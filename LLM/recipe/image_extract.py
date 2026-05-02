import os
import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import quote
from tqdm import tqdm
import time

INPUT_FILE = "data/recipes_dedup.json"
OUTPUT_DIR = "recipe_images"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}


# =========================
# 파일명 정리
# =========================
def safe_filename(name):
    import re
    name = re.sub(r'[\\/*?:"<>|]', "", name)
    return name[:50]


# =========================
# title → 검색 → recipe URL
# =========================
def get_recipe_url_by_title(title):
    try:
        query = quote(title)
        url = f"https://www.10000recipe.com/recipe/list.html?q={query}"

        res = requests.get(url, headers=HEADERS, timeout=5)
        soup = BeautifulSoup(res.text, "html.parser")

        link = soup.select_one("a.common_sp_link")

        if link:
            href = link.get("href")
            return "https://www.10000recipe.com" + href

    except:
        return None

    return None


# =========================
# 상세 페이지 → 이미지 URL
# =========================
def get_image_url(recipe_url):
    try:
        res = requests.get(recipe_url, headers=HEADERS, timeout=5)
        soup = BeautifulSoup(res.text, "html.parser")

        def extract(img):
            return img.get("src") or img.get("data-src")

        # 1️⃣ 대표 이미지
        img = soup.select_one("div.centeredcrop img")
        if img:
            src = extract(img)
            if src:
                return src

        # 2️⃣ 요약 이미지
        img = soup.select_one("div.view2_summary img")
        if img:
            src = extract(img)
            if src:
                return src

        # 3️⃣ fallback
        img = soup.select_one("img")
        if img:
            return extract(img)

    except Exception as e:
        print("ERROR:", e)

    return None

# =========================
# 다운로드
# =========================
def download_image(url, save_path):
    try:
        img = requests.get(url, headers=HEADERS, timeout=5).content

        with open(save_path, "wb") as f:
            f.write(img)

        return True
    except:
        return False


# =========================
# 메인
# =========================
def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with open(INPUT_FILE, encoding="utf-8") as f:
        recipes = json.load(f)

    for r in tqdm(recipes):
        title = r.get("title")

        filename = safe_filename(title)

        if os.path.exists(f"{OUTPUT_DIR}/{filename}.jpg"):
            continue

        # 🔥 1. title → url
        recipe_url = get_recipe_url_by_title(title)

        if not recipe_url:
            print("❌ URL FAIL:", title)
            continue

        # 🔥 2. url → image
        img_url = get_image_url(recipe_url)

        if not img_url:
            print("❌ IMG FAIL:", title)
            continue

        ext = ".jpg"
        if ".png" in img_url:
            ext = ".png"

        save_path = f"{OUTPUT_DIR}/{filename}{ext}"

        # 🔥 3. 다운로드
        ok = download_image(img_url, save_path)

        if not ok:
            print("❌ DOWNLOAD FAIL:", title)

        time.sleep(0.2)  # 서버 보호


if __name__ == "__main__":
    main()