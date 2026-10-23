# -*- coding: utf-8 -*-
"""
scripts/server.py
住ま居る AI Webアプリケーション開発用 高機能ローカルHTTPサーバー
- 静的ファイル配信 (public/配下, UTF-8, 適切なMIMEタイプ)
- APIエンドポイント (POST /api/perspective/preset-generate, POST /api/dashboard/... 等)
- ArchiX / アーキトレンド連携・SVGフォトリアルパースのリアルタイム生成
"""
import os
import sys
import json
import random
import string
import mimetypes
from http.server import HTTPServer, ThreadingHTTPServer, BaseHTTPRequestHandler
import urllib.parse
import hashlib
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
DATA_DIR = os.path.join(PUBLIC_DIR, 'data')
RENDERS_DIR = os.path.join(PUBLIC_DIR, 'renders')
SCRIPTS_DIR = os.path.join(BASE_DIR, 'scripts')
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(RENDERS_DIR, exist_ok=True)
os.makedirs(SCRIPTS_DIR, exist_ok=True)

# 追加MIMEタイプ
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('image/svg+xml', '.svg')
mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('model/gltf-binary', '.glb')
mimetypes.add_type('model/gltf+json', '.gltf')
mimetypes.add_type('application/pdf', '.pdf')

# メモリ内ダッシュボードファイルストア
DASHBOARD_FILES = [
    {
        "id": "file_sample_01",
        "filename": "萩原様邸_空気が廻る家_埼玉県環境住宅賞入選公式パネル.pdf",
        "filesize": 1612054,
        "filetype": "application/pdf",
        "uploaded_by": "建築士（住ま居る）",
        "url": "/images/certs/award_kuki_panel.webp",
        "created_at": "2026-10-14 15:30:00"
    },
    {
        "id": "file_sample_02",
        "filename": "BELS最高ランク評価書原本_星5つ_UA0.37.pdf",
        "filesize": 966906,
        "filetype": "application/pdf",
        "uploaded_by": "建築士（住ま居る）",
        "url": "/images/certs/cert_hagiwara_bels.webp",
        "created_at": "2026-10-14 14:00:00"
    },
    {
        "id": "file_sample_03",
        "filename": "現場気密測定試験結果報告書_実測C値0.1.pdf",
        "filesize": 565542,
        "filetype": "application/pdf",
        "uploaded_by": "建築士（住ま居る）",
        "url": "/images/certs/cert_hagiwara_c_val.webp",
        "created_at": "2026-10-14 14:00:00"
    }
]

def get_perspective_title(space_type, style, lighting):
    space_names = {
        'facade': '邸宅外観（ファサード）',
        'ldk': '吹き抜け大開口 LDK',
        'kitchen': 'アイランド・オープンキッチン',
        'bedroom': 'ホテルライク 主寝室',
        'terrace': '中庭・ウッドデッキテラス',
        'bath': '職人造作・リゾートバス'
    }
    style_names = {
        'japandi': 'ジャパンディ（北欧×和の静謐）',
        'scandi': '北欧ナチュラル',
        'hotellike': 'ホテルライク・グレージュモダン',
        'japanese': '数寄屋現代和モダン',
        'minimal': 'ミニマルリゾート'
    }
    lighting_names = {
        'daylight': '澄み渡る朝の自然光',
        'goldenhour': '黄昏のトワイライト',
        'night': '温もりの間接照明・夜景',
        'soft': '柔らかな午後の陽だまり'
    }
    return f"{space_names.get(space_type, '空間パース')} × {style_names.get(style, 'モダン')}（{lighting_names.get(lighting, '自然光')}）"

