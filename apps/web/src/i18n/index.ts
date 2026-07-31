import type { AppLanguage } from '../domain/models';

export type UiStrings = {
  home: string;
  assistant: string;
  history: string;
  profile: string;
  brandTag: string;
  difficulty: string;
  choosePace: string;
  basic: string;
  hard: string;
  financialProgress: string;
  balanceImproving: string;
  availableToSpend: string;
  thisMonth: string;
  stable: string;
  moneyCategories: string;
  whereBudgetGoes: string;
  edit: string;
  shopping: string;
  foodDrink: string;
  historyTitle: string;
  historySub: string;
  totalIncome: string;
  totalSpent: string;
  thisWeek: string;
  searchTx: string;
  noTx: string;
  trySearch: string;
  aiTitle: string;
  aiReady: string;
  aiIntro: string;
  suggested: string;
  askAnything: string;
  send: string;
  thinking: string;
  offlineDemo: string;
  theme: string;
  language: string;
  colorScheme: string;
  light: string;
  dark: string;
  system: string;
  close: string;
  weekDays: [string, string, string, string, string, string, string];
  qSpendWeek: string;
  qBudget: string;
  qSave: string;
  qLargest: string;
};

const ru: UiStrings = {
  home: 'Home',
  assistant: 'Assistant',
  history: 'History',
  profile: 'Профиль',
  brandTag: 'Track money, improve balance',
  difficulty: 'Difficulty',
  choosePace: 'Choose your pace',
  basic: 'Basic',
  hard: 'Hard',
  financialProgress: 'Financial progress',
  balanceImproving: 'Your balance is improving',
  availableToSpend: 'Available to spend',
  thisMonth: 'This month',
  stable: 'Stable',
  moneyCategories: 'Money categories',
  whereBudgetGoes: 'Where your budget goes',
  edit: 'Edit',
  shopping: 'Shopping',
  foodDrink: 'Food & Drink',
  historyTitle: 'History',
  historySub: 'All transactions and trends',
  totalIncome: 'Total Income',
  totalSpent: 'Total Spent',
  thisWeek: 'This week',
  searchTx: 'Search transactions…',
  noTx: 'No transactions',
  trySearch: 'Try another search',
  aiTitle: 'AI Assistant',
  aiReady: 'Ready to help',
  aiIntro:
    'Привет! Я финансовый ассистент Vyhod. Вижу ваши расходы, категории и доступный баланс — спрашивайте на русском или English.',
  suggested: 'Suggested questions',
  askAnything: 'Ask anything…',
  send: 'Send',
  thinking: 'Thinking…',
  offlineDemo: 'Offline demo',
  theme: 'Theme',
  language: 'Language',
  colorScheme: 'Color',
  light: 'Light',
  dark: 'Dark',
  system: 'System',
  close: 'Close',
  weekDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  qSpendWeek: 'How much did I spend this week?',
  qBudget: 'Where is my budget going?',
  qSave: 'How can I save more?',
  qLargest: 'Show my largest expenses',
};

const en: UiStrings = {
  ...ru,
  profile: 'Profile',
  brandTag: 'Track money, improve balance',
  aiIntro:
    "Hi! I'm your Vyhod finance assistant. I can see your spending, categories, and available balance — ask in English or Russian.",
};

const zh: UiStrings = {
  home: '首页',
  assistant: '助手',
  history: '历史',
  profile: '资料',
  brandTag: '记录支出，改善余额',
  difficulty: '难度',
  choosePace: '选择节奏',
  basic: '基础',
  hard: '进阶',
  financialProgress: '财务进展',
  balanceImproving: '您的余额正在改善',
  availableToSpend: '可支出金额',
  thisMonth: '本月',
  stable: '稳定',
  moneyCategories: '支出分类',
  whereBudgetGoes: '预算去向',
  edit: '编辑',
  shopping: '购物',
  foodDrink: '餐饮',
  historyTitle: '历史记录',
  historySub: '全部交易与趋势',
  totalIncome: '总收入',
  totalSpent: '总支出',
  thisWeek: '本周',
  searchTx: '搜索交易…',
  noTx: '暂无交易',
  trySearch: '试试其他关键词',
  aiTitle: 'AI 助手',
  aiReady: '随时为您服务',
  aiIntro: '您好！我是 Vyhod 财务助手。我了解您的支出、分类与可用余额——可用中文、俄语或英语提问。',
  suggested: '推荐问题',
  askAnything: '随便问…',
  send: '发送',
  thinking: '思考中…',
  offlineDemo: '离线演示',
  theme: '主题',
  language: '语言',
  colorScheme: '配色',
  light: '浅色',
  dark: '深色',
  system: '系统',
  close: '关闭',
  weekDays: ['一', '二', '三', '四', '五', '六', '日'],
  qSpendWeek: '这周花了多少钱？',
  qBudget: '预算都花在哪了？',
  qSave: '如何多存一些？',
  qLargest: '最大的支出是什么？',
};

// Home/nav labels stay brand-English on RU for Screen3 look; full UI i18n for zh/en content elsewhere
export const strings: Record<AppLanguage, UiStrings> = {
  ru: {
    ...ru,
    home: 'Главная',
    assistant: 'Ассистент',
    history: 'История',
    brandTag: 'Считай деньги, улучшай баланс',
    difficulty: 'Режим',
    choosePace: 'Выберите темп',
    basic: 'Базовый',
    hard: 'Жёсткий',
    financialProgress: 'Финансовый прогресс',
    balanceImproving: 'Баланс улучшается',
    availableToSpend: 'Можно потратить',
    thisMonth: 'В этом месяце',
    stable: 'Стабильно',
    moneyCategories: 'Категории трат',
    whereBudgetGoes: 'Куда уходит бюджет',
    edit: 'Изменить',
    shopping: 'Покупки',
    foodDrink: 'Еда и напитки',
    historyTitle: 'История',
    historySub: 'Все операции и тренды',
    totalIncome: 'Доход',
    totalSpent: 'Расход',
    thisWeek: 'На этой неделе',
    searchTx: 'Поиск операций…',
    noTx: 'Операций нет',
    trySearch: 'Попробуйте другой запрос',
    aiTitle: 'AI-ассистент',
    aiReady: 'Готов помочь',
    suggested: 'Подсказки',
    askAnything: 'Спросите что угодно…',
    send: 'Отправить',
    thinking: 'Думаю…',
    offlineDemo: 'Офлайн-демо',
    theme: 'Тема',
    language: 'Язык',
    colorScheme: 'Палитра',
    light: 'Светлая',
    dark: 'Тёмная',
    system: 'Система',
    close: 'Закрыть',
    weekDays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    qSpendWeek: 'Сколько я потратил на этой неделе?',
    qBudget: 'Куда уходит бюджет?',
    qSave: 'Как откладывать больше?',
    qLargest: 'Покажи крупнейшие траты',
  },
  en,
  zh,
};

export function t(lang: AppLanguage): UiStrings {
  return strings[lang] ?? strings.en;
}

export const formatDate = (v: string, lang: AppLanguage) =>
  new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : lang === 'zh' ? 'zh-CN' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(v));

export const colorSchemes: Array<{ id: import('../domain/models').ColorSchemeId; label: string }> = [
  { id: 'mint', label: 'Mint' },
  { id: 'sky', label: 'Sky' },
  { id: 'sage', label: 'Sage' },
  { id: 'lavender', label: 'Lavender' },
  { id: 'sand', label: 'Sand' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'rose', label: 'Rose' },
  { id: 'slate', label: 'Slate' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'graphite', label: 'Graphite' },
];
