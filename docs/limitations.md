# Ограничения

- Нет bank sync и исполнения платежей — только ручные данные.
- Валюты изолированы; FX и скрытое суммирование намеренно отсутствуют.
- Recurrence seed представлен следующими scheduled items; production scheduler не входит в MVP.
- Mobile UI покрывает рабочий шестишаговый onboarding, Today, Plan, Debts и добавление операций; check-in, scenario и export доступны полноценно через API, а в Profile обозначены входами без отдельных сложных форм.
- Offline cache использует secure key/value storage, очередь синхронизируется последовательно; нет фоновой ОС-синхронизации.
- Fake AI является default. Внешний OpenAI adapter не активирован без явной конфигурации.
- Локальная demo auth не имеет email verification и revoke list.
