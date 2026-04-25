interface ToolCallBadgeProps {
  name: string;
  status?: 'running' | 'done';
}

export default function ToolCallBadge({ name, status = 'done' }: ToolCallBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#252218] border border-[#2e2b20] text-[11px] font-sans text-[#c8c0ac]">
      <span className={status === 'running' ? 'animate-pulse' : ''}>⚡</span>
      {name}
    </span>
  );
}
