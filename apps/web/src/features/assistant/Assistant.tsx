import { MessageCircle, Send, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { HeaderChrome } from '../../components/HeaderChrome';
import { askFinancialAssistant, type ChatMessage } from '../../core/ai/financialAssistant';
import { t } from '../../i18n';

export function Assistant() {
  const { data, settings } = useApp();
  const s = t(settings.language);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);

  const suggestions = [s.qSpendWeek, s.qBudget, s.qSave, s.qLargest];

  const send = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true);
    setMessage('');
    const nextHistory: ChatMessage[] = [...history, { role: 'user', content: text }];
    setHistory(nextHistory);
    try {
      const { reply } = await askFinancialAssistant({
        message: text,
        history: nextHistory,
        data,
        language: settings.language,
      });
      setHistory((h) => [...h, { role: 'assistant', content: reply }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fs-assistant">
      <HeaderChrome compact />

      <div className="fs-ai-hero">
        <div className="fs-ai-avatar" aria-hidden>
          <Sparkles className="size-6" />
        </div>
        <div>
          <h1>{s.aiTitle}</h1>
          <div className="fs-ai-status">
            <i aria-hidden />
            {busy ? s.thinking : s.aiReady}
          </div>
        </div>
      </div>

      <div className="fs-bubble">{s.aiIntro}</div>

      {history.map((item, i) => (
        <div key={`${item.role}-${i}`} className={`fs-bubble ${item.role === 'user' ? 'user' : ''}`}>
          {item.content}
        </div>
      ))}

      {!history.length && (
        <>
          <div className="fs-suggest-label">{s.suggested}</div>
          <div className="fs-suggest">
            {suggestions.map((q) => (
              <button key={q} type="button" disabled={busy} onClick={() => void send(q)}>
                {q}
              </button>
            ))}
          </div>
        </>
      )}

      <form
        className="fs-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send(message);
        }}
      >
        <MessageCircle size={18} style={{ color: 'var(--muted)' }} aria-hidden />
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={s.askAnything}
          aria-label={s.askAnything}
          disabled={busy}
        />
        <button type="submit" aria-label={s.send} disabled={busy || !message.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
