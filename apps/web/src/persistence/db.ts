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
  version: 2,
  theme: 'system',
  language: 'ru',
  demoOffline: false,
  demoError: false,
  scenario: 'normal',
  entered: false,
  resources: { phone: true, computer: false, hoursPerWeek: 8, skills: ['Тексты'], investmentLimit: 0 },
};
export function normalizeSettings(raw?: Partial<AppSettings>): AppSettings {
  const resources={...defaultSettings.resources,...raw?.resources};
  return { ...defaultSettings, ...raw, version:2, resources } as AppSettings;
}
export async function getSettings() {
  const value=normalizeSettings(await getRecord<Partial<AppSettings>>('settings'));
  await setRecord('settings',value); return value;
}
export const setSettings = (v: AppSettings) => setRecord('settings', v);
export async function clearUserData() {
  await db.transaction('rw', db.records, db.queue, async () => {
    await db.records.clear();
    await db.queue.clear();
  });
}
