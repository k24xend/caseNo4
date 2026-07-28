# Финансовый движок

`app/domain.py` — чистый синхронный модуль без БД и AI. Все суммы — `int` minor units.

`projected = available + confirmed_income - mandatory - debt_minimums`; `safe = max(0, projected - reserve)`; дневной ориентир — целочисленное деление на минимум один день. Неподтверждённый/просроченный доход не включается.

Состояния ранжированы: отрицательный прогноз; просрочка/недостаточный резерв; долги; недостаточная подушка; рост. Действие следует тому же защитному порядку.

Debt forecast ежемесячно начисляет ставку в basis points с округлением до minor unit, платит минимумы, затем extra целевому долгу. Avalanche сортирует по ставке, Snowball по остатку; освободившийся минимум переносится. Горизонт — 360 месяцев, отрицательная амортизация явно возвращается.

Разные валюты никогда не складываются: план отклоняется, если счёт не в базовой валюте.


## Calculation version 1

Interest accrues once per forecast month as `round_half_up(balance * annual_rate_bps / 120000)` in minor units. The initial sum of minimum payments plus the configured extra payment is a fixed monthly envelope: whenever a debt closes, its unused minimum rolls into the first remaining debt under avalanche, snowball, or custom ordering. Forecasting stops after 360 months and reports negative amortization when a minimum does not exceed that month's interest. No FX conversion is performed.
