# -*- coding: utf-8 -*-
import os
import re

HEADER_CSS = '''
        /* Common Two-Tier Header Matching Site Standard */
        .common-site-header {
            background: rgba(15, 23, 42, 0.96);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.15);
            padding: 0.6rem 1.2rem;
            position: sticky;
            top: 0;
            z-index: 1000;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
        }
        .header-inner {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .header-tier1 {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        }
        .header-tier2 {
            display: flex;
            align-items: center;
            gap: 14px;
            overflow-x: auto;
            padding-top: 4px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            font-size: 0.78rem;
            font-weight: 700;
            white-space: nowrap;
        }
        .header-tier2 a {
            color: #cbd5e1;
            text-decoration: none;
            transition: color 0.2s;
        }
        .header-tier2 a:hover {
            color: #38bdf8;
        }

        /* Common Site Footer */
        .common-site-footer {
            background: #020617;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding: 2.5rem 1.5rem 2rem;
            margin-top: 0;
            color: #94a3b8;
            font-size: 0.8rem;
            z-index: 10;
            position: relative;
        }
        .footer-inner {
            max-width: 1400px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 2fr 1fr 1fr;
            gap: 2rem;
        }
        @media (max-width: 768px) {
            .footer-inner { grid-template-columns: 1fr; }
        }

        /* App Container & Fullscreen Modes */
        #madori-app-container {
            width: 100%;
            height: calc(100vh - 110px);
            min-height: 750px;
            display: flex;
            flex-direction: column;
            position: relative;
            background: #0f172a;
        }
        body.is-fullscreen {
            overflow: hidden !important;
            height: 100vh !important;
            width: 100vw !important;
        }
        body.is-fullscreen .common-site-header,
        body.is-fullscreen .common-site-footer {
            display: none !important;
        }
        body.is-fullscreen #madori-app-container {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 99999 !important;
            min-height: unset !important;
        }
'''

HEADER_HTML = '''
    <!-- サイト共通 Two-Tier ヘッダー -->
    <header class="common-site-header">
        <div class="header-inner">
            <div class="header-tier1">
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <a href="/" style="text-decoration: none; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.3rem;">🏡</span>
                        <div>
                            <div style="font-weight: 900; font-size: 1.15rem; color: #ffffff; letter-spacing: -0.02em;">株式会社住ま居る</div>
                            <div style="font-size: 0.68rem; color: #38bdf8; font-weight: 700;">家づくりAIラボ ｜ メタバース展示場</div>
                        </div>
                    </a>
                    <div style="display: inline-flex; align-items: center; gap: 0.45rem; font-size: 0.72rem; color: #cbd5e1; background: rgba(0, 0, 0, 0.28); border: 1px solid rgba(255, 255, 255, 0.15); padding: 2px 8px; border-radius: 4px;">
                        <span style="color: #38bdf8; font-weight: 700;">施工エリア：埼玉県全域・一部東京都</span>
                        <span style="opacity: 0.3;">|</span>
                        <span>創業30年・累計800棟</span>
                        <span style="opacity: 0.3;">|</span>
                        <span style="color: #6ee7b7;">般-8 第60650号</span>
                    </div>
                </div>

                <!-- AI Suite Quick Links -->
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span style="color: #fde68a; font-size: 0.75rem; font-weight: 700; margin-right: 2px;">🏡 AI体験:</span>
                    <a href="/index.html#floorplan-studio" style="font-size: 0.78rem; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-decoration: none; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);">📐 AI 3Dプラン検索</a>
                    <a href="/madori-sketch/" style="font-size: 0.78rem; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-decoration: none; background: linear-gradient(135deg, #059669, #10b981); color: #ffffff; box-shadow: 0 2px 8px rgba(16,185,129,0.35); border: 1.5px solid #34d399;">✏️ 3D間取り工房 (現在地)</a>
                    <a href="/smilestudio.html" target="_blank" style="font-size: 0.78rem; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-decoration: none; background: linear-gradient(135deg, #d97706, #f59e0b); color: #0f172a; box-shadow: 0 2px 8px rgba(245,158,11,0.4); border: 1.5px solid #fbbf24;">🎨 AI 3Dパース工房 ↗</a>
                    <a href="/index.html#thermal-consultation" style="font-size: 0.78rem; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-decoration: none; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);">💬 AI温熱換気相談</a>
                    <a href="/subsidy/index.html" style="font-size: 0.78rem; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-decoration: none; background: linear-gradient(135deg, #047857, #10b981); color: #ffffff; box-shadow: 0 2px 8px rgba(16,185,129,0.3);">💰 AI補助金ナビ ↗</a>
                    <a href="/mortgage/index.html" style="font-size: 0.78rem; font-weight: 800; padding: 4px 10px; border-radius: 6px; text-decoration: none; background: linear-gradient(135deg, #0284c7, #38bdf8); color: #ffffff; box-shadow: 0 2px 8px rgba(56,189,248,0.3);">🏦 AI住宅ローン診断 ↗</a>
                </div>
            </div>

            <!-- Tier 2: Main Links -->
            <div class="header-tier2">
                <a href="/index.html">🏠 ホーム</a>
                <a href="/index.html#our-philosophy">🏛️ こだわり（芳彩・かぐや）</a>
                <a href="/index.html#craftsmanship">🔨 施工実例（大工手刻み×800棟）</a>
                <a href="/about/" style="color: #34d399; font-weight: 800;">🛡️ 信用実証 (CredLayer)</a>
                <a href="/awards/kankyo-housing/" style="color: #fde68a; font-weight: 800;">🏆 埼玉県環境住宅賞</a>
                <a href="/catalog/" style="color: #6ee7b7; font-weight: 800;">📘 工学カタログ</a>
                <a href="/index.html#article-feature" style="color: #f59e0b; font-weight: 800;">📖 解体新書 (10章)</a>
                <a href="/index.html#metaverse">🌐 メタバース展示場</a>
                <a href="/index.html#scent-experience" style="color: #fde68a; font-weight: 800;">👣 モデルハウス見学予約</a>
                <a href="/index.html#dashboard" style="color: #38bdf8; font-weight: 800;">👤 家カルテ</a>
            </div>
        </div>
    </header>
'''

