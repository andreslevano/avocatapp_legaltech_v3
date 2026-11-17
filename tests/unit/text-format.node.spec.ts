import { test, expect } from '@playwright/test';
import { applyLineStyle, lineStyleAt, toggleWrap } from '@/lib/text-format';
import { hasProductFormatting, renderMfwNda } from '@/lib/org-templates/mobiforwork-nda';
import { markdownToHtml } from '@/lib/doc-html';

test('bold / italic wrap and unwrap the selection', () => {
  const v = 'Plataforma Norte';
  const b = toggleWrap(v, 0, 10, '**');
  expect(b.value).toBe('**Plataforma** Norte');
  expect(b.value.slice(b.start, b.end)).toBe('Plataforma');
  expect(toggleWrap(b.value, b.start, b.end, '**').value).toBe(v);            // toggle off
  expect(toggleWrap(v, 11, 16, '*').value).toBe('Plataforma *Norte*');
  expect(toggleWrap('a ', 0, 2, '**').value).toBe('**a** ');                   // spaces stay outside
  const empty = toggleWrap('x', 1, 1, '**');
  expect(empty.value).toBe('x**texto en negrita**');
  expect(empty.value.slice(empty.start, empty.end)).toBe('texto en negrita');
});

test('line styles: bullets, numbering 1..n, title/subtitle, toggle off', () => {
  const v = 'Plataforma A\nPortal B\nApp C';
  expect(applyLineStyle(v, 0, v.length, 'bullet').value).toBe('- Plataforma A\n- Portal B\n- App C');
  const num = applyLineStyle('- A\n- B', 0, 7, 'number').value;
  expect(num).toBe('1. A\n2. B');
  expect(applyLineStyle(num, 0, num.length, 'number').value).toBe('A\nB');
  expect(applyLineStyle(v, 2, 2, 'h2').value).toBe('## Plataforma A\nPortal B\nApp C');
  expect(applyLineStyle('## T', 0, 0, 'h3').value).toBe('### T');
  expect(lineStyleAt('a\n### b', 4)).toBe('h3');
  expect(lineStyleAt('1. a', 0)).toBe('number');
});

test('NDA products: plain lines keep the classic bold bullets; formatting is kept', () => {
  expect(hasProductFormatting('Plataforma A\n- Portal B')).toBe(false);
  expect(renderMfwNda({ receptor: { tipo: 'persona' }, productos: 'Plataforma A\nPortal B' })).toContain('- **Plataforma A**\n- **Portal B**');
  const rich = '## Software\n1. **Plataforma** de *mantenimiento*\n2. Portal\n# Hardware\n- Sensor ____';
  expect(hasProductFormatting(rich)).toBe(true);
  const md = renderMfwNda({ receptor: { tipo: 'persona' }, productos: rich });
  expect(md).toContain('## Software\n1. **Plataforma** de *mantenimiento*\n2. Portal\n## Hardware\n- Sensor\n');
  expect(md).not.toContain('Sensor ____');
});

test('numbered lists render as <ol> (with start); bullets as <ul>', () => {
  expect(markdownToHtml('1. A\n2. B')).toBe('<ol><li>A</li><li>B</li></ol>');
  expect(markdownToHtml('3. C\n4. D')).toBe('<ol start="3"><li>C</li><li>D</li></ol>');
  expect(markdownToHtml('- a\n1. b')).toBe('<ul><li>a</li></ul><ol><li>b</li></ol>');
  expect(markdownToHtml('<b>x</b> **y**')).toBe('<p>&lt;b&gt;x&lt;/b&gt; <strong>y</strong></p>');
});
