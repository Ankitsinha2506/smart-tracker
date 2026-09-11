# Phase 2 data model

## Relationship map

```text
User (admin/student) ──0..1── Student
       │ createdBy              │
       ├──────────── Technology ├──< ApplyHistory
       ├──────────── Report     └──> Technology
       └──────────── ActivityLog

DashboardStatistic ──> Technology (embedded aggregate references)
```

MongoDB references are used where records have independent lifecycles. Point-in-time analytics are embedded in `DashboardStatistic` because they are read as a complete snapshot.

## Collections

### Users

Authentication identities for admins and students. Login passwords, refresh tokens, and reset tokens never appear in normal queries. Passwords use bcrypt with cost 12. A sparse unique student reference enforces at most one login per student while allowing admins to exist without student profiles.

### Students

The current candidate profile and latest Naukri application snapshot. Personal email, Naukri email, and mobile number are unique. Technology is referenced so names can be governed centrally. Soft deletion uses `deletedAt` so historical reports remain valid.

`naukriCredential` is excluded from queries and JSON by default. Its value is encrypted using authenticated AES-256-GCM with a unique random IV; it is reversible only through an explicitly selected document and the server encryption key. Changing `ENCRYPTION_KEY` requires a credential-rotation migration.

The three snapshot counts obey:

```text
todayApplicationCount = currentTotalApplicationCount - previousDayApplicationCount
currentTotalApplicationCount >= previousDayApplicationCount >= 0
```

The Phase 3 update service will accept only the new current total, calculate all derived fields, and atomically create history. Client-provided daily counts will be rejected.

### Apply History

The authoritative daily application ledger. Its pre-validation hook overwrites `dailyCount` with the calculated difference and normalizes `applicationDate` to UTC midnight. A unique compound index on student and date prevents duplicate daily records. Phase 3 will update the student snapshot and history in one MongoDB transaction.

### Technologies

Admin-managed technology catalog with unique display name and URL-safe slug. Deactivation preserves existing student and report references.

### Dashboard Statistics

Optional precomputed daily/monthly snapshots for high-volume dashboards. Raw apply history remains authoritative. Unique period/date snapshots allow safe regeneration and fast date-range chart reads.

### Activity Logs

Append-only audit events linking an actor, action, and affected entity. Potentially sensitive field-level changes are excluded from default selection. Logs intentionally have no TTL index because retention is an organizational policy decision.

### Reports

Asynchronous report-job metadata including requested range, filters, format, status, output metadata, and failure details. `storageKey` is private. Expiration is indexed for cleanup, but no TTL is enabled until a retention policy is chosen.

## Index strategy

- Unique identity indexes prevent duplicate emails, phone numbers, technology names/slugs, and daily history.
- Compound indexes support common student filters, daily history lookup, audit timelines, report queues, and cached dashboard periods.
- Descending date indexes support newest-first pages and date-range analytics.
- A student text index supports broad admin search; exact mobile search uses its unique B-tree index.
- Production uses `autoIndex: false`; indexes should be applied through a controlled migration/deployment step.

All collections use timestamps. Mutable operational records use optimistic concurrency where conflicting updates could corrupt count state.
