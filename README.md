# eligibility-frontend

React + TypeScript + Vite + TanStack UI for the **Eligibility & Enrollment Platform**.

## Features

- **Eligibility grid** — virtualized, server-side cursor pagination, per-column sort + filter (inline icons in headers), column show/hide, density toggle (comfortable / compact), saved views.
- **Status filter chips** at the top — Active / Pending / Terminated, toggleable.
- **Active filter chips** below toolbar — every Advanced Search filter shows as a removable chip, with "Clear all".
- **Advanced Search modal** — 15 fields grouped into Member / Group&Plan / Coverage dates sections.
- **Add Member modal** — orchestrated through the BFF GraphQL `addMember` mutation. Auto-generates Member ID Card if blank.
- **Member detail drawer** with bitemporal timeline (valid-time vs transaction-time, in-force flag).
- **Groups admin** (`/groups`) — full CRUD for payers, employers, subgroups, plan visibility.
- **File Upload + Job Status** — resumable upload, polls BFF `fileJob` until terminal.
- **Light + dark theme** (proper readable token palette).
- **Click-outside + Escape** closes every popover (modern UX).

## Prerequisites

| Tool | Version |
|---|---|
| Node | 20+ |
| npm | 10+ |
| Docker | 24+ (only if running the BFF backend stack) |

## Run

```bash
# 1. Configure
cp .env.example .env
# (set VITE_BFF_URL — defaults to http://localhost:4000)

# 2. Install + dev
npm install
npm run dev    # → http://localhost:5173 (or 3000 in docker-compose)
```

## Build for production

```bash
npm run build       # outputs to dist/
npm run preview     # serves dist/ for sanity check
```

## Test

```bash
npm run typecheck   # strict tsc
npm run test --if-present
npm run lint
```

## With Docker

This repo's Dockerfile runs Vite dev server on port 5173. The orchestration repo maps it to host port **3000**.

```bash
docker build -t eligibility-frontend:local .
docker run --rm -p 3000:5173 eligibility-frontend:local
# → http://localhost:3000
```

## Environment variables

See [`.env.example`](.env.example).

| Var | Default | Purpose |
|---|---|---|
| `VITE_BFF_URL` | `http://localhost:4000` | BFF GraphQL + REST endpoint |

## Project layout

```
src/
├── api/               # GraphQL client (graphql-request) + typed wrappers
│   ├── bff.ts         # Queries + mutations for the BFF
│   └── types.ts       # Shared TS types (mirror BFF schema)
├── app/
│   ├── AppShell.tsx   # Layout: header nav, theme toggle, footer
│   └── GlobalStatus.tsx
├── components/        # Reusable: Button, Modal, Spinner, Banner, ...
├── features/
│   ├── eligibility/   # Grid, AdvancedSearchModal, AddMemberModal, SavedViews
│   ├── groups/        # GroupsAdmin (bonus task)
│   ├── member/        # Member detail drawer + timeline
│   └── upload/        # File upload + job status
├── lib/               # Hooks: useClickOutside, useDebounce, useLocalStorage, router
├── styles/            # Token palette (CSS vars, light + dark)
└── main.tsx           # React entrypoint
```

## Talks to

- BFF GraphQL: `POST {VITE_BFF_URL}/graphql`
- BFF REST upload: `POST {VITE_BFF_URL}/files/eligibility`

Headers added on every request:
- `X-Tenant-Id` (multi-tenant routing)
- `X-Correlation-Id` (request tracing)

## License

MIT.
