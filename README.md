# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Local Verification Loop

```sh
# 1. Install dependencies
npm ci

# 2. Run all 7 oracles (single command)
bash tools/verify

# 3. Fix any failures, then re-run
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
| 6 | Build | Vite production build (import smoke test) |
| 7 | Tests | Vitest unit tests |

> **Note:** GitHub Actions CI gating is deferred to a future ticket. For now, `tools/verify` is the sole enforcement gate, run locally or inside Lovable. See [docs/LOCAL_VERIFY.md](docs/LOCAL_VERIFY.md) for the full local runbook and [docs/VERIFY_LOG.md](docs/VERIFY_LOG.md) for recorded run evidence.

For manual integration testing, see [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md).

## How to Run Tickets Safely in Lovable

Every ticket lists an **Allowed edits** section with explicit file paths. When working inside Lovable (or any AI agent):

1. **Only edit files named in Allowed edits.** No exceptions.
2. If you discover a file outside that list needs changing, **STOP** and output `NEEDS FOLLOW-UP TICKET` with the file list and a minimal ticket proposal.
3. Resume work on in-scope files only.
4. After finishing, confirm the set of changed files matches the allowed list.

This prevents scope creep — the most common source of regressions.

For the reusable ticket format, see [docs/TICKET_TEMPLATE.md](docs/TICKET_TEMPLATE.md).
Any scope exceptions are logged in [docs/SCOPE_EXCEPTIONS.md](docs/SCOPE_EXCEPTIONS.md).

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
