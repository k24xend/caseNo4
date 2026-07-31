import { ChevronRight, Database, Globe2, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, dataMode } from '../../app/AppContext';
import { Page } from '../../components/Page';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { formatMoney, moneyInput, parseMoney } from '../../domain/money';
import type { Scenario } from '../../domain/models';
import { cn } from '../../lib/utils';

export function Profile() {
  const { settings, patch, data, repository, refresh, reset, setScenario } = useApp();
  const [amount, setAmount] = useState(moneyInput(settings.comfortBudget));
  const [stats, setStats] = useState({ pending: 0, failed: 0, total: 0 });
  useEffect(() => {
    void repository.queueStats().then(setStats);
  }, [settings.demoOffline, repository]);
  const categories = ['Кофе', 'Такси', 'Игры', 'Подписки', 'Снеки'];

  return (
    <Page title="Профиль" sub="Ваши правила, данные и комфорт">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <CardTitle>Неприкосновенный комфорт</CardTitle>
            </div>
            <p className="text-base font-semibold tabular-nums">
              {formatMoney(settings.comfortBudget, data?.currency ?? 'RUB')}
            </p>
          </div>
          <CardDescription>
            То, что помогает нормально жить и работать, не считается «плохим» расходом.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="comfort-limit">Мягкий лимит в месяц</Label>
            <Input
              id="comfort-limit"
              aria-label="Мягкий лимит в месяц"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                const value = parseMoney(e.target.value);
                if (value !== null) void patch({ comfortBudget: value });
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((x) => {
              const active = settings.protectedComfortCategories.includes(x);
              return (
                <Button
                  key={x}
                  type="button"
                  size="sm"
                  variant={active ? 'secondary' : 'outline'}
                  onClick={() =>
                    void patch({
                      protectedComfortCategories: active
                        ? settings.protectedComfortCategories.filter((v) => v !== x)
                        : [...settings.protectedComfortCategories, x],
                    })
                  }
                >
                  {x}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-base font-semibold">Внешний вид</h2>
        <div className="grid grid-cols-3 gap-2">
          {(['system', 'light', 'dark'] as const).map((x) => (
            <Button
              key={x}
              type="button"
              size="sm"
              variant={settings.theme === x ? 'default' : 'outline'}
              onClick={() => void patch({ theme: x })}
            >
              {x === 'light' ? <Sun className="h-4 w-4" /> : x === 'dark' ? <Moon className="h-4 w-4" /> : <span>◐</span>}
              {x === 'system' ? 'Система' : x === 'light' ? 'Светлая' : 'Тёмная'}
            </Button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Globe2 className="h-4 w-4" />
            Язык
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={settings.language === 'ru' ? 'secondary' : 'ghost'}
              onClick={() => void patch({ language: 'ru' })}
            >
              RU
            </Button>
            <Button
              type="button"
              size="sm"
              variant={settings.language === 'en' ? 'secondary' : 'ghost'}
              onClick={() => void patch({ language: 'en' })}
            >
              EN
            </Button>
          </div>
        </div>
      </Card>

      <Card className="divide-y divide-border overflow-hidden p-0">
        {(
          [
            ['/debts', 'Долги'],
            ['/transactions', 'Операции'],
            ['/scenarios', 'Сценарии'],
            ['/opportunities', 'Возможности'],
          ] as const
        ).map(([to, label]) => (
          <Link
            key={to}
            to={to}
            className="flex items-center justify-between px-6 py-4 text-sm font-medium hover:bg-accent"
          >
            {label}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </Card>

      {dataMode === 'demo' && (
        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Демо-данные</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['normal', 'critical', 'empty'] as Scenario[]).map((s) => (
              <Button
                key={s}
                type="button"
                size="sm"
                variant={settings.scenario === s ? 'default' : 'outline'}
                onClick={() => void setScenario(s)}
              >
                {s}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={settings.demoOffline ? 'secondary' : 'outline'}
              onClick={() => void patch({ demoOffline: !settings.demoOffline })}
            >
              Офлайн
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void refresh()}>
              Синхронизировать
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => void reset()}>
              Сброс
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Очередь: {stats.pending} pending · {stats.failed} failed · {stats.total} total
          </p>
        </Card>
      )}
    </Page>
  );
}
