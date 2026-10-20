#!/bin/sh
# Build step: copy the page and pull the openly licensed photos from Wikimedia Commons so they are served from this site.
set -u
mkdir -p public/photos
cp index.html public/
UA="FarnsworthPageBuild/1.0 (static site build; contact via site)"
get() { # $1 = Commons file name, $2 = local name
  curl -sSfL -A "$UA" --retry 2 -m 60 -o "public/photos/$2.jpg" "https://commons.wikimedia.org/wiki/Special:FilePath/$1?width=2000" && echo "ok $2" || { echo "miss $2"; rm -f "public/photos/$2.jpg"; }
}
while read -r f n; do [ -n "$f" ] && get "$f" "$n"; done < photos.txt
ls -la public/photos
