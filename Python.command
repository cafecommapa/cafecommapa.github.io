#!/bin/zsh

# Executa sempre a partir da pasta onde este arquivo está.
SCRIPT_DIR="${0:A:h}"
cd "$SCRIPT_DIR" || exit 1

echo "Atualizando a lista de posts..."
if python3 scripts/build_posts.py; then
  :
else
  status=$?
  echo ""
  echo "Não foi possível atualizar os posts (erro $status)."
  [[ -t 0 ]] && read -r "?Pressione Enter para sair..."
  exit "$status"
fi

echo ""
echo "Atualizando sitemap.xml..."
if python3 scripts/build_sitemap.py; then
  echo ""
  echo "Pronto. Posts e sitemap atualizados. Pode fechar esta janela."
else
  status=$?
  echo ""
  echo "Os posts foram atualizados, mas o sitemap falhou (erro $status)."
fi

if [[ -t 0 ]]; then
  read -r "?Pressione Enter para sair..."
fi
