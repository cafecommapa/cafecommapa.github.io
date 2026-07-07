



+
-++

0
0
02















,1echo "Atualizando sitemap.xml..."
python3 scripts/build_sitemap.py

echo ""
echo "Pronto. Pode fechar esta janela."
if [[ -t 0 ]]; then
  read -r "?Pressione Enter para sair..."
fi
