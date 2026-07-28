# ВЫХОД / VYHOD

Мобильный финансовый навигатор: не просто фиксирует расходы, а детерминированно отвечает, сколько безопасно потратить, какой долг гасить и что сделать сегодня. Это portfolio MVP, не банк и не средство выполнения платежей.

> Screenshot placeholder: запустите Flutter-клиент и используйте экран **Сегодня** с demo-сценарием.

## Стек и архитектура

- Flutter, Riverpod, GoRouter, Dio и защищённый локальный cache/queue;
- FastAPI, Pydantic v2, async SQLAlchemy 2, Alembic и PostgreSQL;
- отдельный целочисленный financial engine; деньги — только minor units, валюта — ISO 4217;
- JWT access/refresh, Argon2, ownership-фильтры, идемпотентные операции;
- schema-validated fake AI с timeout/retry/fallback. AI объясняет, но не считает.

Подробности: [архитектура](docs/architecture.md), [формулы](docs/financial-engine.md), [API](docs/api.md), [security](docs/security.md).

## Быстрый запуск

```bash
cp .env.example .env
docker compose up --build
# API: http://localhost:8000/docs
cd apps/mobile
flutter pub get
# iPhone Simulator (API на том же Mac)
flutter run -d ios --dart-define=API_URL=http://127.0.0.1:8000
```

Demo: `demo@vyhod.app` / `demo-vyhod`. Seed автоматически запускается в Compose. Без Docker: установите API (`pip install -e 'apps/api[dev]'`), затем из `apps/api` выполните `python -m app.seed && uvicorn app.main:app --reload`.

### Запуск на iPhone

В репозитории есть готовый iOS Runner (`apps/mobile/ios`) для iOS 15+. На Mac установите Xcode, Flutter и CocoaPods, запустите API, затем:

```bash
cd apps/mobile
flutter pub get
open -a Simulator
flutter run -d ios --dart-define=API_URL=http://127.0.0.1:8000
```

Для физического iPhone откройте `ios/Runner.xcworkspace` в Xcode, выберите свою Development Team и передайте доступный с телефона HTTPS URL API через `--dart-define=API_URL=...`. HTTP разрешён только для локальной сети разработки; production должен использовать TLS.

## Проверки

```bash
cd apps/api && ruff check . && mypy app && pytest
DATABASE_URL=postgresql+asyncpg://vyhod:vyhod@localhost/vyhod alembic upgrade head
cd apps/mobile && flutter analyze && flutter test && flutter build web
docker compose config && docker compose up --build -d
# Только macOS с Xcode:
cd apps/mobile && flutter build ios --no-codesign
git grep -nEi '(api[_-]?key|secret|token|password)\s*[:=]\s*["'"'][^"'"']+["'"']'
```

Статус проверок конкретного изменения фиксируется в commit/PR и итоговом отчёте; наличие команды здесь не означает, что среда её выполнила.

## Известные ограничения

Ручной ввод вместо bank sync; один базовый currency без FX-конвертации; прогноз использует месячные проценты и горизонт 30 лет; уведомления только как настройка; offline-конфликт сохраняется в очереди и требует повторной синхронизации. См. [полный список](docs/limitations.md).
