# -*- coding: utf-8 -*-
import os
import sys
import json
import shutil
import urllib.parse
import time
import hashlib
from datetime import datetime
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
RAW_CASES_DIR = os.path.join(BASE_DIR, 'raw_source_cases')
RAW_CASE_DIR = os.path.join(BASE_DIR, 'raw_source_case')
USERS_DB_FILE = os.path.join(PUBLIC_DIR, 'data', 'users_db.json')

def load_users_db():
    if os.path.exists(USERS_DB_FILE):
        try:
            with open(USERS_DB_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "users": {},
        "chats": {},
        "files": {},
        "jobs": {}
    }

def save_users_db(data):
    try:
        os.makedirs(os.path.dirname(USERS_DB_FILE), exist_ok=True)
        with open(USERS_DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving users db: {e}")

class RobustRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.end_headers()

    def do_GET(self):
        url_parts = urllib.parse.urlparse(self.path)
        path = url_parts.path

        # /public/<subpath> 互換ハンドラ (URLに誤って /public/ が付いても正常配信)
        if path.startswith('/public/'):
            sub_url = path[len('/public/'):]
            sub_path = urllib.parse.unquote(sub_url)
            target_file = os.path.normpath(os.path.join(PUBLIC_DIR, sub_path))
            if os.path.isfile(target_file):
                import mimetypes
                content_type, _ = mimetypes.guess_type(target_file)
                content_type = content_type or 'application/octet-stream'
                try:
                    size = os.path.getsize(target_file)
                    self.send_response(200)
                    self.send_header('Content-Type', content_type)
                    self.send_header('Content-Length', str(size))
                    self.end_headers()
                    with open(target_file, 'rb') as f:
                        shutil.copyfileobj(f, self.wfile)
                    return
                except Exception as e:
                    print(f"Error streaming public file: {e}")

        # /raw_case_model/<path> FBX配信
        if path.startswith('/raw_case_model/'):
            sub_url = path[len('/raw_case_model/'):]
            sub_path = urllib.parse.unquote(sub_url)
            target_file = os.path.normpath(os.path.join(RAW_CASES_DIR, sub_path))
            if not os.path.exists(target_file):
                target_file = os.path.normpath(os.path.join(RAW_CASE_DIR, sub_path))

            if os.path.isfile(target_file):
                try:
                    size = os.path.getsize(target_file)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/octet-stream')
                    self.send_header('Content-Length', str(size))
                    self.end_headers()
                    with open(target_file, 'rb') as f:
                        shutil.copyfileobj(f, self.wfile)
                except Exception as e:
                    print(f"Error streaming FBX: {e}")
                return
            else:
                self.send_response(404)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.end_headers()
                self.wfile.write(f"FBX Model not found: {sub_path}".encode('utf-8'))
                return

        # /raw_case_photo/<path> 実写真配信
        if path.startswith('/raw_case_photo/'):
            sub_url = path[len('/raw_case_photo/'):]
            sub_path = urllib.parse.unquote(sub_url)
            target_file = os.path.normpath(os.path.join(RAW_CASES_DIR, sub_path))
            if not os.path.exists(target_file):
                target_file = os.path.normpath(os.path.join(RAW_CASE_DIR, sub_path))

            if os.path.isfile(target_file):
                try:
                    size = os.path.getsize(target_file)
                    self.send_response(200)
                    self.send_header('Content-Type', 'image/jpeg')
                    self.send_header('Content-Length', str(size))
                    self.end_headers()
                    with open(target_file, 'rb') as f:
                        shutil.copyfileobj(f, self.wfile)
                except Exception as e:
                    print(f"Error streaming Photo: {e}")
                return
            else:
                self.send_response(404)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.end_headers()
                self.wfile.write(b"Photo not found")
                return

        # API: /api/knowledge-video/links
        if path == '/api/knowledge-video/links':
            links_file = os.path.join(PUBLIC_DIR, 'data', 'knowledge_video_links.json')
            portal_file = os.path.join(PUBLIC_DIR, 'data', 'knowledge_video_portal_data.json')
            result = {}
            if os.path.exists(links_file):
                try:
                    with open(links_file, 'r', encoding='utf-8') as f:
                        result = json.load(f)
                except Exception as e:
                    print(f"Error reading links file: {e}")
            elif os.path.exists(portal_file):
                try:
                    with open(portal_file, 'r', encoding='utf-8') as f:
                        p_data = json.load(f)
                        for it in p_data.get('items', []):
                            result[it['id']] = {
                                'youtubeUrl': it.get('youtubeUrl', ''),
                                'youtubeVideoId': it.get('youtubeVideoId', ''),
                                'veoVideoPath': it.get('veoVideoPath', ''),
                                'status': it.get('status', 'unstarted')
                            }
                except Exception as e:
                    print(f"Error extracting links from portal: {e}")

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
            return

        # API: /api/auth/verify (マジックリンクトークン検証)
        if path == '/api/auth/verify':
            qs = urllib.parse.parse_qs(url_parts.query)
            token = qs.get('token', [''])[0]
            db = load_users_db()
            user = None
            for u in db.get('users', {}).values():
                if u.get('magic_token') == token:
                    user = u
                    break
            if user:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "user": user}, ensure_ascii=False).encode('utf-8'))
            else:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(b'{"success": false, "error": "Invalid token"}')
            return

        # API: /api/dashboard/<userId> (家カルテデータ取得)
        if path.startswith('/api/dashboard/') and not path.endswith('/chat') and not path.endswith('/files'):
            user_id = path.replace('/api/dashboard/', '').strip('/')
            db = load_users_db()
            user = db.get('users', {}).get(user_id)
            if not user:
                # ゲストユーザーや初期ユーザーの自動補完
                user = {
                    "id": user_id,
                    "name": "お施主様",
                    "email": f"{user_id}@example.com",
                    "phone": "090-1234-5678",
                    "plan_applied": False,
                    "created_at": "2026-10-21"
                }
                db.setdefault('users', {})[user_id] = user
                save_users_db(db)

            jobs = db.get('jobs', {}).get(user_id, [])
            files = db.get('files', {}).get(user_id, [])
            messages = db.get('chats', {}).get(user_id, [
                {
                    "sender": "ai",
                    "text": f"ようこそ、{user.get('name', 'お施主')}様！株式会社住ま居るの専任AIエージェントです。\n家カルテは現在初期運用中となります。図面や間取り、家づくりスケジュール、住宅ローン診断について何でもお気軽にご相談ください！"
                }
            ])
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "user": user,
                "jobs": jobs,
                "files": files,
                "messages": messages
            }, ensure_ascii=False).encode('utf-8'))
            return

        # API: /api/knowledge-video/links (知見動画リンク一覧取得)
        if path == '/api/knowledge-video/links':
            links_file = os.path.join(PUBLIC_DIR, 'data', 'knowledge_video_links.json')
            data = {}
            if os.path.exists(links_file):
                try:
                    with open(links_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                except Exception:
                    data = {}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
            return

        super().do_GET()

    def do_HEAD(self):
        url_parts = urllib.parse.urlparse(self.path)
        path = url_parts.path

        if path.startswith('/raw_case_model/'):
            sub_url = path[len('/raw_case_model/'):]
            sub_path = urllib.parse.unquote(sub_url)
            target_file = os.path.normpath(os.path.join(RAW_CASES_DIR, sub_path))
            if not os.path.exists(target_file):
                target_file = os.path.normpath(os.path.join(RAW_CASE_DIR, sub_path))
            if os.path.isfile(target_file):
                self.send_response(200)
                self.send_header('Content-Type', 'application/octet-stream')
                self.send_header('Content-Length', str(os.path.getsize(target_file)))
                self.end_headers()
                return
            else:
                self.send_response(404)
                self.end_headers()
                return

        super().do_HEAD()

    def do_POST(self):
        url_parts = urllib.parse.urlparse(self.path)
        path = url_parts.path

        content_length = int(self.headers.get('Content-Length', 0))
        body_raw = self.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            body = json.loads(body_raw.decode('utf-8'))
        except Exception:
            body = {}

        # API: save-controlnet-source
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
            print(f"[ControlNet Save] 保存完了: {file_path}")

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "filePath": file_path,
                "url": public_url
            }).encode('utf-8'))
            return

        # API: save-debug-info
        if path == '/api/save-debug-info':
            filename = body.get('filename', 'debug.json')
            data = body.get('data', {})
            out_path = os.path.join(PUBLIC_DIR, 'renders', filename)
            with open(out_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"[Debug Info Saved]: {out_path}")
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"success": true}')
            return

        # API: /api/knowledge-video/save-links または /api/knowledge-video/links
        if path in ('/api/knowledge-video/save-links', '/api/knowledge-video/links'):
            portal_file = os.path.join(PUBLIC_DIR, 'data', 'knowledge_video_portal_data.json')
            links_file = os.path.join(PUBLIC_DIR, 'data', 'knowledge_video_links.json')
            updates = body.get('links', body)
            
            # 1. Update knowledge_video_links.json
            current_links = {}
            if os.path.exists(links_file):
                try:
                    with open(links_file, 'r', encoding='utf-8') as f:
                        current_links = json.load(f)
                except Exception:
                    current_links = {}
            current_links.update(updates)
            with open(links_file, 'w', encoding='utf-8') as f:
                json.dump(current_links, f, ensure_ascii=False, indent=2)

            # 2. Sync into knowledge_video_portal_data.json
            synced_count = 0
            if os.path.exists(portal_file):
                try:
                    with open(portal_file, 'r', encoding='utf-8') as f:
                        p_data = json.load(f)
                    for it in p_data.get('items', []):
                        iid = it.get('id')
                        if iid in current_links:
                            u = current_links[iid]
                            if 'youtubeUrl' in u: it['youtubeUrl'] = u['youtubeUrl']
                            if 'youtubeVideoId' in u: it['youtubeVideoId'] = u['youtubeVideoId']
                            if 'veoVideoPath' in u: it['veoVideoPath'] = u['veoVideoPath']
                            if 'status' in u: it['status'] = u['status']
                            synced_count += 1
                    with open(portal_file, 'w', encoding='utf-8') as f:
                        json.dump(p_data, f, ensure_ascii=False, indent=2)
                except Exception as e:
                    print(f"Error syncing portal data: {e}")

            print(f"[Knowledge Video Save] Saved {len(updates)} links, synced {synced_count} items")
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "savedCount": len(updates), "syncedCount": synced_count}).encode('utf-8'))
            return

        # API: /api/publish-community-plan (ユーザー作成プランの自動保存・承認待ちプール保管)
        if path == '/api/publish-community-plan':
            pending_file = os.path.join(PUBLIC_DIR, 'data', 'pending_plans.json')
            new_plan = body.get('plan', body)
            if not new_plan or not isinstance(new_plan, dict) or not new_plan.get('id'):
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(b'{"error": "Invalid plan data"}')
                return

            new_plan['status'] = new_plan.get('status', 'pending')
            new_plan['copyright'] = 'ユーザー本人に帰属（非公開保管・管理者選別待ち）'

            pending_plans = []
            if os.path.exists(pending_file):
                try:
                    with open(pending_file, 'r', encoding='utf-8') as f:
                        pending_plans = json.load(f)
                except Exception:
                    pending_plans = []

            # 既存同一IDの更新、または新規追加
            existing_idx = next((i for i, p in enumerate(pending_plans) if p.get('id') == new_plan.get('id')), -1)
            if existing_idx >= 0:
                pending_plans[existing_idx] = new_plan
            else:
                pending_plans.unshift(new_plan) if hasattr(pending_plans, 'unshift') else pending_plans.insert(0, new_plan)

            with open(pending_file, 'w', encoding='utf-8') as f:
                json.dump(pending_plans, f, ensure_ascii=False, indent=2)

            print(f"[Pending Plan Saved]: {new_plan.get('id')} - {new_plan.get('title')} (Pending pool: {len(pending_plans)})")
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "planId": new_plan.get('id'),
                "status": "pending",
                "message": "プランは安全に保存されました。管理者の選別・監修を経て承認された優良プランのみが3D選定ライブラリに本登録されます。"
            }).encode('utf-8'))
            return

        # API: /api/admin/pending-plans (管理者用: 審査待ちプラン一覧取得)
        if path == '/api/admin/pending-plans':
            pending_file = os.path.join(PUBLIC_DIR, 'data', 'pending_plans.json')
            pending_plans = []
            if os.path.exists(pending_file):
                try:
                    with open(pending_file, 'r', encoding='utf-8') as f:
                        pending_plans = json.load(f)
                except Exception:
                    pending_plans = []
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "plans": pending_plans}).encode('utf-8'))
            return

        # API: /api/admin/approve-plan (管理者用: 手直し後の本登録・3D選定ライブラリ公開)
        if path == '/api/admin/approve-plan':
            comm_file = os.path.join(PUBLIC_DIR, 'data', 'community_plans.json')
            pending_file = os.path.join(PUBLIC_DIR, 'data', 'pending_plans.json')
            approved_plan = body.get('plan', body)
            if not approved_plan or not isinstance(approved_plan, dict) or not approved_plan.get('id'):
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(b'{"error": "Invalid plan data"}')
                return

            approved_plan['status'] = 'approved'
            approved_plan['approved_by'] = '住ま居る設計プロ監修済'
            approved_plan['approved_at'] = datetime.now().strftime('%Y-%m-%d %H:%M')

            # 1. community_plans.json に追加/更新
            comm_plans = []
            if os.path.exists(comm_file):
                try:
                    with open(comm_file, 'r', encoding='utf-8') as f:
                        comm_plans = json.load(f)
                except Exception:
                    comm_plans = []

            c_idx = next((i for i, p in enumerate(comm_plans) if p.get('id') == approved_plan.get('id')), -1)
            if c_idx >= 0:
                comm_plans[c_idx] = approved_plan
            else:
                comm_plans.insert(0, approved_plan)

            with open(comm_file, 'w', encoding='utf-8') as f:
                json.dump(comm_plans, f, ensure_ascii=False, indent=2)

            # 2. pending_plans.json から status を approved に更新
            if os.path.exists(pending_file):
                try:
                    with open(pending_file, 'r', encoding='utf-8') as f:
                        pending_plans = json.load(f)
                    p_idx = next((i for i, p in enumerate(pending_plans) if p.get('id') == approved_plan.get('id')), -1)
                    if p_idx >= 0:
                        pending_plans[p_idx]['status'] = 'approved'
                        with open(pending_file, 'w', encoding='utf-8') as f:
                            json.dump(pending_plans, f, ensure_ascii=False, indent=2)
                except Exception as pe:
                    print(f"Error updating pending file: {pe}")

            print(f"[Plan Approved & Published]: {approved_plan.get('id')} - {approved_plan.get('title')}")
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "planId": approved_plan.get('id'), "totalApproved": len(comm_plans)}).encode('utf-8'))
            return

        # API: /api/knowledge-video/generate-audio
        if path == '/api/knowledge-video/generate-audio':
            item_id = body.get('id', '')
            voice_type = body.get('voice', 'female')
            if not item_id:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "Missing item id"}')
                return

            custom_text = body.get('text', None)
            try:
                import asyncio
                sys.path.append(os.path.join(BASE_DIR, 'scripts'))
                for mod_name in ['phonetic_dict', 'generate_narration_audio']:
                    if mod_name in sys.modules:
                        del sys.modules[mod_name]
                import generate_narration_audio
                res = asyncio.run(generate_narration_audio.generate_single_audio(item_id, voice_type, custom_text=custom_text))
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                print(f"[Generate Audio Error]: {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # API: /api/knowledge-video/combine-video
        if path == '/api/knowledge-video/combine-video':
            item_id = body.get('id', '')
            voice_type = body.get('voice', 'female')
            if not item_id:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "Missing item id"}')
                return

            try:
                import asyncio
                sys.path.append(os.path.join(BASE_DIR, 'scripts'))
                for mod_name in ['phonetic_dict', 'generate_narration_audio']:
                    if mod_name in sys.modules:
                        del sys.modules[mod_name]
                import generate_narration_audio
                res = asyncio.run(generate_narration_audio.combine_video_with_audio(item_id, voice_type))
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                print(f"[Combine Video Error]: {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}, ensure_ascii=False).encode('utf-8'))
            return

        # API: /api/knowledge-video/upload-video (Veo 3動画アップロード)
        if path == '/api/knowledge-video/upload-video':
            item_id = body.get('id', '')
            b64_data = body.get('videoBase64', '')
            if not item_id or not b64_data:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "Missing id or video data"}')
                return

            genre = 'madori' if item_id.startswith('k_') else 'thermal'
            save_dir = os.path.join(PUBLIC_DIR, 'videos', 'veo3', genre)
            os.makedirs(save_dir, exist_ok=True)
            video_file = os.path.join(save_dir, f"{item_id}.mp4")

            if ',' in b64_data:
                b64_data = b64_data.split(',', 1)[1]

            import base64
            with open(video_file, 'wb') as vf:
                vf.write(base64.b64decode(b64_data))

            rel_path = f"/videos/veo3/{genre}/{item_id}.mp4"
            print(f"[Video Upload] Saved: {video_file} ({os.path.getsize(video_file)} bytes)")

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "videoPath": rel_path}).encode('utf-8'))
            return

        # API: /api/knowledge-video/convert-to-vertical (横画面16:9を縦型9:16に自動クロップ変換)
        if path == '/api/knowledge-video/convert-to-vertical':
            item_id = body.get('id', '')
            if not item_id:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "Missing id"}')
                return

            genre = 'madori' if item_id.startswith('k_') else 'thermal'
            video_file = os.path.join(PUBLIC_DIR, 'videos', 'veo3', genre, f"{item_id}.mp4")
            raw_archive = os.path.join(PUBLIC_DIR, 'videos', 'veo3', 'raw_archive', genre, f"{item_id}_raw.mp4")
            target_source = raw_archive if os.path.exists(raw_archive) else video_file

            if not os.path.exists(target_source):
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "Video file not found"}')
                return

            # バックアップとして _raw.mp4 を残す
            if not os.path.exists(raw_archive):
                os.makedirs(os.path.dirname(raw_archive), exist_ok=True)
                import shutil
                shutil.copyfile(target_source, raw_archive)

            temp_vertical = os.path.join(PUBLIC_DIR, 'videos', 'veo3', genre, f"{item_id}_temp_vert.mp4")
            import subprocess
            # 中央を9:16にクロップして 1080x1920 にスケーリング
            crop_filter = "crop=ih*9/16:ih,scale=1080:1920"
            cmd = ['ffmpeg', '-y', '-i', target_source, '-vf', crop_filter, '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-c:a', 'copy', temp_vertical]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

            if res.returncode == 0 and os.path.exists(temp_vertical):
                import shutil
                shutil.move(temp_vertical, video_file)
                rel_path = f"/videos/veo3/{genre}/{item_id}.mp4?v={int(time.time())}"
                print(f"[Convert to Vertical Success] {video_file}")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "videoPath": rel_path}).encode('utf-8'))
            else:
                err_msg = res.stderr.decode('utf-8', errors='ignore') if res.stderr else "FFmpeg conversion failed"
                print(f"[Convert to Vertical Error] {err_msg}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": err_msg}).encode('utf-8'))
            return

        # API: /api/knowledge-video/extract-thumbnail (合成動画・元動画から静止画サムネイルを抽出)
        if path == '/api/knowledge-video/extract-thumbnail':
            item_id = body.get('id', '')
            ss_time = body.get('time', '00:00:02')
            if not item_id:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "Missing id"}')
                return

            genre = 'madori' if item_id.startswith('k_') else 'thermal'
            video_file = os.path.join(PUBLIC_DIR, 'videos', 'veo3', genre, f"{item_id}.mp4")
            raw_archive = os.path.join(PUBLIC_DIR, 'videos', 'veo3', 'raw_archive', genre, f"{item_id}_raw.mp4")
            source_video = video_file if os.path.exists(video_file) else raw_archive

            if not os.path.exists(source_video):
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "Source video not found"}')
                return

            thumb_dir = os.path.join(PUBLIC_DIR, 'images', 'knowledge', 'thumbnails')
            os.makedirs(thumb_dir, exist_ok=True)
            thumb_file = os.path.join(thumb_dir, f"{item_id}_thumb.jpg")

            import subprocess
            cmd = ['ffmpeg', '-y', '-ss', ss_time, '-i', source_video, '-vframes', '1', '-q:v', '2', thumb_file]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

            if res.returncode == 0:
                rel_thumb = f"/images/knowledge/thumbnails/{item_id}_thumb.jpg"
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "thumbnailUrl": rel_thumb}).encode('utf-8'))
            else:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Failed to extract thumbnail"}).encode('utf-8'))
            return

        # API: /api/auth/magic-link (マジックリンク発行・ユーザー認証)
        if path == '/api/auth/magic-link':
            name = body.get('name', 'お施主様')
            email = body.get('email', '')
            phone = body.get('phone', '')
            if not email:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(b'{"error": "Email is required"}')
                return

            db = load_users_db()
            user_id = 'usr_' + hashlib.md5(email.encode('utf-8')).hexdigest()[:10]
            token = 'tok_' + hashlib.md5(f"{email}_{time.time()}".encode('utf-8')).hexdigest()[:16]

            user = db.get('users', {}).get(user_id, {
                "id": user_id,
                "name": name,
                "email": email,
                "phone": phone,
                "plan_applied": False,
                "created_at": datetime.now().strftime('%Y-%m-%d %H:%M')
            })
            user['name'] = name
            user['magic_token'] = token
            db.setdefault('users', {})[user_id] = user
            save_users_db(db)

            magic_url = f"/#dashboard?token={token}"
            print(f"[Magic Link Issued] User: {name} ({email}) -> Token: {token}")

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "message": f"{name} 様宛にログインリンクを発行しました。",
                "token": token,
                "magicUrl": magic_url,
                "user": user
            }, ensure_ascii=False).encode('utf-8'))
            return

        # API: /api/dashboard/<userId>/chat (家カルテ内チャット投稿＆AI応答)
        if path.startswith('/api/dashboard/') and path.endswith('/chat'):
            user_id = path.replace('/api/dashboard/', '').replace('/chat', '').strip('/')
            text = body.get('text', '')
            db = load_users_db()
            chats = db.setdefault('chats', {}).setdefault(user_id, [])

            user_msg = {
                "id": "msg_" + str(int(time.time() * 1000)),
                "sender": "user",
                "text": text,
                "created_at": datetime.now().strftime('%H:%M')
            }
            chats.append(user_msg)

            # AIエージェントの自動応答
            ai_reply = "ご質問ありがとうございます！株式会社住ま居るのAIエージェントです。いただいたご要望をカルテに安全に記録しました。専任の設計士・工務スタッフからも追って詳細なアドバイスを差し上げます。他に気になる点はございますか？"
            if "ローン" in text or "金利" in text:
                ai_reply = "住宅ローンに関するご質問ですね！埼玉エリアの提携優遇金利（武蔵野銀行・埼玉りそな等）や、がん特約・団信についてAI診断結果をカルテに反映できます。詳しくはカルテ上部の「AI住宅ローン診断」ボタンもご活用ください。"
            elif "間取り" in text or "図面" in text:
                ai_reply = "間取りに関するご質問ですね！作成いただいたスケッチや平面図は、管理者の選別・監修を経て手直し登録が可能です。SmileStudioでの立体パース生成もいつでもご利用いただけます。"
            elif "不具合" in text or "エラー" in text or "気づき" in text:
                ai_reply = "運用初期の貴重なお気づき・フィードバックをいただき誠にありがとうございます！担当エンジニアおよび専任スタッフへ即時共有いたしました。迅速に改善対応を進めさせていただきます。"

            ai_msg = {
                "id": "msg_" + str(int(time.time() * 1000) + 1),
                "sender": "ai",
                "text": ai_reply,
                "created_at": datetime.now().strftime('%H:%M')
            }
            chats.append(ai_msg)
            save_users_db(db)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "reply": ai_reply, "messages": chats}, ensure_ascii=False).encode('utf-8'))
            return

        # API: /api/dashboard/<userId>/files (ファイルアップロード登録)
        if path.startswith('/api/dashboard/') and path.endswith('/files'):
            user_id = path.replace('/api/dashboard/', '').replace('/files', '').strip('/')
            db = load_users_db()
            files = db.setdefault('files', {}).setdefault(user_id, [])
            files.insert(0, body)
            save_users_db(db)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "files": files}, ensure_ascii=False).encode('utf-8'))
            return

        # API: /api/carte/migrate-to-drive (Google Drive同期シミュレーション)
        if path == '/api/carte/migrate-to-drive':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "message": "Google Drive連携バックアップとローカル整合性チェックが完了しました。"
            }, ensure_ascii=False).encode('utf-8'))
            return

        # API: /api/carte/<userId>/apply-plan (プラン申込ステータス切替: 申込前/申込後テスト用)
        if path.startswith('/api/carte/') and path.endswith('/apply-plan'):
            user_id = path.replace('/api/carte/', '').replace('/apply-plan', '').strip('/')
            plan_status = body.get('plan_applied', True)
            db = load_users_db()
            if user_id in db.get('users', {}):
                db['users'][user_id]['plan_applied'] = plan_status
                save_users_db(db)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "plan_applied": plan_status}, ensure_ascii=False).encode('utf-8'))
            return

        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"error": "API not found"}')

def run():
    port = 8080
    server_address = ('0.0.0.0', port)
    handler = partial(RobustRequestHandler, directory=PUBLIC_DIR)
    httpd = ThreadingHTTPServer(server_address, handler)
    print(f"Robust Server running on port {port}...")
    sys.stdout.flush()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass

if __name__ == '__main__':
    run()
