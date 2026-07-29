import { Bell, ChevronRight, Database, Globe2, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, dataMode } from '../../app/AppContext';
import { Button } from '../../components/ui';
import { Page } from '../../components/Page';
import { formatMoney, moneyInput, parseMoney } from '../../domain/money';
import type { Scenario } from '../../domain/models';

export function Profile() {
  const { settings, patch, data, repository, refresh, reset, setScenario } = useApp();
  const [amount, setAmount] = useState(moneyInput(settings.comfortBudget));
  const [stats, setStats] = useState({ pending: 0, failed: 0, total: 0 });
  useEffect(() => {
    void repository.queueStats().then(setStats);
  }, [settings.demoOffline]);
  const categories = ['Кофе', 'Такси', 'Игры', 'Подписки', 'Снеки'];
  return (
    <Page title="Профиль" sub="Ваши правила, данные и комфорт">
      <section className="profile-section">
        <div className="section-heading">
          <span>
            <ShieldCheck />
            <b>Неприкосновенный комфорт</b>
          </span>
          <strong>{formatMoney(settings.comfortBudget, data?.currency ?? 'RUB')}</strong>
        </div>
        <p>То, что помогает нормально жить и работать, не считается «плохим» расходом.</p>
        <label className="field">
          <span>Мягкий лимит в месяц</span>
          <input
            aria-label="Мягкий лимит в месяц"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              const value = parseMoney(e.target.value);
              if (value !== null) void patch({ comfortBudget: value });
            }}
          />
        </label>
        <div className="comfort-chips">
          {categories.map((x) => (
            <button
              className={settings.protectedComfortCategories.includes(x) ? 'active' : ''}
              key={x}
              onClick={() =>
                void patch({
                  protectedComfortCategories: settings.protectedComfortCategories.includes(x)
                    ? settings.protectedComfortCategories.filter((v) => v !== x)
                    : [...settings.protectedComfortCategories, x],
                })
              }
            >
              {settings.protectedComfortCategories.includes(x) && <CheckIcon />}
              {x}
            </button>
          ))}
        </div>
        <div className="comfort-actions">
          <button>Оставить</button>
          <button>Сократить временно</button>
        </div>
      </section>
      <section className="profile-section">
        <h2>Внешний вид</h2>
        <div className="theme-picker">
          {(['system', 'light', 'dark'] as const).map((x) => (
            <button
              className={settings.theme === x ? 'active' : ''}
              onClick={() => void patch({ theme: x })}
              key={x}
            >
              {x === 'light' ? <Sun /> : x === 'dark' ? <Moon /> : <span>◐</span>}
              {x === 'system' ? 'Система' : x === 'light' ? 'Светлая' : 'Тёмная'}
            </button>
          ))}
        </div>
        <div className="setting">
          <span>
            <Globe2 />
            <b>Язык</b>
          </span>
          <div className="chips">
            <button
              className={settings.language === 'ru' ? 'active' : ''}
              onClick={() => void patch({ language: 'ru' })}
            >
              RU
            </button>
            <button
              className={settings.language === 'en' ? 'active' : ''}
              onClick={() => void patch({ language: 'en' })}
            >
              EN
            </button>
          </div>
        </div>
      </section>
      <section className="profile-section profile-links">
        <label>
          <span>
            <Bell />
            <b>Напоминания</b>
          </span>
          <input
            className="switch"
            type="checkbox"
            checked={settings.notifications}
            onChange={(e) => void patch({ notifications: e.target.checked })}
          />
        </label>
        <button>
          <span>
            <Database />
            <b>Данные и приватность</b>
          </span>
          <ChevronRight />
        </button>
        <Link to="/transactions">
          <span>
            <Database />
            <b>Операции</b>
          </span>
          <ChevronRight />
        </Link>
      </section>
      <details className="demo-settings">
        <summary>Демо и диагностика</summary>
        <p>
          {dataMode === 'demo' ? 'Вымышленный demo-набор' : 'FastAPI'} · очередь: {stats.pending}{' '}
          ожидает, {stats.failed} ошибок
        </p>
        <label>
          <span>Искусственный offline</span>
          <input
            type="checkbox"
            checked={settings.demoOffline}
            onChange={(e) => void patch({ demoOffline: e.target.checked })}
          />
        </label>
        <label>
          <span>Искусственная ошибка</span>
          <input
            type="checkbox"
            checked={settings.demoError}
            onChange={(e) => void patch({ demoError: e.target.checked })}
          />
        </label>
        <label className="field">
          <span>Сценарий</span>
          <select
            value={settings.scenario}
            onChange={(e) => void setScenario(e.target.value as Scenario)}
          >
            <option value="normal">Normal</option>
            <option value="critical">Critical</option>
            <option value="empty">Empty</option>
          </select>
        </label>
        <Button
          onClick={async () => {
            await repository.sync(settings.demoOffline);
            await refresh();
          }}
        >
          Синхронизировать
        </Button>
        <Button className="secondary" onClick={reset}>
          Сбросить demo-данные
        </Button>
      </details>
      <p className="privacy-note">
        Финансовые числа считает локальный детерминированный движок. Помощник не может менять баланс
        без подтверждения.
      </p>
    </Page>
  );
}
function CheckIcon() {
  return <span aria-hidden="true">✓</span>;
}
