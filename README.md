# Duck Store

A small warehouse application and an order-pricing API for a shop that sells rubber ducks.

- **Warehouse** — create, list, edit and logically delete ducks, with a web UI.
- **Store** — one REST endpoint that prices an order and decides its packaging.

Stack: React (Vite, TypeScript), NestJS, MySQL 8.

> This README grows with the project. Setup steps, the API reference and the
> list of design decisions are filled in as each part is built.

## Prerequisites

- Docker with Docker Compose
- Node.js 22 or newer

## Start the database

```
docker compose up -d mysql
```

MySQL is published on host port `3307`. To change the port or the local
passwords, copy `.env.example` to `.env` and edit it.
