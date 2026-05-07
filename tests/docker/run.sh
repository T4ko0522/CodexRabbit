#!/bin/sh
# ホスト側で実行する probe ランナー。
# codex-review イメージをビルドし、コンテナ内で probe.sh を回す。
#
# 使い方:
#   sh tests/docker/run.sh
#
# 前提:
#   - Docker (Desktop / Engine) が起動している
#   - リポジトリのルートから実行する想定 (このスクリプトはどこから呼んでも動く)

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PROBE="$REPO_ROOT/tests/docker/probe.sh"

if [ ! -f "$PROBE" ]; then
  echo "probe.sh が見当たらない: $PROBE" >&2
  exit 1
fi

IMAGE="codex-review:probe"

echo "== build $IMAGE =="
docker build --quiet -t "$IMAGE" "$REPO_ROOT" >/dev/null
echo "  built"

echo ""
echo "== run probe =="
# tests/ は .dockerignore で除外しているので bind マウントで持ち込む。
# 本番と同じ named volume は使わず、コンテナ内の tmpfs 相当 (匿名 volume) で動かす:
#   - ホスト側にゴミを残さない
#   - 名前付きボリュームの初期化挙動を毎回フレッシュに検証できる
#
# 行継続 (\) を使うと PowerShell から sh を呼んだ際に壊れやすいので 1 行に纏める。
echo "  docker run --rm --entrypoint sh -v $PROBE:/probe.sh:ro $IMAGE /probe.sh"
docker run --rm --entrypoint sh -v "$PROBE:/probe.sh:ro" "$IMAGE" /probe.sh

echo ""
echo "== done =="
