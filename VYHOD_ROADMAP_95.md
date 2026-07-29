# ВЫХОД: roadmap до 95% MVP и 95% App Store-ready

Дата: 28 июля 2026  
Исходная ветка: `codex/implement-mvp-for-exit-application`  
Исходный PR: `k24xend/caseNo4#1`

## Ключевое техническое решение

Основное приложение остаётся на Flutter/Dart. Полная перепись на Swift не нужна.

Swift используется только там, где действительно требуется iOS-интеграция:

- `AppDelegate`;
- универсальные ссылки и deep links;
- нативные permission handlers;
- платформенные каналы, если Flutter-плагина недостаточно;
- StoreKit, Sign in with Apple, push notifications и другие Apple API, когда они войдут в продукт.

Backend остаётся на FastAPI/Python. Для сборки iOS и TestFlight используется облачный macOS CI, чтобы владелец проекта мог работать полностью с iPhone.

## Что означает 95%

### 95% MVP

Все обещанные основные пользовательские сценарии работают end-to-end, приложение стабильно демонстрируется на настоящем iPhone или web-preview, а расчёты и права доступа проверены. Оставшиеся 5% — пользовательская обратная связь, небольшая полировка и необязательные расширения.

### 95% App Store-ready

Есть подписанная release-сборка, production backend, TestFlight, App Store metadata, privacy/account deletion, мониторинг и успешный внутренний beta cycle. Оставшиеся 5% — действия и решения Apple Review, финальные маркетинговые правки и реальные отзывы пользователей.

---

# Roadmap A: от текущих ~40% до 95% MVP

## A0. Зафиксировать базу и проверить правду

Цель: перестать полагаться на текст PR и получить воспроизводимую исходную точку.

- Работать от ветки `codex/implement-mvp-for-exit-application`.
- Не менять `main` напрямую.
- Проверить полный diff относительно `main`.
- Запустить или честно зафиксировать невозможность:
  - `ruff check .`;
  - `mypy app`;
  - `pytest`;
  - миграцию на чистом PostgreSQL;
  - `flutter analyze`;
  - `flutter test`;
  - `flutter build web`;
  - `flutter build ios --no-codesign` на macOS CI.
- Исправить существующие ошибки до новых функций.
- Добавить GitHub Actions:
  - backend lint/typecheck/test;
  - Flutter analyze/test/web build;
  - отдельную macOS job для unsigned iOS build.

Definition of done:

- каждый PR имеет автоматические проверки;
- README перечисляет только реально выполненные команды;
- известен фактический статус iOS-сборки.

## A1. Нормализовать архитектуру Flutter

Цель: убрать весь продукт из одного `main.dart`.

Разделить на:

- `lib/app`;
- `lib/core/api`;
- `lib/core/auth`;
- `lib/core/storage`;
- `lib/core/sync`;
- `lib/core/theme`;
- `lib/core/l10n`;
- `lib/features/onboarding`;
- `lib/features/today`;
- `lib/features/plan`;
- `lib/features/debts`;
- `lib/features/transactions`;
- `lib/features/checkin`;
- `lib/features/scenarios`;
- `lib/features/profile`.

Сделать:

- типизированные DTO и domain models;
- Riverpod providers по feature;
- GoRouter с auth/onboarding guards;
- Dio interceptors для access/refresh token;
- централизованные ошибки;
- конфигурацию dev/demo/prod API URL;
- DI, позволяющий подменять API и storage в тестах.

Definition of done:

- `main.dart` только запускает приложение;
- нет бизнес-логики в widgets;
- нет небезопасных `Map<String, dynamic>` в основных UI flow;
- token refresh и logout работают предсказуемо.

## A2. Довести onboarding и auth

- Отдельно вводить:
  - доступные деньги;
  - дату и сумму ближайшего дохода;
  - несколько источников дохода;
  - обязательные расходы;
  - отдельные долги со ставкой, минимумом и датой;
  - минимальный резерв.
- Валидировать суммы, даты и пустые значения без crash.
- Сохранять прогресс локально.
- Возобновлять onboarding после перезапуска.
- Добавить demo login без создания случайных аккаунтов.
- Реализовать logout.
- Добавить refresh-token rotation/revocation либо явно ограниченную безопасную session-модель.

