import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { ApiRepository, DemoDataRepository, type DataRepository } from '../api/repository';
import type { AppSettings, DemoData, Scenario, ScenarioAdjustment } from '../domain/models';
import { getSettings, setSettings } from '../persistence/db';

export const dataMode = ((import.meta.env.VITE_DATA_MODE as string | undefined) ?? 'demo') as
  | 'demo'
  | 'api';
const repository: DataRepository =
  dataMode === 'demo' ? new DemoDataRepository() : new ApiRepository();
type Context = {
  settings: AppSettings;
  data?: DemoData;
  loading: boolean;
  error?: string;
  repository: DataRepository;
  refresh: () => Promise<void>;
  patch: (value: Partial<AppSettings>) => Promise<void>;
  setScenario: (value: Scenario) => Promise<void>;
  reset: () => Promise<void>;
  applyScenario: (value?: ScenarioAdjustment) => Promise<void>;
};
const AppContext = createContext<Context | null>(null);
const fallbackSettings: AppSettings = {
  version: 4,
  theme: 'system',
  colorScheme: 'mint',
  language: 'ru',
  demoOffline: false,
  demoError: false,
  scenario: 'normal',
  entered: false,
  resources: {
    phone: true,
    computer: false,
    hoursPerWeek: 8,
    skills: ['Тексты'],
    investmentLimit: 0,
  },
  guidanceMode: 'base',
  hardRiskLevel: 'moderate',
  primaryGoal: 'stability',
  secondaryGoals: [],
  comfortBudget: 840000,
  protectedComfortCategories: ['Кофе', 'Подписки'],
  notifications: false,
  advice: [],
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [settingsState, setSettingsState] = useState<AppSettings>();
  const [data, setData] = useState<DemoData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const settings = settingsState ?? fallbackSettings;
  const refresh = async () => {
    if (dataMode === 'api' && !settings.entered) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      setData(await repository.load({ error: settings.demoError, offline: settings.demoOffline }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void getSettings()
      .then(async (saved) => {
        setSettingsState(saved);
        if (dataMode === 'api' && saved.entered && !(await api.restore())) {
          const anonymous = { ...saved, entered: false };
          setSettingsState(anonymous);
          await setSettings(anonymous);
          return;
        }
        if (dataMode === 'demo' || saved.entered)
          setData(await repository.load({ offline: saved.demoOffline }));
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : 'Не удалось открыть данные'),
      )
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const dark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.scheme = settings.colorScheme ?? 'mint';
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.lang = settings.language;
    const names = { ru: 'ВЫХОД', en: 'EXIT', zh: '出路' } as const;
    document.title = names[settings.language] ?? names.en;
  }, [settings.theme, settings.language, settings.colorScheme]);
  useEffect(() => {
    if (dataMode === 'demo' && settingsState) void refresh();
  }, [settings.demoError]);
  useEffect(() => {
    const online = () => {
      if (!settings.demoOffline) void repository.sync(false).then(refresh);
    };
    addEventListener('online', online);
    return () => removeEventListener('online', online);
  }, [settings.demoOffline, settings.entered]);
  const patch = async (value: Partial<AppSettings>) => {
    const next = { ...settings, ...value };
    setSettingsState(next);
    await setSettings(next);
  };
  const setScenario = async (value: Scenario) => {
    if (dataMode !== 'demo') return;
    await patch({ scenario: value });
    setData(await repository.scenario(value));
  };
  const reset = async () => {
    await repository.reset();
    await patch({ scenario: 'normal', demoOffline: false, demoError: false });
    await refresh();
  };
  const applyScenario = async (value?: ScenarioAdjustment) => {
    if (!repository.applyScenario) return;
    const next = await repository.applyScenario(value);
    setData(next);
    await patch({ acceptedScenario: value });
  };
  const context = useMemo(
    () => ({
      settings,
      data,
      loading,
      error,
      repository,
      refresh,
      patch,
      setScenario,
      reset,
      applyScenario,
    }),
    [settings, data, loading, error],
  );
  return <AppContext.Provider value={context}>{children}</AppContext.Provider>;
}
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('AppProvider missing');
  return value;
}
