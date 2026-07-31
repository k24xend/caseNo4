import { Link } from 'react-router-dom';
import { Empty } from '../components/ui';
import { Page } from '../components/Page';
import { Button } from '../components/ui/button';

export function NotFound() {
  return (
    <Page title="Здесь ничего нет">
      <Empty title="Страница не найдена" text="Вернитесь в Сегодня — ваши данные на месте." />
      <Button asChild className="w-full">
        <Link to="/today">Вернуться</Link>
      </Button>
    </Page>
  );
}
