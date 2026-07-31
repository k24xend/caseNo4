import { MessageCircle, Send, Snowflake } from 'lucide-react';
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
  const [history, setHistory] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([]);

  const answer = (q: string) => {
    const available = data?.plan.snapshot.available_now ?? 0;
    const currency = data?.plan.currency ?? 'RUB';
    const spent = (data?.transactions || [])
      .filter((t) => t.kind === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    const text =
      settings.language === 'ru'
        ? `Сейчас доступно ${formatMoney(available, currency)}. Расходы: ${formatMoney(spent, currency)}. Разберём «${q}» по уже посчитанному плану.`
        : `You can spend ${formatMoney(available, currency)} now. Tracked expenses: ${formatMoney(spent, currency)}. Let’s walk through “${q}” using your calculated plan.`;
    setHistory((h) => [...h, { role: 'user', text: q }, { role: 'ai', text }]);
    setMessage('');
  };

  return (
    <div className="fs-assistant">
      <header className="flex items-center gap-3">
        <div className="fs-icon-btn size-11">
          <Snowflake className="size-5 text-cyan-500" />
        </div>
        <div>
          <h1 className="m-0 text-[22px] font-semibold tracking-tight text-slate-950">AI Assistant</h1>
          <p className="m-0 text-xs text-slate-500">
            <span className="mr-1.5 inline-block size-2 rounded-full bg-cyan-500 shadow-[0_0_0_3px_rgba(6,182,212,0.2)]" />
            Ready to help you improve
          </p>
        </div>
      </header>

      <div className="fs-bubble">
        Hi! I’m your Vyhod AI assistant. I can help you understand your finances, track spending
        patterns, and improve your savings. What would you like to know?
      </div>

      {history.map((item, i) => (
        <div
          key={`${item.role}-${i}`}
          className="fs-bubble"
          style={
            item.role === 'user'
              ? { marginLeft: 20, background: 'rgba(6, 182, 212, 0.12)' }
              : undefined
          }
        >
          {item.text}
        </div>
      ))}

      {!history.length && (
        <>
          <div className="text-xs font-semibold text-slate-500">Suggested questions</div>
          <div className="fs-suggest">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => answer(s)}>
                {s}
              </button>
            ))}
          </div>
        </>
      )}

      <form
        className="fs-composer"
        onSubmit={(e) => {
          e.preventDefault();
          if (message.trim()) answer(message.trim());
        }}
      >
        <MessageCircle size={18} className="text-slate-500" aria-hidden />
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
