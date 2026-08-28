# 13 — Release & Versioning

Status: **Draft**
References: [`07-ops-runbook.md`](./07-ops-runbook.md) (deploy), `package.json`

> Numbering 13 mengikuti terra `13-release-versioning` supaya mapping mudah. OIS single package (bukan monorepo workspaces) — alur lebih sederhana.

---

## Current state

- `package.json` `version: 0.0.0` — belum pernah bump (sama seperti terra pre-release).
- `private: true` — tidak publish ke npm, version sebagai penanda rilis internal.
- Rilis sebelumnya pakai **milestone tag** `M1..M5` (`docs/milestones/`) — bukan semver.

## Skema versi

Pakai **SemVer** (`MAJOR.MINOR.PATCH`) untuk root package:

| Bump | Perintah | Kapan |
|------|----------|-------|
| `patch` | `npm version patch --no-git-tag-version` | Fix, refactor, polish, docs — tanpa perubahan API/DB |
| `minor` | `npm version minor --no-git-tag-version` | Fitur baru non-breaking: endpoint/field/kolom DB baru, tetap backward-compatible |
| `major` | `npm version major --no-git-tag-version` | Breaking: kontrak API berubah, migration destruktif, rename/remove endpoint |

- Non-breaking addition (field opsional baru, endpoint baru) → `minor`.
- Internal only (refactor, UI polish) → `patch`.

## Kapan rilis (momen bump)

Bump saat **rilis**, bukan per-commit:

1. Milestone selesai (`M6`, `M7`, ...) → `minor`.
2. Deploy ke staging → sesuai isi (`patch`/`minor`/`major`).
3. Breaking change merged → `major`.
4. Hotfix ke prod → `patch`.

Alur:

```bash
npm run lint && npm run test
npm version <patch|minor|major> --no-git-tag-version
git add -A && git commit -m "release: vX.Y.Z"
git tag vX.Y.Z
git push && git push --tags
```

`--no-git-tag-version` agar npm tidak auto-commit/tag — kita buat manual supaya satu tag = satu rilis utuh.

## Milestone tags (existing)

Tetap pakai `M1..M5` untuk history. Mulai `M6` dan seterusnya, kombinasikan: `git tag v0.1.0` + `git tag M6` di commit yang sama jika perlu.

## Open Items

- [ ] CI check `version` bump saat `prisma/migrations` berubah (breaking signal).
- [ ] Changelog aggregator (generate dari `docs/design/*/Changelog` + `docs/milestones/`).

## Resolved Decisions

| Keputusan | Rationale | Tanggal |
|-----------|-----------|---------|
| SemVer single package | OIS single `package.json`, tidak perlu `--workspaces` seperti terra | 2026-08-28 |
| `private: true` tetap | Penanda rilis internal, bukan npm publish | awal |

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Init release versioning — SemVer single package + milestone tag bridge | — |
