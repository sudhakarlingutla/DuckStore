# Duck Store

A small warehouse application and an order-pricing API for a shop that sells rubber ducks.

- **Warehouse** — create, list, edit and logically delete ducks, with a web UI.
- **Store** — one REST endpoint that prices an order and decides its packaging.

Stack: React (Vite, TypeScript), NestJS, MySQL 8.

> This README grows with the project. Sections are filled in as each part is built.

## Prerequisites

- Docker with Docker Compose
- Node.js 22 or newer

## Run it

```
docker compose up -d mysql          # MySQL on host port 3307

cd backend
npm install
npm run migrate                     # creates the ducks table
npm run start                       # API on http://localhost:3000/api
```

To change ports or the local passwords, copy `.env.example` to `.env` (for
Docker) and `backend/.env.example` to `backend/.env` (for the API). The
defaults work together without either file.

## Run the tests

```
cd backend
npm test                            # unit tests, no database needed
npm run test:e2e                    # HTTP and database tests, need MySQL running
```

The database tests use a separate database, `duckstore_test`, which the MySQL
container creates on first start. They never touch the application's data.

## Decisions and assumptions

The brief leaves several points open. Each choice below is deliberate.

### Warehouse

| Question | Decision | Why |
|---|---|---|
| How is "same duck" kept unique under concurrent adds? | A unique index on (color, size, price, active flag) plus one `INSERT ... ON DUPLICATE KEY UPDATE` statement. | The database enforces the rule, so no request ordering can break it and no application-level lock is needed. |
| Price is a "Double" in the brief. | Stored as `DECIMAL(10,2)`; handled in code as whole cents. Prices with more than two decimals are rejected. | Merging needs exact equality on price, and floating point cannot give that. |
| Does a deleted duck count as "already exists"? | No. Adding a duck that matches only a deleted one creates a new record. | Deleted stock is gone; reviving it would bring back its old quantity. |
| What if an edit changes the price to one another active duck of the same color and size already has? | Refused with `409 DUCK_PRICE_CONFLICT`. | It would create the duplicate the merge rule forbids. Merging the two records silently would be a surprising side effect of an edit. |
| What if a duck changes between loading the edit form and saving it? | Each duck has a `version`. An edit must send the version it loaded; if it is out of date the edit is refused with `409 STALE_VERSION`. | Otherwise saving an old form would overwrite stock merged in meanwhile. |
| Sort order of the listing | Quantity, largest first; id ascending breaks ties. | The brief says "sort by quantity" without a direction. A fixed tie-break keeps the order stable. |
| Add returns | `201` when a record was created, `200` when it was merged. | The caller can tell which happened without an extra field. |
| Limits | Add: quantity 1 to 1,000,000. Edit: quantity 0 and up. Price above 0, at most 999,999.99. | Adding zero is not an addition; a duck can be out of stock. |
| Unknown fields in a request | Rejected with 400, not ignored. | Sending `color` on an edit should fail loudly, since color cannot be edited. |
| Deleting a deleted duck | `404`. | From the API's point of view it no longer exists. |
| Ids after a merge | May skip numbers. | MySQL reserves an id before it knows the insert will merge. Ids stay unique and stable. |
