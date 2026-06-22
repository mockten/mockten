#!/usr/bin/env python3
"""
gemini_image_bot.py
-----------------------
Playwrightで専用プロファイルを持ったChromeを起動し、
Gemini (gemini.google.com) で商品画像を生成・ダウンロードして
minIO/photosに直接保存し、MinIOにアップロードする。
成功した商品は missing_products.json から自動で削除されます。
タイムアウト対策として、画像生成後に10秒待機しJSで強制クリックを行います。
"""

import time
import json
import argparse
from pathlib import Path

PHOTOS_DIR = Path(__file__).parent / "photos"
CHROME_PROFILE_DIR = Path(__file__).parent / "chrome_profile"
PRODUCTS_FILE = Path(__file__).parent / "missing_products.json"

MINIO_ENDPOINT = "localhost:9000"
MINIO_ACCESS_KEY = "minioadmin"
MINIO_SECRET_KEY = "minioadmin"
MINIO_BUCKET = "photos"
GEMINI_URL = "https://gemini.google.com"

# 初回生成用のデフォルトリスト（JSONがない場合に使用）
# 初回生成用のデフォルトリスト（JSONがない場合に使用）
DEFAULT_PRODUCTS = [
    {
        "id": "1da80fb5-2dd5-4cec-ab68-148a7fc149c1",
        "name": "Strategic Marketing Manual",
        "prompt": "A professional product photo of the book 'Strategic Marketing Manual', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "1f647c38-78f1-4848-9653-dc6efaf7039a",
        "name": "Baking Masterclass",
        "prompt": "A professional product photo of the book 'Baking Masterclass', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "2eb77ba3-bef1-4680-b10d-a19c86d2f3a5",
        "name": "Principles of Modern Strategy",
        "prompt": "A professional product photo of the book 'Principles of Modern Strategy', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "3950768b-1be3-402b-ace1-89cdda387232",
        "name": "Verses of Winter",
        "prompt": "A professional product photo of the book 'Verses of Winter', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "3cb97fba-1ace-4d6f-b1b9-e4f62b92675f",
        "name": "AI and Deep Learning Essentials",
        "prompt": "A professional product photo of the book 'AI and Deep Learning Essentials', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "3d1ce936-fcac-40de-9c4b-dbf8161e74ad",
        "name": "Neural Networks Handbook",
        "prompt": "A professional product photo of the book 'Neural Networks Handbook', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "5daf91b0-ff41-4ca7-8994-af3b9adc6989",
        "name": "Deep Dive into Python",
        "prompt": "A professional product photo of the book 'Deep Dive into Python', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "553469d6-5bb7-4152-bdaf-fd999a877314",
        "name": "Stories of the Past",
        "prompt": "A professional product photo of the book 'Stories of the Past', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "7a5dad1b-68eb-4a1a-ba14-b600ff94a94a",
        "name": "Intrigue in London",
        "prompt": "A professional product photo of the book 'Intrigue in London', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "f34c5ff1-8e43-400c-82e0-1232e2eef42e",
        "name": "Melodies of Autumn",
        "prompt": "A professional product photo of the book 'Melodies of Autumn', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "eab888a9-7dd2-41ad-b3aa-004db681cabe",
        "name": "Secret in Tokyo",
        "prompt": "A professional product photo of the book 'Secret in Tokyo', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "e844e9dd-0785-416d-855b-59106743afa1",
        "name": "The Lost Expedition",
        "prompt": "A professional product photo of the book 'The Lost Expedition', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "cec8475f-59c3-493f-878c-2a852133f287",
        "name": "Unlocking Lateral Thought",
        "prompt": "A professional product photo of the book 'Unlocking Lateral Thought', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "d39ceb87-5a1e-479a-8125-7ea61f052437",
        "name": "Journey to the Unknown",
        "prompt": "A professional product photo of the book 'Journey to the Unknown', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "d74991ba-1253-4543-b15d-4eea325dd113",
        "name": "Introduction to Python",
        "prompt": "A professional product photo of the book 'Introduction to Python', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "e4526e41-8b84-4b29-9998-2f3df1f68354",
        "name": "The Art of Innovation",
        "prompt": "A professional product photo of the book 'The Art of Innovation', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "bf1e409f-2ee9-4ec7-910f-e2a15042b44e",
        "name": "Corporate Leadership Fundamentals",
        "prompt": "A professional product photo of the book 'Corporate Leadership Fundamentals', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "b16435bf-513e-447f-9a03-39a3c3b62a40",
        "name": "Machine Learning Masterclass",
        "prompt": "A professional product photo of the book 'Machine Learning Masterclass', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "ae390d4a-6829-481a-b498-cbc280b47405",
        "name": "Legends of the Middle Ages",
        "prompt": "A professional product photo of the book 'Legends of the Middle Ages', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "7dd65fea-2406-4f57-9779-c4e5447187bf",
        "name": "Gourmet Home Cooking",
        "prompt": "A professional product photo of the book 'Gourmet Home Cooking', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "95358db8-5a28-4b32-b6dc-ff04bede2601",
        "name": "Epic Quest Chronicles",
        "prompt": "A professional product photo of the book 'Epic Quest Chronicles', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio."
    },
    {
        "id": "6b87a031-96db-45e7-a561-a81c7d0724c0",
        "name": "Premium Electronic Keyboard",
        "prompt": "A sleek studio shot of 'Premium Electronic Keyboard' music equipment, cinematic lighting, dark background, exactly 1:1 aspect ratio."
    },
    {
        "id": "94d66b90-8945-40f4-857e-5803497f384b",
        "name": "Electronic Keyboard",
        "prompt": "A sleek studio shot of 'Electronic Keyboard' music equipment, cinematic lighting, dark background, exactly 1:1 aspect ratio."
    },
    {
        "id": "94a12631-4158-4399-babf-74effd5a91bc",
        "name": "Vinyl Turntable",
        "prompt": "A sleek studio shot of 'Vinyl Turntable' music equipment, cinematic lighting, dark background, exactly 1:1 aspect ratio."
    },
    {
        "id": "70739a42-81e3-4ad0-9714-148744e8c8fe",
        "name": "Drum Sticks Set",
        "prompt": "A sleek studio shot of 'Drum Sticks Set' music equipment, cinematic lighting, dark background, exactly 1:1 aspect ratio."
    },
    {
        "id": "f778d47b-6846-44b3-9a7a-6e5445158c44",
        "name": "Premium Studio Headphones",
        "prompt": "A sleek studio shot of 'Premium Studio Headphones' music equipment, cinematic lighting, dark background, exactly 1:1 aspect ratio."
    },
    {
        "id": "e8b2b8f2-2a4e-453d-b968-88e1f1b9f98f",
        "name": "Pop Filter Screen",
        "prompt": "A sleek studio shot of 'Pop Filter Screen' music equipment, cinematic lighting, dark background, exactly 1:1 aspect ratio."
    },
    {
        "id": "d23864a4-6c9f-417f-9a4b-e8e23e1bb951",
        "name": "Studio Vocal Microphone",
        "prompt": "A sleek studio shot of 'Studio Vocal Microphone' music equipment, cinematic lighting, dark background, exactly 1:1 aspect ratio."
    },
    {
        "id": "d208fa6a-b5de-40d8-b31d-3dec63635dff",
        "name": "Studio Drum Sticks Set",
        "prompt": "A sleek studio shot of 'Studio Drum Sticks Set' music equipment, cinematic lighting, dark background, exactly 1:1 aspect ratio."
    },
    {
        "id": "a89b3f78-ab45-4e3f-8452-ff96af030a5d",
        "name": "Studio Vinyl Turntable",
        "prompt": "A sleek studio shot of 'Studio Vinyl Turntable' music equipment, cinematic lighting, dark background, exactly 1:1 aspect ratio."
    },
    {
        "id": "61d63d8b-168d-49f2-b272-51a9dc120f11",
        "name": "Classic Digital Piano",
        "prompt": "A sleek studio shot of 'Classic Digital Piano' music equipment, cinematic lighting, dark background, exactly 1:1 aspect ratio."
    },
    {
        "id": "0c759ad8-cd24-43cf-80d9-bb63f4de2630",
        "name": "Interactive Plush Bear Toy",
        "prompt": "A colorful and vibrant studio shot of 'Interactive Plush Bear Toy' toy, kid-friendly design, on a clean light pastel background, 1:1 aspect ratio."
    },
    {
        "id": "84445d62-7124-4465-b270-d16b845cafcb",
        "name": "Plush Bear Toy",
        "prompt": "A colorful and vibrant studio shot of 'Plush Bear Toy' toy, kid-friendly design, on a clean light pastel background, 1:1 aspect ratio."
    },
    {
        "id": "aea52ac6-bb28-43ac-921c-5f7cb7d6a21f",
        "name": "Classic Plush Bear Toy",
        "prompt": "A colorful and vibrant studio shot of 'Classic Plush Bear Toy' toy, kid-friendly design, on a clean light pastel background, 1:1 aspect ratio."
    },
    {
        "id": "aef65b43-9b29-4951-aa04-e36fac4d76a2",
        "name": "Water Gun Blaster",
        "prompt": "A colorful and vibrant studio shot of 'Water Gun Blaster' toy, kid-friendly design, on a clean light pastel background, 1:1 aspect ratio."
    },
    {
        "id": "b90e0684-17ad-450b-aad0-017c3266c6f1",
        "name": "Safe Kids Sunglasses",
        "prompt": "A clean studio shot of 'Safe Kids Sunglasses' product for kids, colorful design, light neutral background, exactly 1:1 aspect ratio."
    },
    {
        "id": "995051eb-fc4d-4a61-94cb-4c59aea5609c",
        "name": "Vitamin C Serum",
        "prompt": "A luxurious and elegant beauty product shot of 'Vitamin C Serum', soft glowing light, pastel background, exactly 1:1 aspect ratio."
    },
    {
        "id": "c042813d-fe5c-446e-9a39-960bba414b4f",
        "name": "Natural Hair Dryer Ionic",
        "prompt": "A luxurious and elegant beauty product shot of 'Natural Hair Dryer Ionic', soft glowing light, pastel background, exactly 1:1 aspect ratio."
    }
]


