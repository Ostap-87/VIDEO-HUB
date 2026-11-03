#!/usr/bin/env bash
# Коммит и пуш без докачки чужих больших файлов (03.11.2026).
# Основная папка — частичная копия: в индексе есть файлы, чьих объектов нет на диске (большие картинки и копии для
# публикации, уже лежащие на GitHub). Обычный `git commit` перед записью дерева проверяет все объекты индекса и докачивает
# недостающие разом (~1,7 ГБ) — на почти полном диске это его добивает. Здесь дерево пишется с --missing-ok, коммит —
# commit-tree; на GitHub уходят только новые объекты.
# Использование: bash reels-studio/scripts/lean_commit.sh "сообщение" путь1 путь2 …   (пути — что добавить в коммит)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
msg="$1"; shift
if [ "$#" -gt 0 ]; then git add -- "$@"; fi
tree=$(git write-tree --missing-ok)
parent=$(git rev-parse HEAD)
if [ "$tree" = "$(git rev-parse "HEAD^{tree}")" ]; then echo "нечего коммитить"; exit 0; fi
commit=$(printf '%s\n' "$msg" | git commit-tree "$tree" -p "$parent")
git update-ref -m "lean_commit: ${msg%%$'\n'*}" HEAD "$commit" "$parent"
git log --oneline -1
for i in 1 2 3 4; do
  if git push -q origin HEAD:main; then exit 0; fi
  sleep $((2 ** i))
done
echo "пуш не прошёл" >&2; exit 1
