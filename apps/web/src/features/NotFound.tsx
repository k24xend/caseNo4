import { Link } from 'react-router-dom';
import { Empty } from '../components/ui';
import { Page } from '../components/Page';
export function NotFound() {
  return (
    <Page title="Здесь ничего нет">
      <Empty title="Страница не найдена" text="Вернитесь в Сегодня — ваши данные на месте." />
      <Link className="button" to="/today">
        Вернуться
      </Link>
    </Page>
  );
}