Definition of done:

- happy path проходит с чистой установки;
- прерывание и продолжение работают;
- неверный ввод не вызывает exception;
- повторная отправка не создаёт дубликаты.

## A3. Довести финансовое ядро

- Исправить классификацию Buffer/Growth.
- Поддержать несколько доходов и scheduled items.
- Не считать неподтверждённый/просроченный доход гарантированным.
- Реализовать:
  - cash-flow calendar;
  - safe-to-spend;
  - safe daily amount;
  - protected reserve;
  - monthly free cash flow;
  - debt-free date;
  - negative amortization;
  - avalanche;
  - snowball;
  - custom order;
  - перенос освободившегося платежа.
- Чётко определить модель процентов и округления.
- Добавить versioned financial snapshots.
- Устранить скрытое смешивание валют.

Тесты:

- границы дат;
- високосный год;
- нулевая и экстремальная ставка;
- долг, который никогда не амортизируется;
- доход сегодня/просрочен/не подтверждён;
- отсутствие дохода;
- отсутствие долгов;
- разные валюты;
- повторный платёж;
- округление minor units;
- сценарий demo seed.

Definition of done:

- расчёты полностью детерминированы;
- один и тот же input всегда даёт один и тот же snapshot;
- критические формулы покрыты table-driven tests;
- AI не влияет на авторитетные суммы.

## A4. Завершить обязательные мобильные функции

### Сегодня

- главное действие;
- безопасная сумма;
- дневной ориентир;
- ближайшие платежи;
- текущий этап;
- прогресс до следующего этапа;
- объяснение изменения плана.

### План

- реальные этапы пользователя;
- текущий месячный план;
- сроки;
- сравнение стратегий;
- выбор стратегии;
- custom order.

### Долги

- список;
- создание;
- редактирование;
- удаление;
- просрочка;
- история платежей;
- подтверждение опасных действий.

### Операции

- реальный список с пагинацией;
- создание дохода/расхода/платежа по долгу;
- категории;
- редактирование и удаление;
- поиск и фильтры;
- optimistic UI с понятным sync status.

### Календарь денег

- ежедневный прогноз;
- обязательные платежи;
- доходы;
- будущий отрицательный остаток.

### Еженедельная сверка

- полностью рабочий flow до пяти шагов;
- пересчёт плана;
- объяснение изменения.

### Что если

- создать сценарий;
- сравнить baseline и scenario;
- не менять реальные данные до подтверждения;
- применить или удалить сценарий.

### Профиль

- RU/EN;
- light/dark;
- экспорт JSON/CSV;
- настоящее удаление аккаунта;
- logout;
- privacy/methodology.

Definition of done:

- пустых кнопок нет;
- каждый экран работает с backend;
- операции и долги можно полноценно вести с iPhone.

## A5. Настоящий offline-first

- Использовать Drift/SQLite, а не secure storage как псевдобазу.
- Secure storage оставить только для token/key material.
- Локально хранить:
  - последний snapshot;
  - план;
  - долги;
  - операции;
  - sync queue.
- Добавить operation IDs и idempotency keys до отправки.
- Реализовать retry/backoff.
- Показывать pending/failed/synced.
- Обрабатывать conflict/version mismatch без молчаливой потери данных.
- Проверить cold start без сети.

Definition of done:

- просмотр работает в airplane mode;
- операция добавляется offline и один раз синхронизируется online;
- конфликт видим пользователю;
- повторный запуск не теряет очередь.

## A6. AI-объяснения

- Сохранить deterministic fake provider.
- Добавить реальный OpenAI provider только через environment variables.
- Строгая Pydantic-схема.
- Timeout, ограниченный retry, fallback.
- AI объясняет готовый snapshot и никогда не возвращает авторитетные суммы.
- Не логировать финансовые данные и PII.
- UI показывает, когда объяснение недоступно.

Definition of done:

- приложение полностью работает без AI key;
- invalid/timeout не ломает план;
- AI-текст не изменяет финансовую модель.

## A7. UX, визуальное качество и доступность

