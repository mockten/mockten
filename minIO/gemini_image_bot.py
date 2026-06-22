#!/usr/bin/env python3
"""
gemini_image_bot.py
-------------------
Playwrightを使ってGemini (gemini.google.com) に自動でアクセスし、
不足している商品画像を1枚ずつ生成・ダウンロードして、
minIO/photosに正しい名前で保存し、MinIOにアップロードする。

Requirements:
  pip3 install playwright minio --break-system-packages
  python3 -m playwright install chromium

Usage:
  python3 gemini_image_bot.py
  
  # テスト（1件だけ試す）
  python3 gemini_image_bot.py --test
  
  # 特定のIDから再開
  python3 gemini_image_bot.py --start-from <product_id>
"""

import os
import sys
import glob
import shutil
import time
import json
import argparse
from pathlib import Path

PHOTOS_DIR = Path(__file__).parent / "photos"
DOWNLOADS_DIR = Path.home() / "Downloads"
MINIO_ENDPOINT = "localhost:9000"
MINIO_ACCESS_KEY = "minioadmin"
MINIO_SECRET_KEY = "minioadmin"
MINIO_BUCKET = "photos"

# Gemini URLのパターン  
GEMINI_URL = "https://gemini.google.com"

# 不足している14件の商品
MISSING_PRODUCTS = [
    {
        "id": "d8010b33-ef59-4f07-a2a9-e4898396af51",
        "name": "Interactive Wooden Train Set",
        "prompt": "A colorful and vibrant studio shot of 'Interactive Wooden Train Set' toy, kid-friendly design, on a clean light pastel background, soft shadows, 1:1 aspect ratio."
    },
    {
        "id": "da859deb-003b-458a-83a3-feb1f1912945",
        "name": "Interactive Board Game Pack",
        "prompt": "A colorful and vibrant studio shot of 'Interactive Board Game Pack' toy, kid-friendly design, on a clean light pastel background, soft shadows, 1:1 aspect ratio."
    },
    {
        "id": "dc72d150-333a-4ae3-8837-ed9ebc2a5bd3",
        "name": "Leather Craft Tool Set",
        "prompt": "A professional product photo of 'Leather Craft Tool Set', high-quality hobby/craft tool/kit, arranged neatly on a clean wooden workbench, bright studio lighting, 1:1 aspect ratio."
    },
    {
        "id": "dc8fc4c1-894c-49dc-b5c0-d534c549c2ec",
        "name": "Silicone Feeding Bowl",
        "prompt": "A gentle and soft studio product photo of 'Silicone Feeding Bowl' baby product, pastel colors, soft fabric texture, lying on a clean white organic cotton sheet, warm soft lighting, 1:1 aspect ratio."
    },
    {
        "id": "dcf8524e-85d2-417a-8bf0-be56a85e4385",
        "name": "Puzzle 1000 Pieces",
        "prompt": "A professional product photo of 'Puzzle 1000 Pieces', high-quality hobby/craft tool/kit, arranged neatly on a clean wooden workbench, bright studio lighting, 1:1 aspect ratio."
    },
    {
        "id": "e0bb5895-58dc-4e0d-a656-77d324247a2f",
        "name": "Artist Puzzle 1000 Pieces",
        "prompt": "A professional product photo of 'Artist Puzzle 1000 Pieces', high-quality hobby/craft tool/kit, arranged neatly on a clean wooden workbench, bright studio lighting, 1:1 aspect ratio."
    },
    {
        "id": "e838fa92-5720-4f84-86ba-4251980ef303",
        "name": "Warm Winter Jacket",
        "prompt": "A clean studio shot of 'Warm Winter Jacket' product for kids, colorful design, light neutral background, bright friendly lighting, 1:1 aspect ratio."
    },
    {
        "id": "e8473d15-580a-41e3-9d5c-8224c426b667",
        "name": "Flying Frisbee Toy",
        "prompt": "A colorful and vibrant studio shot of 'Flying Frisbee Toy' toy, kid-friendly design, on a clean light pastel background, soft shadows, 1:1 aspect ratio."
    },
    {
        "id": "e8775385-8f60-490d-baa3-84b773ebd2bc",
        "name": "Premium Puzzle 1000 Pieces",
        "prompt": "A professional product photo of 'Premium Puzzle 1000 Pieces', high-quality hobby/craft tool/kit, arranged neatly on a clean wooden workbench, bright studio lighting, 1:1 aspect ratio."
    },
    {
        "id": "ee3d01ae-745c-4f59-bf4c-01a5caf29c2a",
        "name": "Interactive Clay Modeling Kit",
        "prompt": "A colorful and vibrant studio shot of 'Interactive Clay Modeling Kit' toy, kid-friendly design, on a clean light pastel background, soft shadows, 1:1 aspect ratio."
    },
    {
        "id": "f3073c24-7dfa-450f-affc-7bcf5943d232",
        "name": "Pro Resistance Bands Set",
        "prompt": "A rugged and clean product photo of 'Pro Resistance Bands Set' sports/outdoor gear, standing on a natural background (like grass, rock, or sand) under bright clear daylight, 1:1 aspect ratio."
    },
    {
        "id": "f4c77af9-9ce6-483c-a241-c76012e0d653",
        "name": "Board Game Pack",
        "prompt": "A colorful and vibrant studio shot of 'Board Game Pack' toy, kid-friendly design, on a clean light pastel background, soft shadows, 1:1 aspect ratio."
    },
    {
        "id": "fec7f1a1-dc79-41a1-a78f-3e786fb11644",
        "name": "Starter Leather Craft Tool Set",
        "prompt": "A professional product photo of 'Starter Leather Craft Tool Set', high-quality hobby/craft tool/kit, arranged neatly on a clean wooden workbench, bright studio lighting, 1:1 aspect ratio."
    },
    {
        "id": "ff8d494b-a21b-4799-9af1-b19e477f6fbd",
        "name": "Kids Sunglasses",
        "prompt": "A clean studio shot of 'Kids Sunglasses' product for kids, colorful design, light neutral background, bright friendly lighting, 1:1 aspect ratio."
    },
]


