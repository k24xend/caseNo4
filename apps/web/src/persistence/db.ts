import Dexie, { type Table } from 'dexie';
import type { AppSettings, DemoData, OnboardingDraft, QueuedMutation } from '../domain/models';
interface RecordValue {
  key: string;
  value: unknown;
}
class VyhodDB extends Dexie {
  records!: Table<RecordValue, string>;
  queue!: Table<QueuedMutation, string>;
  constructor() {
    super('vyhod-web');
    this.version(1).stores({ records: 'key', queue: 'id,status,createdAt,nextAttemptAt' });
    this.version(2).stores({ records: 'key', queue: 'id,status,entityId,createdAt,nextAttemptAt' });
  }
}
export const db = new VyhodDB();
export async function getRecord<T>(key: string): Promise<T | undefined> {
  return (await db.records.get(key))?.value as T | undefined;
}
export async function setRecord(key: string, value: unknown) {
  await db.records.put({ key, value });
}
export const getDemo = () => getRecord<DemoData>('demo');
export const setDemo = (v: DemoData) => setRecord('demo', v);
export const getDraft = () => getRecord<OnboardingDraft>('onboarding');
export const setDraft = (v: OnboardingDraft) => setRecord('onboarding', v);
export const defaultSettings: AppSettings = {
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
  advice: [
    {
      id: 'income-focus',
      topic: 'income',
      title: 'Проверьте один источник дохода',
      body: 'Выберите действие на 30 минут: обновить портфолио или написать одному клиенту.',
      status: 'active',
      updatedAt: new Date(0).toISOString(),
    },
    {
      id: 'plan-review',
      topic: 'plan',
      title: 'Сверьте ближайший платёж',
      body: 'Проверьте дату и сумму — менять финансовые данные без подтверждения не будем.',
      status: 'active',
      updatedAt: new Date(0).toISOString(),
    },
  ],
};
export function normalizeSettings(raw?: Partial<AppSettings>): AppSettings {
  const resources = { ...defaultSettings.resources, ...raw?.resources };
  return {
    ...defaultSettings,
    ...raw,
    version: 4,
    colorScheme: raw?.colorScheme ?? defaultSettings.colorScheme,
    resources,
    advice: raw?.advice ?? defaultSettings.advice,
  } as AppSettings;
}
export async function getSettings() {
  const value = normalizeSettings(await getRecord<Partial<AppSettings>>('settings'));
  await setRecord('settings', value);
  return value;
}
export const setSettings = (v: AppSettings) => setRecord('settings', v);
export async function clearUserData() {
  await db.transaction('rw', db.records, db.queue, async () => {
    await db.records.clear();
    await db.queue.clear();
  });
}
