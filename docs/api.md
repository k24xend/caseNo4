# API

OpenAPI доступен в `/docs`. Группы: `/auth`, `/onboarding`, `/accounts`, `/income`, `/expenses`, `/transactions`, `/debts`, `/plan`, `/checkins`, `/scenarios`, `/export`, `/me`, `/health`.

После регистрации/входа передавайте `Authorization: Bearer …`. `POST /transactions` требует `Idempotency-Key` (8–100 символов). Операции пагинируются `limit/offset`, фильтруются `kind/search`. `POST /scenarios` возвращает отдельный расчёт с `applied=false`. Ошибки имеют `{error: {code, message}}`.

`GET/POST /debts`, а также `GET/PUT/DELETE /debts/{id}` образуют минимальный CRUD долгов. `POST /debts` требует `Idempotency-Key`: повтор идентичного payload возвращает созданный долг, а повтор ключа с другими данными — 409. Все запросы фильтруются по владельцу; чужой UUID возвращает 404. Валюта долга должна совпадать с базовой валютой пользователя. Повтор `POST /onboarding` с тем же `Idempotency-Key` возвращает исходный результат, а новый ключ после завершения — 409.

`GET /plan/explanation` возвращает строгий `AIExplanationEnvelope`: поля объяснения (`headline`, `explanation`, `reasons`, `next_steps`, `uncertainties`) дополнены `generated_at` и `source`. Авторитетные суммы, состояние и главное действие берутся из детерминированного `/plan`; объяснение их не изменяет. Некорректный ответ или timeout провайдера заменяется детерминированным fallback.
