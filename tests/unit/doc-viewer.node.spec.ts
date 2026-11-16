import { test, expect } from '@playwright/test';
import { isHtmlDoc, neighbour, viewerKind, VIEWER_MAX_FETCH_BYTES, wrapFragment } from '@/lib/documents/viewer';

const d = (type: string, extra: object = {}) => ({ name: `x.${type}`, type, size: 1000, downloadUrl: 'https://f/x', ...extra });

test('viewerKind per file type', () => {
  expect(viewerKind(d('doc', { pdfDownloadUrl: 'https://f/x.pdf' }))).toEqual({ kind: 'pdf', url: 'https://f/x.pdf', ext: 'pdf' });
  expect(viewerKind(d('pdf')).kind).toBe('pdf');
  expect(viewerKind(d('PNG')).kind).toBe('image');
  expect(viewerKind(d('doc')).kind).toBe('doc');
  expect(viewerKind(d('docx')).kind).toBe('docx');
  expect(viewerKind(d('csv')).kind).toBe('text');
  expect(viewerKind(d('xlsx')).kind).toBe('none');
  expect(viewerKind(d('docx', { size: VIEWER_MAX_FETCH_BYTES + 1 })).kind).toBe('too-big');
  expect(viewerKind(d('pdf', { size: VIEWER_MAX_FETCH_BYTES + 1 })).kind).toBe('pdf');   // streamed by the browser
  expect(viewerKind({ name: 'Contrato.docx', type: '', size: 1, downloadUrl: 'u' }).kind).toBe('docx');
});

test('Avocat .doc (HTML) vs binary Word', () => {
  expect(isHtmlDoc('﻿<!DOCTYPE html><html>')).toBe(true);
  expect(isHtmlDoc('  <html lang="es">')).toBe(true);
  expect(isHtmlDoc('ÐÏ\u0011à binary')).toBe(false);
});

test('wrapFragment escapes the title; neighbour wraps around', () => {
  expect(wrapFragment('<p>x</p>', '<script>')).toContain('<title>&lt;script&gt;</title>');
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  expect(neighbour(list, 'a', -1)?.id).toBe('c');
  expect(neighbour(list, 'c', 1)?.id).toBe('a');
  expect(neighbour([{ id: 'a' }], 'a', 1)).toBeNull();
});
