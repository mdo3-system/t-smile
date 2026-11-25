# 703プラン量産プロジェクト：PC-2（2台目アカウント）専用指示書

あなたは「703プラン量産プロジェクト」の【PC-2（2台目アカウント）】担当です。
同じDropboxフォルダをPC-1（親機）と共有しているため、競合・上書きを防ぐ以下の絶対ルールを厳守して夜間連続量産を実行してください。

---

## 0. 環境確認（最初に実施）
- ワークスペース直下の `.agents/skills/tif-to-madori-plan/SKILL.md` を必ず読み込み、変換仕様（特に玄関土間 `DOMA` と上り框 `wallType: "agarikamachi"` を含むこと）に従うこと。
- このPCのPython実行パス（`where python` 等）を確認し、事前検算スクリプトを実行できるようにすること。
- TIF原図の参照先（ワークスペースからの相対位置）：
  - `..\3D\scan_plan\FloorPlanApp\input_plans\`（SCAN2406, 2407, 2408）
  - `..\3D\scan_plan\FloorPlanApp\input_plans_add\`（SCAN2473 〜 SCAN2510）

---

## 1. 【厳守】バッティング防止ルール（Dropbox競合ゼロ化）
1. **担当SCAN範囲の厳守**:
   - あなたの担当は **`SCAN2406 〜 SCAN2488` のみ** に更新されました（`SCAN2489` はPC-1がヘルプ引き受け、`SCAN2490 〜 SCAN2510` はPC-1へ再配分済み）。
     - `input_plans`: `2406` (38), `2407` (38), `2408` (3)
     - `input_plans_add`: `2473` (10), `2481` (17), `2485` (23), `2486` (14), `2487` (32), `2488` (17)
   - `SCAN2387 〜 SCAN2405` および **`SCAN2489 〜 SCAN2510`** はPC-1の担当のため、**絶対に触れないこと**。`SCAN2488` まで完了したら越境せず停止して完了報告すること。
   - 生成前に `public/plans_json/PLAN-{案件}-P{nn}.json` が既に存在するか確認し、既に存在する場合は上書きせずスキップすること。
2. **進捗台帳の分離**:
   - 進捗は **`public/plans_json/progress_pc2.md`** にのみ記録すること（初回は新規作成）。
   - `public/plans_json/progress.md` はPC-1専用のため、**絶対に編集・上書きしないこと**。
3. **DB同期・Git・デプロイの禁止**:
   - `scripts/sync_plans_json_db.py` はPC-1が約1時間ごとに一括実行するため、あなたは **絶対に実行しないこと**（`public/data/plans.json` や `public/data/plans_json_index.json` に触れない）。
   - `git commit` / `git push` / 本番デプロイは一切行わないこと。
4. **一時ファイルはDropbox外へ**:
   - TIF正立回転画像やコンタクトシート等の一時ファイルは、必ずこのPCのローカル `scratch/`（`<appDataDir>\brain\<conversation-id>\scratch\`）等、Dropbox同期対象外に出力すること。

---

## 2. 夜間稼働スケジュール（08:00停止ルール）
- 稼働時間帯（現在曜日で判定）：
  - 火曜18:00開始（水曜休み）→ 木曜 08:00 まで稼働
  - 木曜18:00開始 → 金曜 08:00 まで稼働
  - 金曜18:00開始 → 土曜 08:00 まで稼働
  - 土曜18:00開始（日曜休み）→ 月曜 08:00 まで稼働
- 毎晩18:00に自動開始したい場合は、上記曜日の `0 18 * * 2,4,5,6` で定期スケジュールを登録すること。
- 終了時刻（08:00）に達したら、現在の区切りまでを `public/plans_json/progress_pc2.md` に保存して停止すること。

---

## 3. 1バッチ（3〜5件）の実行手順
1. `public/plans_json/progress_pc2.md`（および `public/plans_json/` 内既存ファイル）を確認し、`SCAN2406` から順に未着手の3〜5件を選ぶ。
2. TIF原図をローカル `scratch/` に正立回転・コンタクトシート化して読み取る。
3. `public/plans_json/PLAN-{案件}-P{nn}.json` を生成する（1Fに `DOMA` と `agarikamachi` を必ず含める）。
4. このPCのPythonで `scripts/validate_madori_json.py` を実行し、全件 `[PASS]` を確認する（NGがあれば即修正して再検算）。
5. バッチごとに本番 `https://t-smile.co.jp/madori-sketch/`（browserサブエージェント）で抜き打ち/一括QA確認を行う。
6. `public/plans_json/progress_pc2.md` を更新して次のバッチへ進む。
