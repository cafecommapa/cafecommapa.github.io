import json
from pathlib import Path

SITE_URL = "https://cafecommapa.com"
POSTS_INDEX = Path("posts/index.json")
OUTPUT_FILE = Path("sitemap.xml")


def normalize_url(path: str) -> str:
    return f"{SITE_URL}/{path.lstrip('/')}"


def build_url_entry(loc: str) -> str:
    return "  <url>\n    <loc>{}</loc>\n  </url>".format(loc)


posts = json.loads(POSTS_INDEX.read_text(encoding="utf-8"))

urls = [
    f"{SITE_URL}/",
    normalize_url("mapa.html"),
    normalize_url("trilogia/"),
    normalize_url("trilogia/jennifer/"),
    normalize_url("trilogia/ameaca-nuclear/"),
    normalize_url("trilogia/destinos-cruzados/"),
]

for post in posts:
    slug = post.get("slug", "").strip()
    if not slug:
        continue
    urls.append(normalize_url(f"post.html?slug={slug}"))

unique_urls = []
seen = set()
for url in urls:
    if url in seen:
        continue
    seen.add(url)
    unique_urls.append(url)

xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
]
xml.extend(build_url_entry(url) for url in unique_urls)
xml.append("</urlset>")
xml.append("")

OUTPUT_FILE.write_text("\n".join(xml), encoding="utf-8")

print(f"{len(unique_urls)} URLs geradas em {OUTPUT_FILE}")
