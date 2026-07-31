import { useState } from 'react';
import { Page } from '../../components/Page';
import { Banner } from '../../components/ui';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useApp } from '../../app/AppContext';
import { formatMoney } from '../../domain/money';
import { assessPurchase } from '../../domain/financialEngine';

type Idea = {
  id: string;
  title: string;
  devices: ('phone' | 'computer')[];
  hours: number;
  skills: string[];
  investment: number;
  range: [number, number];
  risk: 'низкий' | 'средний';
  reason: string;
  step: string;
};

const ideas: Idea[] = [
  {
    id: 'sell',
    title: 'Продать неиспользуемые вещи',
    devices: ['phone'],
    hours: 2,
    skills: [],
    investment: 0,
    range: [300000, 1200000],
    risk: 'низкий',
    reason: 'Быстрый разовый результат без нового обязательства',
    step: 'Выберите три вещи и разместите одно объявление.',
  },
  {
    id: 'shift',
    title: 'Дополнительная смена',
    devices: ['phone'],
    hours: 8,
    skills: [],
    investment: 0,
    range: [350000, 650000],
    risk: 'низкий',
    reason: 'Понятная оплата до принятия нагрузки',
    step: 'Уточните чистую оплату и доступную дату смены.',
  },
  {
    id: 'texts',
    title: 'Редактура коротких текстов',
    devices: ['phone', 'computer'],
    hours: 5,
    skills: ['Тексты'],
    investment: 0,
    range: [500000, 1200000],
    risk: 'низкий',
    reason: 'Совпадает с указанным навыком текстов',
    step: 'Подготовьте два примера «до/после».',
  },
  {
    id: 'slides',
    title: 'Оформление презентаций',
    devices: ['computer'],
    hours: 6,
    skills: ['Дизайн'],
    investment: 0,
    range: [700000, 1800000],
    risk: 'средний',
    reason: 'Выше чек, но нужен компьютер и портфолио',
    step: 'Соберите три слайда в один пример.',
  },
  {
    id: 'tutor',
    title: 'Онлайн-помощь с учёбой',
    devices: ['phone', 'computer'],
    hours: 4,
    skills: ['Обучение'],
    investment: 0,
    range: [600000, 1600000],
    risk: 'средний',
    reason: 'Можно ограничить нагрузку доступными часами',
    step: 'Опишите одну тему, которую готовы объяснять.',
  },
  {
    id: 'pets',
    title: 'Присмотр за питомцами',
    devices: ['phone'],
    hours: 6,
    skills: [],
    investment: 0,
    range: [400000, 1000000],
    risk: 'средний',
    reason: 'Не требует покупки оборудования',
    step: 'Уточните график и разместите анкету в районе.',
  },
  {
    id: 'delivery',
    title: 'Пешая доставка',
    devices: ['phone'],
    hours: 8,
    skills: [],
    investment: 100000,
    range: [500000, 1400000],
    risk: 'средний',
    reason: 'Гибкий график, но доход зависит от спроса',
    step: 'Проверьте тарифы и не покупайте экипировку заранее.',
  },
  {
    id: 'photo',
    title: 'Контент для локального бизнеса',
    devices: ['phone'],
    hours: 7,
    skills: ['Дизайн'],
    investment: 0,
    range: [800000, 2000000],
    risk: 'средний',
    reason: 'Использует смартфон и визуальный навык',
    step: 'Снимите один бесплатный пример без платного инструмента.',
  },
];

export function Opportunities() {
  const { data, settings } = useApp();
  const [filter, setFilter] = useState<'fit' | 'free' | 'all'>('fit');
  if (!data) return null;
  const r = settings.resources!;
  const scored = ideas
    .map((i) => ({
      ...i,
      score:
        (i.devices.some((d) => (d === 'phone' ? r.phone : r.computer)) ? 40 : 0) +
        (i.hours <= r.hoursPerWeek ? 35 : 0) +
        (i.investment <= r.investmentLimit ? 15 : 0) +
        (i.skills.some((s) => r.skills.includes(s)) ? 10 : 0),
    }))
    .filter((i) =>
      filter === 'all' || filter === 'free'
        ? filter === 'all' || i.investment === 0
        : i.score >= 75,
    )
    .sort((a, b) => b.score - a.score);
  const tool = assessPurchase(5500000, 3000000, 50, data.plan.snapshot.safe_to_spend);

  return (
    <Page title="Возможности" sub="Идеи по вашим ресурсам — без гарантии дохода">
      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-primary">Ваши ресурсы</p>
          <CardTitle>
            {r.hoursPerWeek} ч/нед. ·{' '}
            {[r.phone && 'смартфон', r.computer && 'компьютер'].filter(Boolean).join(' · ') ||
              'устройство не выбрано'}
          </CardTitle>
          <CardDescription>
            Изменить ресурсы можно в профиле. Диапазоны — ориентир для демо, не обещание рынка.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['fit', 'Подходят'],
                ['free', 'Без вложений'],
                ['all', 'Все'],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={filter === id ? 'secondary' : 'outline'}
                onClick={() => setFilter(id)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {scored.map((i) => (
          <Card key={i.id}>
            <CardHeader className="flex-row items-start justify-between space-y-0 gap-3">
              <CardTitle className="text-base">{i.title}</CardTitle>
              <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-sm font-medium text-secondary-foreground tabular-nums">
                {i.score}/100
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">
                <b className="font-semibold">Почему:</b> {i.reason}
              </p>
              <dl className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <dt className="text-sm text-muted-foreground">Время</dt>
                  <dd className="text-sm font-medium">{i.hours} ч/нед.</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-sm text-muted-foreground">Вложения</dt>
                  <dd className="text-sm font-medium tabular-nums">
                    {formatMoney(i.investment, data.currency)}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-sm text-muted-foreground">Диапазон</dt>
                  <dd className="text-sm font-medium tabular-nums">
                    {formatMoney(i.range[0], data.currency)}–{formatMoney(i.range[1], data.currency)}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-sm text-muted-foreground">Риск</dt>
                  <dd className="text-sm font-medium">{i.risk}</dd>
                </div>
              </dl>
              <p className="text-sm leading-relaxed">
                <b className="font-semibold">Первый шаг:</b> {i.step}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Проверка покупки ноутбука</CardTitle>
          <CardDescription>
            Консервативный доход {formatMoney(tool.conservativeIncome, data.currency)}; окупаемость{' '}
            {tool.paybackMonths ?? '—'} мес.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Banner kind={tool.createsCashGap ? 'danger' : 'info'}>
            {tool.createsCashGap
              ? 'Покупка создаст кассовый разрыв. Не финансируйте её новым долгом.'
              : 'Покупка укладывается в безопасную сумму, но доход не гарантирован.'}
          </Banner>
        </CardContent>
      </Card>
    </Page>
  );
}
