import { MessageCircle, Send, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { formatMoney } from '../../domain/money';

const suggestions = [
  'How much did I spend this week?',
  'Where is my budget going?',
  'How can I save more?',
  'Show my largest expenses',
];

export function Assistant() {
  const { data, settings } = useApp();
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [history, setHistory] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([]);

  const answer = (q: string) => {
    const available = data?.plan.snapshot.available_now ?? 0;
    const currency = data?.plan.currency ?? 'RUB';
    const spent = (data?.transactions || [])
      .filter((t) => t.kind === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    const text =
      settings.language === 'ru'
        ? `Сейчас доступно ${formatMoney(available, currency)}. Расходы в выборке: ${formatMoney(spent, currency)}. Я помогу разобрать «${q}» по уже посчитанному плану — без лишних обещаний.`
        : `You can spend ${formatMoney(available, currency)} now. Tracked expenses in this set: ${formatMoney(spent, currency)}. I can walk through “${q}” using your calculated plan — no guesswork.`;
    setHistory((h) => [...h, { role: 'user', text: q }, { role: 'ai', text }]);
    setReply(text);
    setMessage('');
  };

  return (
    <div className="mint-assistant">
      <header className="mint-assistant-head">
        <div className="mint-ai-ic">
          <Sparkles size={22} />
        </div>
        <div>
          <h1>AI Assistant</h1>
          <p>
            <span className="mint-dot" aria-hidden />
            Ready to help you improve
          </p>
        </div>
      </header>

      <div className="mint-bubble">
        Hi! I’m your Vyhod AI assistant. I can help you understand your finances, track spending
        patterns, and improve your savings. What would you like to know?
      </div>

      {history.map((item, i) => (
        <div
          key={`${item.role}-${i}`}
          className="mint-bubble"
          style={
            item.role === 'user'
              ? { marginLeft: 24, background: 'var(--mint-teal-pale)' }
              : undefined
          }
        >
          {item.text}
        </div>
      ))}

      {!reply && (
        <>
          <div className="mint-suggest-label">Suggested questions</div>
          <div className="mint-suggest">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => answer(s)}>
                {s}
              </button>
            ))}
          </div>
        </>
      )}

      <form
        className="mint-composer"
        onSubmit={(e) => {
          e.preventDefault();
          if (message.trim()) answer(message.trim());
        }}
      >
        <MessageCircle size={18} color="var(--mint-muted)" aria-hidden />
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask anything…"
          aria-label="Ask anything"
        />
        <button type="submit" aria-label="Send">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
