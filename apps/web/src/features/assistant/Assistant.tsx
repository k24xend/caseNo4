import { useMemo, useState } from 'react';
import { Archive, ArrowUp, RotateCcw, Search, WifiOff } from 'lucide-react';
import { useApp } from '../../app/AppContext';
import { Page } from '../../components/Page';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { cn } from '../../lib/utils';

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
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          <WifiOff className="h-4 w-4" />
          AI недоступен · план работает офлайн
        </div>
      )}

      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-primary">
            {settings.guidanceMode === 'base' ? 'Спокойный Base' : 'Интенсивный Hard'}
          </p>
          <CardTitle>С чего начнём?</CardTitle>
          <CardDescription>Спросите про доход, план или расходы. Ответ будет коротким.</CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap gap-2">
        {['Доход', 'План', 'Расходы'].map((x) => (
          <Button key={x} type="button" size="sm" variant="outline" onClick={() => setMessage(x)}>
            {x}
          </Button>
        ))}
      </div>

      {reply && (
        <Card className="bg-secondary p-4 text-sm leading-relaxed" aria-live="polite">
          {reply}
        </Card>
      )}

      <form
        className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Вопрос помощнику</span>
          <Input
            className="border-0 shadow-none focus-visible:ring-0"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Спросить о плане"
          />
        </label>
        <Button type="submit" size="icon" aria-label="Отправить">
          <ArrowUp className="h-4 w-4" />
        </Button>
      </form>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{archive ? 'Архив' : 'Рекомендации'}</h2>
        <Button type="button" variant="ghost" size="sm" onClick={() => setArchive(!archive)}>
          <Archive className="h-4 w-4" />
          {archive ? 'К активным' : 'Архив'}
        </Button>
      </div>

      {archive && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти совет"
            aria-label="Поиск в архиве"
          />
        </div>
      )}

      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {archive ? 'Архив пуст' : 'Активных рекомендаций нет'}
          </p>
        )}
        {items.map((item) => (
          <Card key={item.id} className="p-4">
            <h3 className="text-sm font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {archive ? (
                <Button type="button" size="sm" variant="outline" onClick={() => status(item.id, 'active')}>
                  <RotateCcw className="h-4 w-4" />
                  Вернуть
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => status(item.id, 'archived')}
                  >
                    Принять
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => status(item.id, 'hidden')}>
                    Не предлагать снова
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
}
