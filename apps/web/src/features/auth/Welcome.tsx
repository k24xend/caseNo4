import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '../../api/client';
import { dataMode, useApp } from '../../app/AppContext';
import { Banner, Field } from '../../components/ui';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';

export function Welcome() {
  const { patch, settings } = useApp();
  const [mode, setMode] = useState<'welcome' | 'login' | 'register'>('welcome');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
    <div className="welcome-mint mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 px-4 py-8">
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card text-base font-semibold text-primary shadow-sm">
          В
        </div>
        <p className="text-sm font-medium text-muted-foreground">Финансовый навигатор</p>
        <h1 className="text-3xl font-semibold tracking-tight">ВЫХОД</h1>
        <p className="text-base font-medium leading-relaxed text-foreground">
          Не просто считай расходы.
          <br />
          Найди путь наружу.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Спокойный план на сегодня — без стыда, сложных таблиц и обещаний.
        </p>
      </div>

      {mode === 'welcome' ? (
        <div className="space-y-3">
          <Button className="w-full" size="lg" onClick={demo}>
            Открыть демо
          </Button>
          <Button
            className="w-full"
            size="lg"
            variant="secondary"
            onClick={() => location.assign('/onboarding')}
          >
            Пройти диагностику
          </Button>
          {dataMode === 'api' && (
            <>
              <Button className="w-full" variant="outline" onClick={() => setMode('login')}>
                Войти
              </Button>
              <Button className="w-full" variant="ghost" onClick={() => setMode('register')}>
                Создать аккаунт
              </Button>
            </>
          )}
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => patch({ language: settings.language === 'ru' ? 'en' : 'ru' })}
            >
              {settings.language.toUpperCase()}
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Демо использует вымышленные данные и работает без банка
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Button type="button" size="icon" variant="ghost" onClick={() => setMode('welcome')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle>{mode === 'login' ? 'Вход' : 'Регистрация'}</CardTitle>
                <CardDescription>API-режим</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              {error && <Banner kind="danger">{error}</Banner>}
              <Field label="Email" type="email" error={errors.email?.message} {...register('email')} />
              <div className="relative">
                <Field
                  label="Пароль"
                  type={show ? 'text' : 'password'}
                  error={errors.password?.message}
                  {...register('password')}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-7"
                  onClick={() => setShow((v) => !v)}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button className="w-full" disabled={busy} type="submit">
                {busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
