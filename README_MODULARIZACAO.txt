Estrutura sugerida para substituir no projeto:

/css
  base.css
  header.css
  posts.css
  mapa.css
  popups.css
  responsive.css

/js/core
  utils.js
  lightbox.js
  relogios.js
  menu.js
  popups.js

/js/data
  cidades.js

/js/pages
  home.js
  mapa-page.js
  post-page.js

/js
  main.js

Arquivos HTML atualizados:
- index.html
- mapa.html
- post.html (modelo pronto)

Observações:
1. O arquivo antigo js/blog.js pode ser removido depois da troca.
2. O arquivo antigo js/post.js pode ser substituído por js/pages/post-page.js.
3. O HTML não precisa mais conter os popups no final; o js/core/popups.js injeta isso automaticamente.
4. O mapa agora usa js/pages/mapa-page.js e js/data/cidades.js.