def get_downloads_snapshot():
    """現在のDownloadsのPNGファイルsetを返す"""
    return set(glob.glob(str(DOWNLOADS_DIR / "*.png")))


def wait_for_new_download(before: set, timeout: int = 180) -> str | None:
    """新しいPNGがDownloadsに現れるまで待つ。タイムアウトしたらNoneを返す"""
    start = time.time()
    while time.time() - start < timeout:
        current = set(glob.glob(str(DOWNLOADS_DIR / "*.png")))
        new = current - before
        if new:
            # 最新のファイルを返す
            return max(new, key=os.path.getmtime)
        time.sleep(1)
    return None


def copy_and_upload(downloaded_file: str, product_id: str) -> bool:
    """ファイルをリネームしてphotos/に置き、MinIOにアップロード"""
    target_name = f"{product_id}.png"
    target_path = PHOTOS_DIR / target_name
    
    # Copy to photos dir
    shutil.copy2(downloaded_file, target_path)
    print(f"  📋 Copied → {target_path}")
    
    # Upload to MinIO
    try:
        from minio import Minio
        client = Minio(MINIO_ENDPOINT, access_key=MINIO_ACCESS_KEY, secret_key=MINIO_SECRET_KEY, secure=False)
        client.fput_object(MINIO_BUCKET, target_name, str(target_path), content_type="image/png")
        print(f"  ✅ MinIO upload OK: {target_name}")
        return True
    except Exception as e:
        print(f"  ⚠️  MinIO upload failed: {e}")
        print(f"  (File is saved locally at {target_path})")
        return False


