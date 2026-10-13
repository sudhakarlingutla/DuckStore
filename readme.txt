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

Add a duck:

    curl -X POST http://localhost:3000/api/ducks -H "Content-Type: application/json" -d "{\"color\":\"Red\",\"size\":\"Large\",\"price\":10,\"quantity\":5000}"

Price an order:

    curl -X POST http://localhost:3000/api/orders/price -H "Content-Type: application/json" -d "{\"color\":\"Red\",\"size\":\"Large\",\"quantity\":200,\"destinationCountry\":\"USA\",\"shippingMode\":\"Air\"}"

The second call answers with a total of 7982.4.

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