def load_products() -> list:
    """JSONファイルからリストを読み込む。無ければデフォルトを作成する"""
    if not PRODUCTS_FILE.exists():
        with open(PRODUCTS_FILE, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_PRODUCTS, f, indent=2, ensure_ascii=False)
        return list(DEFAULT_PRODUCTS)
    
    with open(PRODUCTS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_products(products: list):
    """JSONファイルにリストを保存する"""
    with open(PRODUCTS_FILE, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=2, ensure_ascii=False)


def upload_to_minio(file_path: Path, target_name: str) -> bool:
    """MinIOにアップロードする"""
    try:
        from minio import Minio
        client = Minio(MINIO_ENDPOINT, access_key=MINIO_ACCESS_KEY, secret_key=MINIO_SECRET_KEY, secure=False)
        client.fput_object(MINIO_BUCKET, target_name, str(file_path), content_type="image/png")
        print(f"  ✅ MinIO upload OK: {target_name}")
        return True
    except Exception as e:
        print(f"  ⚠️  MinIO upload failed: {e}")
        print(f"  (File is saved locally at {file_path})")
        return False


def find_input_area(page):
    """Geminiのテキスト入力エリアを見つける"""
    selectors = [
        "rich-textarea p",
        "rich-textarea",
        "div[contenteditable='true']",
        "[placeholder*='Gemini']",
        "[placeholder*='Ask']",
        "textarea",
        ".input-area-container *[contenteditable]",
    ]
    for sel in selectors:
        try:
            el = page.locator(sel).first
            if el.is_visible(timeout=2000):
                return el, sel
        except:
            pass
    return None, None


def scroll_to_bottom(page):
    """ページを一番下にスクロール"""
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    time.sleep(0.5)


def find_download_button(page):
    """ダウンロードボタンを見つけて返す（クリックはしない）"""
    img_selectors = [
        "img[alt*='AI 生成']",
        "img[alt*='Generated']",
        "img[src^='blob:']",
        "img[alt*='generated']",
    ]
    
    # 画像にホバーしてダウンロードボタンをUI上に表示させる
    for img_sel in img_selectors:
        try:
            imgs = page.locator(img_sel).all()
            for img in imgs:
                if img.is_visible(timeout=1000):
                    print(f"  🖼️  Found image: {img_sel}, hovering...")
                    img.hover()
                    time.sleep(1)
                    break
        except:
            pass
    
    dl_selectors = [
        "[aria-label*='フルサイズの画像をダウンロード']",
        "[aria-label*='ダウンロード']",
        "[aria-label*='Download']",
        "[aria-label*='download']",
        "[title*='ダウンロード']",
        "[title*='Download']",
        "button:has-text('Download')",
        "button:has-text('ダウンロード')",
    ]
    
    for sel in dl_selectors:
        try:
            btns = page.locator(sel).all()
            for btn in btns:
                if btn.is_visible(timeout=500):
                    return btn
        except:
            pass
    return None


def run_bot(dry_run: bool = False):
    """PlaywrightでChromeを起動して画像生成ループを実行"""
    from playwright.sync_api import sync_playwright
    
    results = []
    products = load_products()
    
    if not products:
        print("✅ No missing products in the JSON file. Everything is done!")
        return results

    with sync_playwright() as p:
        print(f"🚀 Launching Chrome internally...")
        context = None
        try:
            context = p.chromium.launch_persistent_context(
                user_data_dir=CHROME_PROFILE_DIR,
                channel="chrome",
                headless=False,
                viewport={"width": 1280, "height": 800},
                accept_downloads=True  # ダウンロードをネイティブに許可
            )
            
            pages = context.pages
            page = pages[0] if pages else context.new_page()
            
            # Geminiを開く
            page.goto(GEMINI_URL, timeout=60000, wait_until="domcontentloaded")
            time.sleep(5)
            
            # 未ログイン時の待機処理
            if "accounts.google.com" in page.url or "signin" in page.url.lower():
                print("⚠️  Not logged in! Please log in manually in the opened browser.")
                print("⏳ Waiting 90 seconds for you to log in...")
                time.sleep(90)
                
                print("🔄 Reloading Gemini page to check login status...")
                try:
                    page.goto(GEMINI_URL, timeout=60000, wait_until="domcontentloaded")
                    time.sleep(5)
                except:
                    pass
                
                if "accounts.google.com" in page.url or "signin" in page.url.lower():
                    print("❌ Login timeout. Exiting.")
                    return results

            print(f"\n✅ Ready to generate images on Gemini")
            print(f"   Products to process: {len(products)}\n")
            
            if dry_run:
                print("🔍 DRY RUN - skipping actual generation")
                return results
            
            # リストを回す（ループ内で成功分を削除するためコピーを渡す）
            for i, product in enumerate(list(products), 1):
                pid = product["id"]
                name = product["name"]
                
                # 画像サイズ(1024x1024)の指定をプログラム側で強制追加
                base_prompt = product["prompt"]
                prompt = base_prompt + ", the output image must be exactly 1024x1024 pixels in size."
                
                print(f"\n{'='*60}")
                print(f"[{i}/{len(products)}] {name}")
                print(f"ID: {pid}")
                print(f"{'='*60}")
                
                target_name = f"{pid}.png"
                target_path = PHOTOS_DIR / target_name
                
                # すでにローカルに存在する場合はスキップ
                #if target_path.exists():
                #    print(f"  ⏭️  Already exists locally. Removing from JSON and skipping.")
                #    products = [p for p in products if p["id"] != pid]
                #    save_products(products)
                #    results.append({"id": pid, "name": name, "status": "skipped"})
                #    continue
                
                print("  🔄 Opening new Gemini chat...")
                try:
                    page.goto(GEMINI_URL, timeout=60000, wait_until="domcontentloaded")
                    time.sleep(5)
                except Exception as e:
                    print(f"  ⚠️  Navigation error: {e}")
                    time.sleep(3)
                
                print(f"  ✍️  Finding input area...")
                inp, sel = find_input_area(page)
                
                if inp is None:
                    print(f"  ❌ Could not find input area.")
                    results.append({"id": pid, "name": name, "status": "error", "error": "no input area"})
                    continue
                
                print(f"  📝 Input area found")
                try:
                    inp.click()
                    time.sleep(0.5)
                    page.keyboard.press("Control+a")
                    time.sleep(0.2)
                    page.keyboard.press("Backspace")
                    page.keyboard.type(prompt)
                    time.sleep(1)
                    
                    page.keyboard.press("Enter")
                    print(f"  📨 Prompt sent! (Appended 1024x1024 instruction)")
                    
                except Exception as e:
                    print(f"  ❌ Input error: {e}")
                    results.append({"id": pid, "name": name, "status": "error", "error": str(e)})
                    continue
                
                print("  ⏳ Waiting for image generation (up to 4 min)...")
                image_appeared = False
                timeout_secs = 240
                start_wait = time.time()
                
                # 生成完了の待機ループ
                btn = None
                while time.time() - start_wait < timeout_secs:
                    try:
                        body_text = page.inner_text("body", timeout=2000)
                        error_phrases = ["can't create", "cannot create", "i'm not able", "unable to generate", "作成できません", "生成できません"]
                        if any(ph in body_text.lower() for ph in error_phrases):
                            print(f"  ⚠️  Gemini declined to generate image")
                            break
                        
                        btn = find_download_button(page)
                        if btn:
                            image_appeared = True
                            print(f"  ✅ Initial download button detected after {time.time()-start_wait:.1f}s")
                            break
                    except:
                        pass
                    
                    elapsed = time.time() - start_wait
                    if int(elapsed) % 15 == 0:
                        print(f"  ⏳ Still waiting... {elapsed:.0f}s elapsed")
                    time.sleep(2)
                
                if not image_appeared:
                    print(f"  ⚠️  Image may not have appeared after {timeout_secs}s")
                
                # ---------------------------------------------------------
                # 修正ポイント: 描画の安定待ちとJS強制クリック
                # ---------------------------------------------------------
                if image_appeared or btn:
                    print("  ⏳ Image detected! Waiting 10 seconds for rendering to fully stabilize...")
                    time.sleep(90)
                    # 画面更新により要素が変わる可能性があるため、再取得
                    btn = find_download_button(page)
                
                if btn is None:
                    print("  ⚠️  Trying to scroll and look again...")
                    scroll_to_bottom(page)
                    time.sleep(2)
                    btn = find_download_button(page)
                
                if btn:
                    print("  📥 Clicking download button (Forced JS click)...")
                    try:
                        # 最大2分間ダウンロード完了を待機
                        with page.expect_download(timeout=120000) as download_info:
                            # 空振りを防ぐためJS経由で直接クリックを発火
                            btn.evaluate("el => el.click()")
                        
                        download = download_info.value
                        download.save_as(str(target_path))
                        print(f"  ✅ Downloaded directly to: {target_path}")
                        
                        # MinIOへアップロード
                        success = upload_to_minio(target_path, target_name)
                        
                        if success:
                            # 成功時のみJSONから該当商品を削除して上書き保存
                            products = [p for p in products if p["id"] != pid]
                            save_products(products)
                            results.append({"id": pid, "name": name, "status": "success"})
                        else:
                            results.append({"id": pid, "name": name, "status": "saved_locally"})
                            
                    except Exception as e:
                        print(f"  ❌ Download process failed: {e}")
                        results.append({"id": pid, "name": name, "status": "download_failed"})
                else:
                    print(f"  ❌ Could not click download button")
                    results.append({"id": pid, "name": name, "status": "no_download_button"})
                
                print(f"  ⏸️  Waiting 5s before next product...")
                time.sleep(5)
                
        except Exception as e:
            print(f"❌ Fatal error during execution: {e}")
            
        finally:
            if context:
                print("🛑 Closing browser...")
                context.close()
    
    return results


def print_summary(results: list):
    if not results:
        return
    print(f"\n{'='*60}")
    print("📊 SUMMARY")
    print(f"{'='*60}")
    success = [r for r in results if r["status"] == "success"]
    skipped = [r for r in results if r["status"] == "skipped"]
    local = [r for r in results if r["status"] == "saved_locally"]
    failed = [r for r in results if r["status"] not in ("success", "skipped", "saved_locally")]
    
    print(f"✅ Success (MinIO uploaded & removed from JSON): {len(success)}")
    print(f"💾 Saved locally only:                           {len(local)}")
    print(f"⏭️  Skipped (already exists):                     {len(skipped)}")
    print(f"❌ Failed:                                       {len(failed)}")
    
    if failed:
        print("\nFailed:")
        for r in failed:
            print(f"  - [{r.get('status')}] {r['name']}")
    
    if local:
        print("\nSaved locally (upload manually):")
        for r in local:
            print(f"  - photos/{r['id']}.png")


def main():
    parser = argparse.ArgumentParser(description="Gemini Image Bot")
    parser.add_argument("--dry-run", action="store_true", help="Check connection only, no generation")
    args = parser.parse_args()
    
    PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
    
    print(f"🚀 Gemini Image Bot")
    print(f"   Photos dir: {PHOTOS_DIR}")
    print(f"   JSON List: {PRODUCTS_FILE}")
    print(f"   Chrome Profile: {CHROME_PROFILE_DIR}")
    print()
    
    results = run_bot(dry_run=args.dry_run)
    print_summary(results)


if __name__ == "__main__":
    main()