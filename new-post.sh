#!/bin/bash
# 新建日记脚本 — 用法: ./new-post.sh "日记标题"

if [ -z "$1" ]; then
  echo "用法: ./new-post.sh \"日记标题\""
  exit 1
fi

DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M:%S)
SLUG=$(echo "$1" | sed 's/ /-/g')

FILE="_posts/${DATE}-${SLUG}.md"

cat > "$FILE" <<EOF
---
title: "$1"
date: ${DATE} ${TIME}
---

EOF

echo "已创建: $FILE"
echo "用任意文本编辑器打开，写完内容后保存，然后运行:"
echo ""
echo "  git add -A && git commit -m \"新日记: $1\" && git push"
