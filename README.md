# 株式会社住ま居る（t-smile.co.jp）Webサイト ＆ 家づくりAIラボ

埼玉県鶴ヶ島市を拠点に創業30年・累計800棟の実績を持つ地域工務店「株式会社住ま居る」の公式Webサイトおよび家づくりAI支援システムのリポジトリです。

---

## 1. プロジェクト基本情報 & インフラ構成

| 項目 | 設定値 / URL |
| :--- | :--- |
| **GitHub リポジトリ** | `git@github.com:mdo3-system/t-smile.git` |
| **本番公開URL** | [https://t-smile.co.jp](https://t-smile.co.jp) |
| **本番サーバー (Xserver)** | `mdo3@mdo3.xsrv.jp` (SSHポート: `10022`) |
| **本番サーバー配置ディレクトリ** | `/home/mdo3/t-smile.co.jp/public_html` |
| **開発環境 (Local)** | `d:\Dropbox\■住ま居る\■住ま居る共有\ﾒﾀﾊﾞｰｽ展示場\Antigravity` |

---

## 2. デプロイ手順 (本番反映フロー)

本番反映は以下の手順で実施します。

### Step 1: サイトのビルド＆静的ページ生成
変更を加えた後、以下のビルドスクリプトを実行してHTMLおよび静的SEOページ群（LP・知見200選・施工事例・Sitemap）を生成します。

```bash
python scripts/build_site.py
```

### Step 2: 整合性検証
12セクションのSPAおよびルーティングが正常であることを確認します。

```bash
python scratch/verify_sections.py
```

### Step 3: GitHub へのコミット＆プッシュ
```bash
git add .
git commit -m "feat/fix: 更新内容を記述"
git push origin main
```

### Step 4: 本番Webサーバー (XServer) への自動デプロイ
GitHubへのプッシュ完了後、以下のSSHコマンドを実行してXserverへ即時反映します。

```bash
ssh -o BatchMode=yes -p 10022 mdo3@mdo3.xsrv.jp "cd t-smile.co.jp/public_html && git pull origin main"
```

> [!NOTE]
> サーバー上のリポジトリは `/home/mdo3/t-smile.co.jp/public_html` に配置されており、上記コマンドで最新のコミットが同期されます。

---

## 3. ディレクトリ構成

- `public/` : 静的公開アセット（`index.html`、CSS、JS、画像、静的LP、施工事例、知見200選、sitemap.xml、robots.txt）
- `src/` : ソースファイル
  - `src/index.template.html` : 統合HTMLテンプレート
  - `src/partials/` : 各機能セクションのHTMLモジュール
- `scripts/` : 自動ビルドスクリプト
  - `scripts/build_site.py` : メインビルドスクリプト（全体統合・SSG生成・Sitemap生成）
  - `scripts/build_static_lps.py` : 専用静的LP生成（About, Performance, Evidence, AI-Studio, Awards, Pillar）
  - `scripts/build_case_pages.py` : 施工事例6邸の個別静的SEOページ生成
- `server/` : Node.js バックエンド（AI対話API・カルテ保存API）

---

## 4. 主な公開ページ・URL一覧

- トップページ: `https://t-smile.co.jp/`
- 埼玉県環境住宅賞 受賞ストーリー: `https://t-smile.co.jp/awards/kankyo-housing/`
- 会社概要・信頼実証 (About): `https://t-smile.co.jp/about/`
- 住宅性能数値証明 (Performance): `https://t-smile.co.jp/performance/`
- 光熱費・実測データ実証録 (Evidence): `https://t-smile.co.jp/evidence/`
- AIパース工房 (AI Studio): `https://t-smile.co.jp/ai-studio/`
- 温熱知見200選 ピラーページ: `https://t-smile.co.jp/knowledge/thermal/`
- 施工事例 (Cases): `https://t-smile.co.jp/cases/case-1.html` 〜 `case-6.html`
- サイトマップ: `https://t-smile.co.jp/sitemap.xml`
