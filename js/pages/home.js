window.SiteHome = (function () {
  let postsCache = [];

  if (window.marked) {
    marked.setOptions({ gfm: true, breaks: true });
  }

  async function buscarIndice() {
    return window.SiteUtils.fetchJson("posts/index.json");
  }

  async function buscarMarkdown(caminho) {
    return window.SiteUtils.fetchText(caminho);
  }

  function destacarPostAberto(slugAtivo) {
    document.querySelectorAll(".sidebar-link").forEach((link) => {
      if (link.dataset.slug === slugAtivo) link.classList.add("ativo");
      else link.classList.remove("ativo");
    });
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
        await renderizarPrincipais(postsCache);
        destacarPostAberto(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
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
        <a href="#" class="post-link-bloco" data-slug="${post.slug}">
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

    container.querySelectorAll(".post-link-bloco").forEach((link) => {
      link.addEventListener("click", async function (e) {
        e.preventDefault();
        await abrirPostNaHome(this.dataset.slug);
      });
    });
  }

  function renderizarSidebar(posts) {
    const lista = document.getElementById("lista-posts");
    if (!lista) return;

    lista.innerHTML = "";
    posts.slice(0, 10).forEach((post) => {
      const item = document.createElement("li");
      item.className = "sidebar-item";
      item.innerHTML = `
        <a href="#" class="sidebar-link" data-slug="${post.slug}">
          <span class="sidebar-title">${post.title}</span>
          <span class="sidebar-date">${window.SiteUtils.formatarData(post.date)}</span>
        </a>
      `;
      lista.appendChild(item);
    });

    lista.querySelectorAll(".sidebar-link").forEach((link) => {
      link.addEventListener("click", async function (e) {
        e.preventDefault();
        await abrirPostNaHome(this.dataset.slug);
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
    } catch (erro) {
      console.error(erro);
      postsPrincipais.innerHTML = `<p>Erro ao carregar os posts: ${erro.message}</p>`;
    }
  }

  return { init };
})();
