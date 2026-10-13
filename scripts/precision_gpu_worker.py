# -*- coding: utf-8 -*-
"""
precision_gpu_worker.py
========================
Dell Precision 3680（代表PC）専用 GPUパース生成常駐ワーカー

【動作の仕組み】
1. Webサーバー（https://t-smile.co.jp またはローカルAPI）から
   「待機中（queued）」のパース生成リクエストを定期取得（ポーリング）。
2. Precision 3680 内の Stable Diffusion WebUI / Forge (http://127.0.0.1:7860) へ送信。
   - 部位別パーツイメージ（LDK/寝室/玄関/洗面/和室等）
   - 確定図面をもとにした ControlNet（Depth / LineArt）高精度レンダリング
3. レンダリング完了した高精細画像を Webサーバーへ自動アップロードし、
   施主の「家カルテ」へ即座に反映します。
"""

import os
import sys
import time
import json
import base64
import urllib.request
import urllib.error

# 設定
SERVER_BASE_URL = os.environ.get("SMILE_SERVER_URL", "https://t-smile.co.jp")
SD_WEBUI_URL = os.environ.get("SD_WEBUI_URL", "http://127.0.0.1:7860")
WORKER_TOKEN = os.environ.get("WORKER_TOKEN", "precision_3680_worker_secret_2026")
POLL_INTERVAL_SEC = 5

print("=" * 65)
print("  住ま居る AIパース工房 - Dell Precision 3680 GPUワーカー起動")
print(f"  Webサーバー接続先 : {SERVER_BASE_URL}")
print(f"  ローカルSD WebUI  : {SD_WEBUI_URL}")
print("=" * 65)


def check_sd_webui_ready():
    """SD WebUI がローカルで起動しているかチェック"""
    url = f"{SD_WEBUI_URL}/sdapi/v1/progress"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "PrecisionWorker/1.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            if resp.status == 200:
                print(f"[SD WebUI] 接続成功: {SD_WEBUI_URL} は準備完了です。")
                return True
    except Exception as e:
        print(f"[SD WebUI] 接続待機中 ({e}): {SD_WEBUI_URL} の起動を確認してください。")
        return False


def get_next_job():
    """Webサーバーから待機中ジョブを1件取得"""
    url = f"{SERVER_BASE_URL}/api/perspective/worker-poll?token={WORKER_TOKEN}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "PrecisionWorker/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("success") and data.get("job"):
                return data["job"]
    except urllib.error.HTTPError as e:
        if e.code != 404:
            print(f"[Worker Poll] HTTPエラー {e.code}: {e.reason}")
    except Exception as e:
        print(f"[Worker Poll] 通信エラー: {e}")
    return None


def execute_sd_render(job):
    """Stable Diffusion WebUI API を呼び出して画像を生成"""
    prompt = job.get("prompt", "")
    negative_prompt = job.get("negative_prompt", "blurry, low quality, distorted architecture, crooked walls, cgi look, plastic")
    width = job.get("width", 1024)
    height = job.get("height", 768)
    steps = job.get("steps", 28)
    cfg_scale = job.get("cfg_scale", 7.0)
    init_image = job.get("init_image", None)
    controlnet_image = job.get("controlnet_image", None)

    # txt2img または img2img
    api_endpoint = f"{SD_WEBUI_URL}/sdapi/v1/txt2img"
    payload = {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "steps": steps,
        "cfg_scale": cfg_scale,
        "width": width,
        "height": height,
        "sampler_name": "DPM++ 2M Karas"
    }

    # ControlNet または img2img の設定
    if controlnet_image:
        payload["alwayson_scripts"] = {
            "controlnet": {
                "args": [
                    {
                        "input_image": controlnet_image,
                        "module": "depth_anything_v2",
                        "model": "control_v11f1p_sd15_depth",
                        "weight": 0.85,
                        "control_mode": "Balanced"
                    }
                ]
            }
        }
    elif init_image:
        api_endpoint = f"{SD_WEBUI_URL}/sdapi/v1/img2img"
        payload["init_images"] = [init_image]
        payload["denoising_strength"] = job.get("denoising_strength", 0.45)

    print(f"[SD Render] レンダリング開始: JobID={job.get('id')} / Prompt={prompt[:50]}...")
    start_t = time.time()

    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        api_endpoint,
        data=req_data,
        headers={"Content-Type": "application/json"}
    )

    with urllib.request.urlopen(req, timeout=300) as resp:
        res_data = json.loads(resp.read().decode("utf-8"))
        elapsed = time.time() - start_t
        print(f"[SD Render] 生成完了！所要時間: {elapsed:.1f} 秒")
        images = res_data.get("images", [])
        if images:
            return images[0]  # Base64 string
    return None


def upload_completed_job(job_id, base64_image):
    """完成した画像をWebサーバーへ登録"""
    url = f"{SERVER_BASE_URL}/api/perspective/worker-upload"
    payload = {
        "token": WORKER_TOKEN,
        "jobId": job_id,
        "base64Image": base64_image
    }
    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=req_data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read().decode("utf-8"))
        print(f"[Worker Upload] ジョブ完了登録: {result.get('message', 'OK')}")


def main_loop():
    print("[Worker] ジョブ監視ループを開始します（ポーリング間隔: 5秒）...")
    while True:
        try:
            job = get_next_job()
            if job:
                print(f"[Worker] 新規生成リクエスト受信: ID={job['id']} (施主ID: {job.get('userId')})")
                base64_img = execute_sd_render(job)
                if base64_img:
                    upload_completed_job(job["id"], base64_img)
                else:
                    print(f"[Worker] 画像生成に失敗しました: ID={job['id']}")
            time.sleep(POLL_INTERVAL_SEC)
        except KeyboardInterrupt:
            print("\n[Worker] 終了します。")
            break
        except Exception as e:
            print(f"[Worker Loop Error] {e}")
            time.sleep(POLL_INTERVAL_SEC)


if __name__ == "__main__":
    check_sd_webui_ready()
    main_loop()