FOOTER_AND_MODAL_HTML = '''
    <!-- サイト共通 フッター -->
    <footer class="common-site-footer">
        <div class="footer-inner">
            <div>
                <div style="font-size: 1.1rem; font-weight: 900; color: #ffffff; margin-bottom: 0.6rem;">株式会社住ま居る（スマイル）</div>
                <p style="margin-bottom: 0.6rem; line-height: 1.6; color: #94a3b8;">
                    〒350-0219 埼玉県鶴ヶ島市町屋176番地5<br>
                    TEL: 049-281-1718 / FAX: 049-281-1727<br>
                    建設業許可：埼玉県知事許可（般-8）第60650号<br>
                    一級建築士事務所：埼玉県知事登録（1）第11854号
                </p>
                <div style="display: inline-flex; align-items: center; gap: 8px; margin-top: 4px; padding: 4px 10px; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 6px; font-size: 0.75rem; color: #38bdf8; font-weight: 700;">
                    <span>🏷️ システムバージョン:</span>
                    <span class="mono-num font-bold text-white">v2.4.0 (2026.10.22)</span>
                </div>
            </div>
            <div>
                <div style="font-weight: 800; color: #ffffff; margin-bottom: 0.6rem;">AI家づくりスイート</div>
                <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                    <a href="/index.html#floorplan-studio" style="color: #cbd5e1; text-decoration: none;">📐 AI 3Dプラン検索</a>
                    <a href="/madori-sketch/" style="color: #34d399; text-decoration: none; font-weight: 700;">✏️ 3D間取り工房</a>
                    <a href="/smilestudio.html" style="color: #38bdf8; text-decoration: none;">🎨 AI 3Dパース工房</a>
                    <a href="/index.html#thermal-consultation" style="color: #cbd5e1; text-decoration: none;">💬 AI温熱換気相談</a>
                    <a href="/subsidy/index.html" style="color: #cbd5e1; text-decoration: none;">💰 AI補助金ナビ</a>
                    <a href="/mortgage/index.html" style="color: #cbd5e1; text-decoration: none;">🏦 AI住宅ローン診断</a>
                </div>
            </div>
            <div>
                <div style="font-weight: 800; color: #ffffff; margin-bottom: 0.6rem;">実例アーカイブ</div>
                <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                    <a href="/cases/case-1.html" style="color: #cbd5e1; text-decoration: none;">東松山市 K様邸（大黒柱の家）</a>
                    <a href="/cases/case-2.html" style="color: #cbd5e1; text-decoration: none;">ときがわ町 K様邸（吹抜LDK）</a>
                    <a href="/cases/case-3.html" style="color: #cbd5e1; text-decoration: none;">鶴ヶ島市 T様邸（モダン格子）</a>
                    <a href="/cases/case-5.html" style="color: #cbd5e1; text-decoration: none;">日高市 I様邸（平屋・中庭土間）</a>
                </div>
            </div>
        </div>
        <p style="text-align: center; margin-top: 2rem; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 1rem; color: #64748b;">
            © 2026 株式会社住ま居る All Rights Reserved. 自然素材×高気密高断熱（HEAT20 G2/G3）の手刻み注文住宅
        </p>
    </footer>

    <!-- 全画面表示切り替え案内モーダル -->
    <div id="modalFullscreenPrompt" class="fixed inset-0 z-[100000] flex items-center justify-center bg-black/75 backdrop-blur-md transition-opacity" style="display: none;">
        <div class="bg-slate-900 border-2 border-emerald-500/60 rounded-2xl p-6 sm:p-8 max-w-lg w-[92%] shadow-2xl text-center relative animate-in fade-in zoom-in-95 duration-200">
            <button onclick="closeFullscreenModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white text-lg p-1 transition" title="閉じる">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <div class="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                📐
            </div>
            <h3 class="text-xl sm:text-2xl font-black text-white mb-2">全画面モードで作図を始めますか？</h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                iPad・タブレットやPCでの作図を快適にするため、<strong class="text-emerald-300 font-bold">全画面表示</strong>を推奨しています。<br>
                ブラウザの「戻る」操作による誤作動を防ぎ、広々としたキャンバスで理想の間取りを快適に描画いただけます。
            </p>
            <div class="flex flex-col sm:flex-row gap-3 justify-center mb-4">
                <button onclick="startFullscreenFromModal()" class="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 text-sm transition transform active:scale-95 cursor-pointer">
                    <i class="fa-solid fa-expand text-base"></i> 全画面モードを開始（推奨）
                </button>
                <button onclick="closeFullscreenModal()" class="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm transition border border-slate-700 cursor-pointer">
                    通常のまま使う
                </button>
            </div>
            <div class="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <i class="fa-solid fa-circle-info text-sky-400"></i> ※画面右上の「全画面」ボタンまたはEscキーでいつでも切り替え可能です
            </div>
        </div>
    </div>
'''

