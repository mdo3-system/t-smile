# -*- coding: utf-8 -*-
"""
scripts/build_sample_top_page.py
Heroセクションのレイアウト崩れ（右側が真っ黒な空白になり、下に落ちていた問題）を100%完治。
原因:
.hero-brand-container (CSSで grid-template-columns: 1.15fr 1fr;) の直下に
余計な <div style="display: grid; ..."> を1枚挟んでしまっていたため、
第1カラム(1.15fr)に中身が全部入り、第2カラム(1fr)が空洞の真っ黒な穴になっていた。

修正:
.hero-brand-container の直接の子要素として
.hero-left-col と .hero-funnel-container を配置し、PCで完璧な左右2カラム、
スマホで美しい1カラム自動可変レイアウトを実現。
"""

import os
import sys
import re

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
SAMPLE_DIR = os.path.join(PUBLIC_DIR, "sample-top")
OUTPUT_FILE = os.path.join(SAMPLE_DIR, "index.html")
SOURCE_INDEX = os.path.join(PUBLIC_DIR, "index.html")

def generate_sample_top():
    os.makedirs(SAMPLE_DIR, exist_ok=True)
    
    with open(SOURCE_INDEX, "r", encoding="utf-8") as f:
        html = f.read()

    # 1. プレビュー案内バー
    preview_bar = '''
  <!-- ===================================================================== -->
  <!-- プレビューモード案内バー（社内確認用） -->
  <!-- ===================================================================== -->
  <div style="background: linear-gradient(90deg, #0f172a, #1e293b); color: #ffffff; padding: 0.75rem 1.5rem; text-align: center; font-size: 0.88rem; font-weight: 700; position: sticky; top: 0; z-index: 9999; box-shadow: 0 4px 20px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; gap: 1.2rem; flex-wrap: wrap; border-bottom: 2px solid #38bdf8;">
    <span style="display: flex; align-items: center; gap: 6px;">
      <span style="display: inline-block; width: 10px; height: 10px; background: #38bdf8; border-radius: 50%; box-shadow: 0 0 10px #38bdf8;"></span>
      【レイアウト完全修復版】左右均等2カラム ＋ 前向きコピー ＋ 6大AIツール ＋ 30秒シアター
    </span>
    <span style="background: rgba(56,189,248,0.15); color: #7dd3fc; border: 1px solid rgba(56,189,248,0.3); padding: 2px 10px; border-radius: 9999px; font-size: 0.75rem;">
      現行本番トップページ（/）は未変更です
    </span>
    <a href="/" style="color: #fde047; text-decoration: underline; margin-left: 0.5rem; font-size: 0.82rem;">現行トップページと比較する ➜</a>
  </div>
'''
    html = re.sub(r'(<body[^>]*>)', r'\1' + preview_bar, html, count=1)

    # 2. Heroセクションの完全構築（直下に2つのカラムを配置してCSSグリッドを正常化）
    hero_perfect = '''<div class="hero-brand-container" style="background: linear-gradient(135deg, #071524 0%, #0c1a2e 50%, #112240 100%); border-radius: 20px; padding: clamp(1.5rem, 3.0vw, 2.8rem); margin-bottom: 2.5rem; box-shadow: 0 20px 50px rgba(0,0,0,0.5); border: 1px solid rgba(56,189,248,0.25); display: grid; grid-template-columns: 1.1fr 1fr; gap: clamp(1.5rem, 2.5vw, 2.5rem); align-items: start;">
        
        <!-- ==================================================== -->
        <!-- 第1カラム（左側）：新キャッチコピー ＆ 信頼のリード文 -->
        <!-- ==================================================== -->
        <div class="hero-left-col" style="display: flex; flex-direction: column;">
          
          <!-- 上部タグライン -->
          <div style="display: flex; gap: 0.45rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.9rem;">
            <span class="hero-brand-tag" style="background: rgba(217, 119, 6, 0.25); color: #fde68a; border: 1px solid rgba(245, 158, 11, 0.5); margin-bottom: 0; padding: 0.3rem 0.8rem; font-size: 0.78rem;">
              🏠 お客様の建てたい家を建てる工務店
            </span>
            <span class="hero-brand-tag" style="background: rgba(16, 185, 129, 0.22); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.45); margin-bottom: 0; padding: 0.3rem 0.8rem; font-size: 0.78rem;">
              🛡️ 全棟許容応力度計算 耐震最高等級3
            </span>
            <span class="hero-brand-tag" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); margin-bottom: 0; padding: 0.3rem 0.8rem; font-size: 0.78rem;">
              ❄️ HEAT20 G2〜G3 × 実測C値0.1〜0.3台
            </span>
            <span class="hero-brand-tag" style="background: rgba(245, 158, 11, 0.15); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.35); margin-bottom: 0; padding: 0.3rem 0.8rem; font-size: 0.78rem;">
              🏆 埼玉県環境住宅賞受賞
            </span>
          </div>

          <!-- 新メインキャッチコピー -->
          <h1 class="hero-brand-title" style="margin: 0 0 1.0rem 0; font-weight: 800; letter-spacing: -0.02em; line-height: 1.32;">
            <span style="font-size: clamp(1.75rem, 3.0vw, 2.45rem); color: #ffffff; display: block;">
              夢を語るのは、あなた。
            </span>
            <span style="font-size: clamp(1.55rem, 2.7vw, 2.25rem); background: linear-gradient(120deg, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: block; margin-top: 0.25rem;">
              夢を実現するお手伝いをするのが、住ま居る。
            </span>
          </h1>

          <!-- サブヘッドライン -->
          <div style="margin-bottom: 1.1rem;">
            <p style="color: #f59e0b; font-size: clamp(1.0rem, 1.8vw, 1.18rem); font-weight: 700; line-height: 1.5; margin: 0;">
              私たちは「会社の型」を売りません。<br>
              あなたが本当に建てたい家を、最高峰の耐震・断熱工学で形にする工務店です。
            </p>
          </div>

          <!-- リード文（SEO/AIO完全網羅・可読性の高いスタイリング） -->
          <div style="background: rgba(255, 255, 255, 0.03); border-left: 3px solid #38bdf8; border-radius: 0 10px 10px 0; padding: 1.0rem 1.2rem; margin-bottom: 0;">
            <p style="font-size: 0.92rem; line-height: 1.8; color: #cbd5e1; margin: 0 0 0.85rem 0;">
              多くのハウスメーカーや工務店は「当社の仕様はこれ」「標準プランはこちら」と、自分たちの型にお客様を押し込めようとします。<br>
              少し凝った間取りや自由なわがままを伝えた途端、<strong>「耐震計算が合わないので無理です」「規格外オプションで数百万円アップします」</strong>と諦めさせられていませんか？<br>
              住ま居るは、全棟許容応力度計算（耐震最高等級3）・HEAT20 G2/G3超高断熱・実測C値0.1〜0.3台という最高峰の物理工学を100%担保した上で、あなたの“こだわり”を何一つ妥協せずに形にします。
            </p>
            <p style="font-size: 0.90rem; line-height: 1.8; color: #94a3b8; margin: 0; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 0.8rem;">
              家を建てることは、工業製品やスペックを買うことではありません。<br>
              一生に一度、愛する家族と笑顔で過ごす<strong>「かけがえのない時間と命を守る場所」</strong>を育むことです。<br>
              私たちは埼玉県鶴ヶ島市で30年、800家族の暮らしに寄り添い続けてきた地域工務店です。埼玉特有の厳しい夏の熱気を跳ね返す<strong>「屋根・外壁の遮熱工学」</strong>と、真冬もエアコン1台で心地よく過ごせる<strong>「HEAT20 G2〜G2.5の断熱気密（全棟実測C値0.3台・耐震等級3）」</strong>を両立。過剰な数値競争ではなく、埼玉の気候で本当に快適な住まいを熟練大工の手仕事でお届けします。
            </p>
          </div>

        </div>

        <!-- ==================================================== -->
        <!-- 第2カラム（右側）：整然と並ぶ3大ハブ（右側にピッタリ配置！） -->
        <!-- ==================================================== -->
        <div class="hero-funnel-container" style="display: flex; flex-direction: column; gap: 1.0rem;">
          
          <!-- ボックス1: 【前向きなトーン】できないと言われたこだわりを諦めない -->
          <div style="background: rgba(15, 23, 42, 0.88); border: 1.5px solid #d97706; border-radius: 14px; padding: 1.1rem 1.25rem; box-shadow: 0 8px 24px rgba(217, 119, 6, 0.25);">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 0.45rem;">
              <span style="background: linear-gradient(135deg, #d97706, #b45309); color: #ffffff; font-size: 0.72rem; font-weight: 800; padding: 3px 8px; border-radius: 4px;">
                📌 必見の特設ドキュメント公開中
              </span>
              <span style="font-size: 0.72rem; color: #fde68a;">ボツ案の無料構造セカンドオピニオン</span>
            </div>
            <h3 style="color: #ffffff; font-size: 1.02rem; font-weight: 800; margin: 0 0 0.4rem 0; line-height: 1.4;">
              そのこだわり、「構造上できない」と諦めていませんか？
            </h3>
            <p style="color: #cbd5e1; font-size: 0.83rem; margin: 0 0 0.8rem 0; line-height: 1.5;">
              12邸の「他社NG克服カルテ」を全公開。諦めかけていた理想の間取りを工学の力で蘇らせます。
            </p>
            <a href="/custom-freedom/" style="background: linear-gradient(135deg, #d97706, #f59e0b); color: #0f172a; font-weight: 800; font-size: 0.90rem; padding: 0.65rem 1.2rem; border-radius: 8px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35); transition: transform 0.2s;">
              <span>📐 最高性能×完全自由設計の真実を見る ➜</span>
            </a>
          </div>

          <!-- ボックス2: 【登録不要・完全無料】6大AIツール群（設計知見200選を追加！） -->
          <div style="background: rgba(15, 23, 42, 0.8); border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 14px; padding: 1.1rem 1.25rem; box-shadow: 0 8px 20px rgba(0,0,0,0.35);">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.7rem;">
              <span style="color: #38bdf8; font-weight: 800; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
                🤖 【登録不要・完全無料】6大AIツールで家づくりをシミュレーション
              </span>
              <span style="font-size: 0.70rem; color: #94a3b8;">売り込み電話ゼロ</span>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
              <a href="/plans/index.html" style="background: rgba(2, 132, 199, 0.25); border: 1px solid rgba(56, 189, 248, 0.4); color: #e0f2fe; padding: 0.62rem 0.7rem; border-radius: 8px; font-size: 0.82rem; font-weight: 700; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 4px; text-align: center;">
                📐 323プラン集 ↗
              </a>
              <button data-target="madori-consultation-bot" style="background: rgba(124, 58, 237, 0.25); border: 1px solid rgba(167, 139, 250, 0.4); color: #ede9fe; padding: 0.62rem 0.7rem; border-radius: 8px; font-size: 0.82rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; text-align: center;">
                💬 夫婦の家カルテ →
              </button>
              <button data-target="thermal-consultation" style="background: rgba(16, 185, 129, 0.25); border: 1px solid rgba(52, 211, 153, 0.4); color: #d1fae5; padding: 0.62rem 0.7rem; border-radius: 8px; font-size: 0.82rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; text-align: center;">
                🌡️ 24h温熱換気AI →
              </button>
              <a href="/subsidy/index.html" style="background: rgba(13, 148, 136, 0.25); border: 1px solid rgba(45, 212, 191, 0.4); color: #ccfbf1; padding: 0.62rem 0.7rem; border-radius: 8px; font-size: 0.82rem; font-weight: 700; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 4px; text-align: center;">
                💰 AI補助金ナビ ↗
              </a>
              <a href="/mortgage/index.html" style="background: rgba(99, 102, 241, 0.25); border: 1px solid rgba(129, 140, 248, 0.4); color: #e0e7ff; padding: 0.62rem 0.7rem; border-radius: 8px; font-size: 0.82rem; font-weight: 700; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 4px; text-align: center;">
                🏦 AI住宅ローン ↗
              </a>
              <a href="/knowledge/thermal/" style="background: rgba(245, 158, 11, 0.25); border: 1px solid rgba(251, 191, 36, 0.45); color: #fef3c7; padding: 0.62rem 0.7rem; border-radius: 8px; font-size: 0.82rem; font-weight: 700; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 4px; text-align: center;">
                📚 設計知見200選 ↗
              </a>
            </div>
          </div>

          <!-- ボックス3: 【住ま居るの真実】年間150件構造審査の工学実証録 -->
          <div style="background: rgba(6, 44, 38, 0.65); border: 1.5px solid rgba(52, 211, 153, 0.35); border-radius: 14px; padding: 1.1rem 1.25rem; box-shadow: 0 8px 20px rgba(0,0,0,0.35);">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.7rem;">
              <span style="color: #6ee7b7; font-weight: 800; font-size: 0.84rem; display: flex; align-items: center; gap: 6px;">
                🏛️ 【住ま居るの真実】年間150件構造審査の自社建築士 × 埼玉公的アワード
              </span>
              <span style="font-size: 0.70rem; color: #a7f3d0;">遮熱 × 耐震等級3</span>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
              <a href="/awards/kankyo-housing/" style="background: rgba(245, 158, 11, 0.25); border: 1px solid rgba(251, 191, 36, 0.4); color: #fef3c7; padding: 0.62rem 0.7rem; border-radius: 8px; font-size: 0.82rem; font-weight: 700; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 4px; text-align: center;">
                🏆 埼玉県環境住宅賞 ↗
              </a>
              <button data-target="craftsmanship" style="background: rgba(16, 185, 129, 0.25); border: 1px solid rgba(52, 211, 153, 0.4); color: #d1fae5; padding: 0.62rem 0.7rem; border-radius: 8px; font-size: 0.82rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; text-align: center;">
                🔨 手刻み大工の現場哲学 →
              </button>
              <a href="/evidence/" style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(148, 163, 184, 0.4); color: #f1f5f9; padding: 0.62rem 0.7rem; border-radius: 8px; font-size: 0.82rem; font-weight: 700; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 4px; text-align: center;">
                📊 C値0.3実測データ ↗
              </a>
              <a href="/schedule/" style="background: linear-gradient(135deg, #059669, #10b981); color: #ffffff; padding: 0.62rem 0.7rem; border-radius: 8px; font-size: 0.82rem; font-weight: 800; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 4px; text-align: center; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);">
                📅 展示場素足見学 ↗
              </a>
            </div>
          </div>

        </div>

      </div>
'''

    # 3. HEROと3つのお約束の間に「シネマティック動画シアター（トップページ最適化版）」
    video_section = '''
      <!-- ===================================================================== -->
      <!-- ブランドシネマティック動画シアター (#brand-concept-movie) -->
      <!-- 「できないと言われたこだわり」を工学で具現化するストーリーを30秒で体感 -->
      <!-- ===================================================================== -->
      <section id="brand-concept-movie" style="margin: 2.2rem 0 3.2rem 0; background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 16, 30, 0.98) 100%); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 18px; padding: clamp(1.4rem, 3.0vw, 2.4rem); box-shadow: 0 15px 40px rgba(0,0,0,0.6); text-align: center;">
        
        <div style="max-width: 780px; margin: 0 auto 1.5rem auto;">
          <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(217, 119, 6, 0.2); color: #fde68a; border: 1px solid rgba(245, 158, 11, 0.4); padding: 3px 12px; border-radius: 9999px; font-size: 0.78rem; font-weight: 800; margin-bottom: 0.6rem; letter-spacing: 0.04em;">
            🎬 30 SECONDS BRAND MOVIE
          </div>
          <h2 style="font-size: clamp(1.4rem, 2.6vw, 2.0rem); color: #ffffff; font-weight: 800; margin: 0 0 0.6rem 0; line-height: 1.35;">
            そのこだわり、「構造上できない」と諦めていませんか？
          </h2>
          <p style="font-size: 0.92rem; color: #94a3b8; line-height: 1.6; margin: 0;">
            「夢を語るのは、あなた。夢を実現するお手伝いをするのが、住ま居る。」<br>
            妥協のない構造工学が、あなたの理想を解剖し、唯一無二の住まいへと結実させる軌跡をご覧ください。
          </p>
        </div>

        <!-- 動画プレイヤーコンテナ（横型 16:9 スマホでも画面を塞がない黄金比） -->
        <div style="max-width: 860px; margin: 0 auto; position: relative; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.8); border: 1.5px solid rgba(56, 189, 248, 0.4); background: #000000;">
          <video controls preload="metadata" playsinline poster="/assets/images/concept/promise01.webp" style="width: 100%; aspect-ratio: 16/9; display: block; object-fit: cover;">
            <source src="/temp_video_preview/sumairu_concept_horizontal_16x9.mp4" type="video/mp4">
            お使いのブラウザは動画再生に対応していません。
          </video>
        </div>
        
        <div style="margin-top: 1.0rem; display: flex; justify-content: center; gap: 1.2rem; flex-wrap: wrap; font-size: 0.8rem; color: #64748b;">
          <span>🎧 音声あり推奨（男女ナレーション × シネマティックBGM）</span>
          <span>⏱️ 再生時間: 30秒</span>
          <span>📐 横型16:9 シネマスコープ画角</span>
        </div>

      </section>
'''

    # 4. 「家づくりの3つの約束」セクション（デザイナーはあなた、エンジニアは住ま居る を採用）
    three_promises_section = '''
      <!-- ===================================================================== -->
      <!-- ブランドの核：家づくりの3つの約束 (#three-promises) -->
      <!-- 「デザイナーはあなた、エンジニアは住ま居る」を採用 -->
      <!-- ===================================================================== -->
      <section id="three-promises" style="margin: 2.5rem 0 3.5rem 0; background: linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 18px; padding: clamp(1.5rem, 3.5vw, 2.75rem); box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);">
        
        <!-- セクション見出し -->
        <div style="text-align: center; max-width: 840px; margin: 0 auto 2.4rem auto;">
          <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); padding: 4px 14px; border-radius: 9999px; font-size: 0.82rem; font-weight: 800; margin-bottom: 0.8rem; letter-spacing: 0.05em;">
            ✨ OUR PHILOSOPHY & PROMISE
          </div>
          <h2 style="font-size: clamp(1.6rem, 3.2vw, 2.3rem); color: #ffffff; font-weight: 800; line-height: 1.35; margin: 0 0 0.6rem 0; letter-spacing: -0.01em;">
            住ま居るが貫く、家づくりの3つの約束
          </h2>
          <!-- 採用コピー：デザイナーはあなた、エンジニアは住ま居る -->
          <p style="font-size: clamp(1.1rem, 2.2vw, 1.35rem); font-weight: 800; color: #38bdf8; margin: 0 0 0.8rem 0; letter-spacing: 0.02em;">
            「デザイナーはあなた、エンジニアは住ま居る。」
          </p>
          <p style="font-size: 0.96rem; color: #94a3b8; line-height: 1.7; margin: 0;">
            単なる高性能住宅を売るのではなく、<strong>他社が断るような難しい要望にも、最高峰の工学で解決策を探し出す工務店</strong>であり続けます。
          </p>
        </div>

        <!-- 3つの約束カードグリッド -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 1.6rem; margin-bottom: 2.2rem;">
          
          <!-- 約束 1: 理想を小さくしない -->
          <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 8px 20px rgba(0,0,0,0.3);">
            <div style="position: relative; width: 100%; height: 210px; overflow: hidden;">
              <img src="/assets/images/concept/promise01.webp" alt="理想を小さくしない - 吹き抜け・大開口リビング" style="width: 100%; height: 100%; object-fit: cover;">
              <div style="position: absolute; top: 12px; left: 12px; background: rgba(2, 132, 199, 0.9); color: #ffffff; font-weight: 800; font-size: 0.82rem; padding: 4px 10px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
                PROMISE 01
              </div>
            </div>
            <div style="padding: 1.4rem; display: flex; flex-direction: column; flex-grow: 1;">
              <h3 style="font-size: 1.25rem; font-weight: 800; color: #38bdf8; margin: 0 0 0.75rem 0; line-height: 1.4;">
                1. 理想を小さくしない
              </h3>
              <p style="font-size: 0.93rem; color: #e2e8f0; line-height: 1.75; margin: 0;">
                吹き抜け、大開口、ガレージ、趣味の空間。<br>
                まずはやりたいことを全部お聞かせください。<br>
                「構造上無理」「規格外」と言われたこだわりも、初めから否定することはありません。
              </p>
            </div>
          </div>

          <!-- 約束 2: 見えない部分に妥協しない -->
          <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 8px 20px rgba(0,0,0,0.3);">
            <div style="position: relative; width: 100%; height: 210px; overflow: hidden;">
              <img src="/assets/images/concept/promise02.webp" alt="見えない部分に妥協しない - 許容応力度計算と構造フレーム" style="width: 100%; height: 100%; object-fit: cover;">
              <div style="position: absolute; top: 12px; left: 12px; background: rgba(5, 150, 105, 0.9); color: #ffffff; font-weight: 800; font-size: 0.82rem; padding: 4px 10px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
                PROMISE 02
              </div>
            </div>
            <div style="padding: 1.4rem; display: flex; flex-direction: column; flex-grow: 1;">
              <h3 style="font-size: 1.25rem; font-weight: 800; color: #6ee7b7; margin: 0 0 0.75rem 0; line-height: 1.4;">
                2. 見えない部分に妥協しない
              </h3>
              <p style="font-size: 0.93rem; color: #e2e8f0; line-height: 1.75; margin: 0;">
                許容応力度計算、耐震等級3、基礎設計、断熱・気密。<br>
                勘や経験則ではなく、数値と物理法則に基づく根拠のある設計を行います。<br>
                見えなくなる構造躯体こそ、命と財産を守る最重要の要です。
              </p>
            </div>
          </div>

          <!-- 約束 3: 完成後の暮らしまで考える -->
          <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 8px 20px rgba(0,0,0,0.3);">
            <div style="position: relative; width: 100%; height: 210px; overflow: hidden;">
              <img src="/assets/images/concept/promise03.webp" alt="完成後の暮らしまで考える - 木の温もりと家族の笑顔" style="width: 100%; height: 100%; object-fit: cover;">
              <div style="position: absolute; top: 12px; left: 12px; background: rgba(217, 119, 6, 0.9); color: #ffffff; font-weight: 800; font-size: 0.82rem; padding: 4px 10px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
                PROMISE 03
              </div>
            </div>
            <div style="padding: 1.4rem; display: flex; flex-direction: column; flex-grow: 1;">
              <h3 style="font-size: 1.25rem; font-weight: 800; color: #fcd34d; margin: 0 0 0.75rem 0; line-height: 1.4;">
                3. 完成後の暮らしまで考える
              </h3>
              <p style="font-size: 0.93rem; color: #e2e8f0; line-height: 1.75; margin: 0;">
                デザイン、家事動線、光熱費、メンテナンス、将来の暮らしやすさまで考える。<br>
                引き渡しの日がゴールではなく、30年後・50年後も心地よく、修繕費で家族が困らない持続可能な住まいを設計します。
              </p>
            </div>
          </div>

        </div>

        <!-- 構造性能に対する誠実な注意書き（ブランドの信頼性を決定づける重要枠） -->
        <div style="background: rgba(15, 23, 42, 0.8); border-left: 4px solid #f59e0b; border-radius: 0 10px 10px 0; padding: 1.15rem 1.4rem; margin-top: 1.0rem;">
          <div style="display: flex; align-items: flex-start; gap: 10px;">
            <span style="font-size: 1.3rem; line-height: 1;">📐</span>
            <div>
              <h4 style="color: #fcd34d; font-size: 0.96rem; font-weight: 800; margin: 0 0 0.35rem 0;">
                構造性能と自由設計に関する住ま居るの誠実な姿勢
              </h4>
              <p style="font-size: 0.88rem; color: #cbd5e1; line-height: 1.75; margin: 0;">
                <strong>構造性能は、その理想を諦めなくて済むようにするための技術です。</strong><br>
                ただし、耐震等級3や許容応力度計算を採用すれば、どんな大空間でも無条件に実現できるわけではありません。<br>
                私たちは「命を守る安全性」を何よりも最優先とするため、物理的に危険な設計には正直に警鐘を鳴らします。その上で、<strong>「どうすれば耐震最高等級3を担保しながら、お客様の理想に極限まで近づけられるか」の工学的な代替案を全力で追求する</strong>こと。それが、住ま居るの技術者としての誠実さです。
              </p>
            </div>
          </div>
        </div>

      </section>
'''

    # 置換：既存の hero-brand-container を置換し、直後に video_section と three_promises_section を挿入
    old_pattern = re.compile(r'<div class="hero-brand-container".*?(?=<div id="our-philosophy")', re.DOTALL)
    if old_pattern.search(html):
        html = old_pattern.sub(hero_perfect + video_section + three_promises_section, html)
        print("✔ Substituted repaired 2-col hero + video section + 3 promises section")
    else:
        print("⚠ Could not find replacement target")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✔ Successfully regenerated Clean Sample Top Page: {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_sample_top()