- Собственная design-token система.
- Dark и light.
- Цвет этапа влияет на акцент, не на читаемость.
- Skeleton/loading/empty/error/offline для каждого data screen.
- Безопасные зоны, клавиатура, Dynamic Type.
- VoiceOver labels.
- Контраст.
- Reduce Motion.
- Форматирование RU/EN, валют и дат.
- Исправить overflow на маленьком iPhone и при крупном тексте.
- Добавить корректный app icon и launch screen.

Definition of done:

- ключевые экраны проходят widget/golden review;
- UI не выглядит как Material starter;
- приложение удобно на актуальном маленьком и большом iPhone.

## A8. Безопасность и интеграционные тесты

- Ownership tests для каждого user-scoped endpoint.
- IDOR tests.
- Idempotency tests.
- Rate limiting AI/auth.
- CORS для конкретных origins.
- Account deletion cascade.
- Export correctness.
- Secret scanning.
- Dependency audit.
- API integration tests на PostgreSQL.
- Mobile integration happy path против реального test API.

Definition of done:

- пользователь не может читать/изменять чужие записи;
- удаление действительно удаляет данные;
- критические проверки выполняются в CI.

## A9. 95% MVP gate

MVP получает 95%, только если:

1. onboarding, login, Today, Plan, Debts, Transactions, Calendar, Check-in, What-if и Profile работают end-to-end;
2. нет пустых кнопок и фиктивных функций;
3. backend развёрнут в staging с HTTPS;
4. есть one-tap web-preview или TestFlight build;
5. offline cold start и queue проверены;
6. iOS unsigned build проходит;
7. CI зелёный;
8. demo flow воспроизводим;
9. ограничения честно задокументированы;
10. независимый review не находит критических ошибок.

Оставшиеся 5%:

- реальные отзывы 5–10 тестировщиков;
- мелкая UX-полировка;
- необязательные улучшения после наблюдения за использованием.

---

# Roadmap B: от 95% MVP до 95% App Store-ready

## B1. Production backend

- Выбрать managed PostgreSQL и hosting.
- Разделить staging/production.
- HTTPS и собственный API domain.
- Надёжный `JWT_SECRET` и secret management.
- Миграции как release step.
- Backup/restore test.
- Structured logs без PII.
- Error monitoring.
- Uptime/health monitoring.
- Rate limits и abuse protection.
- Политика хранения и удаления данных.

Gate:

- production environment восстанавливается по документации;
- backup restore проверен;
- приложение не зависит от локального компьютера.

## B2. Production iOS shell

- Сгенерировать/починить стандартный Flutter iOS project.
- Выбрать минимальную поддерживаемую iOS.
- Финальный bundle ID.
- Display name, version/build numbers.
- App icons всех требуемых размеров.
- Launch screen.
- Release configuration только с HTTPS API.
- ATS без широких исключений.
- Permissions usage descriptions только для реально используемых разрешений.
- Проверить universal links, Keychain и lifecycle.
- Swift добавлять только для конкретной нативной интеграции.

Gate:

- `flutter build ipa` проходит в macOS CI;
- archive устанавливается через TestFlight;
- debug-only настройки отсутствуют в release.

## B3. Apple Developer и облачный CI/CD

Действия владельца:

- вступить в Apple Developer Program;
- создать Bundle ID;
- создать App Store Connect app;
- создать App Store Connect API key безопасным способом.

Автоматизация:

- macOS CI через Codemagic или GitHub Actions;
- signing certificates/profiles через безопасное хранилище;
- build number automation;
- upload в TestFlight;
- release notes;
- manual approval перед production submission.

Gate:

- новый commit может создать TestFlight build без Mac у владельца;
- секреты не находятся в GitHub.

## B4. Privacy и App Review compliance

- Privacy Policy по публичному HTTPS URL.
- Terms/Support URL.
- В приложении:
  - просмотр privacy policy;
  - экспорт;
  - инициирование полного удаления аккаунта;
  - понятное подтверждение удаления.