FULLSCREEN_JS = '''
// =========================================================================
// 全画面モード切替 ＆ モーダル案内制御
// =========================================================================
function enterFullscreenMode() {
    document.body.classList.add('is-fullscreen');
    const icon = document.getElementById('fullscreenIcon');
    if (icon) icon.className = 'fa-solid fa-compress';
    const btn = document.getElementById('btnFullscreen');
    if (btn) btn.title = '全画面表示を解除（通常表示へ戻る）';

    // ブラウザのフルスクリーンAPI
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log('Fullscreen request note:', err);
        });
    }

    // キャンバスリサイズ
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        if (typeof resizeCanvas === 'function') resizeCanvas();
        if (typeof render === 'function') render();
    }, 120);
}

function exitFullscreenMode() {
    document.body.classList.remove('is-fullscreen');
    const icon = document.getElementById('fullscreenIcon');
    if (icon) icon.className = 'fa-solid fa-expand';
    const btn = document.getElementById('btnFullscreen');
    if (btn) btn.title = '全画面表示（ブラウザの戻る誤操作を防止して快適に作図）';

    if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.log(err));
    }

    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        if (typeof resizeCanvas === 'function') resizeCanvas();
        if (typeof render === 'function') render();
    }, 120);
}

function toggleFullscreenMode() {
    if (document.body.classList.contains('is-fullscreen') || document.fullscreenElement) {
        exitFullscreenMode();
        showToast('全画面モードを解除しました');
    } else {
        enterFullscreenMode();
        showToast('全画面モードを開始しました（Escキーまたはボタンで解除）');
    }
}
window.toggleFullscreenMode = toggleFullscreenMode;

// ブラウザ側の全画面変更イベント（Escキー等で解除された場合の同期）
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && document.body.classList.contains('is-fullscreen')) {
        document.body.classList.remove('is-fullscreen');
        const icon = document.getElementById('fullscreenIcon');
        if (icon) icon.className = 'fa-solid fa-expand';
        window.dispatchEvent(new Event('resize'));
    }
});

function openFullscreenModal() {
    const modal = document.getElementById('modalFullscreenPrompt');
    if (modal) modal.style.display = 'flex';
}
window.openFullscreenModal = openFullscreenModal;

function closeFullscreenModal() {
    const modal = document.getElementById('modalFullscreenPrompt');
    if (modal) modal.style.display = 'none';
}
window.closeFullscreenModal = closeFullscreenModal;

function startFullscreenFromModal() {
    closeFullscreenModal();
    enterFullscreenMode();
    showToast('全画面モードを開始しました（Escキーまたはボタンで解除）');
}
window.startFullscreenFromModal = startFullscreenFromModal;

// ページ読み込み完了時、全画面推奨モーダルをポップアップ
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const hasPrompted = sessionStorage.getItem('madori_fullscreen_prompted');
        if (!hasPrompted) {
            openFullscreenModal();
            sessionStorage.setItem('madori_fullscreen_prompted', 'true');
        }
    }, 400);
});
'''

