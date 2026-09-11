# SmartApply

SmartApply is a MERN application for managing student job-application activity.

## Prerequisites

- Node.js 20.19+
- MongoDB 7+ or MongoDB Atlas

## Local setup

1. Copy `server/.env.example` to `server/.env` and replace every secret.
2. Copy `client/.env.example` to `client/.env`.
3. Run `npm install` from the repository root.
4. Run `npm run dev` and open `http://localhost:5173`.

The API runs at `http://localhost:5000`; its health endpoint is `/api/v1/health`.

## Workspaces

- `client`: React, Vite, Material UI, Router, Axios, React Hook Form/Yup, Recharts
- `server`: Express, Mongoose, JWT, validation, logging, and security middleware

See [`docs/architecture.md`](docs/architecture.md) for the Phase 1 architecture.
See [`docs/data-model.md`](docs/data-model.md) for the Phase 2 collections, relationships, and indexes.
See [`docs/api.md`](docs/api.md) for the Phase 3 REST endpoints and bootstrap instructions.
See [`docs/frontend.md`](docs/frontend.md) for the Phase 4 route map and integrated workflows.
See [`docs/testing.md`](docs/testing.md) for the Phase 5 test suites, hardening, and release checklist.
