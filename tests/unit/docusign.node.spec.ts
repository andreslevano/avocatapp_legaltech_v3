import { test, expect } from '@playwright/test';

process.env.INTEGRATION_TOKEN_ENC_KEY = Buffer.alloc(32, 9).toString('base64');

import { chooseAccount, REFRESH_MARGIN_MS, type DsAccount } from '@/lib/docusign/config';
import { DocusignReconnectRequired } from '@/lib/docusign/errors';
import { needsRefresh, resolveAccessToken } from '@/lib/docusign/token-logic';
import { buildDocHtml, countSignatureBlocks, dateAnchor, signatureAnchor } from '@/lib/doc-html';
import { decodeSignedState, encodeSignedState } from '@/lib/integrations/signed-state';
import { decryptString, encryptString } from '@/lib/integrations/crypto';

const NOW = 1_800_000_000_000;
const tok = (expiresAt: number) => ({ accessToken: 'old-at', refreshToken: 'old-rt', expiresAt });

test.describe('token refresh', () => {
  test('needsRefresh uses a 5-minute margin', () => {
    expect(REFRESH_MARGIN_MS).toBe(5 * 60_000);
    expect(needsRefresh(NOW + 10 * 60_000, NOW)).toBe(false);
    expect(needsRefresh(NOW + 4 * 60_000, NOW)).toBe(true);
    expect(needsRefresh(NOW - 1, NOW)).toBe(true);
  });

  test('fresh token is returned without calling DocuSign', async () => {
    let calls = 0;
    const r = await resolveAccessToken(tok(NOW + 60 * 60_000), NOW, async () => { calls++; throw new Error('no'); });
    expect(r).toEqual({ accessToken: 'old-at', refreshed: null });
    expect(calls).toBe(0);
  });

  test('near-expiry token is refreshed and new tokens are returned for persisting', async () => {
    const r = await resolveAccessToken(tok(NOW + 60_000), NOW, async rt => {
      expect(rt).toBe('old-rt');
      return { access_token: 'new-at', refresh_token: 'new-rt', expires_in: 28_800, token_type: 'Bearer' };
    });
    expect(r.accessToken).toBe('new-at');
    expect(r.refreshed).toEqual({ accessToken: 'new-at', refreshToken: 'new-rt', expiresAt: NOW + 28_800_000 });
  });

  test('keeps the old refresh token if DocuSign does not rotate it', async () => {
    const r = await resolveAccessToken(tok(NOW), NOW, async () =>
      ({ access_token: 'new-at', refresh_token: '', expires_in: 3600, token_type: 'Bearer' }));
    expect(r.refreshed?.refreshToken).toBe('old-rt');
  });

  test('invalid_grant surfaces as ReconnectRequired', async () => {
    await expect(resolveAccessToken(tok(NOW), NOW, async () => { throw new DocusignReconnectRequired(); }))
      .rejects.toBeInstanceOf(DocusignReconnectRequired);
  });
});

test.describe('account choice (multi-account users)', () => {
  const accounts: DsAccount[] = [
    { accountId: 'a1', accountName: 'Personal', baseUri: 'https://demo.docusign.net', isDefault: false },
    { accountId: 'a2', accountName: 'Bufete Pérez', baseUri: 'https://eu.docusign.net', isDefault: true },
  ];
  test('defaults to is_default', () => expect(chooseAccount(accounts)?.accountId).toBe('a2'));
  test('honours an explicit choice the user has', () => expect(chooseAccount(accounts, 'a1')?.accountId).toBe('a1'));
  test('ignores an account the user does not have', () => expect(chooseAccount(accounts, 'zzz')?.accountId).toBe('a2'));
  test('first account when none is default', () => expect(chooseAccount([{ ...accounts[0] }])?.accountId).toBe('a1'));
  test('null when the user has no account', () => expect(chooseAccount([])).toBeNull());
});

test.describe('crypto + signed state', () => {
  test('tokens round-trip and ciphertext differs each time', () => {
    const a = encryptString('eyJ0eXAiOiJNVCIs-refresh');
    expect(decryptString(a)).toBe('eyJ0eXAiOiJNVCIs-refresh');
    expect(encryptString('eyJ0eXAiOiJNVCIs-refresh')).not.toBe(a);
  });
  test('state signature rejects tampering', () => {
    const s = encodeSignedState({ uid: 'u1', nonce: 'n', returnTo: '/profile' });
    expect(decodeSignedState(s)).toEqual({ uid: 'u1', nonce: 'n', returnTo: '/profile' });
    const [, sig] = s.split('.');
    expect(decodeSignedState(`${Buffer.from('{"uid":"evil"}').toString('base64url')}.${sig}`)).toBeNull();
  });
});

test.describe('forSignature document mode (Phase 0)', () => {
  const md = [
    '## BLOQUE DE FIRMAS', '',
    '**ACME S.L.**', 'Fecha: ____________', 'Firma: ________________________', '',
    '**NIKE IBERIA S.L.**', 'Fecha: ____________', 'Firma: ________________________',
  ].join('\n');

  test('anchors are \\s1\\ \\d1\\ \\s2\\ \\d2\\ in document order', () => {
    expect(signatureAnchor(1)).toBe('\\s1\\');
    expect(dateAnchor(2)).toBe('\\d2\\');
    const html = buildDocHtml(md, 'NDA', 'https://x/sig.png', undefined, { forSignature: true });
    for (const a of [signatureAnchor(1), dateAnchor(1), signatureAnchor(2), dateAnchor(2)]) expect(html).toContain(a);
    expect(html).not.toContain(signatureAnchor(3));
    expect(html.indexOf(signatureAnchor(1))).toBeLessThan(html.indexOf(signatureAnchor(2)));
  });
  test('omits the stamped signature image in forSignature mode', () => {
    expect(buildDocHtml(md, 'NDA', 'https://x/sig.png', undefined, { forSignature: true })).not.toContain('sig.png');
  });
  test('normal mode is unchanged (stamp on first block, no anchors)', () => {
    const html = buildDocHtml(md, 'NDA', 'https://x/sig.png');
    expect(html).toContain('sig.png');
    expect(html).not.toContain(signatureAnchor(1));
  });
  test('counts signature blocks (English too)', () => {
    expect(countSignatureBlocks(md)).toBe(2);
    expect(countSignatureBlocks('Signature: ______\nSignature: ______\nSignature: ______')).toBe(3);
  });
});
