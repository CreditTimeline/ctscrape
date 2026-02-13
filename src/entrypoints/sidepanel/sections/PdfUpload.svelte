<script lang="ts">
  import type { PdfReportInfo } from '../../../adapters/types';
  import type { PdfProcessResult } from '../../../utils/messaging';
  import { sendMessage } from '../../../utils/messaging';
  import ProgressBar from '../../../components/ProgressBar.svelte';

  let {
    onjobready,
  }: {
    onjobready: (jobId: string, reportInfo: PdfReportInfo) => void;
  } = $props();

  type UploadState = 'idle' | 'reading' | 'processing' | 'detected' | 'error';

  let uploadState = $state<UploadState>('idle');
  let fileName = $state<string | null>(null);
  let fileSize = $state<number>(0);
  let error = $state<string | null>(null);
  let reportInfo = $state<PdfReportInfo | null>(null);
  let isDragOver = $state(false);

  let isProcessing = $derived(uploadState === 'reading' || uploadState === 'processing');

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      error = 'Please select a PDF file.';
      uploadState = 'error';
      return;
    }

    fileName = file.name;
    fileSize = file.size;
    error = null;
    reportInfo = null;
    uploadState = 'reading';

    try {
      // Read file as ArrayBuffer then convert to Base64
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]!);
      }
      const base64 = btoa(binary);

      uploadState = 'processing';

      // Send to background for processing
      const result: PdfProcessResult = await sendMessage('processPdf', {
        pdfBase64: base64,
        filename: file.name,
      });

      if (result.detected && result.jobId && result.reportInfo) {
        reportInfo = result.reportInfo;
        uploadState = 'detected';
        onjobready(result.jobId, result.reportInfo);
      } else {
        error = result.error ?? 'Unable to detect a supported credit report in this PDF.';
        uploadState = 'error';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to process PDF.';
      uploadState = 'error';
    }
  }

  function handleFileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;
    const file = event.dataTransfer?.files[0];
    if (file) processFile(file);
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragOver = true;
  }

  function handleDragLeave() {
    isDragOver = false;
  }

  function reset() {
    uploadState = 'idle';
    fileName = null;
    fileSize = 0;
    error = null;
    reportInfo = null;
  }
</script>

