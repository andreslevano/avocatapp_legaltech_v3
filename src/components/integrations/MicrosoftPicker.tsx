'use client';

// Microsoft OneDrive File Picker v8 hosted in an iframe inside a modal.
// Contract: https://learn.microsoft.com/onedrive/developer/controls/file-pickers/
//   1. POST {baseUrl}/_layouts/15/FilePicker.aspx (or onedrive.live.com/picker) into the iframe,
//      with ?filePicker=<options> and a hidden access_token (required for iframes).
//   2. Picker posts {type:'initialize', channelId} → we take event.ports[0] and send 'activate'.
//   3. Commands on the port: authenticate (→ token for command.resource), pick, close.
//      Every command is acknowledged, then answered with a 'result'.
// Read-only (M2): upload / create folder / move actions are disabled in the options.

import { useEffect, useRef, useState } from 'react';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { Button } from '@/components/ui/Button';
import { ConnectorError, getPickerToken, type MicrosoftIntegrationInfo } from '@/lib/integrations/microsoft/client';

export const IMPORTABLE_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.png', '.jpg', '.jpeg'];

export interface PickedItem {
  id: string;
  name?: string;
  size?: number;
  webUrl?: string;
  folder?: { childCount?: number };
  file?: { mimeType?: string };
  parentReference: { driveId: string; id?: string; path?: string };
  '@sharePoint.endpoint'?: string;
}

interface Props {
  info: MicrosoftIntegrationInfo;
  onPick: (items: PickedItem[]) => void;
  onClose: () => void;
  onReconnect: () => void;
}

type PortMessage = {
  type: 'notification' | 'command' | 'acknowledge' | 'result';
  id: string;
  data: { command?: string; notification?: string; resource?: string; type?: string; items?: PickedItem[] };
};

function pickerOptions(info: MicrosoftIntegrationInfo, channelId: string) {
  const work = info.accountType === 'work';
  return {
    sdk: '8.0',
    entry: { oneDrive: { files: {} } },
    // Host supplies tokens. Graph tokens are not handed to the browser; SharePoint only.
    authentication: work ? { tokens: { graph: false, sharePoint: true } } : {},
    messaging: { origin: window.location.origin, channelId },
    selection: { mode: 'multiple', maximumCount: 300, enablePersistence: true },
    typesAndSources: {
      mode: 'all',
      filters: [...IMPORTABLE_EXTENSIONS, 'folder'],
      access: { mode: 'read' },
      ...(work ? { pivots: { oneDrive: true, recent: true, shared: true, sharedLibraries: true, site: true } } : {}),
    },
    commands: {
      pick: { action: 'select', label: 'Importar' },
      close: { label: 'Cancelar' },
      upload: { enabled: false },
      createFolder: { enabled: false },
      browseThisDevice: { enabled: false },
      switchAccount: { mode: 'none' },
      manageAccounts: { mode: 'none' },
    },
    theme: 'dark',
  };
}

const LOAD_TIMEOUT_MS = 25_000;

