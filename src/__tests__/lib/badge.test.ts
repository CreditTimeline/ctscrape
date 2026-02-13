import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateBadge, clearBadge } from '../../lib/badge';
import type { ExtractionState } from '../../extraction/types';

// Mock browser.action methods since @webext-core/fake-browser doesn't implement them
const mockSetBadgeText = vi.fn().mockResolvedValue(undefined);
const mockSetBadgeBackgroundColor = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  // Override the browser.action methods provided by fake-browser
  browser.action.setBadgeText = mockSetBadgeText;
  browser.action.setBadgeBackgroundColor = mockSetBadgeBackgroundColor;
});

describe('updateBadge', () => {
  it('sets empty text for idle state', async () => {
    await updateBadge(1, 'idle');
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '', tabId: 1 });
    expect(mockSetBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#9ca3af', tabId: 1 });
  });

  it('sets "!" for detected state with blue background', async () => {
    await updateBadge(1, 'detected');
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '!', tabId: 1 });
    expect(mockSetBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#3b82f6', tabId: 1 });
  });

  it('sets "..." for extracting state with yellow background', async () => {
    await updateBadge(1, 'extracting');
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '...', tabId: 1 });
    expect(mockSetBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#f59e0b', tabId: 1 });
  });

  it('sets "OK" for ready state with green background', async () => {
    await updateBadge(1, 'ready');
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: 'OK', tabId: 1 });
    expect(mockSetBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#10b981', tabId: 1 });
  });

  it('sets "ERR" for error state with red background', async () => {
    await updateBadge(1, 'error');
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: 'ERR', tabId: 1 });
    expect(mockSetBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#ef4444', tabId: 1 });
  });

  it('sets "OK" for complete state with green background', async () => {
    await updateBadge(1, 'complete');
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: 'OK', tabId: 1 });
    expect(mockSetBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#10b981', tabId: 1 });
  });

  const processingStates: ExtractionState[] = ['normalising', 'sending'];
  it.each(processingStates)('sets "..." for %s state', async (state) => {
    await updateBadge(1, state);
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '...', tabId: 1 });
  });
});

describe('clearBadge', () => {
  it('clears badge text for the tab', async () => {
    await clearBadge(42);
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '', tabId: 42 });
  });
});