def run_bot(products: list, use_chrome: bool = True, headless: bool = False):
    """Playwrightでgemini.google.comを操作して画像を生成・DL"""
    from playwright.sync_api import sync_playwright
    
    results = []
    
    with sync_playwright() as p:
        import tempfile
        import shutil as _shutil
        
        print(f"🌐 Launching browser (headless={headless})...")
        
        # ChromeのデフォルトプロファイルからDefault/を一時ディレクトリにコピーして使う
        # （元のChromeが起動中でも衝突しない）
        chrome_base = Path.home() / "Library" / "Application Support" / "Google" / "Chrome"
        chrome_default = chrome_base / "Default"
        tmp_profile = None
        context = None
        
        if use_chrome and chrome_default.exists():
            try:
                tmp_profile = tempfile.mkdtemp(prefix="playwright_chrome_")
                tmp_default = Path(tmp_profile) / "Default"
                # Cookiesだけコピー（軽量でログイン状態を引き継ぐ）
                tmp_default.mkdir(parents=True, exist_ok=True)
                cookie_src = chrome_default / "Cookies"
                if cookie_src.exists():
                    _shutil.copy2(cookie_src, tmp_default / "Cookies")
                # Local Storage
                ls_src = chrome_default / "Local Storage"
                if ls_src.exists():
                    _shutil.copytree(ls_src, tmp_default / "Local Storage", dirs_exist_ok=True)
                
                context = p.chromium.launch_persistent_context(
                    user_data_dir=tmp_profile,
                    channel="chrome",
                    headless=headless,
                    accept_downloads=True,
                    downloads_path=str(DOWNLOADS_DIR),
                    args=["--no-first-run", "--no-default-browser-check",
                          "--disable-sync", "--disable-extensions"]
                )
                page = context.new_page()
                print(f"  ✅ Using temporary Chrome profile: {tmp_profile}")
            except Exception as e:
                print(f"  ⚠️  Chrome profile copy failed: {e}")
                print(f"  🔄 Falling back to fresh Chromium...")
                context = None
                if tmp_profile and Path(tmp_profile).exists():
                    _shutil.rmtree(tmp_profile, ignore_errors=True)
                tmp_profile = None
        
        if context is None:
            browser = p.chromium.launch(headless=headless)
            context = browser.new_context(accept_downloads=True)
            page = context.new_page()
        
        # まずGeminiに移動して状態確認
        print(f"🔗 Navigating to {GEMINI_URL} ...")
        page.goto(GEMINI_URL, timeout=60000)
        page.wait_for_load_state("networkidle", timeout=30000)
        time.sleep(3)
        
        # ログイン確認
        if "accounts.google.com" in page.url or "signin" in page.url.lower():
            print("⚠️  Not logged in! Please log into Google/Gemini manually.")
            print("   The browser is now open. Please log in, then press Enter here...")
            input("Press Enter after logging in: ")
            page.wait_for_url(f"{GEMINI_URL}/**", timeout=60000)
        
        print(f"✅ On Gemini. Starting image generation loop...")
        print(f"   Will process {len(products)} products\n")
        
        for i, product in enumerate(products, 1):
            pid = product["id"]
            name = product["name"]
            prompt = product["prompt"]
            
            print(f"\n{'='*60}")
            print(f"[{i}/{len(products)}] {name}")
            print(f"ID: {pid}")
            print(f"Prompt: {prompt[:80]}...")
            print(f"{'='*60}")
            
            # すでに存在するなら skip
            target_path = PHOTOS_DIR / f"{pid}.png"
            if target_path.exists():
                print(f"  ⏭️  Already exists, skipping.")
                results.append({"id": pid, "name": name, "status": "skipped"})
                continue
            
            # 新規チャットを開く
            print("  🔄 Starting new chat...")
            try:
                # New chat button を探す
                # GeminiのUIでは "新しいチャット" or pencil icon など
                new_chat_selectors = [
                    "button[aria-label='New chat']",
                    "button[aria-label='新しいチャット']",
                    "[data-test-id='new-chat-button']",
                    "a[href='/']",
                    "button:has-text('New chat')",
                    "button:has-text('新しいチャット')",
                ]
                new_chat_clicked = False
                for selector in new_chat_selectors:
                    try:
                        btn = page.locator(selector).first
                        if btn.is_visible(timeout=2000):
                            btn.click()
                            new_chat_clicked = True
                            break
                    except:
                        pass
                
                if not new_chat_clicked:
                    # URLで直接新しいチャットへ
                    page.goto(GEMINI_URL, timeout=30000)
                
                page.wait_for_load_state("networkidle", timeout=15000)
                time.sleep(2)
            except Exception as e:
                print(f"  ⚠️  New chat navigation: {e}")
                page.goto(GEMINI_URL, timeout=30000)
                time.sleep(3)
            
            # Downloadsのスナップショット（DL検出用）
            before_dl = get_downloads_snapshot()
            
            # プロンプトを入力
            print("  ✍️  Typing prompt...")
            try:
                # テキスト入力エリアを探す
                input_selectors = [
                    "rich-textarea",
                    "div[contenteditable='true']",
                    "textarea[placeholder]",
                    "[data-test-id='chat-input']",
                    ".ql-editor",
                    "p[data-placeholder]",
                ]
                input_found = False
                for sel in input_selectors:
                    try:
                        inp = page.locator(sel).first
                        if inp.is_visible(timeout=3000):
                            inp.click()
                            time.sleep(0.5)
                            inp.fill(prompt)
                            input_found = True
                            print(f"  📝 Input using: {sel}")
                            break
                    except:
                        pass
                
                if not input_found:
                    # フォールバック: keyboard type
                    page.keyboard.press("Tab")
                    time.sleep(0.5)
                    page.keyboard.type(prompt)
                
                time.sleep(1)
                
                # 送信
                page.keyboard.press("Enter")
                print("  📨 Prompt sent, waiting for image generation...")
                
            except Exception as e:
                print(f"  ❌ Failed to input prompt: {e}")
                results.append({"id": pid, "name": name, "status": "error", "error": str(e)})
                continue
            
            # 画像が生成されるまで待つ（最大3分）
            image_appeared = False
            print("  ⏳ Waiting for image to appear (up to 3 min)...")
            try:
                # 画像が生成されたことを示すセレクタ
                img_selectors = [
                    "img[alt*='Generated']",
                    "img[src*='blob:']",
                    "[data-test-id='image-container'] img",
                    ".generated-image img",
                    "figure img",
                    "response-container img",
                ]
                
                deadline = time.time() + 180
                while time.time() < deadline:
                    for sel in img_selectors:
                        try:
                            img = page.locator(sel).first
                            if img.is_visible(timeout=1000):
                                image_appeared = True
                                break
                        except:
                            pass
                    if image_appeared:
                        break
                    
                    # エラーメッセージチェック
                    error_texts = ["I can't create", "I'm not able to", "Unable to generate", "cannot generate"]
                    page_text = page.inner_text("body")
                    for err in error_texts:
                        if err.lower() in page_text.lower():
                            print(f"  ⚠️  Gemini refused to generate image")
                            break
                    
                    time.sleep(2)
                
                if not image_appeared:
                    print("  ❓ Image may not have appeared. Checking for download button anyway...")
            
            except Exception as e:
                print(f"  ⚠️  Image wait error: {e}")
            
            time.sleep(3)  # 追加待機
            
            # ダウンロードボタンを探してクリック
            print("  📥 Looking for download button...")
            downloaded_file = None
            try:
                dl_selectors = [
                    "button[aria-label*='Download']",
                    "button[aria-label*='ダウンロード']",
                    "button[title*='Download']",
                    "[data-test-id='download-button']",
                    "button:has-text('Download')",
                    # アイコンボタン
                    "button svg[path*='download']",
                    ".download-button",
                ]
                
                dl_clicked = False
                for sel in dl_selectors:
                    try:
                        btn = page.locator(sel).first
                        if btn.is_visible(timeout=2000):
                            # DownloadイベントをPlaywrightで捕捉
                            with page.expect_download(timeout=30000) as dl_info:
                                btn.click()
                            download = dl_info.value
                            
                            # ダウンロードファイルをDownloadsに保存
                            dl_dest = str(DOWNLOADS_DIR / download.suggested_filename)
                            download.save_as(dl_dest)
                            downloaded_file = dl_dest
                            print(f"  ✅ Downloaded via Playwright: {download.suggested_filename}")
                            dl_clicked = True
                            break
                    except Exception as de:
                        pass
                
                if not dl_clicked:
                    # フォールバック: 画像の右クリックメニューや別の方法
                    print("  🔍 Trying alternative download method...")
                    # 新しいファイルがDownloadsに来るのを待つ
                    # (ユーザーが手動でDLした場合の対応)
                    new_file = wait_for_new_download(before_dl, timeout=30)
                    if new_file:
                        downloaded_file = new_file
                        print(f"  ✅ Detected download: {Path(new_file).name}")
                
            except Exception as e:
                print(f"  ❌ Download error: {e}")
                # 画面スクショを撮る
                try:
                    screenshot_path = PHOTOS_DIR / f"debug_{pid}.png"
                    page.screenshot(path=str(screenshot_path))
                    print(f"  📸 Screenshot saved: {screenshot_path}")
                except:
                    pass
            
            if downloaded_file:
                # リネームしてMinIOにアップロード
                success = copy_and_upload(downloaded_file, pid)
                results.append({
                    "id": pid,
                    "name": name,
                    "status": "success" if success else "saved_locally",
                    "downloaded_as": Path(downloaded_file).name
                })
            else:
                print(f"  ❌ No download detected for {name}")
                results.append({"id": pid, "name": name, "status": "download_failed"})
            
            # 次へ行く前に少し待つ
            print("  ⏸️  Waiting before next product (5s)...")
            time.sleep(5)
        
        context.close()
        
        # 一時プロファイルを削除
        if tmp_profile and Path(tmp_profile).exists():
            try:
                import shutil as _shutil2
                _shutil2.rmtree(tmp_profile, ignore_errors=True)
                print(f"🧹 Cleaned up temp profile: {tmp_profile}")
            except:
                pass
    
    return results


