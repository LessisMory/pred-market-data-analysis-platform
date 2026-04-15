# Details

Date : 2026-04-14 21:36:38

Directory /Users/mike/Duke/fintech512/final_project/pred_market_data_platform/src

Total : 143 files,  17685 codes, 659 comments, 2865 blanks, all 21209 lines

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)

## Files
| filename | language | code | comment | blank | total |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [src/data\_service/api/Dockerfile](/src/data_service/api/Dockerfile) | Docker | 10 | 0 | 7 | 17 |
| [src/data\_service/api/README.md](/src/data_service/api/README.md) | Markdown | 258 | 0 | 85 | 343 |
| [src/data\_service/api/\_\_init\_\_.py](/src/data_service/api/__init__.py) | Python | 0 | 1 | 1 | 2 |
| [src/data\_service/api/api.py](/src/data_service/api/api.py) | Python | 9 | 0 | 4 | 13 |
| [src/data\_service/api/db/\_\_init\_\_.py](/src/data_service/api/db/__init__.py) | Python | 0 | 1 | 1 | 2 |
| [src/data\_service/api/db/client.py](/src/data_service/api/db/client.py) | Python | 104 | 11 | 33 | 148 |
| [src/data\_service/api/docker-compose.yaml](/src/data_service/api/docker-compose.yaml) | YAML | 23 | 0 | 2 | 25 |
| [src/data\_service/api/fetchers/\_\_init\_\_.py](/src/data_service/api/fetchers/__init__.py) | Python | 0 | 1 | 1 | 2 |
| [src/data\_service/api/fetchers/chainlink\_fetcher.py](/src/data_service/api/fetchers/chainlink_fetcher.py) | Python | 69 | 35 | 20 | 124 |
| [src/data\_service/api/fetchers/market\_chart\_fetcher.py](/src/data_service/api/fetchers/market_chart_fetcher.py) | Python | 162 | 33 | 23 | 218 |
| [src/data\_service/api/requirements.txt](/src/data_service/api/requirements.txt) | pip requirements | 5 | 0 | 1 | 6 |
| [src/data\_service/api/routes/\_\_init\_\_.py](/src/data_service/api/routes/__init__.py) | Python | 0 | 1 | 1 | 2 |
| [src/data\_service/api/routes/chainlink.py](/src/data_service/api/routes/chainlink.py) | Python | 138 | 1 | 26 | 165 |
| [src/data\_service/api/routes/health.py](/src/data_service/api/routes/health.py) | Python | 27 | 1 | 10 | 38 |
| [src/data\_service/api/routes/markets.py](/src/data_service/api/routes/markets.py) | Python | 209 | 2 | 48 | 259 |
| [src/data\_service/api/tests/\_\_init\_\_.py](/src/data_service/api/tests/__init__.py) | Python | 0 | 0 | 1 | 1 |
| [src/data\_service/api/tests/conftest.py](/src/data_service/api/tests/conftest.py) | Python | 15 | 1 | 8 | 24 |
| [src/data\_service/api/tests/test\_chainlink\_fetcher.py](/src/data_service/api/tests/test_chainlink_fetcher.py) | Python | 162 | 0 | 38 | 200 |
| [src/data\_service/api/tests/test\_db\_client.py](/src/data_service/api/tests/test_db_client.py) | Python | 144 | 0 | 42 | 186 |
| [src/data\_service/api/tests/test\_market\_chart\_fetcher.py](/src/data_service/api/tests/test_market_chart_fetcher.py) | Python | 165 | 0 | 26 | 191 |
| [src/data\_service/api/tests/test\_market\_routes.py](/src/data_service/api/tests/test_market_routes.py) | Python | 284 | 0 | 42 | 326 |
| [src/data\_service/api/tests/test\_routes.py](/src/data_service/api/tests/test_routes.py) | Python | 369 | 0 | 74 | 443 |
| [src/data\_service/database/Dockerfile](/src/data_service/database/Dockerfile) | Docker | 3 | 0 | 2 | 5 |
| [src/data\_service/database/data\_initialization/Dockerfile](/src/data_service/database/data_initialization/Dockerfile) | Docker | 8 | 2 | 6 | 16 |
| [src/data\_service/database/data\_initialization/data\_initialization\_testing.ipynb](/src/data_service/database/data_initialization/data_initialization_testing.ipynb) | JSON | 215 | 0 | 1 | 216 |
| [src/data\_service/database/data\_initialization/main.py](/src/data_service/database/data_initialization/main.py) | Python | 769 | 43 | 115 | 927 |
| [src/data\_service/database/data\_initialization/requirements.txt](/src/data_service/database/data_initialization/requirements.txt) | pip requirements | 3 | 0 | 1 | 4 |
| [src/data\_service/database/docker-compose.yaml](/src/data_service/database/docker-compose.yaml) | YAML | 58 | 0 | 4 | 62 |
| [src/data\_service/database/init/load\_schema.sql](/src/data_service/database/init/load_schema.sql) | MS SQL | 2 | 0 | 1 | 3 |
| [src/data\_service/database/init/setup\_cdc.sql](/src/data_service/database/init/setup_cdc.sql) | MS SQL | 22 | 3 | 4 | 29 |
| [src/data\_service/database/schema/setup.sql](/src/data_service/database/schema/setup.sql) | MS SQL | 14 | 5 | 5 | 24 |
| [src/data\_service/database/schema/tables/binance\_prices.sql](/src/data_service/database/schema/tables/binance_prices.sql) | MS SQL | 14 | 0 | 2 | 16 |
| [src/data\_service/database/schema/tables/chainlink\_prices.sql](/src/data_service/database/schema/tables/chainlink_prices.sql) | MS SQL | 14 | 0 | 2 | 16 |
| [src/data\_service/database/schema/tables/comments.sql](/src/data_service/database/schema/tables/comments.sql) | MS SQL | 7 | 0 | 3 | 10 |
| [src/data\_service/database/schema/tables/events.sql](/src/data_service/database/schema/tables/events.sql) | MS SQL | 43 | 2 | 7 | 52 |
| [src/data\_service/database/schema/tables/markets.sql](/src/data_service/database/schema/tables/markets.sql) | MS SQL | 62 | 10 | 8 | 80 |
| [src/data\_service/database/schema/tables/order\_book\_snapshots.sql](/src/data_service/database/schema/tables/order_book_snapshots.sql) | MS SQL | 11 | 2 | 4 | 17 |
| [src/data\_service/database/schema/tables/order\_book\_trades.sql](/src/data_service/database/schema/tables/order_book_trades.sql) | MS SQL | 13 | 0 | 2 | 15 |
| [src/data\_service/database/schema/tables/order\_book\_updates.sql](/src/data_service/database/schema/tables/order_book_updates.sql) | MS SQL | 13 | 2 | 4 | 19 |
| [src/data\_service/database/schema/tables/series.sql](/src/data_service/database/schema/tables/series.sql) | MS SQL | 15 | 0 | 3 | 18 |
| [src/data\_service/database/schema/tables/tag\_list.sql](/src/data_service/database/schema/tables/tag_list.sql) | MS SQL | 5 | 0 | 0 | 5 |
| [src/data\_service/database/schema/tables/tags.sql](/src/data_service/database/schema/tables/tags.sql) | MS SQL | 8 | 0 | 1 | 9 |
| [src/data\_service/database/schema/tables/tokens.sql](/src/data_service/database/schema/tables/tokens.sql) | MS SQL | 6 | 0 | 1 | 7 |
| [src/data\_service/database/schema/tables/trades.sql](/src/data_service/database/schema/tables/trades.sql) | MS SQL | 13 | 0 | 1 | 14 |
| [src/data\_service/database/schema/tables/users.sql](/src/data_service/database/schema/tables/users.sql) | MS SQL | 8 | 0 | 1 | 9 |
| [src/data\_service/dbz\_init.sh](/src/data_service/dbz_init.sh) | Shell Script | 68 | 2 | 9 | 79 |
| [src/data\_service/inflow\_gateway/Dockerfile](/src/data_service/inflow_gateway/Dockerfile) | Docker | 7 | 0 | 7 | 14 |
| [src/data\_service/inflow\_gateway/docker-compose.yaml](/src/data_service/inflow_gateway/docker-compose.yaml) | YAML | 28 | 0 | 4 | 32 |
| [src/data\_service/inflow\_gateway/pyproject.toml](/src/data_service/inflow_gateway/pyproject.toml) | toml | 17 | 0 | 3 | 20 |
| [src/data\_service/inflow\_gateway/requirements.txt](/src/data_service/inflow_gateway/requirements.txt) | pip requirements | 14 | 0 | 1 | 15 |
| [src/data\_service/inflow\_gateway/stream.py](/src/data_service/inflow_gateway/stream.py) | Python | 461 | 31 | 107 | 599 |
| [src/data\_service/inflow\_gateway/tests/test\_stream.py](/src/data_service/inflow_gateway/tests/test_stream.py) | Python | 725 | 0 | 193 | 918 |
| [src/data\_service/shared/\_\_init\_\_.py](/src/data_service/shared/__init__.py) | Python | 8 | 5 | 7 | 20 |
| [src/data\_service/shared/subscriber.py](/src/data_service/shared/subscriber.py) | Python | 76 | 2 | 12 | 90 |
| [src/data\_service/transform\_layer/Dockerfile](/src/data_service/transform_layer/Dockerfile) | Docker | 10 | 2 | 7 | 19 |
| [src/data\_service/transform\_layer/config.py](/src/data_service/transform_layer/config.py) | Python | 76 | 1 | 19 | 96 |
| [src/data\_service/transform\_layer/docker-compose.yaml](/src/data_service/transform_layer/docker-compose.yaml) | YAML | 136 | 8 | 8 | 152 |
| [src/data\_service/transform\_layer/kafka\_bridge.py](/src/data_service/transform_layer/kafka_bridge.py) | Python | 133 | 1 | 26 | 160 |
| [src/data\_service/transform\_layer/requirements.txt](/src/data_service/transform_layer/requirements.txt) | pip requirements | 3 | 0 | 1 | 4 |
| [src/data\_service/transform\_layer/template.sql](/src/data_service/transform_layer/template.sql) | MS SQL | 1,782 | 2 | 100 | 1,884 |
| [src/data\_service/transform\_layer/tests/conftest.py](/src/data_service/transform_layer/tests/conftest.py) | Python | 5 | 0 | 3 | 8 |
| [src/data\_service/transform\_layer/tests/test\_transform\_writer.py](/src/data_service/transform_layer/tests/test_transform_writer.py) | Python | 63 | 0 | 22 | 85 |
| [src/data\_service/transform\_layer/transform\_writer.py](/src/data_service/transform_layer/transform_writer.py) | Python | 470 | 5 | 62 | 537 |
| [src/fullstack/back\_end/Dockerfile](/src/fullstack/back_end/Dockerfile) | Docker | 10 | 0 | 8 | 18 |
| [src/fullstack/back\_end/\_\_tests\_\_/admin.test.js](/src/fullstack/back_end/__tests__/admin.test.js) | JavaScript | 300 | 24 | 78 | 402 |
| [src/fullstack/back\_end/\_\_tests\_\_/auth.test.js](/src/fullstack/back_end/__tests__/auth.test.js) | JavaScript | 199 | 11 | 45 | 255 |
| [src/fullstack/back\_end/\_\_tests\_\_/authController.test.js](/src/fullstack/back_end/__tests__/authController.test.js) | JavaScript | 60 | 0 | 11 | 71 |
| [src/fullstack/back\_end/\_\_tests\_\_/billing.test.js](/src/fullstack/back_end/__tests__/billing.test.js) | JavaScript | 92 | 7 | 23 | 122 |
| [src/fullstack/back\_end/\_\_tests\_\_/legacyAnalytics.test.js](/src/fullstack/back_end/__tests__/legacyAnalytics.test.js) | JavaScript | 45 | 0 | 10 | 55 |
| [src/fullstack/back\_end/\_\_tests\_\_/markets.test.js](/src/fullstack/back_end/__tests__/markets.test.js) | JavaScript | 181 | 0 | 35 | 216 |
| [src/fullstack/back\_end/\_\_tests\_\_/marketsService.test.js](/src/fullstack/back_end/__tests__/marketsService.test.js) | JavaScript | 173 | 0 | 12 | 185 |
| [src/fullstack/back\_end/\_\_tests\_\_/user.test.js](/src/fullstack/back_end/__tests__/user.test.js) | JavaScript | 416 | 30 | 91 | 537 |
| [src/fullstack/back\_end/\_\_tests\_\_/wallet.test.js](/src/fullstack/back_end/__tests__/wallet.test.js) | JavaScript | 68 | 7 | 18 | 93 |
| [src/fullstack/back\_end/app.js](/src/fullstack/back_end/app.js) | JavaScript | 85 | 14 | 21 | 120 |
| [src/fullstack/back\_end/config/env.js](/src/fullstack/back_end/config/env.js) | JavaScript | 50 | 0 | 10 | 60 |
| [src/fullstack/back\_end/config/swagger.js](/src/fullstack/back_end/config/swagger.js) | JavaScript | 46 | 0 | 3 | 49 |
| [src/fullstack/back\_end/config/upstream.js](/src/fullstack/back_end/config/upstream.js) | JavaScript | 28 | 0 | 4 | 32 |
| [src/fullstack/back\_end/controllers/adminController.js](/src/fullstack/back_end/controllers/adminController.js) | JavaScript | 534 | 0 | 96 | 630 |
| [src/fullstack/back\_end/controllers/analyticsController.js](/src/fullstack/back_end/controllers/analyticsController.js) | JavaScript | 216 | 0 | 49 | 265 |
| [src/fullstack/back\_end/controllers/authController.js](/src/fullstack/back_end/controllers/authController.js) | JavaScript | 247 | 9 | 48 | 304 |
| [src/fullstack/back\_end/controllers/billingController.js](/src/fullstack/back_end/controllers/billingController.js) | JavaScript | 74 | 6 | 16 | 96 |
| [src/fullstack/back\_end/controllers/marketsController.js](/src/fullstack/back_end/controllers/marketsController.js) | JavaScript | 75 | 1 | 20 | 96 |
| [src/fullstack/back\_end/controllers/userController.js](/src/fullstack/back_end/controllers/userController.js) | JavaScript | 506 | 4 | 94 | 604 |
| [src/fullstack/back\_end/controllers/walletController.js](/src/fullstack/back_end/controllers/walletController.js) | JavaScript | 54 | 5 | 12 | 71 |
| [src/fullstack/back\_end/db.js](/src/fullstack/back_end/db.js) | JavaScript | 14 | 0 | 3 | 17 |
| [src/fullstack/back\_end/db/00\_extensions.sql](/src/fullstack/back_end/db/00_extensions.sql) | MS SQL | 2 | 1 | 1 | 4 |
| [src/fullstack/back\_end/db/01\_users.sql](/src/fullstack/back_end/db/01_users.sql) | MS SQL | 51 | 5 | 8 | 64 |
| [src/fullstack/back\_end/db/02\_activity.sql](/src/fullstack/back_end/db/02_activity.sql) | MS SQL | 20 | 2 | 5 | 27 |
| [src/fullstack/back\_end/db/03\_subscriptions.sql](/src/fullstack/back_end/db/03_subscriptions.sql) | MS SQL | 28 | 2 | 6 | 36 |
| [src/fullstack/back\_end/db/04\_admin.sql](/src/fullstack/back_end/db/04_admin.sql) | MS SQL | 18 | 1 | 4 | 23 |
| [src/fullstack/back\_end/db/05\_events.sql](/src/fullstack/back_end/db/05_events.sql) | MS SQL | 14 | 1 | 3 | 18 |
| [src/fullstack/back\_end/db/06\_metrics.sql](/src/fullstack/back_end/db/06_metrics.sql) | MS SQL | 9 | 1 | 1 | 11 |
| [src/fullstack/back\_end/db/07\_roles.sql](/src/fullstack/back_end/db/07_roles.sql) | MS SQL | 11 | 2 | 3 | 16 |
| [src/fullstack/back\_end/db/08\_firebase\_auth.sql](/src/fullstack/back_end/db/08_firebase_auth.sql) | MS SQL | 5 | 0 | 3 | 8 |
| [src/fullstack/back\_end/db/init.js](/src/fullstack/back_end/db/init.js) | JavaScript | 32 | 4 | 5 | 41 |
| [src/fullstack/back\_end/middleware/authenticate.js](/src/fullstack/back_end/middleware/authenticate.js) | JavaScript | 43 | 0 | 7 | 50 |
| [src/fullstack/back\_end/middleware/rateLimit.js](/src/fullstack/back_end/middleware/rateLimit.js) | JavaScript | 22 | 3 | 6 | 31 |
| [src/fullstack/back\_end/middleware/requireAdmin.js](/src/fullstack/back_end/middleware/requireAdmin.js) | JavaScript | 10 | 0 | 4 | 14 |
| [src/fullstack/back\_end/middleware/requireSubscription.js](/src/fullstack/back_end/middleware/requireSubscription.js) | JavaScript | 20 | 0 | 6 | 26 |
| [src/fullstack/back\_end/package.json](/src/fullstack/back_end/package.json) | JSON | 33 | 0 | 1 | 34 |
| [src/fullstack/back\_end/routes/admin.js](/src/fullstack/back_end/routes/admin.js) | JavaScript | 14 | 23 | 3 | 40 |
| [src/fullstack/back\_end/routes/analytics.js](/src/fullstack/back_end/routes/analytics.js) | JavaScript | 12 | 0 | 3 | 15 |
| [src/fullstack/back\_end/routes/auth.js](/src/fullstack/back_end/routes/auth.js) | JavaScript | 11 | 66 | 7 | 84 |
| [src/fullstack/back\_end/routes/billing.js](/src/fullstack/back_end/routes/billing.js) | JavaScript | 6 | 21 | 3 | 30 |
| [src/fullstack/back\_end/routes/markets.js](/src/fullstack/back_end/routes/markets.js) | JavaScript | 8 | 11 | 3 | 22 |
| [src/fullstack/back\_end/routes/transactions.js](/src/fullstack/back_end/routes/transactions.js) | JavaScript | 6 | 17 | 3 | 26 |
| [src/fullstack/back\_end/routes/user.js](/src/fullstack/back_end/routes/user.js) | JavaScript | 15 | 49 | 5 | 69 |
| [src/fullstack/back\_end/routes/wallet.js](/src/fullstack/back_end/routes/wallet.js) | JavaScript | 7 | 29 | 4 | 40 |
| [src/fullstack/back\_end/services/analyticsService.js](/src/fullstack/back_end/services/analyticsService.js) | JavaScript | 197 | 0 | 45 | 242 |
| [src/fullstack/back\_end/services/firebaseAdmin.js](/src/fullstack/back_end/services/firebaseAdmin.js) | JavaScript | 43 | 0 | 9 | 52 |
| [src/fullstack/back\_end/services/firebaseAuthSync.js](/src/fullstack/back_end/services/firebaseAuthSync.js) | JavaScript | 169 | 0 | 22 | 191 |
| [src/fullstack/back\_end/services/firebaseToken.js](/src/fullstack/back_end/services/firebaseToken.js) | JavaScript | 64 | 0 | 15 | 79 |
| [src/fullstack/back\_end/services/marketsService.js](/src/fullstack/back_end/services/marketsService.js) | JavaScript | 170 | 0 | 29 | 199 |
| [src/fullstack/back\_end/start.sh](/src/fullstack/back_end/start.sh) | Shell Script | 5 | 1 | 3 | 9 |
| [src/fullstack/back\_end/ws/stream.js](/src/fullstack/back_end/ws/stream.js) | JavaScript | 128 | 29 | 29 | 186 |
| [src/fullstack/front\_end/Dockerfile](/src/fullstack/front_end/Dockerfile) | Docker | 7 | 0 | 4 | 11 |
| [src/fullstack/front\_end/README.md](/src/fullstack/front_end/README.md) | Markdown | 145 | 0 | 38 | 183 |
| [src/fullstack/front\_end/admin.html](/src/fullstack/front_end/admin.html) | HTML | 21 | 0 | 1 | 22 |
| [src/fullstack/front\_end/admin.js](/src/fullstack/front_end/admin.js) | JavaScript | 678 | 11 | 73 | 762 |
| [src/fullstack/front\_end/firebase-client.js](/src/fullstack/front_end/firebase-client.js) | JavaScript | 287 | 0 | 53 | 340 |
| [src/fullstack/front\_end/history.html](/src/fullstack/front_end/history.html) | HTML | 21 | 0 | 1 | 22 |
| [src/fullstack/front\_end/history.js](/src/fullstack/front_end/history.js) | JavaScript | 194 | 15 | 26 | 235 |
| [src/fullstack/front\_end/index.html](/src/fullstack/front_end/index.html) | HTML | 21 | 0 | 1 | 22 |
| [src/fullstack/front\_end/index.js](/src/fullstack/front_end/index.js) | JavaScript | 131 | 0 | 25 | 156 |
| [src/fullstack/front\_end/log\_design.md](/src/fullstack/front_end/log_design.md) | Markdown | 121 | 0 | 36 | 157 |
| [src/fullstack/front\_end/login.html](/src/fullstack/front_end/login.html) | HTML | 21 | 0 | 1 | 22 |
| [src/fullstack/front\_end/login.js](/src/fullstack/front_end/login.js) | JavaScript | 118 | 0 | 25 | 143 |
| [src/fullstack/front\_end/membership.html](/src/fullstack/front_end/membership.html) | HTML | 21 | 0 | 1 | 22 |
| [src/fullstack/front\_end/membership.js](/src/fullstack/front_end/membership.js) | JavaScript | 179 | 1 | 21 | 201 |
| [src/fullstack/front\_end/menu.html](/src/fullstack/front_end/menu.html) | HTML | 21 | 0 | 1 | 22 |
| [src/fullstack/front\_end/menu.js](/src/fullstack/front_end/menu.js) | JavaScript | 179 | 8 | 27 | 214 |
| [src/fullstack/front\_end/nginx.conf](/src/fullstack/front_end/nginx.conf) | Properties | 24 | 4 | 6 | 34 |
| [src/fullstack/front\_end/profile.html](/src/fullstack/front_end/profile.html) | HTML | 21 | 0 | 1 | 22 |
| [src/fullstack/front\_end/profile.js](/src/fullstack/front_end/profile.js) | JavaScript | 703 | 0 | 80 | 783 |
| [src/fullstack/front\_end/proxy\_params.conf](/src/fullstack/front_end/proxy_params.conf) | Properties | 7 | 0 | 1 | 8 |
| [src/fullstack/front\_end/register.html](/src/fullstack/front_end/register.html) | HTML | 21 | 0 | 1 | 22 |
| [src/fullstack/front\_end/register.js](/src/fullstack/front_end/register.js) | JavaScript | 186 | 0 | 32 | 218 |
| [src/fullstack/front\_end/shared.js](/src/fullstack/front_end/shared.js) | JavaScript | 97 | 0 | 6 | 103 |
| [src/fullstack/front\_end/styles.css](/src/fullstack/front_end/styles.css) | PostCSS | 57 | 13 | 15 | 85 |
| [src/fullstack/front\_end/terminal.html](/src/fullstack/front_end/terminal.html) | HTML | 24 | 0 | 1 | 25 |
| [src/fullstack/front\_end/terminal.js](/src/fullstack/front_end/terminal.js) | JavaScript | 1,913 | 0 | 142 | 2,055 |
| [src/fullstack/front\_end/wallet.html](/src/fullstack/front_end/wallet.html) | HTML | 21 | 0 | 1 | 22 |
| [src/fullstack/front\_end/wallet.js](/src/fullstack/front_end/wallet.js) | JavaScript | 239 | 5 | 29 | 273 |

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)