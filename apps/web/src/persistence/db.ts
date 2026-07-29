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
  theme: 'system',
  language: 'ru',
  demoOffline: false,
  demoError: false,
  scenario: 'normal',
  entered: false,
};
export async function getSettings() {
  return { ...defaultSettings, ...(await getRecord<Partial<AppSettings>>('settings')) };
}
export const setSettings = (v: AppSettings) => setRecord('settings', v);
export async function clearUserData() {
  await db.transaction('rw', db.records, db.queue, async () => {
    await db.records.clear();
    await db.queue.clear();
  });
}
