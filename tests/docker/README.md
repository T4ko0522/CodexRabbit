# Docker permission smoke probe

`codex-review` イメージのコンテナ内で permission エラー / 必須バイナリ欠如 / workspace ライフサイクル不整合 が起きないかを確認する最小限の smoke test です。実 GitHub App / 実 Codex API キー / 実 Discord は不要。

## 何を検証するか

`probe.sh` がコンテナ内で以下を順に確認します:

1. **書き込み権限**: `/app/data` / `/app/workspaces` / `/root/.codex` が書き換え可能
2. **必須バイナリ**: `git` / `codex` / `node` が PATH 上にある
3. **workspace ライフサイクル**: ローカル bare repo を立てて、production の `cloneRepoAtDefaultBranch → checkoutNewBranch → commitAll → pushBranch → cleanup` と同じ git 呼び出し列を再現。失敗時は `[FAIL]` 行で報告
4. **ディレクトリ残留**: `cleanup` 後に `/app/workspaces` 配下にゴミが残らない

## 使い方

リポジトリルートから、シェルに合わせて 1 つ:

```sh
# Linux / macOS / WSL / Git Bash
sh tests/docker/run.sh
```

```powershell
# PowerShell 7 (Windows ネイティブ)
.\tests\docker\run.ps1
```

どちらも内部で:

1. `docker build -t codex-review:probe .` で smoke 用イメージをビルド
2. `probe.sh` をコンテナに bind mount し、`docker run --rm --entrypoint sh ... /probe.sh` で実行

何もエラーが無ければ `OK: 全 probe 成功` で終わります。1 つでも失敗があれば終了コード 1 で `[FAIL]` 付きの行が `stderr` に出ます。

## Windows での実行メモ

- **PowerShell 7 ネイティブで動かしたい**: `run.ps1` を使う。`-v` ではなく `--mount` を使い、配列 splat で渡すので Native Command Argument Passing の揺れを避けられる
- **Git Bash / WSL2 を使える**: `bash tests/docker/run.sh` でも `wsl bash tests/docker/run.sh` でも OK
- 生 cmd / PowerShell 5.1 は未検証。pwsh 7 を推奨

## なぜ probe を bind mount で持ち込むのか

リポジトリの `.dockerignore` が `tests` を除外しているため、`tests/docker/probe.sh` は **イメージに焼かれません**。bind mount で `/probe.sh` として持ち込むことで、イメージ側を改変せずに probe を差し替え・更新できます。

## limitation

このスモークは **fix の主要 file system 操作 (clone / commit / push / cleanup)** までしかカバーしません。Codex CLI 本体の起動や OAuth トークンリフレッシュ、GitHub API 呼び出しの permission 系は、本番資格情報を伴う E2E が必要です。

E2E が必要になったら、以下の追加で広げられます (今回は範囲外):

- `fake-codex.sh` を `CODEX_BIN` に差し替え、Codex を呼ばずに workspace のファイル書き換えだけ模擬する compose override
- HMAC 署名付き webhook を `curl` で投げる `send-webhook.sh`
- 本番に近い payload (例: `codex-review` ラベル付き Issue opened) を送る fixtures