export default function MicrosoftPicker({ info, onPick, onClose, onReconnect }: Props) {
  const { user } = useAppAuth();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [frameName] = useState(() => `ms-picker-${Math.random().toString(36).slice(2)}`);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorText, setErrorText] = useState('');
  const [attempt, setAttempt] = useState(0);
  const handlers = useRef({ onPick, onClose, onReconnect });
  handlers.current = { onPick, onClose, onReconnect };

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !info.pickerBaseUrl) return;
    let port: MessagePort | null = null;
    let cancelled = false;
    const channelId = crypto.randomUUID();
    const options = pickerOptions(info, channelId);
    const baseUrl = info.pickerBaseUrl;
    const initialResource = new URL(baseUrl).origin;

    const fail = (text: string) => { if (!cancelled) { setStatus('error'); setErrorText(text); } };
    const timer = setTimeout(() => fail('El selector de Microsoft no respondió.'), LOAD_TIMEOUT_MS);

    const reply = (id: string, data: unknown) => port?.postMessage({ type: 'result', id, data });

    const onPortMessage = async (ev: MessageEvent<PortMessage>) => {
      const msg = ev.data;
      if (msg.type === 'notification') {
        if (msg.data.notification === 'page-loaded') { clearTimeout(timer); setStatus('ready'); }
        return;
      }
      if (msg.type !== 'command') return;
      port?.postMessage({ type: 'acknowledge', id: msg.id });
      const cmd = msg.data;
      switch (cmd.command) {
        case 'authenticate':
          if (process.env.NODE_ENV !== 'production') console.info('[ms-picker] authenticate', cmd.type, cmd.resource);
          try {
            const { token } = await getPickerToken(user, cmd.resource ?? initialResource);
            reply(msg.id, { result: 'token', token });
          } catch (err) {
            reply(msg.id, { result: 'error', error: { code: 'unableToObtainToken', message: (err as Error).message } });
            if (err instanceof ConnectorError && err.code === 'reconnect_required') handlers.current.onReconnect();
          }
          break;
        case 'pick':
          reply(msg.id, { result: 'success' });
          handlers.current.onPick(cmd.items ?? []);
          break;
        case 'close':
          handlers.current.onClose();
          break;
        default:
          reply(msg.id, { result: 'error', error: { code: 'unsupportedCommand', message: cmd.command } });
      }
    };

    const onWindowMessage = (ev: MessageEvent) => {
      if (ev.source !== frame.contentWindow) return;
      const m = ev.data as { type?: string; channelId?: string };
      if (m?.type === 'initialize' && m.channelId === channelId && ev.ports[0]) {
        clearTimeout(timer);
        setStatus('ready');
        port = ev.ports[0];
        port.addEventListener('message', onPortMessage);
        port.start();
        port.postMessage({ type: 'activate' });
      }
    };
    window.addEventListener('message', onWindowMessage);

    (async () => {
      try {
        const { token } = await getPickerToken(user, initialResource);
        if (cancelled) return;
        const action = info.accountType === 'personal' ? baseUrl : `${baseUrl}/_layouts/15/FilePicker.aspx`;
        const qs = new URLSearchParams({ filePicker: JSON.stringify(options), locale: 'es-es' });
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `${action}?${qs}`;
        form.target = frameName;
        form.style.display = 'none';
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'access_token';
        input.value = token;
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
        form.remove();
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof ConnectorError && err.code === 'reconnect_required') handlers.current.onReconnect();
        else fail('No pudimos abrir el selector de Microsoft.');
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener('message', onWindowMessage);
      port?.removeEventListener('message', onPortMessage);
      port?.close();
    };
  }, [info, user, frameName, attempt]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center md:p-6">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full h-full md:max-w-[1080px] md:h-[680px] md:max-h-[90vh] bg-[#1e1c16] md:border md:border-[#2e2b20] md:rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2e2b20] flex-shrink-0">
          <p className="text-[13px] font-sans font-semibold text-[#e8d4a0]">
            Importar desde {info.accountType === 'personal' ? 'OneDrive' : 'OneDrive / SharePoint'}
            <span className="ml-2 text-[11px] font-normal text-[#6b6050]">{info.email}</span>
          </p>
          <button onClick={onClose} aria-label="Cerrar" className="text-[#6b6050] hover:text-[#c8c0ac] p-1">✕</button>
        </div>
        <div className="relative flex-1 min-h-0 bg-[#161410]">
          {!info.pickerBaseUrl ? (
            <div className="flex items-center justify-center h-full text-[12px] text-[#6b6050] px-6 text-center">
              No encontramos tu OneDrive. Reconecta tu cuenta de Microsoft.
            </div>
          ) : (
            <iframe key={attempt} ref={frameRef} name={frameName} title="Selector de archivos de Microsoft" className="w-full h-full border-0" />
          )}
          {status === 'loading' && info.pickerBaseUrl && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-6 w-6 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" />
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#161410] text-center px-6">
              <p className="text-[13px] text-[#c8c0ac]">{errorText}</p>
              <Button variant="BtnGold" size="sm" onClick={() => { setStatus('loading'); setAttempt(a => a + 1); }}>Reintentar</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
