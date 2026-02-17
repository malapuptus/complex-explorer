# Welcome to Complex Mapper

A word-association research tool built with React, TypeScript, Vite, and Tailwind CSS.

## Quick Start

```sh
# 1. Clone the repository
git clone <YOUR_GIT_URL>

# 2. Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# 3. Install dependencies
npm ci

# 4. Start the development server
npm run dev
```

## Local Verification Loop

```sh
# Run all 8 oracles (single command)
bash tools/verify

# Fix any failures, then re-run
bash tools/verify
```

**Cross-platform fallback:** `node tools/verify.mjs`

The `tools/verify` script runs these checks in order (fails fast):

| # | Oracle | What it checks |
|---|--------|---------------|
| 1 | Repo hygiene | File length ≤350, function length ≤60, no console.log |
| 2 | Format | Prettier compliance |
| 3 | Lint | ESLint rules |
| 4 | Typecheck | TypeScript compilation |
| 5 | Boundaries | Layer imports (domain cannot import infra/ui) |
| 6 | Load smoke | Vite SSR import test |
| 7 | Build | Vite production build |
| 8 | Tests | Vitest unit tests |

> See [docs/LOCAL_VERIFY.md](docs/LOCAL_VERIFY.md) for the full local runbook and [docs/VERIFY_LOG.md](docs/VERIFY_LOG.md) for recorded run evidence.

For manual integration testing, see [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md).

## How to Run Tickets Safely

Every ticket lists an **Allowed edits** section with explicit file paths. When working inside Lovable (or any AI agent):

1. **Only edit files named in Allowed edits.** No exceptions.
2. If you discover a file outside that list needs changing, **STOP** and output `NEEDS FOLLOW-UP TICKET` with the file list and a minimal ticket proposal.
3. Resume work on in-scope files only.
4. After finishing, confirm the set of changed files matches the allowed list.

This prevents scope creep — the most common source of regressions.

For the reusable ticket format, see [docs/TICKET_TEMPLATE.md](docs/TICKET_TEMPLATE.md).
Any scope exceptions are logged in [docs/SCOPE_EXCEPTIONS.md](docs/SCOPE_EXCEPTIONS.md).

## Technology Stack

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
