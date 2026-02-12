/**
 * Dependency boundary rules.
 *
 * Primary enforcement is via tools/check-boundaries.ts (custom script).
 * This file documents the rules for reference and optional use with
 * dependency-cruiser if installed.
 *
 * Architecture: app/ui -> domain -> infra (no reverse imports)
 *
 * | Layer   | Directories               | May import from        |
 * |---------|---------------------------|------------------------|
 * | app/ui  | src/components/, src/pages/| domain, infra, external|
 * | domain  | src/domain/               | external only (pure)   |
 * | infra   | src/infra/                | domain, external       |
 */
module.exports = {
  forbidden: [
    {
      name: "domain-cannot-import-infra",
      severity: "error",
      from: { path: "^src/domain/" },
      to: { path: "^src/infra/" },
    },
    {
      name: "domain-cannot-import-ui",
      severity: "error",
      from: { path: "^src/domain/" },
      to: { path: "^src/(components|pages)/" },
    },
    {
      name: "infra-cannot-import-ui",
      severity: "error",
      from: { path: "^src/infra/" },
      to: { path: "^src/(components|pages)/" },
    },
  ],
};
