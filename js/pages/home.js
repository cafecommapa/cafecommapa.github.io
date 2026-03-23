window.SiteHome = (function () {
  let postsCache = [];
  const LIMITE_SIDEBAR = 10;
  const TITULOS_CATEGORIAS = {
    viagem: "Viagem",
    pensamento: "Pensamento",
    livro: "Livro",
    receita: "Receita",
    filme: "Filme",
    tecnologia: "Tecnologia",
    "todos-posts": "Todos os Posts"
  };
  const TITULOS_AUTORES = {
    "todos-autores": "Todos os Posts por Autor",
    "marcia-shimada": "Marcia Shimada",
    "carlos-patrocinio": "Carlos Patrocinio"
  };

  if (window.marked) {
    marked.setOptions({ gfm: true, breaks: true });
  }

  async function buscarIndice() {
    return window.SiteUtils.fetchJson("posts/index.json");
  }

  async function buscarMarkdown(caminho) {
    return window.SiteUtils.fetchText(caminho);
  }

  function normalizarCategoria(valor) {
    return String(valor || "")
      .trim()
      .replace(/^["']|["']$/g, "")
      .toLowerCase();
  }

  function normalizarAutor(valor) {
    return String(valor || "")
      .trim()
      .replace(/^["']|["']$/g, "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function ehAutorDoMenu(valor) {
    const autor = normalizarAutor(valor);
    return autor === "marcia-shimada" || autor === "carlos-patrocinio";
  }

  function contarPostsDaCategoria(categoria) {
    const categoriaNormalizada = normalizarCategoria(categoria);
    if (categoriaNormalizada === "todos-posts") return postsCache.length;

    return postsCache.filter((post) => {
      return normalizarCategoria(post.category) === categoriaNormalizada;
    }).length;
  }

  function contarPostsDoAutor(autor) {
    const autorNormalizado = normalizarAutor(autor);
    if (autorNormalizado === "todos-autores") {
      return postsCache.filter((post) => ehAutorDoMenu(post.criador)).length;
    }

    return postsCache.filter((post) => {
      return normalizarAutor(post.criador) === autorNormalizado;
    }).length;
  }

  function atualizarContadoresDoMenu() {
    document.querySelectorAll("[data-categoria]").forEach((linkCategoria) => {
      const categoria = normalizarCategoria(linkCategoria.dataset.categoria);
      const tituloBase = TITULOS_CATEGORIAS[categoria] || linkCategoria.dataset.labelBase || linkCategoria.textContent.trim();
      const total = contarPostsDaCategoria(categoria);

      linkCategoria.dataset.labelBase = tituloBase;
      linkCategoria.textContent = `${tituloBase} (${total})`;
    });

    document.querySelectorAll("[data-autor]").forEach((linkAutor) => {
      const autor = normalizarAutor(linkAutor.dataset.autor);
      const tituloBase = TITULOS_AUTORES[autor] || linkAutor.dataset.labelBase || linkAutor.textContent.trim();
      const total = contarPostsDoAutor(autor);

      linkAutor.dataset.labelBase = tituloBase;
      linkAutor.textContent = `${tituloBase} (${total})`;
    });
  }

  function destacarPostAberto(slugAtivo) {
    document.querySelectorAll(".sidebar-link").forEach((link) => {
      if (link.dataset.slug === slugAtivo) link.classList.add("ativo");
      else link.classList.remove("ativo");
    });
  }

  function getPostUrl(slug) {
    return `post.html?slug=${encodeURIComponent(slug)}`;
  }

  async function abrirPostNaHome(slug) {
    const container = document.getElementById("posts-principais");
    if (!container) return;

    const post = postsCache.find((p) => p.slug === slug);
    if (!post) {
      container.innerHTML = "<p>Post não encontrado.</p>";
      return;
    }

    const markdown = await buscarMarkdown(post.file);
    const corpo = window.SiteUtils.removerFrontMatter(markdown);

    container.innerHTML = `
      <article class="post-full">
        <a href="#" class="botao-voltar" id="botao-voltar">← Voltar</a>
        <div class="post-meta">
  ${window.SiteUtils.formatarData(post.date)} ${post.criador ? " · " + post.criador : ""}
</div>
        <h1>${post.title}</h1>
        <div class="post-body">${marked.parse(corpo)}</div>
      </article>
    `;

    const botaoVoltar = document.getElementById("botao-voltar");
    if (botaoVoltar) {
      botaoVoltar.addEventListener("click", async function (e) {
        e.preventDefault();
        await voltarParaHomePrincipal();
      });
    }

    destacarPostAberto(slug);
    window.SiteLightbox?.ativarNasImagens?.();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function renderizarPrincipais(posts) {
    const container = document.getElementById("posts-principais");
    if (!container) return;

    container.innerHTML = "";

    for (const [index, post] of posts.slice(0, 2).entries()) {
      const markdown = await buscarMarkdown(post.file);
      const corpo = window.SiteUtils.removerFrontMatter(markdown);
      const limite = index === 0 ? 700 : 400;

      const artigo = document.createElement("article");
      artigo.className = index === 0 ? "card-post destaque" : "card-post secundario";
      artigo.innerHTML = `
        <a href="${getPostUrl(post.slug)}" class="post-link-bloco" data-slug="${post.slug}">
          ${post.cover ? `<img src="${post.cover}" alt="${post.title}">` : ""}
          <div class="post-meta">
  ${window.SiteUtils.formatarData(post.date)} ${post.criador ? " · " + post.criador : ""}
</div>
          <h2>${post.title}</h2>
          ${post.summary ? `<p class="resumo">${post.summary}</p>` : ""}
        </a>
        <div class="post-preview">${marked.parse(corpo.substring(0, limite) + (corpo.length > limite ? "..." : ""))}</div>
      `;

      container.appendChild(artigo);
    }

  }

  async function voltarParaHomePrincipal() {
    await renderizarPrincipais(postsCache);
    destacarPostAberto(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderizarListaDePosts(posts, options = {}) {
    const container = document.getElementById("posts-principais");
    if (!container) return;
    const postsOrdenados = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
    const titulo = options.titulo || "Mais posts do blog";
    const descricao = options.descricao || "Todos os posts publicados";
    const totalLabel = postsOrdenados.length === 1 ? "1 post" : `${postsOrdenados.length} posts`;

    container.innerHTML = `
      <section class="post-full lista-posts-completa">
        <a href="#" class="botao-voltar" id="botao-voltar-lista">← Voltar</a>
        <div class="post-meta">${descricao}</div>
        <div class="lista-posts-topo">
          <h1>${titulo}</h1>
          <div class="lista-posts-total" aria-label="Total de posts">${totalLabel}</div>
        </div>
        <div class="lista-posts-completa-grid">
          ${postsOrdenados.length > 0 ? postsOrdenados.map((post) => `
            <a href="${getPostUrl(post.slug)}" class="lista-post-link" data-slug="${post.slug}">
              <span class="lista-post-link-titulo">${post.title}</span>
              <span class="lista-post-link-data">${window.SiteUtils.formatarData(post.date)}</span>
            </a>
          `).join("") : '<p class="lista-post-vazia">Nenhum post encontrado nessa categoria.</p>'}
        </div>
      </section>
    `;

    const botaoVoltarLista = document.getElementById("botao-voltar-lista");
    if (botaoVoltarLista) {
      botaoVoltarLista.addEventListener("click", async function (e) {
        e.preventDefault();
        await voltarParaHomePrincipal();
      });
    }

    destacarPostAberto(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderizarTodosOsPosts(posts) {
    renderizarListaDePosts(posts, {
      titulo: "Mais posts do blog",
      descricao: "Todos os posts publicados"
    });
  }

  function renderizarPostsPorCategoria(categoria) {
    const categoriaNormalizada = normalizarCategoria(categoria);
    const postsFiltrados = postsCache.filter((post) => {
      return normalizarCategoria(post.category) === categoriaNormalizada;
    });

    renderizarListaDePosts(postsFiltrados, {
      titulo: TITULOS_CATEGORIAS[categoriaNormalizada] || "Categoria",
      descricao: `Posts da categoria ${TITULOS_CATEGORIAS[categoriaNormalizada] || categoriaNormalizada}`
    });
  }

  function renderizarPostsPorAutor(autor) {
    const autorNormalizado = normalizarAutor(autor);
    const postsFiltrados = postsCache.filter((post) => {
      if (autorNormalizado === "todos-autores") return ehAutorDoMenu(post.criador);
      return normalizarAutor(post.criador) === autorNormalizado;
    });

    renderizarListaDePosts(postsFiltrados, {
      titulo: TITULOS_AUTORES[autorNormalizado] || "Autor",
      descricao: autorNormalizado === "todos-autores"
        ? "Posts publicados por autor"
        : `Posts de ${TITULOS_AUTORES[autorNormalizado] || autorNormalizado}`
    });
  }

  function bindMenuCategorias() {
    document.querySelectorAll("[data-categoria]").forEach((linkCategoria) => {
      linkCategoria.addEventListener("click", function (e) {
        e.preventDefault();

        const categoria = normalizarCategoria(this.dataset.categoria);
        if (categoria === "todos-posts") {
          renderizarTodosOsPosts(postsCache);
          return;
        }

        renderizarPostsPorCategoria(categoria);
      });
    });
  }

  function bindMenuAutores() {
    document.querySelectorAll("[data-autor]").forEach((linkAutor) => {
      linkAutor.addEventListener("click", function (e) {
        e.preventDefault();
        renderizarPostsPorAutor(this.dataset.autor);
      });
    });
  }

  function bindMenuInicio() {
    document.querySelectorAll('[data-menu="inicio"]').forEach((linkInicio) => {
      linkInicio.addEventListener("click", async function (e) {
        e.preventDefault();
        await voltarParaHomePrincipal();
      });
    });
  }

  function renderizarSidebar(posts) {
    const lista = document.getElementById("lista-posts");
    if (!lista) return;

    lista.innerHTML = "";
    posts.slice(0, LIMITE_SIDEBAR).forEach((post) => {
      const item = document.createElement("li");
      item.className = "sidebar-item";
      item.innerHTML = `
        <a href="${getPostUrl(post.slug)}" class="sidebar-link" data-slug="${post.slug}">
          <span class="sidebar-title">${post.title}</span>
          <span class="sidebar-date">${window.SiteUtils.formatarData(post.date)}</span>
        </a>
      `;
      lista.appendChild(item);
    });

    if (posts.length > LIMITE_SIDEBAR) {
      const itemMaisPosts = document.createElement("li");
      itemMaisPosts.className = "sidebar-item sidebar-item-mais-posts";
      itemMaisPosts.innerHTML = `
        <a href="#" class="sidebar-link sidebar-link-mais-posts" id="sidebar-ver-mais-posts">
          Existem mais posts. Clique para ver todos.
        </a>
      `;
      lista.appendChild(itemMaisPosts);
    }

    lista.querySelectorAll(".sidebar-link").forEach((link) => {
      link.addEventListener("click", async function (e) {
        e.preventDefault();
        if (this.id === "sidebar-ver-mais-posts") {
          renderizarTodosOsPosts(postsCache);
          return;
        }

        window.location.href = getPostUrl(this.dataset.slug);
      });
    });
  }

  async function init() {
    const postsPrincipais = document.getElementById("posts-principais");
    if (!postsPrincipais) return;

    try {
      postsCache = await buscarIndice();
      await renderizarPrincipais(postsCache);
      renderizarSidebar(postsCache);
      atualizarContadoresDoMenu();
      bindMenuInicio();
      bindMenuCategorias();
      bindMenuAutores();
    } catch (erro) {
      console.error(erro);
      postsPrincipais.innerHTML = `<p>Erro ao carregar os posts: ${erro.message}</p>`;
    }
  }

  return { init };
})();
