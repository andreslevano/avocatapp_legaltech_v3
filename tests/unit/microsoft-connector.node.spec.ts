import { test, expect } from '@playwright/test';

process.env.INTEGRATION_TOKEN_ENC_KEY = Buffer.alloc(32, 7).toString('base64');

import {
  assertReadOnlyScopes, isAllowedPickerResource, sanitizeReturnTo, scopeNames, sharePointTenantFromUrl, withParams,
} from '@/lib/integrations/microsoft/config';
import { classifyAuthError, isReauthError } from '@/lib/integrations/microsoft/errors';
import { decodeState, encodeState } from '@/lib/integrations/microsoft/state';
import { decryptString, encryptString } from '@/lib/integrations/crypto';

test.describe('read-only scope guard (M2)', () => {
  test('accepts the registered read-only grants', () => {
    expect(() => assertReadOnlyScopes(
      'https://graph.microsoft.com/Files.Read.All https://graph.microsoft.com/Sites.Read.All https://graph.microsoft.com/User.Read openid profile email offline_access',
    )).not.toThrow();
    expect(() => assertReadOnlyScopes('https://contoso-my.sharepoint.com/AllSites.Read https://contoso-my.sharepoint.com/MyFiles.Read')).not.toThrow();
    expect(() => assertReadOnlyScopes('OneDrive.ReadOnly')).not.toThrow();
  });
  for (const bad of ['Files.ReadWrite.All', 'Sites.ReadWrite.All', 'AllSites.Write', 'MyFiles.Write', 'Sites.Manage.All', 'Sites.FullControl.All', 'Mail.Send']) {
    test(`rejects ${bad}`, () => {
      expect(() => assertReadOnlyScopes(`https://graph.microsoft.com/User.Read https://graph.microsoft.com/${bad}`)).toThrow(/M2/);
    });
  }
  test('scopeNames strips resource prefixes', () => {
    expect(scopeNames('https://graph.microsoft.com/User.Read openid')).toEqual(['User.Read', 'openid']);
  });
});

test.describe('returnTo sanitising', () => {
  test('keeps same-site relative paths', () => {
    expect(sanitizeReturnTo('/documents?folder=abc')).toBe('/documents?folder=abc');
    expect(sanitizeReturnTo('/cases/x#docs')).toBe('/cases/x#docs');
  });
  for (const bad of ['https://evil.com', '//evil.com/x', '/\\evil.com', 'javascript:alert(1)', 'documents', '', null, '/x\n']) {
    test(`rejects ${JSON.stringify(bad)}`, () => expect(sanitizeReturnTo(bad as string)).toBe('/documents'));
  }
  test('withParams appends and keeps existing params', () => {
    expect(withParams('/documents?folder=a', { ms: 'connected' })).toBe('/documents?folder=a&ms=connected');
  });
});

test.describe('signed state', () => {
  const s = { uid: 'u1', nonce: 'n1', returnTo: '/documents?folder=f', intent: 'import' as const, folderId: 'f', caseId: null };
  test('round-trips', () => expect(decodeState(encodeState(s))).toEqual(s));
  test('rejects tampering', () => {
    const [body, sig] = encodeState(s).split('.');
    const forged = Buffer.from(JSON.stringify({ ...s, uid: 'attacker' })).toString('base64url');
    expect(decodeState(`${forged}.${sig}`)).toBeNull();
    expect(decodeState(`${body}.x${sig.slice(1)}`)).toBeNull();
    expect(decodeState('garbage')).toBeNull();
  });
  test('re-sanitises returnTo', () => {
    expect(decodeState(encodeState({ ...s, returnTo: 'https://evil.com' }))?.returnTo).toBe('/documents');
  });
});

test.describe('crypto', () => {
  test('round-trips and uses a fresh IV', () => {
    const a = encryptString('refresh-token-ü');
    expect(decryptString(a)).toBe('refresh-token-ü');
    expect(encryptString('refresh-token-ü')).not.toBe(a);
  });
  test('detects tampering', () => {
    const [v, iv, tag, ct] = encryptString('secret').split('.');
    expect(() => decryptString([v, iv, tag, `A${ct.slice(1)}`].join('.'))).toThrow();
  });
});

test.describe('Microsoft error mapping', () => {
  const cases: [string | null, string | null, string | null, string][] = [
    ['consent_required', null, null, 'admin_consent'],
    ['access_denied', 'AADSTS65001: The user or administrator has not consented', null, 'admin_consent'],
    ['access_denied', 'AADSTS90094: Admin approval required', null, 'admin_consent'],
    ['access_denied', 'AADSTS65004: User declined to consent to access the app.', null, 'cancelled'],
    ['access_denied', null, 'cancel', 'cancelled'],
    ['access_denied', 'AADSTS50020: User account from identity provider does not exist in tenant', null, 'error'],
    ['access_denied', 'AADSTS53003: Access has been blocked by Conditional Access policies', null, 'error'],
    ['server_error', 'something', null, 'error'],
  ];
  for (const [error, desc, sub, expected] of cases) {
    test(`${error} ${desc?.slice(0, 11) ?? ''} ${sub ?? ''} → ${expected}`, () => {
      expect(classifyAuthError(error, desc, sub)).toBe(expected);
    });
  }
  test('refresh failures that require reconnecting', () => {
    expect(isReauthError({ error: 'invalid_grant', error_description: 'AADSTS70008: expired' })).toBe(true);
    expect(isReauthError({ error: 'interaction_required', error_description: 'AADSTS50076: MFA' })).toBe(true);
    expect(isReauthError({ error: 'invalid_client', error_description: 'AADSTS7000215: bad secret' })).toBe(false);
  });
});

test.describe('picker resource allow-list', () => {
  const work = { accountType: 'work' as const, sharePointTenant: 'contoso' };
  test('work: only the tenant SharePoint hosts', () => {
    expect(isAllowedPickerResource('https://contoso-my.sharepoint.com', work)).toBe(true);
    expect(isAllowedPickerResource('https://contoso.sharepoint.com/sites/legal', work)).toBe(true);
    expect(isAllowedPickerResource('https://fabrikam.sharepoint.com', work)).toBe(false);
    expect(isAllowedPickerResource('https://graph.microsoft.com', work)).toBe(false);
    expect(isAllowedPickerResource('http://contoso.sharepoint.com', work)).toBe(false);
    expect(isAllowedPickerResource('https://contoso.sharepoint.com.evil.com', work)).toBe(false);
  });
  test('personal: only OneDrive consumer', () => {
    const personal = { accountType: 'personal' as const, sharePointTenant: null };
    expect(isAllowedPickerResource('https://onedrive.live.com', personal)).toBe(true);
    expect(isAllowedPickerResource('https://contoso.sharepoint.com', personal)).toBe(false);
  });
  test('tenant from OneDrive webUrl', () => {
    expect(sharePointTenantFromUrl('https://contoso-my.sharepoint.com/personal/ana_contoso_com/Documents')).toBe('contoso');
    expect(sharePointTenantFromUrl('https://contoso.sharepoint.com/sites/x')).toBe('contoso');
    expect(sharePointTenantFromUrl('https://onedrive.live.com/?id=1')).toBeNull();
  });
});
