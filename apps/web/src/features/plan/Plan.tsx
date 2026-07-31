import { ArrowRight, Check, ChevronDown, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { Page } from '../../components/Page';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import type { FinancialGoal } from '../../domain/models';
import { formatMoney } from '../../domain/money';
import { cn } from '../../lib/utils';

const goals: Array<[FinancialGoal, string, string]> = [
  ['stability', 'Стабильность', 'Подушка и спокойный ритм'],
  ['debt_free', 'Выйти из минуса', 'Закрыть долги без стыда'],
  ['income', 'Увеличить доход', 'Найти устойчивый прирост'],
  ['freelance', 'Фриланс', 'Проверить переход'],
  ['business', 'Своё дело', 'Тестировать спрос'],
  ['capital', 'Капитал', 'Резерв и инвестиции'],
  ['custom', 'Своя комбинация', 'Собрать личный путь'],
];

export function Plan() {
  const { data, settings, patch } = useApp();
  if (!data)
    return (
      <Page title="План">
        <p className="text-sm text-muted-foreground">План загружается…</p>
      </Page>
    );

  const goal = goals.find((x) => x[0] === settings.primaryGoal)!;

  return (
    <Page title="План" sub="Куда вы хотите прийти с деньгами?">
      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-primary">Главная цель</p>
          <CardTitle>{goal[1]}</CardTitle>
          <CardDescription>
            {goal[2]}. Цифры плана рассчитываются детерминированно.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-primary">
              Изменить цель
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <div className="mt-4 space-y-2">
              {goals.map(([id, name, sub]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => void patch({ primaryGoal: id })}
                  className={cn(
                    'flex w-full items-start justify-between gap-3 rounded-lg border border-border px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    settings.primaryGoal === id && 'border-primary bg-secondary',
                  )}
                >
                  <span>
                    <b className="block text-sm font-semibold">{name}</b>
                    <small className="text-sm text-muted-foreground">{sub}</small>
                  </span>
                  {settings.primaryGoal === id && <Check className="mt-1 h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
          </details>
        </CardContent>
      </Card>

      <Card className="border-white/60 bg-card/80 shadow-glass backdrop-blur">
        <CardHeader>
          <p className="text-sm text-muted-foreground">Темп сопровождения</p>
          <CardTitle>
            {settings.guidanceMode === 'base' ? 'Base · устойчиво' : 'Hard · интенсивно'}
          </CardTitle>
          <CardDescription>
            Режим меняет приоритет и тон советов, но не финансовые факты. Переключение — в шапке
            (Base).
          </CardDescription>
        </CardHeader>
      </Card>

      {settings.guidanceMode === 'hard' && (
        <Card className="space-y-4 p-6">
          <div className="space-y-2">
            <h2 className="text-base font-semibold">Допустимый риск</h2>
            <p className="text-sm text-muted-foreground">
              Обязательные деньги и комфорт остаются защищены.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['moderate', 'Умеренный'],
                ['high', 'Высокий'],
                ['extreme', 'Предельный'],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={settings.hardRiskLevel === id ? 'default' : 'outline'}
                onClick={() => void patch({ hardRiskLevel: id })}
              >
                {label}
              </Button>
            ))}
          </div>
          {settings.hardRiskLevel === 'extreme' && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Shield className="mt-0.5 h-4 w-4 shrink-0" />
              Проверьте максимальную потерю и путь назад перед подтверждением.
            </p>
          )}
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Безопасно сегодня</p>
          <p className="mt-2 text-base font-semibold tabular-nums">
            {formatMoney(data.plan.snapshot.safe_daily_amount, data.currency)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Свободный поток</p>
          <p className="mt-2 text-base font-semibold tabular-nums">
            {formatMoney(data.plan.snapshot.monthly_free_cash_flow, data.currency)}
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Неприкосновенный комфорт</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums">
          {formatMoney(settings.comfortBudget, data.currency)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">Уважается и в Base, и в Hard.</p>
        <Button asChild variant="link" className="mt-2 h-auto px-0">
          <Link to="/profile">
            Настроить <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </Card>

      <Card className="p-6">
        <p className="text-sm font-medium text-primary">Что если</p>
        <h2 className="mt-2 text-base font-semibold">Проверьте сценарий до решения</h2>
        <div className="mt-4 divide-y divide-border">
          <Link
            to="/scenarios"
            className="flex items-center justify-between py-3 text-sm font-medium hover:text-primary"
          >
            Уйду во фриланс <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/opportunities"
            className="flex items-center justify-between py-3 text-sm font-medium hover:text-primary"
          >
            Возможности <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>
    </Page>
  );
}
