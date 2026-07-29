import { useMemo, useState } from 'react';
import { Archive, ArrowUp, RotateCcw, Search, WifiOff } from 'lucide-react';
import { useApp } from '../../app/AppContext';
import { Page } from '../../components/Page';

export function Assistant() {
  const { settings, patch } = useApp();
  const [archive, setArchive] = useState(false);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const items = useMemo(
    () =>
      settings.advice.filter(
        (x) =>
          (archive ? x.status === 'archived' : x.status === 'active') &&
          x.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [settings.advice, archive, query],
  );
  const status = (id: string, next: 'hidden' | 'archived' | 'active') =>
    void patch({
      advice: settings.advice.map((x) =>
        x.id === id ? { ...x, status: next, updatedAt: new Date().toISOString() } : x,
      ),
    });
  const ask = () => {
    if (!message.trim()) return;
    setReply(
      settings.demoOffline
        ? 'Помощник сейчас офлайн. Ваш последний план сохранён; финансовые расчёты продолжают работать.'
        : `Коротко: ${settings.guidanceMode === 'base' ? 'сначала защитим обязательства и комфорт' : 'проверим риск, допустимую потерю и путь назад'}. Числа берутся только из рассчитанного плана.`,
    );
    setMessage('');
  };
  return (
    <Page title="Помощник" sub="Объясняет расчёты, но не меняет деньги">
      {settings.demoOffline && (
        <div className="status-banner">
          <WifiOff />
          AI недоступен · план работает офлайн
        </div>
      )}
      <div className="assistant-intro liquid-panel">
        <span className="lens-dot" />
        <div>
          <small>{settings.guidanceMode === 'base' ? 'Спокойный Base' : 'Интенсивный Hard'}</small>
          <h2>С чего начнём?</h2>
          <p>Спросите про доход, план или расходы. Ответ будет коротким.</p>
        </div>
      </div>
      <div className="quick-topics">
        {['Доход', 'План', 'Расходы'].map((x) => (
          <button key={x} onClick={() => setMessage(x)}>
            {x}
          </button>
        ))}
      </div>
      {reply && (
        <div className="chat-reply" aria-live="polite">
          {reply}
        </div>
      )}
      <form
        className="ask-bar"
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
      >
        <label>
          <span className="sr-only">Вопрос помощнику</span>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Спросить о плане"
          />
        </label>
        <button aria-label="Отправить">
          <ArrowUp />
        </button>
      </form>
      <div className="advice-header">
        <h2>{archive ? 'Архив' : 'Рекомендации'}</h2>
        <button onClick={() => setArchive(!archive)}>
          <Archive />
          {archive ? 'К активным' : 'Архив'}
        </button>
      </div>
      {archive && (
        <label className="search">
          <Search />
          <span className="sr-only">Поиск в архиве</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти совет"
          />
        </label>
      )}
      <div className="advice-list">
        {items.length ? (
          items.map((item) => (
            <article key={item.id}>
              <small>
                {item.topic === 'income' ? 'Доход' : item.topic === 'plan' ? 'План' : 'Расходы'}
              </small>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <div>
                {archive ? (
                  <button onClick={() => status(item.id, 'active')}>
                    <RotateCcw />
                    Вернуть
                  </button>
                ) : (
                  <>
                    <button className="primary-mini">Открыть</button>
                    <button onClick={() => status(item.id, 'hidden')}>Скрыть</button>
                    <button onClick={() => status(item.id, 'archived')}>Не предлагать снова</button>
                  </>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <Archive />
            <h3>{archive ? 'Архив пуст' : 'На сегодня всё'}</h3>
            <p>
              {archive
                ? 'Скрытые навсегда советы появятся здесь.'
                : 'Новых советов нет — можно вернуться позже.'}
            </p>
          </div>
        )}
      </div>
    </Page>
  );
}
