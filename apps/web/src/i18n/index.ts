export const copy = {
  ru: {
    today: 'Обзор',
    plan: 'План',
    transactions: 'Помощник',
    profile: 'Профиль',
    debts: 'Долги',
  },
  en: {
    today: 'Overview',
    plan: 'Plan',
    transactions: 'Assistant',
    profile: 'Profile',
    debts: 'Debts',
  },
} as const;
export const formatDate = (v: string, lang: 'ru' | 'en') =>
  new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(v));
