import requests
from bs4 import BeautifulSoup
import time
import json
import os

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}


def get_recipe_links(page):
    url = f"https://www.10000recipe.com/recipe/list.html?page={page}"
    res = requests.get(url, headers=HEADERS)
    soup = BeautifulSoup(res.text, "html.parser")

    links = []

    for a in soup.select("a.common_sp_link"):
        href = a.get("href")
        if href and "/recipe/" in href:
            links.append("https://www.10000recipe.com" + href)

    return list(set(links))


def is_valid_recipe(soup):
    title = soup.select_one("div.view2_summary h3")
    ingredients = soup.select("div.ready_ingre3 ul li")

    if not title or not title.text.strip():
        return False
    if len(ingredients) == 0:
        return False

    return True


def crawl_recipe(url):
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)

        if res.status_code != 200:
            return None

        soup = BeautifulSoup(res.text, "html.parser")

        if not is_valid_recipe(soup):
            return None

        title = soup.select_one("div.view2_summary h3").text.strip()

        ingredients = [
            item.get_text(" ", strip=True)
            for item in soup.select("div.ready_ingre3 ul li")
        ]

        steps = [
            step.get_text(" ", strip=True)
            for step in soup.select("div.view_step_cont")
        ]

        return {
            "title": title,
            "ingredients": ingredients,
            "steps": steps
        }

    except:
        return None


# 🔥 페이지별 저장
def crawl_by_page(start_page=1, end_page=6686, save_dir="recipes_pages"):
    os.makedirs(save_dir, exist_ok=True)

    for page in range(start_page, end_page + 1):
        file_path = os.path.join(save_dir, f"recipes_page_{page}.json")

        # 🔥 이미 존재하면 skip (resume 기능)
        if os.path.exists(file_path):
            print(f"[SKIP PAGE] {page}")
            continue

        print(f"\n=== PAGE {page} ===")

        page_data = []

        try:
            links = get_recipe_links(page)
        except:
            print(f"[ERROR] page {page}")
            continue

        for link in links:
            recipe = crawl_recipe(link)

            if recipe:
                print(f"[OK] {recipe['title']}")
                page_data.append(recipe)
            else:
                print(f"[SKIP] {link}")

            time.sleep(0.3)

        # 🔥 페이지 단위 저장
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(page_data, f, ensure_ascii=False, indent=2)

        print(f"[SAVED] {file_path} ({len(page_data)} recipes)")

        time.sleep(1)


# 실행
if __name__ == "__main__":
    crawl_by_page(1, 6686)