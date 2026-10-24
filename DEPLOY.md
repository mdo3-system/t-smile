# 🚀 株式会社住ま居る Webサイト 本番デプロイマニュアル

本ドキュメントは、株式会社住ま居る公式サイト（`t-smile.co.jp`）を本番Webサーバー（XServer）へ安全にデプロイするための完全手順書です。

---

## 🛑 【絶対制約】ユーザーからの明示的なデプロイ指示が出るまでデプロイ禁止

> [!IMPORTANT]
> **AIアシスタントは、ユーザーから明確に「デプロイして」「本番へ反映して」という指示を受けるまで、GitHubへのプッシュおよび本番サーバーへのデプロイ操作を絶対に行ってはなりません。**
> 開発環境での修正・改善作業中は、ローカル検証および `version.json` のパッチバージョン管理（`v*.*.*`）にとどめます。

---

## 📦 容量制限 & デプロイ対象アセットの厳格管理

GitHubのリポジトリ容量制限（1ファイル100MB以下、全体容量の適正化）および本番Webサーバーの最適化のため、以下のルールを徹底します：

1. **動画ファイル（`*.mp4`, `*.mov`, `*.webm` 等）のアップロード完全禁止**:
   - Webサイト上で再生する動画は、すべて**YouTubeからの埋め込み再生（ファサード / iframe）**を使用します。
   - Gitリポジトリおよび本番サーバーへの動画ローカル配置は一切行いません（`.gitignore` で完全除外）。
2. **公開Webアセットのみをデプロイ**:
   - デプロイ対象は、一般公開ブラウザが直接読み込む `HTML`, `CSS`, `JS`, `WebP画像`, `JSON`, `SVG` のみです。
   - 数GBに達する未圧縮の現場生写真（`raw_source_cases/` 等）、印刷用巨大PDF、テスト用音声ファイル（`test_*.mp3`）、スクラッチファイルはデプロイしません。
   - **社内管理者用ローカルツール（`public/knowledge-video-portal/` 等のSNS/YouTube動画ポータル）**: 管理者がローカル（Dropbox）上で動画制作やプロンプト生成を行うためのツールであるため、本番サーバーへのデプロイ対象外（不要）です。

---

## 🛠️ デプロイ方法

### 方法 A: 推奨・自動デプロイスクリプト（メッセージ付き）

コンソールで以下のコマンドを実行します：

```bash
python scripts/deploy.py
```

実行の流れ：
1. **開始メッセージ**: 「⚠️ Dropbox の同期を一時停止しましたか？」の確認が表示されます。
2. **Git コミット & プッシュ**: 未反映の変更をステージングし、GitHub へプッシュします。
3. **本番サーバー反映**: SSH 経由で XServer 上の `public_html` に `git pull origin main` を実行します。
4. **完了メッセージ**: **「🎉 デプロイ完了！Dropbox の同期を再開してください！」** のアラートが表示されます。

---

### 方法 B: 手動デプロイ手順

#### Step 1: Dropbox の同期を一時停止
（タスクトレイより一時停止）

#### Step 2: サイトマップおよびビルドの更新
```bash
python scripts/build_site.py
```

#### Step 3: Git コミット & GitHub プッシュ
```bash
git add .
git commit -m "feat/fix: 更新内容の要約"
git push origin main
```

#### Step 4: 本番Webサーバー (XServer) へSSHで反映
```bash
ssh -o BatchMode=yes -p 10022 mdo3@mdo3.xsrv.jp "cd t-smile.co.jp/public_html && git pull origin main"
```

#### Step 5: Dropbox の同期を再開
タスクトレイの Dropbox アイコンから **「同期を再開」** をクリック。

---

## 🌐 本番環境情報

- **本番ドメイン**: https://t-smile.co.jp/
- **サーバー**: XServer (`mdo3.xsrv.jp`)
- **SSHポート**: 10022
- **本番パス**: `/home/mdo3/t-smile.co.jp/public_html`
