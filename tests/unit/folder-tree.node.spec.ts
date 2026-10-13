import { test, expect } from '@playwright/test';
import {
  planFolderMove, planFolderDelete, planAutoOrganize, folderPathLabel, indexById, uniqueName, isNameTaken,
} from '@/lib/folders/tree';
import { validateFolderName, sanitizeFolderName } from '@/lib/folders/types';

// Tree:  A › A1 › A1a        B        C (depth chain C1..C7 below)
const f = (id: string, name: string, ancestors: string[]) =>
  ({ id, name, parentId: ancestors.length ? ancestors[ancestors.length - 1] : null, ancestors, depth: ancestors.length + 1 });

const base = [
  f('A', 'Clientes', []),
  f('A1', 'Acme', ['A']),
  f('A1a', 'NDAs', ['A', 'A1']),
  f('B', 'Casos', []),
];

test.describe('planFolderMove', () => {
  test('moves a subtree and rewrites descendants', () => {
    const r = planFolderMove(base, 'A1', 'B');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patches).toEqual([
      { id: 'A1', parentId: 'B', ancestors: ['B'], depth: 2 },
      { id: 'A1a', ancestors: ['B', 'A1'], depth: 3 },
    ]);
  });
  test('moves to root', () => {
    const r = planFolderMove(base, 'A1a', null);
    expect(r.ok && r.patches).toEqual([{ id: 'A1a', parentId: null, ancestors: [], depth: 1 }]);
  });
  test('rejects moving into itself or a descendant (cycle)', () => {
    expect(planFolderMove(base, 'A', 'A')).toMatchObject({ ok: false, code: 'cycle' });
    expect(planFolderMove(base, 'A', 'A1a')).toMatchObject({ ok: false, code: 'cycle' });
  });
  test('rejects when the subtree would exceed depth 8', () => {
    const chain = [f('C1', 'c1', [])];
    for (let i = 2; i <= 7; i++) chain.push(f(`C${i}`, `c${i}`, chain.map(c => c.id)));
    // C7 is depth 7; moving A (subtree depth 3) under it → A1a at depth 10
    expect(planFolderMove([...base, ...chain], 'A', 'C7')).toMatchObject({ ok: false, code: 'depth' });
    // A1a alone (depth 1 subtree) under C7 → depth 8, allowed
    expect(planFolderMove([...base, ...chain], 'A1a', 'C7').ok).toBe(true);
  });
  test('rejects a name clash in the destination (case-insensitive)', () => {
    const r = planFolderMove([...base, f('X', 'acme', ['B'])], 'A1', 'B');
    expect(r).toMatchObject({ ok: false, code: 'name-taken' });
  });
  test('unknown ids are not found; same parent is a no-op', () => {
    expect(planFolderMove(base, 'nope', null)).toMatchObject({ ok: false, code: 'not-found' });
    expect(planFolderMove(base, 'A1', 'nope')).toMatchObject({ ok: false, code: 'not-found' });
    expect(planFolderMove(base, 'A1', 'A')).toMatchObject({ ok: false, code: 'noop' });
  });
});

test.describe('planFolderDelete', () => {
  const docs = [
    { id: 'd1', folderId: 'A1' },
    { id: 'd2', folderId: 'A1a' },
    { id: 'd3', folderId: null },
    { id: 'd4', folderId: 'B' },
  ];
  test('move-up: content goes to the parent, subtree loses the deleted ancestor', () => {
    const r = planFolderDelete(base, docs, 'A1', 'move-up');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.deleteFolderIds).toEqual(['A1']);
    expect(r.plan.docMoves).toEqual([{ id: 'd1', folderId: 'A' }]);
    expect(r.plan.folderPatches).toEqual([{ id: 'A1a', parentId: 'A', ancestors: ['A'], depth: 2 }]);
    expect(r.plan.deleteDocIds).toEqual([]);
    expect(r.plan.counts).toEqual({ folders: 1, documents: 2 });
  });
  test('move-up renames a child that clashes with a sibling in the parent', () => {
    const folders = [...base, f('A2', 'NDAs', ['A'])];
    const r = planFolderDelete(folders, docs, 'A1', 'move-up');
    expect(r.ok && r.plan.folderPatches[0]).toMatchObject({ id: 'A1a', name: 'NDAs (2)', parentId: 'A' });
  });
  test('move-up of a top-level folder sends content to root', () => {
    const r = planFolderDelete(base, docs, 'A', 'move-up');
    expect(r.ok && r.plan.folderPatches).toEqual([
      { id: 'A1', parentId: null, ancestors: [], depth: 1 },
      { id: 'A1a', ancestors: ['A1'], depth: 2 },
    ]);
  });
  test('delete-all removes the subtree and its documents only', () => {
    const r = planFolderDelete(base, docs, 'A', 'delete-all');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(new Set(r.plan.deleteFolderIds)).toEqual(new Set(['A', 'A1', 'A1a']));
    expect(new Set(r.plan.deleteDocIds)).toEqual(new Set(['d1', 'd2']));
    expect(r.plan.counts).toEqual({ folders: 2, documents: 2 });
  });
});

test.describe('names & paths', () => {
  test('validateFolderName', () => {
    expect(validateFolderName('Clientes')).toBeNull();
    expect(validateFolderName('  ')).not.toBeNull();
    expect(validateFolderName('a/b')).not.toBeNull();
    expect(validateFolderName('a|b')).not.toBeNull();
    expect(validateFolderName('x'.repeat(121))).not.toBeNull();
  });
  test('sanitizeFolderName replaces forbidden characters', () => {
    expect(sanitizeFolderName('AVC/2026:555')).toBe('AVC-2026-555');
    expect(sanitizeFolderName('///')).toBe('-');
    expect(sanitizeFolderName('')).toBe('Sin nombre');
  });
  test('uniqueName / isNameTaken are per-parent and case-insensitive', () => {
    expect(isNameTaken(base, 'A', 'ACME')).toBe(true);
    expect(isNameTaken(base, null, 'acme')).toBe(false);
    expect(uniqueName(base, 'A', 'Acme')).toBe('Acme (2)');
  });
  test('folderPathLabel', () => {
    expect(folderPathLabel('A1a', indexById(base))).toBe('Mis documentos › Clientes › Acme › NDAs');
    expect(folderPathLabel(null, indexById(base))).toBe('Mis documentos');
  });
});

test.describe('planAutoOrganize', () => {
  test('case link wins over client link; only root documents are proposed', () => {
    const groups = planAutoOrganize({
      docs: [
        { id: 'd1', caseId: 'c1', clientId: 'k1' },
        { id: 'd2', clientId: 'k1' },
        { id: 'd3', caseId: 'c1', folderId: 'A' },  // already filed → ignored
        { id: 'd4' },                                // no links → ignored
      ],
      cases: [{ id: 'c1', ref: 'AVC/2026/555', title: 'Acme vs. Foo' }],
      clients: [{ id: 'k1', name: 'Acme S.L.' }],
    }, sanitizeFolderName);
    expect(groups).toEqual([
      { parentName: 'Casos', name: 'AVC-2026-555', docIds: ['d1'] },
      { parentName: 'Clientes', name: 'Acme S.L.', docIds: ['d2'] },
    ]);
  });
});
