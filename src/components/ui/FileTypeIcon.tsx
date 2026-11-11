import { FileText, FilePenLine, FileSpreadsheet, Image as ImageIcon, Paperclip } from 'lucide-react';

// Lucide icon for an attachment / document type (replaces 📄 📝 📊 🖼 📎).
export function FileTypeIcon({ mimeType = '', name = '', size = 16, className = '' }: { mimeType?: string; name?: string; size?: number; className?: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const Icon =
    mimeType === 'application/pdf' || ext === 'pdf' ? FileText
    : mimeType.includes('word') || ['docx', 'doc'].includes(ext) ? FilePenLine
    : mimeType.includes('sheet') || mimeType.includes('excel') || ['xlsx', 'xls', 'csv'].includes(ext) ? FileSpreadsheet
    : mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext) ? ImageIcon
    : Paperclip;
  return <Icon size={size} className={className} aria-hidden />;
}
