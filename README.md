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

### Store

| Question | Decision | Why |
|---|---|---|
| Is each percentage taken of the base cost or of the running total? | Of the running total, in the order the brief lists the rules. Each breakdown line states the amount it was calculated on. | The brief lists the rules as an ordered sequence acting on "the total cost". The order only means something if each rule sees the result of the ones before it. The other reading is a one-line change in each rule (pass the base cost instead of the running total). |
| Are shipping charges subject to the percentages? | No. Shipping is added last. | It is listed last, and it is a flat or per-unit amount rather than a share of the goods' cost. |
| The air discount | 15% of the air charge only, shown as its own line. | The brief says "reduce the air charge by 15%". |
| Thresholds | "More than 100" and "exceeds 1000" are strict: 100 and 1000 units get no discount. | Literal reading. |
| Rounding | Every line is rounded half-up to the cent, so the base cost plus all lines always equals the total exactly. | A breakdown that does not add up to the total cannot be checked by the customer. |
| The order has no price. Which warehouse price applies when a color and size exist at several prices? | The cheapest active record that can cover the whole quantity. | The customer gets the best price that can actually be fulfilled. Deterministic: prices are unique per color and size. |
| Stock spread across several records | Not combined. If no single record covers the quantity: `422 INSUFFICIENT_STOCK`. | The pricing rules assume one unit price per order; splitting would need per-lot pricing the brief does not describe. |
| Does pricing an order reduce stock? | No. The endpoint is a read-only quote and stores nothing. | The brief asks for a pricing API whose response is packaging and a total; it defines no checkout or fulfilment step. A quote that consumed stock would give a different answer each time it was asked. To add ordering later, a separate "place order" step would decrement stock with one conditional `UPDATE ... WHERE quantity >= ?`. |
| Country matching | By name, ignoring case and surrounding spaces. Only USA, Bolivia and India have their own rate; anything else, including "United States", is "any other destination" (15%). | The brief gives names, not codes. A real shop would take ISO country codes. |
| No duck of that color and size | `404 NO_MATCHING_DUCK`. Deleted ducks are never used for pricing. | |

## API

All paths are under `/api`. Money is a JSON number in US dollars with at most two decimals.

| Method and path | Body | Success | Errors |
|---|---|---|---|
| `GET /ducks` | – | `200` list of active ducks, by quantity descending | – |
| `POST /ducks` | `color`, `size`, `price`, `quantity` | `201` created or `200` merged; the duck | `400`, `422` |
| `PATCH /ducks/:id` | `version`, and `price` and/or `quantity` | `200` the duck | `400`, `404`, `409` |
| `DELETE /ducks/:id` | – | `204` | `400`, `404` |
| `POST /orders/price` | `color`, `size`, `quantity`, `destinationCountry`, `shippingMode` | `200` the quote | `400`, `404`, `422` |

Colors: `Red`, `Green`, `Yellow`, `Black`. Sizes: `XLarge`, `Large`, `Medium`, `Small`, `XSmall`. Shipping modes: `Land`, `Air`, `Sea`. These are case-sensitive.

Every error has the same shape:

```json
{ "statusCode": 409, "code": "STALE_VERSION", "message": "This duck was changed by someone else. Reload and try again.", "details": [] }
```

| Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | A field is missing, invalid or unknown. `details` names each one. |
| 404 | `DUCK_NOT_FOUND` | No active duck with that id. |
| 404 | `NO_MATCHING_DUCK` | The warehouse has no active duck of the ordered color and size. |
| 409 | `STALE_VERSION` | The edit was based on an out-of-date version of the duck. |
| 409 | `DUCK_PRICE_CONFLICT` | Another active duck of that color and size already has the new price. |
| 422 | `INSUFFICIENT_STOCK` | No single record has enough stock for the order. |
| 422 | `STOCK_LIMIT_EXCEEDED` | The add would push one record past the largest quantity it can hold. |

### Try it

```
curl -X POST http://localhost:3000/api/ducks -H "Content-Type: application/json" \
  -d '{"color":"Red","size":"Large","price":10,"quantity":5000}'

curl -X POST http://localhost:3000/api/orders/price -H "Content-Type: application/json" \
  -d '{"color":"Red","size":"Large","quantity":200,"destinationCountry":"USA","shippingMode":"Air"}'
```

The second call answers:

```json
{
  "packageType": "Wood",
  "protectionTypes": ["Polystyrene balls"],
  "duckId": 1,
  "unitPrice": 10,
  "quantity": 200,
  "baseCost": 2000,
  "breakdown": [
    { "code": "VOLUME_DISCOUNT", "description": "Over 100 units: 20% discount", "rate": 0.2, "basis": 2000, "amount": -400, "runningTotal": 1600 },
    { "code": "PACKAGE_WOOD", "description": "Wood package: +5%", "rate": 0.05, "basis": 1600, "amount": 80, "runningTotal": 1680 },
    { "code": "DESTINATION_USA", "description": "Destination USA: +18%", "rate": 0.18, "basis": 1680, "amount": 302.4, "runningTotal": 1982.4 },
    { "code": "SHIPPING_AIR", "description": "Air shipment: 30 USD x 200 units", "amount": 6000, "runningTotal": 7982.4 }
  ],
  "total": 7982.4,
  "currency": "USD"
}
```
