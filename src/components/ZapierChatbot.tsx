'use client';

import { useEffect } from 'react';

// Kept on the home page (DS v4 default). Accent is themed via `--zapier-primary: var(--accent)` in globals.css.
// TODO(ds-v4): the AIDisclaimer can't be placed inside this third-party popup (shadow DOM); ask Zapier to
// add "Avocat puede equivocarse…" to the bot's greeting, or replace it with the in-app agent.
export default function ZapierChatbot() {
  useEffect(() => {
    // Ensure the web component is visible on mobile - minimal styles to avoid conflicts
    const style = document.createElement('style');
    style.id = 'zapier-chatbot-mobile-fix';
    style.textContent = `
      zapier-interfaces-chatbot-embed {
        z-index: 9999 !important;
      }
      @media (max-width: 768px) {
        zapier-interfaces-chatbot-embed {
          z-index: 9999 !important;
          display: block !important;
        }
        /* Ensure popup button is visible on mobile */
        zapier-interfaces-chatbot-embed::part(button),
        zapier-interfaces-chatbot-embed button,
        zapier-interfaces-chatbot-embed [role="button"] {
          display: block !important;
          visibility: visible !important;
        }
      }
    `;
    
    // Only add if not already added
    if (!document.getElementById('zapier-chatbot-mobile-fix')) {
      document.head.appendChild(style);
    }
    
    return () => {
      const existingStyle = document.getElementById('zapier-chatbot-mobile-fix');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);

  return (
    <zapier-interfaces-chatbot-embed 
      is-popup="true" 
      chatbot-id="cmjcoh48l001an7iiungo9mn2"
    />
  );
}

