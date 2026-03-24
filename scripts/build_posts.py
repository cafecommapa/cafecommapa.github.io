import json
import re
from pathlib import Path

POSTS_DIR = Path("posts")
OUTPUT_FILE = POSTS_DIR / "index.json"


def parse_front_matter(text):
    if not text.startswith("---"):
        return {}, text

    parts = text.split("---", 2)
    meta_raw = parts[1].strip()
    body = parts[2].strip()

    meta = {}

    for line in meta_raw.split("\n"):
        if ":" in line:
            key, value = line.split(":", 1)
            meta[key.strip()] = value.strip()

    return meta, body


def extract_preview(text, limit=200):
    text = re.sub(r"\!\[.*?\]\(.*?\)", "", text)
    text = re.sub(r"#.*", "", text)
    text = re.sub(r"\n+", " ", text)
    text = text.strip()

    return text[:limit] + ("..." if len(text) > limit else "")


def normalize_date(value):
    text = str(value or "").strip()
    return text[:10] if len(text) >= 10 else text or "1970-01-01"


posts = []

for file_path in sorted(POSTS_DIR.glob("*.md"), reverse=True):

    slug = file_path.stem

    content = file_path.read_text(encoding="utf-8")

    meta, body = parse_front_matter(content)

    category = meta.get("category", "").strip().lower()

    cover = meta.get("cover", "").strip()

    if not cover and category:
        cover = f"imagens/{category}.png"

    post = {
        "slug": slug,
        "file": f"posts/{file_path.name}",
        "title": meta.get("title", slug),
        "date": normalize_date(meta.get("date", "1970-01-01")),
        "criador": meta.get("criador", ""),
        "category": category,
        "cover": cover,
        "summary": meta.get("summary", "") or extract_preview(body),
    }

    posts.append(post)

posts.sort(key=lambda x: x["date"], reverse=True)

OUTPUT_FILE.write_text(
    json.dumps(posts, indent=2, ensure_ascii=False),
    encoding="utf-8"
)

print(f"{len(posts)} posts indexados em {OUTPUT_FILE}")
