# Phase 4 frontend

## Route map

- Public: `/login`, `/forgot-password`, `/reset-password`
- Admin: `/dashboard`, `/students`, `/history`, `/reports`, `/technologies`, `/users`, `/settings`
- Student: `/my-profile`, `/history`, `/settings`

Access tokens stay in memory and are restored through the HTTP-only refresh cookie. A single Axios interceptor retries an expired authenticated request once after refreshing. Route guards improve navigation, while server-side authorization remains authoritative.

The application uses route-level lazy loading. Dashboard/Recharts and management modules are split out of the initial authentication bundle.

## Integrated workflows

- Login, Remember Me, logout, forgot/reset password, and password change
- Admin dashboard date filtering and all six analytics charts
- Server-paginated student search, filtering, sorting, CRUD, and soft deletion
- Current-total-only application updates with a calculated-difference preview
- Admin and Student application history
- CSV, XLSX, and PDF report downloads
- Technology catalog and user-account management
- Student profile, latest application snapshot, and self-service updates
- Responsive desktop/mobile navigation and light/dark themes

Configure `VITE_API_BASE_URL` in `client/.env`. Production hosts must route all frontend paths to `index.html` so React Router can handle deep links.
