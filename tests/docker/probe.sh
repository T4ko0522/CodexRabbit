#!/bin/sh
# Codex Rabbit Docker permission smoke probe.
#
# このスクリプトは codex-review イメージのコンテナ内で実行する。
# 自動 fix のフローで実際に行う file system 書き込み と git 操作 を、
# production と同じ呼び出し順序で再現し、permission エラーが出ないことを確認する。
#
# 検証する観点:
#   1. /app/data, /app/workspaces, /root/.codex への書き込み権限
#   2. git / codex バイナリが PATH にある
#   3. workspace の clone → checkout -b → commit (env author) → push → rmSync
#      の連鎖が完走し、root 所有のディレクトリが残らない
#
# 終了コード: 0 = 成功 / 1 = いずれかの検証で失敗

set -eu

PASS="  [ok]"
FAIL_COUNT=0
fail() {
  echo "  [FAIL] $1" >&2
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

echo "== 1. ファイルシステム書き込み権限 =="

mkdir -p /app/data /app/workspaces /root/.codex

if echo probe > /app/data/.probe.tmp 2>/dev/null && rm /app/data/.probe.tmp; then
  echo "$PASS /app/data"
else
  fail "/app/data に書き込めない"
fi

if echo probe > /app/workspaces/.probe.tmp 2>/dev/null && rm /app/workspaces/.probe.tmp; then
  echo "$PASS /app/workspaces"
else
  fail "/app/workspaces に書き込めない"
fi

if echo probe > /root/.codex/.probe.tmp 2>/dev/null && rm /root/.codex/.probe.tmp; then
  echo "$PASS /root/.codex (Codex の token cache 用)"
else
  fail "/root/.codex に書き込めない (compose の bind マウント先で uid 不一致の可能性)"
fi

echo ""
echo "== 2. 必須バイナリ =="

if command -v git >/dev/null 2>&1; then
  echo "$PASS git: $(git --version)"
else
  fail "git が見つからない"
fi

if command -v codex >/dev/null 2>&1; then
  echo "$PASS codex バイナリ存在: $(command -v codex)"
else
  fail "codex CLI が見つからない (Dockerfile の npm install -g @openai/codex 確認)"
fi

if command -v node >/dev/null 2>&1; then
  echo "$PASS node: $(node --version)"
else
  fail "node が見つからない"
fi

echo ""
echo "== 3. git workspace ライフサイクル =="

WS_BASE=/app/workspaces
BARE=$(mktemp -d)/probe-bare.git
SEED=$(mktemp -d)
WS_HOLDER=$(mktemp -d "$WS_BASE/probe-XXXXXX")

cleanup_paths() {
  rm -rf "$BARE" "$SEED" "$WS_HOLDER" 2>/dev/null || true
}
trap cleanup_paths EXIT

# ローカル bare repo を立てて 初期コミットを seed する
git init --bare --quiet "$BARE"
git -C "$BARE" config uploadpack.allowFilter true

git -c init.defaultBranch=main init --quiet "$SEED"
git -C "$SEED" config user.email "seed@example.com"
git -C "$SEED" config user.name "seed"
echo "init" > "$SEED/README.md"
git -C "$SEED" add .
git -C "$SEED" commit --quiet -m "initial"
git -C "$SEED" remote add origin "$BARE"
git -C "$SEED" push --quiet -u origin main

# production の cloneRepoAtDefaultBranch と同じ流儀で
# holder を mkdtemp し、git clone のために一旦消してから clone する
rm -rf "$WS_HOLDER"
if ! git clone --quiet --filter=blob:none --depth=1 "$BARE" "$WS_HOLDER" 2>/tmp/probe.err; then
  fail "git clone --filter=blob:none --depth=1 失敗 ($(cat /tmp/probe.err))"
  exit 1
fi
echo "$PASS clone (--filter=blob:none --depth=1)"

cd "$WS_HOLDER"
git checkout --quiet -b probe/fix-1
echo "$PASS checkout -b probe/fix-1"

echo "stub edit" > STUB.md
if [ -n "$(git status --porcelain)" ]; then
  echo "$PASS hasUncommittedChanges (true 検出)"
else
  fail "編集後でも git status が空 — 検出ロジックがおかしい可能性"
fi

GIT_AUTHOR_NAME="codex-rabbit[bot]" \
GIT_AUTHOR_EMAIL="codex-rabbit[bot]@users.noreply.github.com" \
GIT_COMMITTER_NAME="codex-rabbit[bot]" \
GIT_COMMITTER_EMAIL="codex-rabbit[bot]@users.noreply.github.com" \
sh -c 'git add -A && git commit --quiet -m "fix: probe"'
ACTUAL_AUTHOR=$(git log -1 --format='%an <%ae>')
EXPECTED='codex-rabbit[bot] <codex-rabbit[bot]@users.noreply.github.com>'
if [ "$ACTUAL_AUTHOR" = "$EXPECTED" ]; then
  echo "$PASS commit (author env が反映されている)"
else
  fail "commit author が想定と違う: $ACTUAL_AUTHOR"
fi

if git push --quiet --set-upstream origin probe/fix-1:probe/fix-1 2>/tmp/probe.err; then
  echo "$PASS push --set-upstream (file:// の bare に対して)"
else
  fail "push 失敗 ($(cat /tmp/probe.err))"
fi

# bare 側にブランチが反映されているか
if git -C "$BARE" rev-parse --verify --quiet probe/fix-1 >/dev/null; then
  echo "$PASS push 結果: bare repo に probe/fix-1 が存在"
else
  fail "bare repo に push したブランチが見当たらない"
fi

# cleanup の再現: workspace を rm -rf で消す (production の cleanup は rmSync recursive force)
cd /
rm -rf "$WS_HOLDER"
if [ ! -e "$WS_HOLDER" ]; then
  echo "$PASS workspace cleanup (root 所有のディレクトリが残らない)"
else
  fail "workspace cleanup 後にディレクトリが残っている: $WS_HOLDER"
fi

echo ""
echo "== 4. /app/workspaces の残留チェック =="
LEFTOVER=$(find /app/workspaces -mindepth 1 -maxdepth 1 2>/dev/null | wc -l)
if [ "$LEFTOVER" -eq 0 ]; then
  echo "$PASS /app/workspaces にゴミディレクトリなし"
else
  fail "/app/workspaces に残留ディレクトリあり ($LEFTOVER 件) — 過去の異常終了かテスト副作用"
fi

echo ""
if [ "$FAIL_COUNT" -eq 0 ]; then
  echo "OK: 全 probe 成功"
  exit 0
else
  echo "NG: $FAIL_COUNT 件失敗"
  exit 1
fi
