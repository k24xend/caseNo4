# Security и threat model

## Активы и границы

Активы: credentials, токены, персональные и финансовые записи. Недоверенные границы: mobile input, Authorization header, import/export и AI provider.

## Меры MVP

- Argon2 password hashing; короткий access и отдельный refresh JWT; секрет только из environment.
- Каждая финансовая выборка/мутация ограничена authenticated `user_id`; account/debt UUID проверяется вместе с владельцем.
- Pydantic bounds, ограниченная пагинация/строки, запрет смешивания валют, CORS allowlist.
- Уникальный idempotency key на пользователя; финансовые payload и токены не логируются приложением.
- AI получает готовое действие, имеет timeout/retry, strict schema и безопасный fallback.
- `DELETE /me` каскадно очищает данные; JSON export позволяет забрать их.

## Остаточные риски

Нет ротации/revocation JWT, field encryption, production WAF/rate-limit storage и malware scanning импорта (сам file import отсутствует). Compose credentials предназначены только для локальной разработки. Перед production нужны managed secrets, TLS, backups, monitoring, penetration test и DPIA.


## Web PWA auth and CORS

The static web client reads its API origin from `VITE_API_BASE_URL`. Deployments must set `CORS_ORIGINS` to an exact comma-separated HTTPS allowlist; wildcard origins are incompatible with credentialed requests. The current JSON refresh-token contract is supported only through a temporary sessionStorage adapter (access token remains memory-only). A production web deployment requires a separate Secure, HttpOnly, SameSite refresh cookie and CSRF protection for cookie-authenticated mutations. Native SwiftUI/Flutter bearer-token flows remain unchanged.
