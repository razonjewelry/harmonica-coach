#!/usr/bin/env bash
# בונה ומפרסם את האתר לשתי הכתובות (הישנה והחדשה) ב-GitHub Pages
set -e
cd "$(dirname "$0")/.."
npm run build
touch dist/.nojekyll
for repo in harmonica-coach harmonica-app; do
  (cd dist && rm -rf .git && git init -q -b gh-pages && git add -A && \
    git -c user.name=razonjewelry -c user.email=razonjewelry@users.noreply.github.com commit -q -m "Deploy site" && \
    git remote add origin "https://github.com/razonjewelry/$repo.git" && git push -q -f origin gh-pages)
  echo "deployed to $repo"
done
rm -rf dist/.git
