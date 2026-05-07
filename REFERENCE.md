# リファレンス

## 環境変数 (.env)

| 変数                          |   必須   | デフォルト                                   | 説明                                                                     |
| ----------------------------- | :------: | -------------------------------------------- | ------------------------------------------------------------------------ |
| `WEBHOOK_SECRET`              | **必須** | -                                            | HMAC-SHA256 署名検証用 (8 文字以上)                                      |
| `GITHUB_APP_ID`               | **必須** | -                                            | GitHub App の App ID                                                     |
| `GITHUB_APP_PRIVATE_KEY_PATH` | **必須** | -                                            | PEM 秘密鍵のファイルパス                                                 |
| `GITHUB_APP_INSTALLATION_ID`  | **必須** | -                                            | GitHub App の Installation ID                                            |
| `DISCORD_BOT_TOKEN`           |          | -                                            | Discord Bot Token                                                        |
| `DISCORD_CHANNEL_ID`          |          | -                                            | レビュー投稿先チャンネル ID                                              |
| `HTTP_HOST`                   |          | `127.0.0.1`                                  | リスンアドレス                                                           |
| `HTTP_PORT`                   |          | `3000`                                       | リスンポート                                                             |
| `CODEX_BIN`                   |          | `codex`                                      | Codex CLI のパス                                                         |
| `CODEX_EXTRA_ARGS`            |          | -                                            | Codex 追加引数 (例: `--model gpt-5-codex --full-auto`)                   |
| `CODEX_FIX_ARGS`              |          | -                                            | 自動 fix 専用 Codex 引数。未設定なら `CODEX_EXTRA_ARGS` にフォールバック |
| `CODEX_TIMEOUT_MS`            |          | `900000`                                     | Codex 実行タイムアウト (ms)                                              |
| `GIT_AUTHOR_NAME`             |          | `codex-rabbit[bot]`                          | 自動 fix で生成する commit の author 名                                  |
| `GIT_AUTHOR_EMAIL`            |          | `codex-rabbit[bot]@users.noreply.github.com` | 自動 fix で生成する commit の author メール                              |
| `SHUTDOWN_TIMEOUT_MS`         |          | `30000`                                      | shutdown 時に `queue.drain` を待つ最大時間 (ms)                          |
| `WORKSPACES_DIR`              |          | `/app/workspaces`                            | clone 先ディレクトリ                                                     |
| `DATA_DIR`                    |          | `/app/data`                                  | SQLite 保存先                                                            |
| `LOG_LEVEL`                   |          | `info`                                       | `trace` / `debug` / `info` / `warn` / `error`                            |
| `CONFIG_FILE`                 |          | `/app/config.yml`                            | config ファイルパス                                                      |

## 設定ファイル (config.yml)

### events

3 つのサブキーそれぞれに `enabled` と発火制御オプションを持ちます。

| キー                               | デフォルト     | 説明                                                                     |
| ---------------------------------- | -------------- | ------------------------------------------------------------------------ |
| `events.push.enabled`              | `true`         | push イベントを処理する                                                  |
| `events.push.mode`                 | `default-only` | `all` = 全 push を自動レビュー / `default-only` = デフォルトブランチのみ |
| `events.pull_request.enabled`      | `true`         | PR イベントを処理する                                                    |
| `events.pull_request.autoReviewOn` | `["opened"]`   | 自動レビューする action 一覧。含まれない action は mention 待ち          |
| `events.issues.enabled`            | `true`         | Issue イベントを処理する                                                 |
| `events.issues.autoReviewOn`       | `[]`           | 空なら全て mention 待ち。`opened` などを入れると自動起動                 |

### mention

| キー                  | デフォルト                  | 説明                                                                                                                |
| --------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `mention.triggers`    | `["!codex-rabbit"]`         | PR/Issue コメント本文にこれらの文字列が含まれるとレビュー実行。空配列で mention 機能 OFF                            |
| `mention.fixTriggers` | `["@CodexRabbit[bot] fix"]` | Issue コメント本文にこれらが含まれると自動 fix (修正 PR 作成) を実行。PR コメントでは無視。空配列で fix mention OFF |

### filters

| キー                    | デフォルト | 説明                                               |
| ----------------------- | ---------- | -------------------------------------------------- |
| `repositories`          | `[]`       | 許可リポ (`owner/repo` or `owner/*`)。空なら全許可 |
| `branches`              | `[]`       | push 対象ブランチ。空なら全許可                    |
| `skipDraftPullRequests` | `true`     | Draft PR をスキップ                                |
| `skipBotSenders`        | `true`     | `*[bot]` sender をスキップ                         |

### review

| キー                | デフォルト | 説明                                                  |
| ------------------- | ---------- | ----------------------------------------------------- |
| `maxDiffChars`      | `200000`   | diff の最大文字数 (超過分は切り詰め)                  |
| `cloneDepth`        | `50`       | shallow clone の depth (0 で full clone)              |
| `includeExtensions` | `[]`       | レビュー対象の拡張子 (例: `["ts", "js"]`)。空なら全て |
| `excludePaths`      | `[]`       | 除外パス (glob 風: `node_modules/**`, `*.lock` 等)    |

### github

| キー                   | デフォルト     | 説明                                                           |
| ---------------------- | -------------- | -------------------------------------------------------------- |
| `prReviewComment`      | `true`         | PR にレビューコメントを投稿                                    |
| `pushCommitComment`    | `false`        | push レビュー時に head コミットへコメントを投稿 (opt-in)       |
| `pushIssueOnSevere`    | `true`         | push で Critical/High 検出時に Issue を自動作成                |
| `autoFixOnSevereIssue` | `true`         | `autoFixIssueLabel` 付き Issue を自動 fix → PR 化 (起票者不問) |
| `autoFixIssueLabel`    | `codex-review` | 自動 fix の対象 Issue ラベル                                   |
| `fixLabel`             | `codex-fix`    | 自動 fix で作成した PR に付与するラベル                        |
| `fixBranchPrefix`      | `codex-fix`    | 自動 fix で作るブランチ名 prefix (`<prefix>/issue-<N>-<ts>`)   |

### discord

| キー                       | デフォルト | 説明                                                            |
| -------------------------- | ---------- | --------------------------------------------------------------- |
| `enabled`                  | `true`     | `false` で Discord 連携を無効化 (環境変数 `DISCORD_*` も不要に) |
| `chunkSize`                | `1900`     | 1 メッセージの最大文字数 (上限 2000)                            |
| `threadAutoArchiveMinutes` | `1440`     | `60` / `1440` / `4320` / `10080`                                |
| `enableThreadChat`         | `true`     | スレッド内での対話応答                                          |

### workspace

| キー         | デフォルト | 説明                                                                                  |
| ------------ | ---------- | ------------------------------------------------------------------------------------- |
| `ttlMinutes` | `1440`     | 非活性スレッドに紐づく clone ディレクトリを自動回収するまでの分数 (10 分間隔で sweep) |
