# SmartApply REST API (Phase 3)

Base path: `/api/v1`. JSON endpoints use `{ success, message, data, meta? }`; errors use `{ success: false, message, errors? }`. Send access tokens as `Authorization: Bearer <token>`. Refresh tokens are rotated into an HTTP-only cookie.

## Authentication and users

| Method | Endpoint                | Access         | Purpose                                          |
| ------ | ----------------------- | -------------- | ------------------------------------------------ |
| POST   | `/auth/login`           | Public         | Login; accepts `email`, `password`, `rememberMe` |
| POST   | `/auth/refresh`         | Refresh cookie | Issue a new access token                         |
| POST   | `/auth/forgot-password` | Public         | Create and email a 15-minute reset token         |
| POST   | `/auth/reset-password`  | Public         | Reset using `token` and compliant `password`     |
| GET    | `/auth/me`              | Authenticated  | Current user                                     |
| POST   | `/auth/logout`          | Authenticated  | Revoke refresh session and clear cookie          |
| PATCH  | `/auth/change-password` | Authenticated  | Change password and revoke session               |
| GET    | `/auth/users`           | Admin          | List users                                       |
| POST   | `/auth/users`           | Admin          | Create an Admin or linked Student user           |
| PATCH  | `/auth/users/:id`       | Admin          | Change name, role, status, or student link       |

Passwords require 8–128 characters with uppercase, lowercase, and a digit. In development only, forgot-password also returns the reset token to support local testing. Production requires SMTP configuration and never returns it.

## Students

| Method | Endpoint                          | Access         | Purpose                                        |
| ------ | --------------------------------- | -------------- | ---------------------------------------------- |
| GET    | `/students`                       | Admin          | Paginated search/filter/sort                   |
| POST   | `/students`                       | Admin          | Create profile; initial total becomes baseline |
| GET    | `/students/:id`                   | Admin or owner | View profile                                   |
| PATCH  | `/students/:id`                   | Admin          | Update profile, excluding count fields         |
| DELETE | `/students/:id`                   | Admin          | Soft-delete profile                            |
| GET    | `/students/me`                    | Student        | View own linked profile                        |
| PATCH  | `/students/:id/application-count` | Admin or owner | Submit only the new total                      |
| PATCH  | `/students/me/application-count`  | Student        | Submit own new total                           |

List query parameters: `page`, `limit`, `search`, `technology`, `trainer`, `membershipType`, `batch`, `status`, `from`, `to`, `minApplications`, `maxApplications`, and `sort`. Sort values are `name_asc`, `name_desc`, `applications_high`, `applications_low`, `newest`, and `oldest`.

Count updates run in a MongoDB transaction and upsert one UTC-normalized history entry per student/day. MongoDB transactions require Atlas or a replica set, including in local production-like testing.

## Technologies and history

| Method | Endpoint               | Access        | Purpose                                               |
| ------ | ---------------------- | ------------- | ----------------------------------------------------- |
| GET    | `/technologies`        | Authenticated | List catalog; students see active entries             |
| POST   | `/technologies`        | Admin         | Create technology                                     |
| PATCH  | `/technologies/:id`    | Admin         | Update or deactivate technology                       |
| GET    | `/application-history` | Authenticated | Admin sees filtered data; students see only their own |

History supports `page`, `limit`, `student`, `from`, `to`, and `sort` (`newest`, `oldest`, `applications_high`, `applications_low`).

## Dashboard and reports

| Method | Endpoint               | Access | Purpose                                 |
| ------ | ---------------------- | ------ | --------------------------------------- |
| GET    | `/dashboard?from=&to=` | Admin  | Cards and all six chart datasets        |
| GET    | `/reports`             | Admin  | Paginated report-job history            |
| POST   | `/reports/generate`    | Admin  | Generate and download CSV, XLSX, or PDF |

Report generation accepts `name`, `type`, `format`, `from`, `to`, and optional filters for technologies, trainers, batches, membership, and student status. The binary response includes `X-Report-Id`; report metadata and failures are retained in MongoDB.

## Bootstrap

Set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`, then run:

```bash
npm run seed:admin -w server
```

Use a MongoDB Atlas cluster or local replica set before testing transactional application-count updates.
