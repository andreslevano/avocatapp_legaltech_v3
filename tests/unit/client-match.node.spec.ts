import { expect, test } from '@playwright/test';
import { confidentMatch, guessPersonType, matchClients, nameScore, normalizeName } from '@/lib/clients/match';

const clients = [
  { id: 'a', name: 'Sociedad Concesionaria Salud Siglo XXI S.A.', email: 'x@salud.cl' },
  { id: 'b', name: 'Juan Pérez', email: 'juan@x.es', idNumber: '12345678Z' },
  { id: 'c', name: 'Ana Gil', company: 'Acme S.L.', email: 'ana@acme.es', companyTaxId: 'B12345678' },
  { id: 'd', name: 'Juan Pérez García', email: 'jpg@x.es' },
];

test('normalizeName drops accents, punctuation and legal forms', () => {
  expect(normalizeName('Sociedad Concesionaria Salud Siglo XXI S.A.')).toBe('concesionaria salud siglo xxi');
  expect(normalizeName('ACME, S.L.U.')).toBe('acme');
  expect(normalizeName('José  Ñúñez')).toBe('jose nunez');
});

test('scores and matches by name, company or tax id', () => {
  expect(nameScore('Salud Siglo XXI SA', 'Sociedad Concesionaria Salud Siglo XXI S.A.')).toBe(0.9);
  expect(nameScore('juan perez', 'Juan Pérez')).toBe(1);
  expect(matchClients('Acme Sociedad Limitada', clients)[0].client.id).toBe('c');
  expect(matchClients('B-12345678', clients)[0].client.id).toBe('c');
  expect(matchClients('Pedro Ruiz', clients)).toEqual([]);
  expect(matchClients('', clients)).toEqual([]);
});

test('confidentMatch links only one clear match', () => {
  expect(confidentMatch('Sociedad Concesionaria Salud Siglo XXI S.A.', clients)?.id).toBe('a');
  expect(confidentMatch('Juan Pérez', clients)?.id).toBe('b');          // exact beats "Juan Pérez García" (0.9)
  expect(confidentMatch('Pérez', clients)).toBeNull();
  expect(confidentMatch('Otra Empresa S.A.', clients)).toBeNull();
});

test('guessPersonType', () => {
  expect(guessPersonType('Acme S.L.')).toBe('sociedad');
  expect(guessPersonType('Sociedad Concesionaria Salud')).toBe('sociedad');
  expect(guessPersonType('Banco del Estado SPA')).toBe('sociedad');
  expect(guessPersonType('Juan Pérez')).toBe('persona');
  expect(guessPersonType('Salas')).toBe('persona');
});
