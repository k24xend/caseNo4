export const copy = {
  ru: {
    today: 'Сегодня',
    plan: 'План',
    transactions: 'Операции',
    profile: 'Профиль',
    debts: 'Долги',
  },
  en: {
    today: 'Today',
    plan: 'Plan',
    transactions: 'Transactions',
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
