# Demo script

1. `docker compose up --build`, дождаться `GET /health/ready`.
2. Запустить mobile и войти `demo@vyhod.app` / `demo-vyhod`.
3. На «Сегодня» показать действие, safe-to-spend, дневной ориентир и состояние.
4. В «План» сравнить Avalanche/Snowball; в «Долги» показать ставку и минимум.
5. Добавить расход: сумма уйдёт реальным POST с idempotency key, план пересчитается.
6. Отключить сеть, открыть cached plan и добавить операцию; включить сеть и refresh для синхронизации.
7. В Swagger выполнить check-in, what-if и показать, что scenario имеет `applied=false`.
8. Показать JSON export и удаление demo-аккаунта только в самом конце.

