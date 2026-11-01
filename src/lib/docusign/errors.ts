// Typed errors so routes and UI can tell "reconnect" apart from other failures.

export class DocusignReconnectRequired extends Error {
  readonly code = 'reconnect_required' as const;
  constructor(message = 'Reconecta tu cuenta de DocuSign') { super(message); this.name = 'DocusignReconnectRequired'; }
}

export class DocusignNotConnected extends Error {
  readonly code = 'not_connected' as const;
  constructor(message = 'DocuSign no está conectado') { super(message); this.name = 'DocusignNotConnected'; }
}
