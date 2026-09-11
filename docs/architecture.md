# Phase 1 architecture

SmartApply uses an npm workspace monorepo so the frontend and backend can be developed together while remaining independently deployable.

## Backend boundaries

- `config`: validated environment and infrastructure setup
- `controllers`: HTTP request/response coordination
- `services`: business rules and transaction orchestration
- `models`: Mongoose persistence models (Phase 2)
- `repositories`: database query boundary
- `routes`: versioned REST endpoint registration
- `middlewares`: authentication, authorization, validation, errors, and security
- `validators`: request schemas
- `utils`: stateless shared utilities

Controllers stay thin; application-count calculations belong in services, and database access is isolated from HTTP concerns. All endpoints live below `/api/v1` and use a consistent response envelope.

## Frontend boundaries

- `app`: providers, routing, theme, and store composition
- `features`: domain modules such as authentication, students, dashboard, and reports
- `components`: reusable presentation and feedback components
- `layouts`: page shells and navigation
- `pages`: route-level composition
- `services`: configured HTTP clients and cross-feature APIs
- `hooks`, `utils`, `constants`: shared supporting code

Feature folders will contain their own components, API adapters, hooks, and validation schemas. Route guards will enforce authenticated and role-specific navigation; the server remains the authorization authority.

## Security baseline

The API uses Helmet, explicit CORS origins, rate limiting, JSON body limits, MongoDB operator sanitization, parameter pollution protection, environment validation, structured logging, and centralized errors. Secrets are never committed. JWT access/refresh behavior and encrypted Naukri credentials will be designed in the authentication and data-model phases.
