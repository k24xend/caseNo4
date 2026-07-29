import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { dataMode, useApp } from '../../app/AppContext';
import { Button, Card } from '../../components/ui';
import { Page } from '../../components/Page';
import type { Scenario } from '../../domain/models';
import { clearUserData } from '../../persistence/db';
export function Profile() {
  const { settings, patch, setScenario, reset, refresh, repository } = useApp();
  const [stats, setStats] = useState({ pending: 0, failed: 0, total: 0 });
  useEffect(() => {
    void repository.queueStats().then(setStats);
  }, [settings.demoOffline]);
  const sync = async () => {
    await repository.sync(settings.demoOffline);
    await refresh();
    setStats(await repository.queueStats());
  };
  return (
    <Page title="Профиль" sub="Настройки и состояние приложения">
      <Card><h3>Разделы</h3><div className="hub-grid"><Link to="/debts">Долги</Link><Link to="/scenarios">Сценарии</Link><Link to="/opportunities">Возможности</Link><Link to="/transactions">Операции</Link></div></Card>
      <Card><h3>Ресурсы для подработки</h3><label className="check"><input type="checkbox" checked={settings.resources?.phone??false} onChange={e=>patch({resources:{...settings.resources!,phone:e.target.checked}})}/> Есть смартфон</label><label className="check"><input type="checkbox" checked={settings.resources?.computer??false} onChange={e=>patch({resources:{...settings.resources!,computer:e.target.checked}})}/> Есть компьютер</label><label className="field"><span>Часов в неделю</span><input aria-label="Часов в неделю" type="number" min="0" max="40" value={settings.resources?.hoursPerWeek??0} onChange={e=>patch({resources:{...settings.resources!,hoursPerWeek:Number(e.target.value)}})}/></label></Card>
      <Card>
        <div className="setting">
          <span>
            <b>Режим данных</b>
            <small>{dataMode === 'demo' ? 'Вымышленный demo-набор' : 'FastAPI'}</small>
          </span>
          <span className="demo-pill">{dataMode.toUpperCase()}</span>
        </div>
        <div className="setting">
          <span>
            <b>Сеть</b>
            <small>navigator.onLine — только подсказка</small>
          </span>
          <b>{settings.demoOffline ? 'Офлайн' : 'Онлайн'}</b>
        </div>
        <div className="setting">
          <span>
            <b>Очередь</b>
            <small>
              {stats.pending} ожидает · {stats.failed} ошибок
            </small>
          </span>
          <Button className="tiny" onClick={sync}>
            Синхронизировать
          </Button>
        </div>
      </Card>
      <Card>
        <h3>Внешний вид</h3>
        <div className="theme-picker">
          {(['system', 'light', 'dark'] as const).map((x) => (
            <button
              className={settings.theme === x ? 'active' : ''}
              key={x}
              onClick={() => patch({ theme: x })}
            >
              {x === 'light' ? <Sun /> : x === 'dark' ? <Moon /> : <span>◐</span>}
              {x === 'system' ? 'Система' : x === 'light' ? 'Светлая' : 'Тёмная'}
            </button>
          ))}
        </div>
        <div className="setting">
          <b>Язык</b>
          <div className="chips">
            <button
              className={settings.language === 'ru' ? 'active' : ''}
              onClick={() => patch({ language: 'ru' })}
            >
              RU
            </button>
            <button
              className={settings.language === 'en' ? 'active' : ''}
              onClick={() => patch({ language: 'en' })}
            >
              EN
            </button>
          </div>
        </div>
      </Card>
      <Card>
        <h3>Управление демо</h3>
        <label className="setting">
          <span>
            <b>Искусственный offline</b>
            <small>Новые записи попадут в очередь</small>
          </span>
          <input
            className="switch"
            type="checkbox"
            checked={settings.demoOffline}
            onChange={(e) => patch({ demoOffline: e.target.checked })}
          />
        </label>
        <label className="setting">
          <span>
            <b>Искусственная ошибка</b>
            <small>Проверка error state</small>
          </span>
          <input
            className="switch"
            type="checkbox"
            checked={settings.demoError}
            onChange={(e) => patch({ demoError: e.target.checked })}
          />
        </label>
        <label className="field">
          <span>Сценарий</span>
          <select
            value={settings.scenario}
            onChange={(e) => setScenario(e.target.value as Scenario)}
          >
            <option value="normal">Normal</option>
            <option value="critical">Critical</option>
            <option value="empty">Empty</option>
          </select>
        </label>
        <Button className="secondary" onClick={reset}>
          Сбросить demo-данные
        </Button>
      </Card>
      <Card>
        <h3>Установка на iPhone</h3>
        <p>В Safari нажмите «Поделиться» → «На экран Домой».</p>
        <small>
          {matchMedia('(display-mode: standalone)').matches
            ? 'Приложение запущено с экрана Домой'
            : 'Открыто в браузере'}
        </small>
      </Card>
      <Card>
        <h3>О приложении</h3>
        <p>Версия 0.1.0 · портфолио preview</p>
        <p className="muted">
          Не банк и не платёжный сервис. Данные вводятся вручную. Расчёты не являются гарантией
          результата.
        </p>
      </Card>
      <Button
        className="secondary"
        onClick={async () => {
          if (dataMode === 'api') await api.logout();
          await clearUserData();
          sessionStorage.clear();
          await patch({ entered: false });
          location.href = '/';
        }}
      >
        Выйти и очистить данные
      </Button>
    </Page>
  );
}
