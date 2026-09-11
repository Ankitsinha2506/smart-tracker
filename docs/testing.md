# Phase 5 testing and hardening

## Automated suites

```bash
npm test             # Backend unit and HTTP integration tests
npm run test:e2e     # Desktop and mobile Chromium journeys
npm run lint         # Frontend and backend static analysis
npm run build        # Production frontend bundle
npm run format:check # Repository formatting
npm audit            # Dependency advisories
```

Playwright builds and serves the production frontend. Its deterministic request interception mocks only `/api/v1`, so tests exercise the real React application without altering development or production MongoDB records. Failed browser runs retain screenshots, video, and traces in ignored local artifact directories.

Covered browser journeys include public login, Admin dashboard rendering, Admin application-count updates, Student route isolation, Student self-service updates, desktop/mobile layouts, and axe accessibility analysis.

## Hardening applied

- Global and authentication-specific rate limits
- Temporary account lockout after five failed logins
- Trusted-origin enforcement for unsafe browser requests
- HTTP-only secure refresh cookies and in-memory access tokens
- Request IDs in responses and activity logs
- Helmet, explicit CORS, body limits, HPP, operator sanitization, and compression
- Spreadsheet-formula neutralization in CSV/XLSX reports
- React top-level error recovery boundary
- Route-level code splitting and debounced student search
- Semantic landmarks, heading order, navigation structure, and accessible icon labels

## Release checklist

- Use Node.js 20 LTS and MongoDB Atlas or a replica set.
- Rotate all JWT and encryption secrets; never reuse example values.
- Configure the exact production `CLIENT_URL` and SMTP settings.
- Run the Admin seed once, then remove bootstrap credentials from the hosting environment.
- Run every command above in CI before deployment.
- Perform a staging smoke test against real MongoDB and SMTP integrations.
