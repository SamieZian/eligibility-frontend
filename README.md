# eligibility-frontend

React + TypeScript + Vite + TanStack UI for the Eligibility & Enrollment Platform.

## Features

- **Eligibility grid** — virtualized, server-side pagination (cursor), column config + density (persisted in localStorage), quick search + advanced search modal.
- **Advanced Search modal** matches the wireframe — 15 filter fields (Member ID, SSN last 4, employer, subgroup, plan, DOB, effective/term date ranges, member type, status).
- **Member detail drawer** with a bitemporal enrollment timeline (valid-time vs transaction-time, in-force rows highlighted, historical rows dimmed).
- **File Upload + Job Status** — resumable upload, polls BFF `fileJob` until terminal.
- **Saved views** — named filter presets.

## Run

```bash
npm install
VITE_BFF_URL=http://localhost:4000 npm run dev
# → http://localhost:5173
```

Build for prod:
```bash
npm run build && npm run preview
```

## Test

```bash
npm run typecheck
npm run test --if-present
```

## Talks to

- BFF GraphQL at `/graphql` (default http://localhost:4000)
- REST `POST /files/eligibility` on the BFF for uploads.

## License

MIT.
