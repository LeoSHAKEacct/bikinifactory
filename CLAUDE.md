# Repository rules (read before pushing)

This repo holds several separate websites. Each folder is deployed by its own Vercel project:

| Folder     | Vercel project                         | Live URL                           |
|------------|----------------------------------------|------------------------------------|
| `pranav/`  | `pranav`                               | https://pranav-sepia.vercel.app (Pranav's own page only) |
| `lase/`    | `lase-properties` (was `bikinifactory-5h36`) | LASE Properties site         |
| `sitios/`  | `sitios` (to be created)               | Admin, student feed and student sites (`/admin`, `/editor`, `/feed`, `/<slug>`) |
| `hospital/` | `hospital` (to be created)            | Hospital patient app: booking, self-triage, AI assistant |

- **Own domains for student sites** are managed by the teacher in the admin ("Dominio propio" box).
  They are stored as host rewrites in `sitios/vercel.json` (written by `sitios/api/_domains.js`); don't edit
  those entries by hand.
- **Each site builds only when its own folder changes.** Every `vercel.json` has an `ignoreCommand` that runs
  `scripts/vercel-ignore.sh` (skip if nothing changed since that project's last successful deployment).
  Keep it in any new site's `vercel.json`; without it every push builds every project and the Hobby plan's
  daily deployment limit runs out.
- **Never force-push `main`** and never rewrite its history (no `git push --force`, no `reset` + push).
  Other sessions' sites live on `main`; a force-push deletes them from production.
  Always `git fetch origin main` and add your commit on top, or merge.
- **Do not mix sites.** Change only the folder you were asked to work on. Do not copy one site
  into another site's folder, and do not route one site's domain through another site's project.
