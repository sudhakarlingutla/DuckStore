DUCK STORE
==========

A warehouse application (API + web UI) and an order-pricing API for a shop
that sells rubber ducks.

  API : NestJS (Node.js), in the "backend" folder
  UI  : React, in the "frontend" folder
  DB  : MySQL 8, run in Docker


WHAT YOU NEED
-------------

  - Docker with Docker Compose
  - Node.js 22.12 or newer (only for running the tests, or for running the
    API and UI outside Docker)


OPTION A: RUN EVERYTHING WITH ONE COMMAND
-----------------------------------------

From the repository root:

    docker compose up --build

Then open:

    UI   http://localhost:8080
    API  http://localhost:3000/api

The database tables are created automatically. The first run downloads
images and packages, so it takes a few minutes.

To stop and delete the data:

    docker compose down -v

If port 8080, 3000 or 3307 is already in use, copy ".env.example" to ".env"
and change the port there.


OPTION B: RUN THE API AND UI YOURSELF
-------------------------------------

If Option A is running, first free its ports:

    docker compose stop backend frontend

1. Start the database:

    docker compose up -d mysql

2. Install and start the API (terminal 1):

    cd backend
    npm install
    npm run migrate
    npm run start:dev

   The API is now on http://localhost:3000/api

3. Install and start the UI (terminal 2):

    cd frontend
    npm install
    npm run dev

   The UI is now on http://localhost:5173


RUN THE TESTS
-------------

The API's database tests need MySQL running:

    docker compose up -d mysql

API tests:

    cd backend
    npm install
    npm test              (unit tests, no database needed)
    npm run test:e2e      (HTTP and database tests)

  Note: test:e2e prints one red "ERROR ... password=hunter2" line. That is
  expected. One test crashes a route on purpose to check that the response
  does not reveal the cause. Look at the summary at the end for the result.

  These tests use their own database (duckstore_test), not the
  application's data.

UI tests:

    cd frontend
    npm install
    npm test


TRY THE API
-----------

The "samples" folder holds ready-made requests. Run these from the
repository root. They work the same in PowerShell, the Windows command
prompt and bash. (In the old Windows PowerShell 5, type curl.exe instead of
curl.)

Add four ducks:

    curl -X POST http://localhost:3000/api/ducks -H "Content-Type: application/json" -d "@samples/duck-red-large.json"
    curl -X POST http://localhost:3000/api/ducks -H "Content-Type: application/json" -d "@samples/duck-red-large-dearer.json"
    curl -X POST http://localhost:3000/api/ducks -H "Content-Type: application/json" -d "@samples/duck-yellow-medium.json"
    curl -X POST http://localhost:3000/api/ducks -H "Content-Type: application/json" -d "@samples/duck-black-xsmall.json"

List them:

    curl http://localhost:3000/api/ducks

Price three orders:

    curl -X POST http://localhost:3000/api/orders/price -H "Content-Type: application/json" -d "@samples/order-usa-air.json"
    curl -X POST http://localhost:3000/api/orders/price -H "Content-Type: application/json" -d "@samples/order-bolivia-sea.json"
    curl -X POST http://localhost:3000/api/orders/price -H "Content-Type: application/json" -d "@samples/order-france-air-bulk.json"

With only the sample ducks in the warehouse, the totals are:

    order-usa-air           200 Red Large     -> 7982.40
    order-bolivia-sea       10 Yellow Medium  -> 483.90
    order-france-air-bulk   1001 Black XSmall -> 28554.40

Red Large exists at two prices (10 and 12.50). The order is priced from the
cheaper one, because it has enough stock.

Endpoints (all under /api):

    GET    /ducks            list ducks, sorted by quantity
    POST   /ducks            add a duck (merges into an existing one with
                             the same color, size and price)
    PATCH  /ducks/:id        edit price and/or quantity; send the "version"
                             you received
    DELETE /ducks/:id        logical delete
    POST   /orders/price     package, protection, total and breakdown

Allowed values (case-sensitive):

    color         Red, Green, Yellow, Black
    size          XLarge, Large, Medium, Small, XSmall
    shippingMode  Land, Air, Sea
