#!/bin/sh
# Vercel "Ignored Build Step" shared by the sites in this repo.
#   exit 0 = skip this deployment, exit 1 = build it (never any other code).
# A project builds only when its own files changed since its last successful deployment,
# so a push to one site no longer spends a build on every other site.
# Any doubt (first deployment, previous commit not in the clone) -> build.
# Usage, from the project's root directory:  sh ../scripts/vercel-ignore.sh [pathspec...]   (default: .)
P="$VERCEL_GIT_PREVIOUS_SHA"
[ -n "$P" ] || { echo "No previous deployment: build"; exit 1; }
git cat-file -e "$P^{commit}" 2>/dev/null || git fetch -q --deepen=300 >/dev/null 2>&1 || true
git cat-file -e "$P^{commit}" 2>/dev/null || { echo "Last deployed commit $P not in the clone: build"; exit 1; }
[ $# -gt 0 ] || set -- .
if git diff --quiet "$P" HEAD -- "$@"; then echo "Nothing changed for this site since $P: skip"; exit 0; fi
echo "This site changed since $P: build"; exit 1