def generate_archix_svg(render_id, space_type, style, lighting, prompt=''):
    is_night = lighting in ('night', 'goldenhour')
    is_twilight = lighting == 'goldenhour'

    sky_top = '#38bdf8'
    sky_bottom = '#e0f2fe'
    floor_color = '#d97706'
    wall_color = '#f8fafc'
    accent_light = '#fef08a'

    if is_twilight:
        sky_top = '#1e1b4b'
        sky_bottom = '#f97316'
        accent_light = '#fbbf24'
    elif is_night:
        sky_top = '#090d16'
        sky_bottom = '#1e293b'
        accent_light = '#f59e0b'

    if style == 'japandi':
        wall_color = '#f1f5f9'
        floor_color = '#b45309'
    elif style == 'hotellike':
        wall_color = '#334155'
        floor_color = '#475569'
    elif style == 'scandi':
        wall_color = '#ffffff'
        floor_color = '#fcd34d'
    elif style == 'japanese':
        wall_color = '#fef3c7'
        floor_color = '#92400e'

    title = get_perspective_title(space_type, style, lighting)

    if space_type == 'facade':
        scene = f"""
        <!-- Ground & Grass -->
        <rect y="540" width="1200" height="260" fill="#064e3b" />
        <path d="M 0 560 Q 350 530 700 550 T 1200 540 L 1200 800 L 0 800 Z" fill="#047857" opacity="0.85"/>
        <!-- Stone Walkway -->
        <polygon points="460,800 560,800 530,550 490,550" fill="#64748b" opacity="0.7"/>
        <!-- Architectural Eaves & Overhang -->
        <polygon points="120,320 1080,320 1010,240 190,240" fill="#0f172a" />
        <!-- Building Main Facade -->
        <rect x="180" y="320" width="840" height="230" fill="{wall_color}" stroke="#334155" stroke-width="2"/>
        <!-- Timber Louver Screen -->
        <g fill="{floor_color}">
          <rect x="220" y="330" width="14" height="210" />
          <rect x="250" y="330" width="14" height="210" />
          <rect x="280" y="330" width="14" height="210" />
          <rect x="310" y="330" width="14" height="210" />
          <rect x="340" y="330" width="14" height="210" />
          <rect x="370" y="330" width="14" height="210" />
        </g>
        <!-- Floor-to-Ceiling Picture Glass -->
        <rect x="440" y="340" width="400" height="190" fill="#38bdf8" opacity="0.25" stroke="#475569" stroke-width="4"/>
        <!-- Warm Glow Inside Glass -->
        <rect x="460" y="360" width="360" height="150" fill="{accent_light}" opacity="{'0.75' if is_night else '0.3'}" filter="url(#rxGlow)"/>
        <!-- Entrance Wooden Door -->
        <rect x="880" y="370" width="100" height="180" fill="{floor_color}" stroke="#78350f" stroke-width="3"/>
        <!-- Entrance Sconce Light -->
        <circle cx="860" cy="410" r="10" fill="{accent_light}" filter="url(#rxGlow)"/>
        """
    elif space_type == 'kitchen':
        scene = f"""
        <rect width="1200" height="800" fill="{wall_color}"/>
        <polygon points="0,520 1200,520 1200,800 0,800" fill="{floor_color}"/>
        <line x1="0" y1="580" x2="1200" y2="580" stroke="#78350f" stroke-width="1.5" opacity="0.4"/>
        <line x1="0" y1="650" x2="1200" y2="650" stroke="#78350f" stroke-width="1.5" opacity="0.4"/>
        <line x1="0" y1="730" x2="1200" y2="730" stroke="#78350f" stroke-width="1.5" opacity="0.4"/>
        <rect x="150" y="240" width="900" height="280" fill="#334155"/>
        <rect x="300" y="280" width="600" height="120" fill="#38bdf8" opacity="0.4" stroke="#64748b" stroke-width="3"/>
        <rect x="250" y="440" width="700" height="220" rx="8" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
        <rect x="230" y="430" width="740" height="30" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
        <path d="M 450 430 L 450 360 Q 450 330 480 330 Q 510 330 510 360 L 510 380" fill="none" stroke="#94a3b8" stroke-width="6"/>
        <circle cx="420" cy="285" r="22" fill="{accent_light}" opacity="0.9" filter="url(#rxGlow)"/>
        <circle cx="600" cy="285" r="22" fill="{accent_light}" opacity="0.9" filter="url(#rxGlow)"/>
        <circle cx="780" cy="285" r="22" fill="{accent_light}" opacity="0.9" filter="url(#rxGlow)"/>
        """
    else: # ldk, bedroom, terrace, bath
        scene = f"""
        <rect width="1200" height="800" fill="{wall_color}"/>
        <polygon points="0,480 1200,480 1200,800 0,800" fill="{floor_color}"/>
        <line x1="600" y1="480" x2="100" y2="800" stroke="#78350f" stroke-width="2" opacity="0.3"/>
        <line x1="600" y1="480" x2="350" y2="800" stroke="#78350f" stroke-width="2" opacity="0.3"/>
        <line x1="600" y1="480" x2="600" y2="800" stroke="#78350f" stroke-width="2" opacity="0.3"/>
        <line x1="600" y1="480" x2="850" y2="800" stroke="#78350f" stroke-width="2" opacity="0.3"/>
        <line x1="600" y1="480" x2="1100" y2="800" stroke="#78350f" stroke-width="2" opacity="0.3"/>
        <!-- High Exposed Timber Beams -->
        <rect x="100" y="60" width="1000" height="40" fill="#78350f" rx="4"/>
        <rect x="180" y="60" width="40" height="180" fill="#92400e"/>
        <rect x="580" y="60" width="40" height="180" fill="#92400e"/>
        <rect x="980" y="60" width="40" height="180" fill="#92400e"/>
        <!-- Panoramic Garden Window -->
        <rect x="120" y="160" width="680" height="320" fill="#e0f2fe" stroke="#334155" stroke-width="6"/>
        <rect x="125" y="340" width="670" height="135" fill="#047857" opacity="0.8"/>
        <!-- Low Sofa -->
        <rect x="420" y="520" width="460" height="160" rx="14" fill="#334155" stroke="#1e293b" stroke-width="3"/>
        <rect x="440" y="500" width="420" height="60" rx="10" fill="#475569"/>
        <!-- Coffee Table -->
        <ellipse cx="640" cy="720" rx="160" ry="45" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3"/>
        <!-- Plants -->
        <path d="M 160 520 Q 200 420 180 360 Q 230 400 240 480 Z" fill="#15803d"/>
        <path d="M 220 540 Q 270 410 290 350 Q 280 430 250 500 Z" fill="#166534"/>
        <rect x="100" y="100" width="1000" height="40" fill="{accent_light}" opacity="0.6" filter="url(#rxGlow)"/>
        """

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <linearGradient id="rxSky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="{sky_top}"/>
      <stop offset="100%" stop-color="{sky_bottom}"/>
    </linearGradient>
    <filter id="rxGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="rxShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="1200" height="800" fill="url(#rxSky)"/>
  {scene}
  <g filter="url(#rxShadow)">
    <rect x="40" y="40" width="620" height="84" rx="14" fill="#0f172a" opacity="0.92" stroke="#38bdf8" stroke-width="1.5"/>
    <text x="65" y="72" fill="#f8fafc" font-family="'Inter', sans-serif" font-size="18" font-weight="700">
      AI フォトリアルパース工房 [ArchiX Engine]
    </text>
    <text x="65" y="100" fill="#38bdf8" font-family="'Inter', sans-serif" font-size="13">
      {title}
    </text>
    <rect x="520" y="55" width="120" height="28" rx="6" fill="#0284c7"/>
    <text x="532" y="74" fill="#ffffff" font-family="sans-serif" font-size="12" font-weight="bold">ArchiX 4Kリアル</text>
  </g>
