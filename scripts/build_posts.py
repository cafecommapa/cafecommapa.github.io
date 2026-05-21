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
    text = re.sub(r"<div[^>]*class=[\"'][^\"']*galeria[^\"']*[\"'][^>]*>.*?</div>", "", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<img\b[^>]*>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"#.*", "", text)
    text = re.sub(r"\n+", " ", text)
    text = text.strip()

    return text[:limit] + ("..." if len(text) > limit else "")


def extract_leading_image(text):
    start = text.lstrip()
    leading_slice = start[:1200]

    markdown_match = re.match(r"!\[[^\]]*\]\(([^)]+)\)", leading_slice)
    if markdown_match:
        return markdown_match.group(1).strip()

    html_match = re.search(r"<img\b[^>]*\bsrc=[\"']([^\"']+)[\"'][^>]*>", leading_slice, flags=re.IGNORECASE)
    if html_match:
        before_image = leading_slice[:html_match.start()]
        before_image = re.sub(r"</?div\b[^>]*>", "", before_image, flags=re.IGNORECASE)
        if not before_image.strip():
            return html_match.group(1).strip()

    return ""


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

    if not cover:
        cover = extract_leading_image(body)

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