- Заполнить App Privacy details / Privacy Nutrition Label.
- Описать данные, цели, хранение, удаление и third-party processors.
- Проверить SDK privacy manifests.
- Не обещать гарантированный финансовый результат.
- Чётко позиционировать продукт как budgeting/planning tool.
- Добавить disclaimer методики без превращения UX в юридическую простыню.

Gate:

- account deletion реально работает;
- privacy answers совпадают с кодом и backend;
- review notes объясняют demo account и ключевые функции.

## B5. TestFlight beta

- Внутренняя beta.
- Минимум 5–10 реальных тестировщиков.
- Проверить:
  - чистую установку;
  - регистрацию;
  - восстановление сессии;
  - offline/online;
  - медленную сеть;
  - удаление аккаунта;
  - export;
  - большие данные;
  - крупный шрифт;
  - VoiceOver;
  - crash-free sessions.
- Исправить P0/P1.
- Повторить beta.

Gate:

- нет известных crash/data-loss/security P0/P1;
- demo и новый аккаунт проходят на физическом iPhone;
- основные метрики стабильности наблюдаются.

## B6. App Store product page

- Название, subtitle, description, keywords.
- Category.
- Support URL.
- Privacy URL.
- 6–8 качественных iPhone screenshots.
- App icon.
- Review contact.
- Demo account.
- Review notes.
- Export compliance.
- Age rating.
- Accessibility Nutrition Labels, если доступны для выбранной версии App Store Connect.

Gate:

- metadata отражает только реально существующие функции;
- screenshots сделаны из release/TestFlight build;
- reviewer может пройти приложение без переписки.

## B7. Release candidate и review

- Зафиксировать release candidate.
- Полный regression pass.
- Проверить production migration и rollback.
- Проверить privacy/account deletion.
- Загрузить TestFlight RC.
- Создать App Store submission.
- Не добавлять новые функции между RC и review.
- Отвечать на review фактически; исправлять только подтверждённые проблемы.

## B8. 95% App Store-ready gate

95% достигнуто, если:

1. production backend стабилен;
2. подписанный IPA автоматически собирается;
3. TestFlight build работает на физических iPhone;
4. beta P0/P1 закрыты;
5. privacy, deletion, export и support работают;
6. metadata/screenshots готовы;
7. submission создана и готова к review либо уже находится на review;
8. rollback и monitoring готовы;
9. нет известных причин для технического отклонения;
10. код и документация совпадают.

Оставшиеся 5%:

- решение Apple Review;
- возможный reviewer-specific вопрос;
- финальная корректировка metadata;
- реальные продуктовые изменения после публикации.

---

# Как отдавать работу Codex

Не давать весь Roadmap A и Roadmap B одним запуском.

Оптимальные пакеты:

1. A0–A3: база, архитектура, auth/onboarding, финансовое ядро.
2. A4–A5: полный mobile flow и offline-first.
3. A6–A8: AI, UX, безопасность и интеграционные тесты.
4. A9: независимый review и MVP gate.
5. B1–B3: production, iOS build, CI/TestFlight.
6. B4–B6: compliance, beta, App Store assets.
7. B7–B8: release candidate и submission gate.

После каждого пакета:

- создать/обновить PR;
- проверить diff;
- запустить CI;
- запросить фактический отчёт;
- только затем переходить к следующему.

Это позволяет остановиться на 95% проверяемого результата, а не получить ложные «100%» из одного гигантского запуска.

---

# Промпт №1 для Codex: довести основу MVP

