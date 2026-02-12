// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { captureHtml, sha256, captureWithHash } from './html-capture';

describe('sha256', () => {
  it('produces correct hex digest for known input', async () => {
    // SHA-256 of "hello" is well-known
    const hash = await sha256('hello');
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('is deterministic — same input produces same output', async () => {
    const a = await sha256('test input');
    const b = await sha256('test input');
    expect(a).toBe(b);
  });

  it('produces different hashes for different inputs', async () => {
    const a = await sha256('input A');
    const b = await sha256('input B');
    expect(a).not.toBe(b);
  });
});

describe('captureHtml', () => {
  it('returns outerHTML of the element', () => {
    const div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = '<p>Hello</p>';

    const html = captureHtml(div);
    expect(html).toContain('<div id="test">');
    expect(html).toContain('<p>Hello</p>');
    expect(html).toContain('</div>');
  });

  it('strips <script> tags from the capture', () => {
    const div = document.createElement('div');
    div.innerHTML = '<p>Data</p><script>alert("xss")</script><span>More</span>';

    const html = captureHtml(div);
    expect(html).toContain('<p>Data</p>');
    expect(html).toContain('<span>More</span>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('alert');
  });

  it('strips nested <script> tags', () => {
    const div = document.createElement('div');
    div.innerHTML = '<div><script type="module">import x</script><p>Keep</p></div>';

    const html = captureHtml(div);
    expect(html).not.toContain('script');
    expect(html).toContain('<p>Keep</p>');
  });

  it('does not mutate the original element', () => {
    const div = document.createElement('div');
    div.innerHTML = '<script>code</script><p>Text</p>';

    captureHtml(div);
    expect(div.querySelector('script')).not.toBeNull();
  });
});

describe('captureWithHash', () => {
  it('returns matching html and hash pair', async () => {
    const div = document.createElement('div');
    div.innerHTML = '<p>Content</p>';

    const result = await captureWithHash(div);
    expect(result.html).toContain('<p>Content</p>');

    // Verify hash matches the captured html
    const expectedHash = await sha256(result.html);
    expect(result.hash).toBe(expectedHash);
  });

  it('hash reflects script-stripped html', async () => {
    const div = document.createElement('div');
    div.innerHTML = '<script>bad</script><p>Good</p>';

    const result = await captureWithHash(div);
    expect(result.html).not.toContain('script');

    // Hash should be of the stripped version
    const expectedHash = await sha256(result.html);
    expect(result.hash).toBe(expectedHash);
  });
});
