#!/usr/bin/env python3
import json
import re
from pathlib import Path

# ==========================================
# 設定
# ==========================================
SQL_FILE = "../mysql/init.sql"  # ← 実際のSQLファイル名に合わせてください
PHOTOS_DIR = Path("photos")
OUTPUT_FILE = "missing_products.json"

# カテゴリーIDごとの最適化されたプロンプトテンプレート
CATEGORY_PROMPTS = {
    "01": "A professional product photo of the book '{pname}', lying flat on a clean modern desk, aesthetic lighting, high quality, 1:1 aspect ratio.",
    "02": "A sleek studio shot of '{pname}' music equipment, cinematic lighting, dark background, exactly 1:1 aspect ratio.",
    "03": "A mouth-watering, high-quality food photography shot of '{pname}', fresh ingredients, clean background, soft lighting, 1:1 aspect ratio.",
    "04": "A vibrant and dynamic product shot of '{pname}' gaming gear, neon accents, modern aesthetic, exactly 1:1 aspect ratio.",
    "05": "A cozy and elegant lifestyle product photo of '{pname}' home decor, soft natural light, exactly 1:1 aspect ratio.",
    "06": "A stylish flat-lay fashion photography shot of '{pname}', premium fabric texture, minimalistic neutral background, 1:1 aspect ratio.",
    "07": "A sleek, modern tech product photo of '{pname}', glossy reflective surface, studio lighting, exactly 1:1 aspect ratio.",
    "08": "A professional product photo of '{pname}', high-quality hobby kit, arranged neatly, bright studio lighting, exactly 1:1 aspect ratio.",
    "09": "A colorful and vibrant studio shot of '{pname}' toy, kid-friendly design, on a clean light pastel background, 1:1 aspect ratio.",
    "10": "A clean studio shot of '{pname}' product for kids, colorful design, light neutral background, exactly 1:1 aspect ratio.",
    "11": "A gentle and soft studio product photo of '{pname}' baby product, pastel colors, soft fabric texture, warm lighting, 1:1 aspect ratio.",
    "12": "A rugged and clean product photo of '{pname}' sports gear, standing on a natural background under bright clear daylight, exactly 1:1 aspect ratio.",
    "13": "A luxurious and elegant beauty product shot of '{pname}', soft glowing light, pastel background, exactly 1:1 aspect ratio.",
    "14": "A clean, professional automotive accessory product shot of '{pname}', sleek metallic background, exactly 1:1 aspect ratio.",
    "15": "A beautifully wrapped aesthetic photo of '{pname}' gift item, warm festive lighting, exactly 1:1 aspect ratio.",
    "16": "A clean, clinical, and fresh product photo of '{pname}' health supplement, bright white background, exactly 1:1 aspect ratio.",
    "99": "A professional, high-quality product photo of '{pname}', clean studio lighting, exactly 1:1 aspect ratio."
}

def main():
    # 1. SQLファイルの読み込み
    try:
        with open(SQL_FILE, "r", encoding="utf-8") as f:
            sql_text = f.read()
    except FileNotFoundError:
        print(f"❌ エラー: '{SQL_FILE}' が見つかりません。ファイル名を確認してください。")
        return

    # 2. ProductのINSERT文から ID, 商品名, カテゴリID を抽出
    # UUID, 商品名, 出品者(無視), 価格(無視), カテゴリID(2桁) の並びを厳密にキャッチ
    pattern = r"\('([a-f0-9\-]{36})',\s*'([^']+)',\s*'[^']+',\s*\d+,\s*'(\d{2})'"
    products_in_sql = {}
    for match in re.finditer(pattern, sql_text):
        pid, pname, cid = match.groups()
        products_in_sql[pid] = {
            "name": pname,
            "category": cid
        }
    
    print(f"🔍 SQLから {len(products_in_sql)} 件の商品情報を検出しました。")

    # 3. photosフォルダ内の既存画像IDを取得
    existing_ids = set()
    if PHOTOS_DIR.exists():
        for filepath in PHOTOS_DIR.glob("*.png"):
            # プレースホルダーなどは除外するため、UUID形式（36文字）のみ対象にする
            if len(filepath.stem) == 36:
                existing_ids.add(filepath.stem)
        print(f"🖼️  photosフォルダから {len(existing_ids)} 件の生成済み画像を確認しました。")
    else:
        print("⚠️ photosフォルダが存在しません。全件を生成対象とします。")

    # 4. 差分（画像がない商品）のJSONリストを作成
    missing_products = []
    for pid, info in products_in_sql.items():
        if pid not in existing_ids:
            pname = info["name"]
            cid = info["category"]
            
            # カテゴリに応じたプロンプトを取得し、商品名を埋め込む
            base_prompt = CATEGORY_PROMPTS.get(cid, CATEGORY_PROMPTS["99"])
            prompt = base_prompt.replace("{pname}", pname)

            missing_products.append({
                "id": pid,
                "name": pname,
                "prompt": prompt
            })

    # 5. missing_products.json に保存
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(missing_products, f, indent=2, ensure_ascii=False)

    print(f"✅ 画像が不足している {len(missing_products)} 件の商品を '{OUTPUT_FILE}' に書き出しました！")

if __name__ == "__main__":
    main()