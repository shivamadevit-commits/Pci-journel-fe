# PCI Journal Portal — Frontend

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui (Radix, `radix-nova`) · React Hook Form + Zod · TanStack Query · Lucide.

The UI talks only to the journal API in `../` (Express/Prisma). API contract: `../docs/API.md`, `../docs/openapi.json`; permission matrix: `../docs/PERMISSIONS.md`; workflow: `../docs/WORKFLOW.md`.

## Run

```bash
cd frontend
npm install
cp .env.example .env.local        # set API_URL to the running backend
npm run dev                       # http://localhost:3000
```

Backend first (from the repo root): `npm run dev` (needs PostgreSQL + `.env`, see `../README.md`). Seed the first admin with `npm run seed` there, then sign in at `/login`.

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |

## Environment

| Variable | Scope | Purpose |
|---|---|---|
| `API_URL` | **server only** | Backend base URL, no `/api/v1` suffix (e.g. `http://localhost:4000`) |
| `NEXT_PUBLIC_APP_NAME` | public | Display name |

No secrets are exposed to the browser.

## How it connects to the API

- **Same-origin proxy** (`app/api/[...path]/route.ts`): the browser calls `/api/<backend path>`; the handler forwards to `${API_URL}/api/v1/<path>`. No CORS configuration is needed on the API.
- **Session**: the API returns JSON tokens. The proxy stores them in **httpOnly cookies** (`pci_at`, `pci_rt`, plus `pci_role` for routing hints only) and removes them from the response body, so page JavaScript never sees a token. On `TOKEN_EXPIRED` it rotates the refresh token once (single-flight) and retries; if the session is gone the cookies are cleared and the user is sent to `/login`.
- `proxy.ts` (Next 16’s replacement for `middleware.ts`) redirects unauthenticated users and wrong-role area access. It is a convenience only — the API authorises every request.
- `lib/api-client.ts` is the typed client: unwraps the `{success,message,data,meta}` envelope, throws `ApiError` (`status`, `code`, field `errors`, `requestId`), and `lib/actions.ts` (`useAction`) adds toasts, cache invalidation, double-submit protection and mapping of server validation errors onto forms.

## Structure

```
app/(auth)        login (+OTP step), register, verify-email, forgot/reset/set-password, reviewer-apply
app/(portal)      author/ editor/ reviewer/ production/ admin/ notifications profile  (sidebar shell, role navigation)
app/(public)      published articles (public API)
app/api           proxy to the backend
components/ui     shadcn/ui     components/layout, forms, tables, shared, editor, author, reviewer, production
lib/              api-client, actions, schemas (Zod), constants (statuses, roles/nav), format, links
hooks/ types/
```

## Modules and the API they use

| Area | Pages | Main endpoints |
|---|---|---|
| Auth | login/OTP, register, verify, forgot/reset/set password, profile | `/auth/*`, `/users/me/profile` |
| Author | dashboard, submissions, new submission (multipart), detail (status, decision, approved comments, proofs/corrections, APC, versions), revision upload | `/author/*`, `/files/:id/download` |
| Editor / Admin | dashboard, queue with filters, manuscript detail (screening, plagiarism, APC, reviewers, reports & comment moderation, decision, production/publication, history), reviewer pool & profile, applications, major changes | `/editorial/*`, `/publication/*` |
| Reviewer | dashboard, assignments, history, anonymised review form (draft/submit/decline) | `/reviewer/*`, `/reviewer-applications` |
| Production | dashboard, queue, proofs, corrections (implement/route to Editor), final HTML/PDF, metadata, hand-off | `/production/*`, `/publication/*` |
| Admin | users & roles, subject areas, portal configuration, audit log | `/admin/*` |
| Shared | notifications (bell + page), published articles | `/notifications*`, `/publications*` |

Actions are shown only for valid role + status combinations (mirroring `../docs/WORKFLOW.md`); the API remains the authority and its 403/409 responses are surfaced as messages.

## Known gaps / dependencies

- Online payment (“Pay online”) and plagiarism “Check via provider” return **503 until PCI selects and wires a provider**; manual recording is fully supported in the UI.
- Revision after peer review is off by default (backend config `allowRevisionAfterReview`); the Request-revision decision and author revision upload exist but the API rejects them until enabled.
- After the author returns minor corrections, production must upload a revised proof and the author approves it — there is no backend endpoint to skip re-proofing, so none is offered.
- The API has no draft/save-before-submit and no endpoint for authors to edit metadata after submission; none is offered.
- Workflow statuses themselves are not configurable (backend constraint); only journal rules under **Admin → Portal configuration**.
- Links in e-mails assume these frontend routes: `/reset-password`, `/set-password`, `/author/articles/:id`, `/editor/articles/:id`, `/reviewer/assignments/:id`, `/production/articles/:id`, `/articles/:submissionId` (all exist here).
- One backend change was made for this frontend: `GET /subject-areas` is now public (needed by the reviewer-application form before sign-in).
- No automated tests or browser testing were run (per project instructions); verified with `tsc`, ESLint and `next build`.