def print_summary(results: list):
    print(f"\n{'='*60}")
    print("📊 SUMMARY")
    print(f"{'='*60}")
    success = [r for r in results if r["status"] == "success"]
    skipped = [r for r in results if r["status"] == "skipped"]
    failed = [r for r in results if r["status"] not in ("success", "skipped", "saved_locally")]
    local = [r for r in results if r["status"] == "saved_locally"]
    
    print(f"✅ Success (uploaded to MinIO): {len(success)}")
    print(f"💾 Saved locally only:          {len(local)}")
    print(f"⏭️  Skipped (already exists):   {len(skipped)}")
    print(f"❌ Failed:                      {len(failed)}")
    
    if failed:
        print("\nFailed products:")
        for r in failed:
            print(f"  - {r['name']} ({r['id']})")
    
    if local:
        print("\nLocally saved (MinIO upload failed - run upload.sh manually):")
        for r in local:
            print(f"  - {r['name']}: photos/{r['id']}.png")


def main():
    parser = argparse.ArgumentParser(description="Generate product images via Gemini")
    parser.add_argument("--test", action="store_true", help="Test with first product only")
    parser.add_argument("--start-from", help="Start from specific product_id")
    parser.add_argument("--headless", action="store_true", help="Run headless (no GUI)")
    parser.add_argument("--no-chrome", action="store_true", help="Don't use existing Chrome profile")
    args = parser.parse_args()
    
    products = MISSING_PRODUCTS
    
    if args.test:
        products = products[:1]
        print("🧪 TEST MODE: Processing first product only")
    
    if args.start_from:
        ids = [p["id"] for p in products]
        if args.start_from in ids:
            idx = ids.index(args.start_from)
            products = products[idx:]
            print(f"▶️  Starting from: {products[0]['name']}")
        else:
            print(f"❌ Product ID not found: {args.start_from}")
            sys.exit(1)
    
    print(f"🚀 Starting Gemini Image Bot")
    print(f"   Products to process: {len(products)}")
    print(f"   Photos dir: {PHOTOS_DIR}")
    print(f"   Downloads dir: {DOWNLOADS_DIR}")
    print()
    
    results = run_bot(products, use_chrome=not args.no_chrome, headless=args.headless)
    print_summary(results)


if __name__ == "__main__":
    main()
