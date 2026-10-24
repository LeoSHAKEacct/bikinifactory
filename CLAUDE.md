# Repository rules (read before pushing)

This repo holds several separate websites. Each folder is deployed by its own Vercel project:

| Folder     | Vercel project                         | Live URL                           |
|------------|----------------------------------------|------------------------------------|
| `pranav/`  | `pranav`                               | https://pranav-sepia.vercel.app (Pranav's own page only) |
| `lase/`    | `lase-properties` (was `bikinifactory-5h36`) | LASE Properties site         |
| `sitios/`  | `sitios` (to be created)               | Admin, student feed and student sites (`/admin`, `/editor`, `/feed`, `/<slug>`) |
| `casagatica/` | `casagatica` (to be created) | Casa Gatica (Medellín) site — redesign of casagaticacaliente.com |

- **Never force-push `main`** and never rewrite its history (no `git push --force`, no `reset` + push).
  Other sessions' sites live on `main`; a force-push deletes them from production.
  Always `git fetch origin main` and add your commit on top, or merge.
- **Do not mix sites.** Change only the folder you were asked to work on. Do not copy one site
  into another site's folder, and do not route one site's domain through another site's project.
