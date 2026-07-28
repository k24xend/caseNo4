# Финансовый движок

`app/domain.py` — чистый синхронный модуль без БД и AI. Все суммы — `int` minor units.

`projected = available + confirmed_income - mandatory - debt_minimums`; `safe = max(0, projected - reserve)`; дневной ориентир — целочисленное деление на минимум один день. Неподтверждённый/просроченный доход не включается.

Состояния ранжированы: отрицательный прогноз; просрочка/недостаточный резерв; долги; недостаточная подушка; рост. Действие следует тому же защитному порядку.

Debt forecast ежемесячно начисляет ставку в basis points с округлением до minor unit, платит минимумы, затем extra целевому долгу. Avalanche сортирует по ставке, Snowball по остатку; освободившийся минимум переносится. Горизонт — 360 месяцев, отрицательная амортизация явно возвращается.

Разные валюты никогда не складываются: план отклоняется, если счёт не в базовой валюте.


## Calculation version 1

Interest accrues once per forecast month as `round_half_up(balance * annual_rate_bps / 120000)` in minor units. The initial sum of minimum payments plus the configured extra payment is a fixed monthly envelope: whenever a debt closes, its unused minimum rolls into the first remaining debt under avalanche, snowball, or custom ordering. Forecasting stops after 360 months and reports negative amortization when a minimum does not exceed that month's interest. No FX conversion is performed.

## Debt forecast calendar and payment order (algorithm v1)

For each calendar month the engine accrues nominal APR/12 interest on the opening
balance and rounds half-up to one minor unit. It then pays every active debt's
minimum, limited by both its balance and the fixed monthly envelope. Remaining
envelope (minimums released by closed debts plus the configured extra payment)
is applied to the first active debt in Avalanche, Snowball, or Custom order.
`total_paid` is the sum of every applied payment and therefore includes principal
and accrued interest. A minimum not exceeding that month's interest is reported
as negative amortization. An insufficient envelope leaves the unpaid balance in
place; forecasts stop after 360 months. Payoff dates advance by calendar months
and clamp end-of-month dates (for example, 31 January to 29 February in 2024).
