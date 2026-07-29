import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '../../api/client';
import { dataMode, useApp } from '../../app/AppContext';
import { Banner, Button, Field } from '../../components/ui';
export function Welcome() {
  const { patch, settings } = useApp();
  const [mode, setMode] = useState<'welcome' | 'login' | 'register'>('welcome');
  const [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const schema = z.object({
    email: z.string().email('Введите корректный email'),
    password: z.string().min(8, 'Минимум 8 символов'),
  });
  type F = z.infer<typeof schema>;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<F>({ resolver: zodResolver(schema) });
  const demo = async () => {
    await patch({ entered: true });
    location.assign('/today');
  };
  const submit = handleSubmit(async (v) => {
    setBusy(true);
    setError('');
    try {
      await api.auth(mode === 'login' ? 'login' : 'register', v.email, v.password);
      await patch({ entered: true });
      location.assign(mode === 'register' ? '/onboarding' : '/today');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  });
  return (
    <div className="welcome">
      <div className="brand-symbol" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <p className="eyebrow">Финансовый навигатор</p>
      <h1>ВЫХОД</h1>
      <h2>
        Не просто считай расходы.
        <br />
        Найди путь наружу.
      </h2>
      <p className="muted">Спокойный план на сегодня — без стыда, сложных таблиц и обещаний.</p>
      {mode === 'welcome' ? (
        <div className="welcome-actions">
          <Button onClick={demo}>Открыть демо</Button>
          <Button className="secondary" onClick={() => location.assign('/onboarding')}>
            Пройти диагностику
          </Button>
          {dataMode === 'api' && (
            <>
              <Button className="secondary" onClick={() => setMode('login')}>
                Войти
              </Button>
              <button className="text-button" onClick={() => setMode('register')}>
                Создать аккаунт
              </button>
            </>
          )}
          <button
            className="lang"
            onClick={() => patch({ language: settings.language === 'ru' ? 'en' : 'ru' })}
          >
            {settings.language.toUpperCase()}
          </button>
          <small>Демо использует вымышленные данные и работает без банка</small>
        </div>
      ) : (
        <form onSubmit={submit} className="auth-form">
          <button type="button" className="back" onClick={() => setMode('welcome')}>
            <ArrowLeft />
            Назад
          </button>
          <h3>{mode === 'login' ? 'Вход' : 'Регистрация'}</h3>
          <Field
            label="Email"
            autoComplete="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <div className="password">
            <Field
              label="Пароль"
              type={show ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              {...register('password')}
              error={errors.password?.message}
            />
            <button type="button" aria-label="Показать пароль" onClick={() => setShow(!show)}>
              {show ? <EyeOff /> : <Eye />}
            </button>
          </div>
          {error && <Banner kind="danger">{error}</Banner>}
          <Button disabled={busy}>
            {busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Продолжить'}
          </Button>
        </form>
      )}
    </div>
  );
}
