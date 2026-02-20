'use client';

import { useState, useEffect, useCallback } from 'react';

// Types for the revision email workflow
type ScheduleFrequency = 'manual' | 'daily' | 'weekly' | 'custom';

interface EmailAccount {
  connected: boolean;
  email?: string;
  provider?: 'gmail' | 'outlook';
}

interface ProcessedEmail {
  id: string;
  subject: string;
  from: string;
  date: string;
  category: string;
  mainIdeas: string[];
  riskLevel?: 'low' | 'medium' | 'high';
  attachments?: { name: string; url: string; size: number }[];
}

interface JobProgress {
  jobId: string | null;
  status: 'idle' | 'running' | 'completed' | 'error';
  processed: number;
  total: number;
  error?: string;
}

// External service integration points (replace with your AI/backend)
// - startRevisionJob(frequency) -> returns { jobId }
// - pollJobProgress(jobId) -> returns { processed, total, status, results? }

// Generate Excel-compatible CSV
function exportToExcel(emails: ProcessedEmail[]): void {
  const headers = ['Asunto', 'De', 'Fecha', 'Categoría', 'Ideas principales', 'Nivel de riesgo', 'Adjuntos'];
  const rows = emails.map((e) => [
    `"${(e.subject || '').replace(/"/g, '""')}"`,
    `"${(e.from || '').replace(/"/g, '""')}"`,
    e.date,
    e.category,
    `"${(e.mainIdeas?.join('; ') || '').replace(/"/g, '""')}"`,
    e.riskLevel || '',
    (e.attachments?.map((a) => a.name).join(', ') || '').replace(/"/g, '""'),
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `revision-email-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Mock data for demo
const MOCK_EMAILS: ProcessedEmail[] = [
  {
    id: '1',
    subject: 'Reunión de seguimiento - Proyecto X',
    from: 'cliente@empresa.com',
    date: '2026-02-10',
    category: 'Contratos',
    mainIdeas: ['Solicitud de prórroga', 'Revisión de cláusulas de confidencialidad'],
    riskLevel: 'medium',
    attachments: [{ name: 'contrato-v2.pdf', url: '#', size: 245000 }],
  },
  {
    id: '2',
    subject: 'Plazo de respuesta - Demanda laboral',
    from: 'abogado@bufete.es',
    date: '2026-02-09',
    category: 'Laboral',
    mainIdeas: ['Vencimiento de plazo en 72 horas', 'Solicitud de documentación complementaria'],
    riskLevel: 'high',
    attachments: [],
  },
  {
    id: '3',
    subject: 'Información fiscal trimestral',
    from: 'administracion@empresa.com',
    date: '2026-02-08',
    category: 'Fiscal',
    mainIdeas: ['Envío de documentación trimestral', 'Sin novedades'],
    riskLevel: 'low',
    attachments: [
      { name: 'informe-q1.pdf', url: '#', size: 120000 },
      { name: 'datos.xlsx', url: '#', size: 45000 },
    ],
  },
];

export default function RevisionEmailPage() {
  const [emailAccount, setEmailAccount] = useState<EmailAccount>({ connected: false });
  const [schedule, setSchedule] = useState<ScheduleFrequency>('manual');
  const [customSchedule, setCustomSchedule] = useState({ day: 1, hour: 9, minute: 0 });
  const [progress, setProgress] = useState<JobProgress>({
    jobId: null,
    status: 'idle',
    processed: 0,
    total: 0,
  });
  const [results, setResults] = useState<ProcessedEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<ProcessedEmail | null>(null);
  const [attachmentsFilter, setAttachmentsFilter] = useState<'all' | 'with'>('all');

  // Simulate job execution (mock external service)
  const runJob = useCallback(async () => {
    setProgress({ jobId: null, status: 'running', processed: 0, total: 12 });
    // Simulate progress updates
    for (let i = 1; i <= 12; i++) {
      await new Promise((r) => setTimeout(r, 600));
      setProgress((p) => ({ ...p, processed: i, total: 12 }));
    }
    setProgress((p) => ({ ...p, status: 'completed' }));
    setResults(MOCK_EMAILS);
  }, []);

  const connectEmail = () => {
    // In production: open OAuth flow for Gmail/Outlook
    setEmailAccount({
      connected: true,
      email: 'usuario@ejemplo.com',
      provider: 'gmail',
    });
  };

  const disconnectEmail = () => {
    setEmailAccount({ connected: false });
    setResults([]);
    setProgress({ jobId: null, status: 'idle', processed: 0, total: 0 });
  };

  const filteredResults = results.filter((e) => {
    if (attachmentsFilter === 'with') return (e.attachments?.length ?? 0) > 0;
    return true;
  });

  const allAttachments = results.flatMap((e) =>
    (e.attachments ?? []).map((a) => ({ ...a, emailSubject: e.subject, emailId: e.id }))
  );

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-h1 text-text-primary mb-2">Revisión de Email</h1>
        <p className="text-body text-text-secondary mb-8">
          Conecta tu cuenta de correo, programa la frecuencia y obtén análisis con IA: categorización, ideas principales y adjuntos.
        </p>

        {/* 1. Email connection */}
        <div className="bg-card overflow-hidden shadow rounded-lg border border-border mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-h2 text-text-primary mb-4">Cuenta de correo</h2>
            <p className="text-sm text-text-secondary mb-4">
              Conecta una cuenta para leer correos, categorizarlos, extraer ideas principales y descargar adjuntos.
            </p>
            {emailAccount.connected ? (
              <div className="flex items-center justify-between p-4 bg-surface-muted/20 border border-border rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-surface-muted/30 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{emailAccount.email}</p>
                    <p className="text-xs text-text-secondary capitalize">{emailAccount.provider}</p>
                  </div>
                </div>
                <button
                  onClick={disconnectEmail}
                  className="text-sm font-medium text-text-secondary hover:text-text-primary px-3 py-2 rounded-md border border-border hover:bg-surface-muted/20 transition-colors"
                >
                  Desconectar
                </button>
              </div>
            ) : (
              <button onClick={connectEmail} className="btn-primary">
                Conectar cuenta de correo
              </button>
            )}
          </div>
        </div>

        {/* 2. Schedule / frequency */}
        <div className="bg-card overflow-hidden shadow rounded-lg border border-border mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-h2 text-text-primary mb-4">Frecuencia de ejecución</h2>
            <p className="text-sm text-text-secondary mb-4">
              Define cuándo se ejecutará el análisis. El procesamiento se realiza en un servicio externo con IA.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Frecuencia</label>
                <select
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value as ScheduleFrequency)}
                  className="input-field"
                >
                  <option value="manual">Solo manual</option>
                  <option value="daily">Diaria</option>
                  <option value="weekly">Semanal</option>
                  <option value="custom">Personalizada</option>
                </select>
              </div>
              {schedule === 'custom' && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Día</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={customSchedule.day}
                      onChange={(e) => setCustomSchedule((s) => ({ ...s, day: +e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Hora</label>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={customSchedule.hour}
                      onChange={(e) => setCustomSchedule((s) => ({ ...s, hour: +e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Min</label>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={customSchedule.minute}
                      onChange={(e) => setCustomSchedule((s) => ({ ...s, minute: +e.target.value }))}
                      className="input-field"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6">
              <button
                onClick={runJob}
                disabled={!emailAccount.connected || progress.status === 'running'}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {progress.status === 'running' ? 'Ejecutando...' : 'Ejecutar ahora'}
              </button>
            </div>
          </div>
        </div>

        {/* 3. Progress (when running) */}
        {progress.status === 'running' && (
          <div className="bg-card overflow-hidden shadow rounded-lg border border-border mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-h2 text-text-primary mb-4">Progreso de ejecución</h2>
              <p className="text-sm text-text-secondary mb-4">
                El análisis se está ejecutando en el servicio externo. Puedes ver el avance en tiempo real.
              </p>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Emails procesados</span>
                  <span className="font-medium text-text-primary">
                    {progress.processed} / {progress.total}
                  </span>
                </div>
                <div className="h-3 bg-surface-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sidebar transition-all duration-300"
                    style={{ width: `${progress.total ? (progress.processed / progress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Results display */}
        {results.length > 0 && progress.status === 'completed' && (
          <>
            <div className="bg-card overflow-hidden shadow rounded-lg border border-border mb-8">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <h2 className="text-h2 text-text-primary">Resultados</h2>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => exportToExcel(results)} className="btn-primary text-sm">
                      Descargar Excel
                    </button>
                    <select
                      value={attachmentsFilter}
                      onChange={(e) => setAttachmentsFilter(e.target.value as 'all' | 'with')}
                      className="input-field w-auto"
                    >
                      <option value="all">Todos los emails</option>
                      <option value="with">Solo con adjuntos</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Asunto</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">De</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Categoría</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Riesgo</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Adjuntos</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredResults.map((email) => (
                        <tr key={email.id} className="hover:bg-surface-muted/10">
                          <td className="px-4 py-3 text-sm text-text-primary max-w-[200px] truncate">{email.subject}</td>
                          <td className="px-4 py-3 text-sm text-text-secondary">{email.from}</td>
                          <td className="px-4 py-3 text-sm text-text-secondary">{email.date}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-surface-muted/30 text-text-primary border border-border">
                              {email.category}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                email.riskLevel === 'high'
                                  ? 'bg-surface-muted/50 text-text-primary'
                                  : email.riskLevel === 'medium'
                                  ? 'bg-surface-muted/30 text-text-secondary'
                                  : 'bg-surface-muted/20 text-text-secondary'
                              }`}
                            >
                              {email.riskLevel || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">
                            {email.attachments?.length ?? 0} archivo(s)
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setSelectedEmail(selectedEmail?.id === email.id ? null : email)}
                              className="text-sm font-medium text-text-primary hover:text-text-secondary transition-colors"
                            >
                              {selectedEmail?.id === email.id ? 'Ocultar' : 'Ver detalle'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedEmail && (
                  <div className="mt-6 p-4 bg-surface-muted/20 border border-border rounded-lg">
                    <h4 className="font-medium text-text-primary mb-2">Ideas principales</h4>
                    <ul className="list-disc list-inside text-sm text-text-secondary space-y-1">
                      {selectedEmail.mainIdeas.map((idea, i) => (
                        <li key={i}>{idea}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Attachments repository */}
            {allAttachments.length > 0 && (
              <div className="bg-card overflow-hidden shadow rounded-lg border border-border">
                <div className="px-4 py-5 sm:p-6">
                  <h2 className="text-h2 text-text-primary mb-4">Repositorio de adjuntos</h2>
                  <p className="text-sm text-text-secondary mb-4">
                    Archivos extraídos de los correos procesados. Descarga y visualiza los adjuntos.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allAttachments.map((att, i) => (
                      <a
                        key={i}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center p-4 border border-border rounded-lg bg-surface-muted/10 hover:bg-surface-muted/20 transition-colors"
                      >
                        <div className="w-10 h-10 bg-surface-muted/30 rounded flex items-center justify-center mr-3 flex-shrink-0">
                          <svg className="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-text-primary truncate">{att.name}</p>
                          <p className="text-xs text-text-secondary truncate">{att.emailSubject}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