</svg>"""
    filename = f"archix_{render_id}.svg"
    filepath = os.path.join(RENDERS_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(svg)
    return f"/renders/{filename}"

class CustomHandler(BaseHTTPRequestHandler):
    def end_headers_with_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers_with_cors()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # API: rate-status
        if path == '/api/perspective/rate-status' or path == '/api/rate-status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers_with_cors()
            self.wfile.write(json.dumps({
                "success": True,
                "currentActiveJobs": 0,
                "maxConcurrent": 3,
                "isFreeAvailable": True
            }).encode('utf-8'))
            return

        # API: dashboard files
        if path.startswith('/api/dashboard/') and path.endswith('/files'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers_with_cors()
            self.wfile.write(json.dumps({
                "success": True,
                "files": DASHBOARD_FILES
            }).encode('utf-8'))
            return

        # API: cases-3d-status (全12実邸 ＆ 特別受賞邸の3Dデータ配置状況チェック)
        if path == '/api/cases-3d-status':
            pipe_json = os.path.join(DATA_DIR, 'archix_photographer_pipeline.json')
            if not os.path.exists(pipe_json):
                try:
                    sys.path.insert(0, os.path.join(BASE_DIR, 'scripts'))
                    import verify_cases_3d_pipeline
                    verify_cases_3d_pipeline.scan_and_verify_pipeline()
                except Exception as e:
                    print("Error generating pipeline json:", e)

            pipe_data = {}
            if os.path.exists(pipe_json):
                with open(pipe_json, 'r', encoding='utf-8') as f:
                    pipe_data = json.load(f)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers_with_cors()
            self.wfile.write(json.dumps({
                "success": True,
                "casesDir": os.path.join(BASE_DIR, 'raw_source_cases'),
                "pipeline": pipe_data
            }).encode('utf-8'))
            return

        # /raw_case_photo/<path> プロ住宅写真家実写真ダイレクト配信 (1,220枚完全対応・Pillow高速Web最適化キャッシュ)
        if path.startswith('/raw_case_photo/'):
            sub_url = path[len('/raw_case_photo/'):]
            sub_path = urllib.parse.unquote(sub_url)
            raw_cases_dir = os.path.join(BASE_DIR, 'raw_source_cases')
            target_file = os.path.normpath(os.path.join(raw_cases_dir, sub_path))

            if target_file.startswith(raw_cases_dir) and os.path.isfile(target_file):
                cache_dir = os.path.join(PUBLIC_DIR, 'cache', 'preview')
                os.makedirs(cache_dir, exist_ok=True)
                
                # キャッシュキー生成（ファイルパス + 更新日時）
                mtime = str(os.path.getmtime(target_file))
                cache_key = hashlib.md5((sub_path + '_' + mtime).encode('utf-8')).hexdigest()
                cached_file = os.path.join(cache_dir, f"{cache_key}.jpg")

                serve_file = target_file
                content_type = 'image/jpeg'

                # Web高速化のためPillowで長辺1600px・プログレッシブJPEGへ最適化キャッシュ
                if os.path.exists(cached_file):
                    serve_file = cached_file
                else:
                    try:
                        from PIL import Image, ImageOps
                        with Image.open(target_file) as img:
                            img = ImageOps.exif_transpose(img)
                            if img.mode not in ('RGB', 'L'):
                                img = img.convert('RGB')
                            img.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
                            img.save(cached_file, 'JPEG', quality=88, progressive=True, optimize=True)
                        serve_file = cached_file
                    except Exception as e:
                        # Pillow変換失敗時は元ファイルを直接配信
                        serve_file = target_file
                        mime, _ = mimetypes.guess_type(target_file)
                        content_type = mime or 'image/jpeg'

                self.send_response(200)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Length', str(os.path.getsize(serve_file)))
                self.send_header('Cache-Control', 'public, max-age=604800')
                self.end_headers_with_cors()
                with open(serve_file, 'rb') as f:
                    shutil.copyfileobj(f, self.wfile)
                return
            else:
                self.send_response(404)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.end_headers_with_cors()
                self.wfile.write(b"Photo not found")
                return

        # /raw_case_model/<path> FBX/3Dモデルファイル配信
        if path.startswith('/raw_case_model/'):
            sub_url = path[len('/raw_case_model/'):]
            sub_path = urllib.parse.unquote(sub_url)
            raw_cases_dir = os.path.join(BASE_DIR, 'raw_source_cases')
            target_file = os.path.normpath(os.path.join(raw_cases_dir, sub_path))

            if target_file.startswith(raw_cases_dir) and os.path.isfile(target_file):
                self.send_response(200)
                self.send_header('Content-Type', 'application/octet-stream')
                self.send_header('Content-Length', str(os.path.getsize(target_file)))
                self.send_header('Cache-Control', 'public, max-age=86400')
                self.end_headers_with_cors()
                with open(target_file, 'rb') as f:
                    shutil.copyfileobj(f, self.wfile)
                return
            else:
                self.send_response(404)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.end_headers_with_cors()
                self.wfile.write(b"Model file not found")
                return

        # 静的ファイル配信 (日本語パス完全対応)
        unquoted_rel = urllib.parse.unquote(path).lstrip('/')
        if not unquoted_rel or unquoted_rel.endswith('/'):
            unquoted_rel = os.path.join(unquoted_rel, 'index.html')

        file_path = os.path.join(PUBLIC_DIR, unquoted_rel)
        if not os.path.exists(file_path) and os.path.exists(file_path + '.html'):
            file_path = file_path + '.html'

        if os.path.exists(file_path) and os.path.isfile(file_path):
            self.send_response(200)
            mime, _ = mimetypes.guess_type(file_path)
            mime = mime or 'application/octet-stream'
            if mime.startswith('text/') or mime in ('application/javascript', 'application/json'):
                mime += '; charset=utf-8'
            self.send_header('Content-Type', mime)
            self.send_header('Content-Length', str(os.path.getsize(file_path)))
            
            # HTMLやJSはキャッシュによる不整合を防ぐため no-cache を設定
            if file_path.endswith('.html') or file_path.endswith('.js') or file_path.endswith('.json'):
                self.send_header('Cache-Control', 'no-cache, must-revalidate')
            else:
                self.send_header('Cache-Control', 'public, max-age=86400')

            self.end_headers_with_cors()
            with open(file_path, 'rb') as f:
                shutil.copyfileobj(f, self.wfile)
        else:
            # 404
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers_with_cors()
            self.wfile.write(b"<h1>404 Not Found</h1><p>The requested URL was not found on this server.</p>")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get('Content-Length', 0))
        body_bytes = self.rfile.read(length) if length > 0 else b'{}'
        
        try:
            body = json.loads(body_bytes.decode('utf-8')) if body_bytes else {}
        except Exception:
            body = {}

        # API: preset-generate (ArchiX / フォトリアルパース瞬時生成)
        if path == '/api/perspective/preset-generate':
            space_type = body.get('spaceType', 'facade')
            style = body.get('style', 'japandi')
            lighting = body.get('lighting', 'daylight')
            prompt = body.get('prompt', '')

            render_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
            img_url = generate_archix_svg(render_id, space_type, style, lighting, prompt)
            title = get_perspective_title(space_type, style, lighting)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers_with_cors()
            self.wfile.write(json.dumps({
                "success": True,
                "renderId": render_id,
                "imageUrl": img_url,
                "title": title,
                "spaceType": space_type,
                "style": style,
                "lighting": lighting
            }).encode('utf-8'))
            return

        # API: save-controlnet-source (FBXビューアから抽出したDepth/Wireframe画像の保存)
        if path == '/api/save-controlnet-source':
            case_id = body.get('caseId', 'unknown')
            angle = body.get('angle', 'exterior')
            img_type = body.get('type', 'normal')
            b64_data = body.get('image', '')

            save_dir = os.path.join(PUBLIC_DIR, 'renders', 'controlnet_extracted', case_id)
            os.makedirs(save_dir, exist_ok=True)

            file_name = f"{angle}_{img_type}.png"
            file_path = os.path.join(save_dir, file_name)

            if ',' in b64_data:
                b64_data = b64_data.split(',', 1)[1]

            import base64
            with open(file_path, 'wb') as f:
                f.write(base64.b64decode(b64_data))

            public_url = f"/renders/controlnet_extracted/{urllib.parse.quote(case_id)}/{file_name}"
            print(f"[ControlNet Save] 保存完了: {file_path} -> {public_url}")

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers_with_cors()
            self.wfile.write(json.dumps({
                "success": True,
                "filePath": file_path,
                "url": public_url
            }).encode('utf-8'))
            return

        # API: save-debug-info (Three.jsからのメッシュ情報ダンプ受信用)
        if path == '/api/save-debug-info':
            filename = body.get('filename', 'mesh_debug.json')
            data = body.get('data', {})
            debug_path = os.path.join(SCRIPTS_DIR, filename)
            with open(debug_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"[Debug Save] デバッグ情報保存: {debug_path}")
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers_with_cors()
            self.wfile.write(json.dumps({"success": True, "path": debug_path}).encode('utf-8'))
            return

        # API: upload-generate (間取り図面・CADアップロードからパース生成)
        if path == '/api/perspective/upload-generate':
            filename = body.get('filename', '間取り図面.pdf')
            space_type = body.get('spaceType', 'ldk')
            style = body.get('style', 'japandi')
            lighting = body.get('lighting', 'daylight')

            render_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
            img_url = generate_archix_svg(render_id, space_type, style, lighting, f"Based on CAD: {filename}")
            title = f"【CAD/図面連動】{filename} ➜ {get_perspective_title(space_type, style, lighting)}"

            # 家カルテへも自動保存
            DASHBOARD_FILES.insert(0, {
                "id": "file_" + render_id,
                "filename": filename,
                "filesize": body.get('filesize', 1024000),
                "filetype": body.get('filetype', 'application/pdf'),
                "uploaded_by": "お施主様（ArchiXパース連携）",
                "url": img_url,
                "created_at": "2026-10-14 20:30:00"
            })

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers_with_cors()
            self.wfile.write(json.dumps({
                "success": True,
                "renderId": render_id,
                "imageUrl": img_url,
                "title": title
            }).encode('utf-8'))
            return

        # API: dashboard file upload
        if path.startswith('/api/dashboard/') and path.endswith('/files'):
            filename = body.get('filename', 'アップロード図面.pdf')
            new_file = {
                "id": "file_" + ''.join(random.choices(string.ascii_lowercase + string.digits, k=8)),
                "filename": filename,
                "filesize": body.get('filesize', 1500000),
                "filetype": body.get('filetype', 'application/pdf'),
                "uploaded_by": body.get('uploadedBy', 'お施主様'),
                "url": body.get('url', '#'),
                "created_at": "2026-10-14 20:30:00"
            }
            DASHBOARD_FILES.insert(0, new_file)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers_with_cors()
            self.wfile.write(json.dumps({
                "success": True,
                "file": new_file,
                "total": len(DASHBOARD_FILES)
            }).encode('utf-8'))
        # API: upload-case-3d (ブラウザから raw_source_cases/<case_id>/ へ直接3D・CAD・図面保存)
        if path == '/api/upload-case-3d':
            case_id = body.get('caseId', 'case01_tsurugashima_S')
            filename = body.get('filename', 'model.glb')
            file_data_b64 = body.get('dataBase64', '')
            raw_cases_dir = os.path.join(BASE_DIR, 'raw_source_cases', case_id)
            os.makedirs(raw_cases_dir, exist_ok=True)
            saved_path = os.path.join(raw_cases_dir, filename)

            if file_data_b64:
                import base64
                if ',' in file_data_b64:
                    file_data_b64 = file_data_b64.split(',', 1)[1]
                with open(saved_path, 'wb') as f:
                    f.write(base64.b64decode(file_data_b64))
            else:
                with open(saved_path, 'w', encoding='utf-8') as f:
                    f.write(f"Placeholder for 3D model: {filename}")

            # 自動セルフテスト実行
            try:
                sys.path.insert(0, os.path.join(BASE_DIR, 'scripts'))
                import verify_cases_3d_pipeline
                verify_cases_3d_pipeline.scan_and_verify_pipeline()
            except Exception as e:
                print("Auto-verify pipeline notice:", e)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers_with_cors()
            self.wfile.write(json.dumps({
                "success": True,
                "savedPath": saved_path,
                "caseId": case_id,
                "filename": filename
            }).encode('utf-8'))
            return

        # API: pipeline/verify (セルフテスト手動・自動トリガー)
        if path == '/api/pipeline/verify':
            try:
                sys.path.insert(0, os.path.join(BASE_DIR, 'scripts'))
                import verify_cases_3d_pipeline
                res = verify_cases_3d_pipeline.scan_and_verify_pipeline()
            except Exception as e:
                res = {"error": str(e)}

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers_with_cors()
            self.wfile.write(json.dumps({
                "success": True,
                "result": res
            }).encode('utf-8'))
            return

        # API: perspective/case-generate (実写真構図再現 + Stable Diffusion プロンプト基生成)
        if path == '/api/perspective/case-generate':
            case_id = body.get('caseId', 'case01_tsurugashima_S')
            # 12実邸 ＆ 特別受賞実邸のプロンプト・ControlNet定義
            case_prompts = {
                "ときがわ町 K様邸": {
                    "title": "【ときがわ町・K様邸】吉野杉大黒柱×吹き抜け×大谷石薪ストーブパース",
                    "composition": "吉野杉8寸角大黒柱がそびえ立つ吹き抜け見上げアングル。黒の鋳物薪ストーブと大谷石炉壁、大開口から望むときがわの山並み（Nikon D700 16-35mm F16パンフォーカス再現）。",
                    "sd_prompt": "photorealistic architectural photo of a dramatic double-height void living room, prominent Yoshino cedar central pillar (daikokubashira), black cast iron wood burning stove, textured Oya stone hearth wall, massive exposed timber truss beams, panoramic clerestory windows framing blue sky and mountain ridges, rich natural wood grain, dust motes in sunbeams, cozy warmth, high-end Japanese passive house, architectural photography, 8k, photorealistic, Hasselblad H6D --ar 16:9",
                    "sd_negative": "ugly, deformed, poor lighting, lowres, oversaturated, plastic texture, wrong perspective",
                    "controlnet": "ControlNet Depth (Weight: 1.0) + ControlNet Canny (Weight: 0.7) / DPM++ 2M Karras, Steps: 35, CFG: 7.5",
                    "spaceType": "ldk",
                    "style": "japanese",
                    "lighting": "goldenhour"
                },
                "吉見町 O様邸": {
                    "title": "【吉見町・O様邸】家族の温もり×自然素材無垢杉フロア×陽だまりLDKパース",
                    "composition": "明るい南面開口から光が降り注ぐ無垢杉床のリビングダイニング。家族の笑顔が集う職人仕上げの温かみある空間。",
                    "sd_prompt": "heartwarming architectural photography of a sunny Japanese living room, solid natural cedar flooring, family-friendly open layout, warm daylight pouring through sheer curtains, artisan plaster walls, cozy fabric sofa, clean Scandinavian-Japanese aesthetic, 8k, photorealistic --ar 16:9",
                    "sd_negative": "dark gloomy, cold, artificial plastics, oversaturated",
                    "controlnet": "ControlNet Depth (Weight: 1.0) + ControlNet Canny (Weight: 0.6) / DPM++ 2M Karras, Steps: 30, CFG: 7.5",
                    "spaceType": "ldk",
                    "style": "scandi",
                    "lighting": "daylight"
                },
                "川越市 Y様邸": {
                    "title": "【川越市・Y様邸】30帖白タイル床×ピットリビング×鉄骨スケルトン階段パース",
                    "composition": "30帖大空間の白光沢タイル床に一段掘り込まれたピットリビング。ストリップ鉄骨スケルトン階段と折り上げ天井のLED間接照明。",
                    "sd_prompt": "opulent modern luxury villa interior, 30 tatami-mat grand living room, sunken pit living lounge with plush custom sofa, glossy white porcelain tile flooring reflecting soft ambient light, black steel floating spiral staircase, high double-height ceiling with concealed warm linear LED cove lighting, minimalist gallery aesthetic, Architectural Digest, 8k, hyper-detailed --ar 16:9",
                    "sd_negative": "dirty, rough wood, vintage, grainy, bad reflection, distorted proportions",
                    "controlnet": "ControlNet Depth (Weight: 1.0) + ControlNet Canny (Weight: 0.6) / DPM++ 2M Karras, Steps: 30, CFG: 7.5",
                    "spaceType": "ldk",
                    "style": "hotellike",
                    "lighting": "night"
                },
                "日高市 I様邸": {
                    "title": "【日高市・I様邸】勾配天井ロフト×化粧梁×民芸調和空間（神レンズ14mm構図）",
                    "composition": "勾配天井と力強い化粧梁が交差する2階ロフトホール。民芸調格子建具と漆喰壁、天窓から差し込む直達光（Nikon D4S 14-24mm F11神レンズ再現）。",
                    "sd_prompt": "authentic Japanese timber frame interior, dramatic sloped vaulted ceiling with massive dark-stained exposed timber beams, 14mm rectilinear ultra-wide architectural photo, loft gallery overlook, traditional lattice shoji doors, artisan white plaster walls, skylight natural sunbeam illuminating wooden floor, peaceful zen atmosphere, high airtightness super insulated home, architectural documentary, 8k, highly detailed --ar 16:9",
                    "sd_negative": "modern glossy, chrome, neon, cartoon, poorly drawn, bad architecture",
                    "controlnet": "ControlNet Depth (Weight: 0.85) + MLSD (Weight: 0.75) / DPM++ SDE Karras, Steps: 32, CFG: 7.5",
                    "spaceType": "ldk",
                    "style": "japanese",
                    "lighting": "daylight"
                },
                "東松山市 K様邸": {
                    "title": "【東松山市・K様邸】職人手刻み木組み×高気密高断熱×開放的吹き抜けパース",
                    "composition": "職人の手刻みによる頑強な梁組みと、高気密高断熱ならではの均一な温熱環境を実現した開放感あふれるリビング。",
                    "sd_prompt": "masterpiece architectural photo of modern Japanese timber craft home, visible traditional mortise and tenon joinery, double height ceiling, warm natural daylight, solid cypress posts, ultra-airtight comfortable living room, high-end residential photography, 8k --ar 16:9",
                    "sd_negative": "poor joinery, cartoon, deformed, lowres",
                    "controlnet": "ControlNet Depth (Weight: 1.0) + Canny (Weight: 0.7) / DPM++ 2M Karras, Steps: 32, CFG: 7.5",
                    "spaceType": "ldk",
                    "style": "japanese",
                    "lighting": "daylight"
                },
                "行田市 H様邸": {
                    "title": "【行田市・H様邸】ビルトインガレージ×ネイビーガルバ×手刻み格子（神レンズ14mm外観）",
                    "composition": "夕景トワイライトに浮かぶビルトインガレージハウス外観。深いネイビー縦ハゼガルバリウム×天然木羽目板×大工手刻み格子スクリーン（14mm超広角2点透視）。",
                    "sd_prompt": "modern Japanese built-in garage house facade at twilight, 14mm ultra-wide architectural lens, two-point perspective, perfectly parallel vertical lines, deep matte navy blue vertical standing seam metal siding, natural cedar wood plank accent cladding, hand-crafted wooden lattice privacy screen, luxury car softly illuminated inside glass garage door, dramatic architectural exterior lighting, warm interior glow through triple-pane windows, 8k, photorealistic, ArchDaily --ar 16:9",
                    "sd_negative": "daytime, rustic log cabin, messy street, blurry, blown out lights, distorted verticals",
                    "controlnet": "ControlNet Depth (Weight: 1.0) + ControlNet MLSD (Weight: 0.8) / DPM++ 2M Karras, Steps: 35, CFG: 8.0",
                    "spaceType": "facade",
                    "style": "japandi",
                    "lighting": "goldenhour"
                },
                "鳩山町 T様邸": {
                    "title": "【鳩山町・T様邸】豊かな自然景観と調和する平屋調ファサード×木漏れ日パース",
                    "composition": "緑豊かな丘陵地に溶け込む深い軒と自然素材外壁。木漏れ日が揺れるウッドデッキと庭のつながり。",
                    "sd_prompt": "peaceful Japanese modern single-story residence facade, surrounded by lush green trees, deep overhanging wooden eaves, cedar siding, large windows reflecting greenery, dappled sunlight on timber deck, architectural digest landscape photography, 8k --ar 16:9",
                    "sd_negative": "urban concrete, crowded, lowres, fake foliage",
                    "controlnet": "ControlNet Depth (Weight: 1.0) + Lineart (Weight: 0.6) / DPM++ 2M Karras, Steps: 30, CFG: 7.5",
                    "spaceType": "facade",
                    "style": "scandi",
                    "lighting": "soft"
                },
                "鶴ヶ島市 A様邸": {
                    "title": "【鶴ヶ島市・A様邸】アイランドキッチン回遊動線×リゾート中庭テラスパース",
                    "composition": "モノトーン大理石調アイランドキッチンから中庭ウッドデッキテラスへと抜ける回遊動線アングル。木製格子ルーバー壁とダウンライト（Nikon 16-35mm広角）。",
                    "sd_prompt": "luxury resort-style Japanese modern kitchen and dining, central marble island kitchen, seamless circulation route, vertical wooden slatted louvers accent wall, view extending to private wooden deck courtyard, large glass doors, overcast soft diffused lighting, refined greige color palette, recessed spot lights, premium architectural interior, ultra-detailed, photorealistic, 8k --ar 16:9",
                    "sd_negative": "cluttered, low resolution, amateur, dark shadows, noisy, fake wood",
                    "controlnet": "ControlNet Depth (Weight: 1.0) + ControlNet Lineart (Weight: 0.5) / DPM++ 2M Karras, Steps: 30, CFG: 7.0",
                    "spaceType": "kitchen",
                    "style": "hotellike",
                    "lighting": "soft"
                },
                "鶴ヶ島市 KB様邸": {
                    "title": "【鶴ヶ島市・KB様邸】格調高いファサード×無垢床リビング×雪見障子和室パース",
                    "composition": "端正な直線を活かした24mm広角アイレベル1150mmアングル。手前の無垢杉リビングから奥の雪見障子和室への美しい奥行き。",
                    "sd_prompt": "refined Japanese modern interior with tatami room suite, 24mm architectural lens, smooth eye level 1150mm perspective, solid cedar wood floor, delicate washi paper shoji screens, natural diffused daylight, understated elegance, high-end Japanese craftsmanship, 8k --ar 16:9",
                    "sd_negative": "gaudy, cluttered, blown out windows, plastic textures",
                    "controlnet": "ControlNet Depth (Weight: 0.9) + Canny (Weight: 0.65) / DPM++ 2M Karras, Steps: 32, CFG: 7.5",
                    "spaceType": "ldk",
                    "style": "japanese",
                    "lighting": "daylight"
                },
                "鶴ヶ島市 K様邸": {
                    "title": "【鶴ヶ島市・K様邸】職人手塗り珪藻土×木格子の陰影×和モダンリビングパース",
                    "composition": "珪藻土のテクスチャと格子から漏れるやわらかな光。ローアングル850mmの座視線で落ち着いた和の風情を演出。",
                    "sd_prompt": "serene modern Japanese living room, textured artisan diatomaceous earth plaster walls, custom vertical wooden lattice divider, low eye-level perspective 850mm, soft diffused side light, warm 3000K indirect illumination, wabi-sabi calm, 8k resolution, razor sharp --ar 16:9",
                    "sd_negative": "harsh reflections, plastic, distorted, cluttered",
                    "controlnet": "ControlNet Depth (Weight: 0.85) + MLSD (Weight: 0.7) / DPM++ SDE Karras, Steps: 32, CFG: 7.5",
                    "spaceType": "ldk",
                    "style": "japanese",
                    "lighting": "goldenhour"
                },
                "鶴ヶ島市 S様邸": {
                    "title": "【鶴ヶ島市・S様邸】天井高2.8m大空間LDK×無垢杉フロア（中出カメラマン画角再現）",
                    "composition": "対面キッチンから22帖大空間LDKを一望する広角アングル。手前に無垢杉カウンター、中央に無垢杉床と革張りソファ、奥に大開口掃き出し窓（プロ写真家撮影216枚準拠）。",
                    "sd_prompt": "masterpiece, ultra-detailed architectural photography of a modern Japanese living room, 2.8m high ceiling, solid cedar wood flooring with natural grain, artisan plaster diatomaceous earth walls, open concept kitchen counter, leather sofa, wide floor-to-ceiling glass sliding doors, soft morning natural sunlight pouring in, indirect warm cove lighting 3000K, architectural digest style, 8k resolution, photorealistic, sharp focus, octane render --ar 16:9",
                    "sd_negative": "blurry, distorted, CGI cartoon, flat lighting, unrealistic texture, low quality, warped furniture, oversaturated",
                    "controlnet": "ControlNet Depth (Weight: 1.0) + ControlNet MLSD (Weight: 0.6) / DPM++ 2M Karras, Steps: 30, CFG: 7.5",
                    "spaceType": "ldk",
                    "style": "scandi",
                    "lighting": "daylight"
                },
                "鶴ヶ島市 T様邸": {
                    "title": "【鶴ヶ島市・T様邸】キヤノン17mm超広角・吹き抜けリビング×造作水回りパース",
                    "composition": "Canon EOS 5D Mark II + EF17-40mm F4L USM再現。吹き抜け上部から降り注ぐ自然光と、美しい木目の造作洗面・対面キッチンの調和。",
                    "sd_prompt": "Canon 17mm ultra-wide architectural photo of a soaring double-height Japanese living room, dramatic high void with upper clerestory windows, handcrafted wooden kitchen counter and vanity, bright daylight filling the entire room, pristine architectural details, 8k, photorealistic --ar 16:9",
                    "sd_negative": "dark, gloomy, distorted lines, artificial plastic",
                    "controlnet": "ControlNet Depth (Weight: 1.0) + Canny (Weight: 0.7) / DPM++ 2M Karras, Steps: 32, CFG: 7.5",
                    "spaceType": "ldk",
                    "style": "scandi",
                    "lighting": "daylight"
                },
                "戸田市萩原様邸": {
                    "title": "【特別実邸・戸田市萩原様邸】埼玉県環境住宅賞受賞 薪ストーブと大谷石カウンターW断熱パース",
                    "composition": "実測C値0.1・空気が回る家。多孔質な大谷石カウンターと薪ストーブ、中2階スキップフロアから立体的に光が回る自然共生空間。",
                    "sd_prompt": "award-winning Japanese eco-house interior (Saitama Environmental Housing Award), wood stove set against genuine porous greenish Oya stone counter and wall, double insulation timber frame, skip-floor open plan layout, warm diffused passive solar daylight, natural air circulation design, ultra-airtight C-value 0.1 craftsmanship, authentic architectural photograph, 8k, photorealistic --ar 16:9",
                    "sd_negative": "plastic, modern fake materials, flat lighting, unrealistic",
                    "controlnet": "ControlNet Depth (Weight: 1.0) + Canny (Weight: 0.7) / DPM++ 2M Karras, Steps: 35, CFG: 7.5",
                    "spaceType": "ldk",
                    "style": "japanese",
                    "lighting": "daylight"
                }
            }

            # エイリアスマッピング (legacy ID -> 日本語邸名)
            alias_map = {
                "case01_tsurugashima_S": "鶴ヶ島市 S様邸",
                "case02_tokigawa_K": "ときがわ町 K様邸",
                "case03_tsurugashima_A": "鶴ヶ島市 A様邸",
                "case04_hidaka_I": "日高市 I様邸",
                "case05_kawagoe_Y": "川越市 Y様邸",
                "case06_gyoda_H": "行田市 H様邸",
                "case_special_toda_H": "戸田市萩原様邸"
            }
            mapped_case = alias_map.get(case_id, case_id)

            c_info = case_prompts.get(mapped_case, case_prompts["鶴ヶ島市 S様邸"])
            render_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
            img_url = generate_archix_svg(render_id, c_info["spaceType"], c_info["style"], c_info["lighting"], c_info["title"])

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers_with_cors()
            self.wfile.write(json.dumps({
                "success": True,
                "renderId": render_id,
                "imageUrl": img_url,
                "caseId": case_id,
                "caseName": mapped_case,
                "title": c_info["title"],
                "composition": c_info["composition"],
                "sdPrompt": c_info["sd_prompt"],
                "sdNegative": c_info["sd_negative"],
                "controlnetSettings": c_info["controlnet"]
            }).encode('utf-8'))
            return

        # 404 for other POST
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers_with_cors()
        self.wfile.write(json.dumps({"success": False, "error": "Endpoint not found"}).encode('utf-8'))

def run_server(port=8080):
    server_address = ('', port)
    httpd = ThreadingHTTPServer(server_address, CustomHandler)
    print(f"[SERVER] Sumaile Application Server (Multi-Threaded) running on http://127.0.0.1:{port}/")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("[SERVER] Shutting down.")
        httpd.server_close()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    run_server(port)
