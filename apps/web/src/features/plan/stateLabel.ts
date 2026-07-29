export const stateLabel = (s: string) =>
  ({
    critical: 'Критическая ситуация',
    stabilization: 'Стабилизация',
    exit: 'Выход из долгов',
    buffer: 'Создание подушки',
    growth: 'Рост',
  })[s] ?? s;