def process_file(filepath):
    if not os.path.exists(filepath):
        print(f'File not found: {filepath}')
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. CSS追加
    if 'common-site-header' not in html:
        html = html.replace('</style>', HEADER_CSS + '\n    </style>')

    # 2. bodyタグ修正 (flex flex-col h-screen w-screen overflow-hidden を通常bodyに変更)
    html = re.sub(
        r'<body[^>]*class="[^"]*"[^>]*>',
        '<body class="select-none bg-slate-900 text-slate-100 min-h-screen">',
        html
    )

    # 3. 共通ヘッダー挿入 & アプリコンテナラッパー開始
    if '<header class="common-site-header">' not in html:
        # アプリ専用ヘッダーの直前に共通ヘッダーと <div id="madori-app-container"> を挿入
        target = '<!-- TOP HEADER BAR -->'
        if target in html:
            html = html.replace(target, HEADER_HTML + '\n    <div id="madori-app-container">\n    ' + target)

    # 4. アプリコンテナラッパー終了 & 共通フッター & モーダル挿入
    if '<footer class="common-site-footer">' not in html:
        # スクリプト群（<script src="/madori-sketch/... または <script src=...）の直前に </div> とフッター・モーダルを挿入
        target_script = '<!-- JSON Storage & Module Scripts -->'
        if target_script in html:
            html = html.replace(target_script, '    </div>\n' + FOOTER_AND_MODAL_HTML + '\n    ' + target_script)
        else:
            # 代替ターゲット: </body> 直前
            html = html.replace('</body>', '    </div>\n' + FOOTER_AND_MODAL_HTML + '\n</body>')

    # 5. Fullscreen JS更新
    if 'startFullscreenFromModal' not in html:
        # 既存の toggleFullscreenMode を置き換えまたは追加
        if '// 2. 全画面モード切替 ＆ 離脱防止（beforeunload）' in html:
            html = html.replace('// 2. 全画面モード切替 ＆ 離脱防止（beforeunload）', FULLSCREEN_JS + '\n// 離脱防止（beforeunload）')
        else:
            # スクリプト末尾に追加
            html = html.replace('</script>\n</body>', FULLSCREEN_JS + '\n</script>\n</body>')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'Successfully updated: {filepath}')

process_file('public/madori-sketch/index.html')
if os.path.exists('src/madori-sketch/index.source.html'):
    process_file('src/madori-sketch/index.source.html')
