from pathlib import Path
import json
import re

BASE_DIR = Path(__file__).resolve().parent.parent
POSTS_DIR = BASE_DIR / "posts"
OUTPUT_FILE = POSTS_DIR / "index.json"

FRONT_MATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.DOTALL)

def parse_front_matter(text: str):
    match = FRONT_MATTER_RE.match(text.strip())
    if not match:
        return {}, text

    raw_meta = match.group(1)
    body = match.group(2).strip()

    meta = {}
    for line in raw_meta.splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            meta[key.strip()] = value.strip()

    return meta, body

def extract_preview(body: str, max_chars: int = 180):
    lines = []
    for line in body.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("#"):
            continue
        if line.startswith("!["):
            continue
        lines.append(line)

    text = " ".join(lines).strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "..."

def main():
    posts = []

    for file_path in POSTS_DIR.glob("*.md"):
        text = file_path.read_text(encoding="utf-8")
        meta, body = parse_front_matter(text)

        slug = file_path.stem

        post = {
            "slug": slug,
            "file": f"posts/{file_path.name}",
            "title": meta.get("title", slug),
            "date": meta.get("date", "1970-01-01"),
            "cover": meta.get("cover", ""),
            "summary": meta.get("summary", "") or extract_preview(body),
        }
        posts.append(post)

    posts.sort(key=lambda p: p["date"], reverse=True)

    OUTPUT_FILE.write_text(
        json.dumps(posts, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print(f"Arquivo gerado com sucesso: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()