<section class="pdf-upload">
  <h2 class="section-title">Upload PDF Report</h2>

  {#if uploadState === 'idle' || uploadState === 'error'}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="drop-zone"
      class:drag-over={isDragOver}
      ondrop={handleDrop}
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
    >
      <div class="drop-content">
        <span class="drop-icon">&#128196;</span>
        <p class="drop-text">Drag and drop a PDF credit report here</p>
        <p class="drop-hint">or</p>
        <label class="btn btn-secondary file-label">
          Choose File
          <input
            type="file"
            accept=".pdf"
            class="file-input"
            onchange={handleFileInput}
          />
        </label>
      </div>
    </div>

    {#if error}
      <div class="error-message">
        <p>{error}</p>
      </div>
    {/if}
  {/if}

  {#if isProcessing}
    <div class="status-card">
      <div class="file-info">
        <span class="file-name">{fileName}</span>
        <span class="file-size">{formatFileSize(fileSize)}</span>
      </div>
      <ProgressBar />
      <p class="status-text">
        {#if uploadState === 'reading'}
          Reading PDF...
        {:else}
          Detecting report format and extracting data...
        {/if}
      </p>
    </div>
  {/if}

  {#if uploadState === 'detected' && reportInfo}
    <div class="result-card">
      <div class="result-header">
        <span class="result-icon">&#9989;</span>
        <span class="result-title">Report Detected</span>
      </div>
      <div class="page-info">
        <div class="info-row">
          <span class="info-label">Source</span>
          <span class="info-value">Equifax PDF</span>
        </div>
        <div class="info-row">
          <span class="info-label">Subject</span>
          <span class="info-value">{reportInfo.subjectName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Report Date</span>
          <span class="info-value">{reportInfo.reportDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Pages</span>
          <span class="info-value">{reportInfo.pageCount}</span>
        </div>
        {#if reportInfo.reference}
          <div class="info-row">
            <span class="info-label">Reference</span>
            <span class="info-value">{reportInfo.reference}</span>
          </div>
        {/if}
      </div>
      <button class="btn btn-secondary" onclick={reset}>
        Upload Different PDF
      </button>
    </div>
  {/if}
</section>

<style>
  .pdf-upload {
    display: flex;
    flex-direction: column;
    gap: var(--ct-space-3);
  }

  .section-title {
    font-size: var(--ct-font-size-base);
    font-weight: var(--ct-font-weight-semibold);
  }

  .drop-zone {
    border: 2px dashed var(--ct-color-border-subtle);
    border-radius: var(--ct-radius-md);
    padding: var(--ct-space-6) var(--ct-space-4);
    text-align: center;
    transition: border-color var(--ct-transition-fast), background var(--ct-transition-fast);
    cursor: pointer;
  }

  .drop-zone.drag-over {
    border-color: var(--ct-color-primary);
    background: var(--ct-color-bg-subtle);
  }

  .drop-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--ct-space-2);
  }

  .drop-icon {
    font-size: 2rem;
    opacity: 0.5;
  }

  .drop-text {
    font-size: var(--ct-font-size-sm);
    color: var(--ct-color-text-muted);
  }

  .drop-hint {
    font-size: var(--ct-font-size-xs);
    color: var(--ct-color-text-muted);
  }

  .file-label {
    cursor: pointer;
    display: inline-block;
  }

  .file-input {
    display: none;
  }

  .status-card {
    display: flex;
    flex-direction: column;
    gap: var(--ct-space-2);
    padding: var(--ct-space-3);
    background: var(--ct-color-bg-subtle);
    border-radius: var(--ct-radius-md);
  }

  .file-info {
    display: flex;
    justify-content: space-between;
    font-size: var(--ct-font-size-sm);
  }

  .file-name {
    font-weight: var(--ct-font-weight-medium);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    color: var(--ct-color-text-muted);
    flex-shrink: 0;
  }

  .status-text {
    font-size: var(--ct-font-size-sm);
    color: var(--ct-color-text-muted);
    text-align: center;
  }

  .error-message {
    padding: var(--ct-space-2) var(--ct-space-3);
    background: var(--ct-color-bg-danger);
    border-radius: var(--ct-radius-md);
    font-size: var(--ct-font-size-sm);
    color: var(--ct-color-text-danger);
  }

  .result-card {
    display: flex;
    flex-direction: column;
    gap: var(--ct-space-3);
  }

  .result-header {
    display: flex;
    align-items: center;
    gap: var(--ct-space-2);
    font-weight: var(--ct-font-weight-medium);
  }

  .result-icon {
    font-size: 1.2rem;
  }

  .result-title {
    color: var(--ct-color-text-success);
  }

  .page-info {
    display: flex;
    flex-direction: column;
    gap: var(--ct-space-1);
    padding: var(--ct-space-2) var(--ct-space-3);
    background: var(--ct-color-bg-subtle);
    border-radius: var(--ct-radius-md);
    font-size: var(--ct-font-size-sm);
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    gap: var(--ct-space-2);
  }

  .info-label {
    color: var(--ct-color-text-muted);
    flex-shrink: 0;
  }

  .info-value {
    text-align: right;
    font-weight: var(--ct-font-weight-medium);
    word-break: break-word;
  }

  .btn {
    padding: var(--ct-space-2) var(--ct-space-4);
    border-radius: var(--ct-radius-md);
    font-size: var(--ct-font-size-sm);
    font-weight: var(--ct-font-weight-medium);
    transition: opacity var(--ct-transition-fast);
  }

  .btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn-secondary {
    background: var(--ct-color-bg-subtle);
    color: var(--ct-color-text);
    border: 1px solid var(--ct-color-border-subtle);
  }
</style>
