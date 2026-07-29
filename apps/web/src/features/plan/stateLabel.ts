export const stateLabel = (s: string) =>
  ({
    critical: 'Кризис · защищаем базовые расходы',
    stabilization: 'Стабилизация',
    exit: 'Выход из долгов',
    buffer: 'Создание подушки',
    growth: 'Рост',
  })[s] ?? s;
