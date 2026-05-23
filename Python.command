#!/bin/zsh

cd "$(dirname "$0")" || exit 1

echo "Atualizando posts/index.json..."
python3 scripts/build_posts.py

echo ""
echo "Atualizando sitemap.xml..."
python3 scripts/build_sitemap.py

echo ""
echo "Pronto. Pode fechar esta janela."
if [[ -t 0 ]]; then
  read -r "?Pressione Enter para sair..."
fi
