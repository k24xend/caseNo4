# API

OpenAPI доступен в `/docs`. Группы: `/auth`, `/onboarding`, `/accounts`, `/income`, `/expenses`, `/transactions`, `/debts`, `/plan`, `/checkins`, `/scenarios`, `/export`, `/me`, `/health`.

После регистрации/входа передавайте `Authorization: Bearer …`. `POST /transactions` требует `Idempotency-Key` (8–100 символов). Операции пагинируются `limit/offset`, фильтруются `kind/search`. `POST /scenarios` возвращает отдельный расчёт с `applied=false`. Ошибки имеют `{error: {code, message}}`.

