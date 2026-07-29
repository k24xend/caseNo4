import { ArrowRight, Check, ChevronDown, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { ModeDial } from '../../components/ModeDial';
import { Page } from '../../components/Page';
import type { FinancialGoal } from '../../domain/models';
import { formatMoney } from '../../domain/money';

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
        <div className="empty-state">План загружается…</div>
      </Page>
    );
  const goal = goals.find((x) => x[0] === settings.primaryGoal)!;
  const toggleSecondary = (id: FinancialGoal) => {
    const exists = settings.secondaryGoals.includes(id);
    const next = exists
      ? settings.secondaryGoals.filter((x) => x !== id)
      : [...settings.secondaryGoals, id].slice(-2);
    void patch({ secondaryGoals: next });
  };
  return (
    <Page title="План" sub="Куда вы хотите прийти с деньгами?">
      <section className="plan-focus liquid-panel">
        <span className="eyebrow">Главная цель</span>
        <h2>{goal[1]}</h2>
        <p>{goal[2]}. Цифры плана рассчитываются детерминированно.</p>
        <details>
          <summary>
            Изменить цель <ChevronDown />
          </summary>
          <div className="goal-grid">
            {goals.map(([id, name, sub]) => (
              <button
                className={settings.primaryGoal === id ? 'active' : ''}
                onClick={() => void patch({ primaryGoal: id })}
                key={id}
              >
                <b>{name}</b>
                <small>{sub}</small>
                {settings.primaryGoal === id && <Check />}
              </button>
            ))}
          </div>
        </details>
      </section>
      <section className="mode-plan">
        <div>
          <small>Темп сопровождения</small>
          <h2>{settings.guidanceMode === 'base' ? 'Base · устойчиво' : 'Hard · интенсивно'}</h2>
          <p>Режим меняет приоритет и тон советов, но не финансовые факты.</p>
        </div>
        <ModeDial expanded={false} />
      </section>
      {settings.guidanceMode === 'hard' && (
        <section className="risk-section">
          <h2>Допустимый риск</h2>
          <p>Обязательные деньги и комфорт остаются защищены.</p>
          <div>
            {(
              [
                ['moderate', 'Умеренный'],
                ['high', 'Высокий'],
                ['extreme', 'Предельный'],
              ] as const
            ).map(([id, label]) => (
              <button
                className={settings.hardRiskLevel === id ? 'active' : ''}
                onClick={() => void patch({ hardRiskLevel: id })}
                key={id}
              >
                {label}
              </button>
            ))}
          </div>
          {settings.hardRiskLevel === 'extreme' && (
            <small>
              <Shield />
              Проверьте максимальную потерю и путь назад перед подтверждением.
            </small>
          )}
        </section>
      )}
      <section className="plan-numbers">
        <div>
          <small>Безопасно сегодня</small>
          <strong>{formatMoney(data.plan.snapshot.safe_daily_amount, data.currency)}</strong>
        </div>
        <div>
          <small>Свободный поток</small>
          <strong>{formatMoney(data.plan.snapshot.monthly_free_cash_flow, data.currency)}</strong>
        </div>
      </section>
      <section className="comfort-plan">
        <span>Неприкосновенный комфорт</span>
        <strong>{formatMoney(settings.comfortBudget, data.currency)}</strong>
        <p>Уважается и в Base, и в Hard.</p>
        <Link to="/profile">
          Настроить <ArrowRight />
        </Link>
      </section>
      <section className="what-if">
        <span className="eyebrow">Что если</span>
        <h2>Проверьте сценарий до решения</h2>
        <div>
          <Link to="/scenarios">
            Уйду во фриланс <ArrowRight />
          </Link>
          <Link to="/scenarios">
            Доход упадёт <ArrowRight />
          </Link>
          <Link to="/scenarios">
            Увеличу платёж <ArrowRight />
          </Link>
        </div>
        <small>Сценарий не меняет реальные данные до подтверждения.</small>
      </section>
      <details className="secondary-goals">
        <summary>
          Дополнительные цели · {settings.secondaryGoals.length}/2 <ChevronDown />
        </summary>
        {goals
          .filter((x) => x[0] !== settings.primaryGoal)
          .map(([id, name]) => (
            <label key={id}>
              <input
                type="checkbox"
                checked={settings.secondaryGoals.includes(id)}
                onChange={() => toggleSecondary(id)}
              />
              {name}
            </label>
          ))}
      </details>
      <Link className="row-link" to="/debts">
        <span>
          <b>Долги и стратегия</b>
          <small>Avalanche, snowball и свой порядок</small>
        </span>
        <ArrowRight />
      </Link>
    </Page>
  );
}
