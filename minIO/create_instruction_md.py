import os
import json
import pymysql

MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "mocktenusr")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "mocktenpassword")
MYSQL_DB = os.getenv("MYSQL_DB", "mocktendb")

# Category prompt templates
PROMPT_TEMPLATES = {
    "01": "A professional book cover design and mockup of the book '{name}', clean graphic design, lying flat on a neat wooden desk, soft studio lighting, 1:1 aspect ratio, commercial style.",
    "02": "A high-quality product photo of the musical instrument '{name}', showing fine details, on a clean studio stage with dark elegant background, warm spotlights, 1:1 aspect ratio.",
    "03": "A clean, appetizing product photo of '{name}' food/beverage product, beautifully packaged, standing on a wooden table with soft natural light, commercial photography style, 1:1 aspect ratio.",
    "04": "A professional studio shot of the game console or controller '{name}', sleek modern design, on a clean dark reflective surface, neon accent lighting, 1:1 aspect ratio.",
    "05": "A professional studio shot of the home decor item '{name}', clean elegant design, placed in a bright modern minimalist room setting, soft shadows, 1:1 aspect ratio.",
    "06": "A clean studio shot of '{name}' fashion accessory/apparel item, laid flat or on a clean mannequin, bright soft lighting, neutral background, 1:1 aspect ratio.",
    "07": "A high-end product photo of '{name}' consumer electronics device, sleek metal and glass details, standing on a clean dark surface, bright studio lighting, 1:1 aspect ratio.",
    "08": "A professional product photo of '{name}', high-quality hobby/craft tool/kit, arranged neatly on a clean wooden workbench, bright studio lighting, 1:1 aspect ratio.",
    "09": "A colorful and vibrant studio shot of '{name}' toy, kid-friendly design, on a clean light pastel background, soft shadows, 1:1 aspect ratio.",
    "10": "A clean studio shot of '{name}' product for kids, colorful design, light neutral background, bright friendly lighting, 1:1 aspect ratio.",
    "11": "A gentle and soft studio product photo of '{name}' baby product, pastel colors, soft fabric texture, lying on a clean white organic cotton sheet, warm soft lighting, 1:1 aspect ratio.",
    "12": "A rugged and clean product photo of '{name}' sports/outdoor gear, standing on a natural background (like grass, rock, or sand) under bright clear daylight, 1:1 aspect ratio.",
    "13": "A sleek, minimal product photo of '{name}' beauty/cosmetic bottle, clean neutral background, soft studio lighting, next to subtle organic botanical elements, 1:1 aspect ratio.",
    "14": "A professional product photo of '{name}' automotive accessory/part, clean industrial design, on a polished concrete floor, dramatic studio side lighting, 1:1 aspect ratio.",
    "15": "A beautifully wrapped gift item '{name}', with an elegant bow, standing on a clean surface with soft warm festive lighting, 1:1 aspect ratio.",
    "16": "A clean, trustworthy product photo of '{name}' health/supplement package, minimalist label, standing on a clean white stone surface, bright airy lighting, 1:1 aspect ratio."
}

DEFAULT_TEMPLATE = "A professional product photo of '{name}', standing on a clean light gray background, bright studio lighting, sharp focus, 1:1 aspect ratio, commercial photography style."

def get_category_name(conn, cid):
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT category_name FROM Category WHERE category_id = %s", (cid,))
            res = cur.fetchone()
            if res:
                return res["category_name"]
    except Exception:
        pass
    return f"Category {cid}"

if __name__ == "__main__":
    progress_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "minIO", "progress.json")
    if os.path.exists(progress_file):
        with open(progress_file, "r") as f:
            progress_data = json.load(f)
            generated_ids = set(progress_data.get("generated_product_ids", []))
    else:
        generated_ids = set()

    conn = pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        db=MYSQL_DB,
        cursorclass=pymysql.cursors.DictCursor
    )

    with conn.cursor() as cur:
        cur.execute("SELECT product_id, product_name, category_id, summary FROM Product ORDER BY category_id, product_name")
        products = cur.fetchall()

    missing_products = [p for p in products if p["product_id"] not in generated_ids]
    
    # Group by category
    grouped = {}
    for p in missing_products:
        cid = p["category_id"]
        if cid not in grouped:
            grouped[cid] = []
        grouped[cid].append(p)

    output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "image_generation_instructions.md")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("# Image Generation Instructions for Remaining Products\n\n")
        f.write(f"Total remaining products to generate: **{len(missing_products)}**\n\n")
        f.write("Please use an image generation tool (like Gemini GUI, Midjourney, or Stable Diffusion) to create high-quality product images based on the prompts below.\n\n")
        f.write("### Instructions:\n")
        f.write("1. Generate the image for a product using the provided **Prompt**.\n")
        f.write("2. Save/download the generated image.\n")
        f.write("3. Rename the file to exactly match the **Filename** (e.g. `[product_id].png`).\n")
        f.write("4. Place all renamed images in the `minIO/photos/` directory.\n\n")
        f.write("---\n\n")

        for cid in sorted(grouped.keys()):
            cat_name = get_category_name(conn, cid)
            f.write(f"## Category: {cat_name} ({len(grouped[cid])} products)\n\n")
            f.write("| Product Name | Product ID / Filename | Recommended Prompt |\n")
            f.write("| :--- | :--- | :--- |\n")
            
            for p in grouped[cid]:
                name = p["product_name"]
                pid = p["product_id"]
                template = PROMPT_TEMPLATES.get(cid, DEFAULT_TEMPLATE)
                prompt = template.format(name=name)
                f.write(f"| {name} | `{pid}.png` | {prompt} |\n")
            f.write("\n")

    conn.close()
    print(f"Successfully created instructions file at: {output_path}")