```text
Продолжи работу в репозитории k24xend/caseNo4 от ветки codex/implement-mvp-for-exit-application. Не меняй main напрямую и не создавай новый проект с нуля.

Цель этого запуска — выполнить только этапы A0–A3 из roadmap ниже: получить воспроизводимую базу, нормализовать Flutter-архитектуру, довести auth/onboarding и финансовое ядро. Не заявляй о полном MVP и не переходи к App Store-публикации.

Сначала:
1. Полностью прочитай AGENTS.md и VYHOD_SPEC.md.
2. Осмотри текущий diff и код. Сохрани рабочие части предыдущего изменения.
3. Проверь, какие тесты и builds действительно проходят; не доверяй предыдущему PR-описанию без повторной проверки.
4. Составь краткий план файлов и вертикальных срезов, затем сразу приступай к реализации.

Обязательная работа:

A0 — verification baseline
- Исправь существующие lint/type/test/build ошибки.
- Добавь GitHub Actions для backend lint, mypy, pytest, PostgreSQL migration, Flutter analyze/test/web build.
- Добавь отдельную macOS CI job для `flutter build ios --no-codesign`, если GitHub Actions поддерживает её в этом репозитории.
- README должен перечислять фактически рабочие команды.

A1 — Flutter architecture
- Раздели монолитный `apps/mobile/lib/main.dart` на app/core/features.
- Вынеси API, auth, storage, sync, theme, l10n и feature modules.
- Замени `Map<String, dynamic>` в основных flows типизированными DTO/domain models.
- Добавь GoRouter guards для auth/onboarding.
- Реализуй access/refresh token handling, logout и централизованную обработку API errors.
- Поддержи dev/demo/prod API configuration.

A2 — auth/onboarding
- Сделай полноценный пошаговый onboarding для нескольких доходов, обязательных расходов и отдельных долгов.
- Валидируй суммы и даты без crash.
- Сохраняй и восстанавливай прогресс onboarding.
- Demo login должен использовать seed account, а не создавать случайных пользователей.
- Повторная отправка onboarding должна быть идемпотентной.
- Добавь релевантные backend и Flutter tests.

A3 — financial engine
- Реализуй и проверь состояния Critical, Stabilization, Exit, Buffer, Growth.
- Не считай неподтверждённый или просроченный доход гарантированным.
- Поддержи несколько доходов и scheduled items.
- Доведи safe-to-spend, safe daily amount, reserve, monthly free cash flow, debt-free date, negative amortization, avalanche, snowball, custom order и rollover freed payments.
- Зафиксируй точную модель процентов и округления minor units.
- Не смешивай валюты.
- Добавь versioned financial snapshots.
- Покрой граничные случаи table-driven tests.
- AI не должен влиять на авторитетные суммы или состояние.

Ограничения:
- Flutter/Dart остаётся основным клиентским стеком. Не переписывай приложение на Swift.
- Swift допускается только для конкретной iOS platform integration.
- Не добавляй функции из раздела «Что не входит в MVP».
- Не выполняй deployment, не загружай TestFlight и не меняй production.
- Не удаляй рабочую функциональность ради архитектурной чистоты.
- Не оставляй обязательную работу в TODO.
- Не создавай binary build artifacts в git diff.

Перед завершением выполни все доступные проверки. Если среда не позволяет iOS build, сообщи точный blocker и оставь macOS CI workflow для проверки после push.

В итоговом отчёте укажи:
- что было сломано или не доказано до изменений;
- что реально реализовано;
- основные файлы и архитектурные решения;
- точные выполненные команды и результаты;
- CI jobs;
- незавершённые пункты A0–A3;
- риски и следующий рекомендуемый пакет A4–A5.

Не называй проект готовым на 95%, пока A4–A9 не выполнены и не проверены.
```

# Промпт продолжения после успешного A0–A3

```text
Проверь фактическое состояние ветки и CI после предыдущего этапа. Выполни только A4–A5 из VYHOD_ROADMAP_95.md: заверши все обязательные мобильные flows и настоящий Drift/SQLite offline-first. Сохрани архитектуру и финансовые инварианты, не переходи к App Store и не заявляй 95% до прохождения A9 gate. Запусти релевантные backend, Flutter и integration tests и отчитайся только по фактическим результатам.
```

# Промпт App Store-этапа

Использовать только после прохождения A9:

```text
Исходи из проверенного 95% MVP в k24xend/caseNo4. Выполни пакет B1–B3 из VYHOD_ROADMAP_95.md: production-ready hosting configuration, production iOS shell и облачный CI/TestFlight pipeline. Flutter/Dart остаётся основой; Swift добавляй только для конкретной нативной интеграции. Не публикуй приложение и не отправляй его на App Review без явного разрешения владельца. Не коммить Apple credentials, certificates, profiles или API keys. В конце отдели выполненный код от действий, требующих Apple Developer account, и дай владельцу не более трёх коротких действий с iPhone.
```
