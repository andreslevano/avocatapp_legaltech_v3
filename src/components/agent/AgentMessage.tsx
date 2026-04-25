import ToolCallBadge from './ToolCallBadge';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: { name: string; status?: 'running' | 'done' }[];
  streaming?: boolean;
}

export default function AgentMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-avocat-gold/20 border border-avocat-gold/30 flex items-center justify-center mr-2.5 mt-0.5 flex-shrink-0">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-3.5 h-3.5 text-avocat-gold"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
            />
          </svg>
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? 'order-1' : ''}`}>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {message.toolCalls.map((tc, i) => (
              <ToolCallBadge key={i} name={tc.name} status={tc.status} />
            ))}
          </div>
        )}
        <div
          className={[
            'rounded-2xl px-4 py-2.5 text-[13px] font-sans leading-relaxed whitespace-pre-wrap break-words',
            isUser
              ? 'bg-avocat-gold text-white rounded-tr-sm'
              : 'bg-[#252218] border border-[#2e2b20] text-[#c8c0ac] rounded-tl-sm',
          ].join(' ')}
        >
          {message.content || (message.streaming && !message.content ? '' : '')}
          {message.streaming && (
            <span className="inline-block w-1 h-3.5 bg-current ml-0.5 animate-pulse rounded-sm align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}
