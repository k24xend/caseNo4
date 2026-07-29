import { useState } from 'react';
import { BriefcaseBusiness, Laptop, PackageOpen, Wrench } from 'lucide-react';
import { Page } from '../../components/Page';
import { Banner, Card } from '../../components/ui';
import { useApp } from '../../app/AppContext';
import { formatMoney } from '../../domain/money';
import { assessTool } from '../../domain/navigationEngine';
const opportunities = [
  {
    icon: BriefcaseBusiness,
    title: 'Помощь с презентациями',
    meta: '4–6 ч/нед. · компьютер',
    range: [600000, 1200000],
    step: 'Собрать 3 примера и написать пяти знакомым — без покупки рекламы.',
  },
  {
    icon: Wrench,
    title: 'Дополнительная смена',
    meta: '1 смена · без вложений',
    range: [350000, 550000],
    step: 'Уточнить доступную смену и подтвердить чистую сумму до расчёта плана.',
  },
  {
    icon: PackageOpen,
    title: 'Продать неиспользуемое',
    meta: '1–2 ч · телефон',
    range: [300000, 800000],
    step: 'Выбрать три вещи, сфотографировать и разместить одно объявление.',
  },
];
export function Opportunities() {
  const { data } = useApp();
  const [filter, setFilter] = useState<'all' | 'quick'>('all');
  if (!data) return null;
  const cost = 5500000,
    income = 3000000,
    assessment = assessTool(data.plan, cost, income, 50);
  return (
    <Page title="Возможности" sub="Увеличиваем доход без нового опасного долга">
      <Card className="skill-card">
        <p className="eyebrow">Твои ресурсы</p>
        <h2>Дизайн · тексты · 8 часов в неделю</h2>
        <p>Есть телефон и компьютер. Доход ниже — ориентир для демо, не гарантия рынка.</p>
        <div className="chips">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
            Все идеи
          </button>
          <button className={filter === 'quick' ? 'active' : ''} onClick={() => setFilter('quick')}>
            Без вложений
          </button>
        </div>
      </Card>
      <div className="opportunity-list">
        {opportunities
          .filter((_, i) => filter === 'all' || i > 0)
          .map((x) => (
            <Card key={x.title}>
              <x.icon className="opportunity-icon" />
              <div>
                <h3>{x.title}</h3>
                <p className="muted">{x.meta}</p>
                <strong>
                  {formatMoney(x.range[0], 'RUB')}–{formatMoney(x.range[1], 'RUB')} / мес.
                </strong>
                <p>
                  <b>Первый шаг:</b> {x.step}
                </p>
              </div>
            </Card>
          ))}
      </div>
      <Card>
        <div className="card-heading">
          <h2>Проверка инструмента</h2>
          <Laptop />
        </div>
        <p>
          Ноутбук {formatMoney(cost, 'RUB')} окупится не раньше чем за{' '}
          {assessment.paybackMonths ?? '—'} мес. при консервативных 50% ожидаемого дохода (
          {formatMoney(assessment.conservativeMonthlyIncome, 'RUB')} в месяц).
        </p>
        <Banner kind={assessment.createsCashGap ? 'danger' : 'info'}>
          {assessment.message} Новый кредит не рекомендуется.
        </Banner>
      </Card>
    </Page>
  );
}
