window.SitePostPage = (function () {
  const LIMITE_SIDEBAR = 10;
  const SITE_URL = "https://cafecommapa.com";

  function obterSlugDaUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("slug") || params.get("post");
  }

  function getPostUrl(slug) {
    return `post.html?slug=${encodeURIComponent(slug)}`;
  }

  function renderizarSidebar(posts, slugAtivo) {
    const lista = document.getElementById("lista-posts");
    if (!lista) return;

    lista.innerHTML = "";
    posts.slice(0, LIMITE_SIDEBAR).forEach((post) => {
      const item = document.createElement("li");
      item.className = "sidebar-item";
      item.innerHTML = `
        <a href="${getPostUrl(post.slug)}" class="sidebar-link${post.slug === slugAtivo ? " ativo" : ""}">
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
        <a href="index.html" class="sidebar-link sidebar-link-mais-posts">
          Existem mais posts. Clique para ver todos.
        </a>
      `;
      lista.appendChild(itemMaisPosts);
    }
  }

  async function init() {
    const container = document.getElementById("post-completo");
    if (!container) return;

    if (window.marked) {
      marked.setOptions({ gfm: true, breaks: true });
    }

    try {
      const slug = obterSlugDaUrl();
      if (!slug) {
        container.innerHTML = "<p>Slug não informado na URL.</p>";
        return;
      }

      const indice = await window.SiteUtils.fetchJson("posts/index.json");
      const post = indice.find((p) => p.slug === slug);
      if (!post) {
        container.innerHTML = `<p>Post não encontrado para o slug: <strong>${slug}</strong></p>`;
        return;
      }

      renderizarSidebar(indice, slug);

      const markdown = await window.SiteUtils.fetchText(post.file);
      const { body } = window.SiteUtils.separarFrontMatter(markdown);
      document.title = `${post.title} - Café com Mapa`;
      const metaDescription = document.getElementById("meta-description");
      if (metaDescription) {
        metaDescription.setAttribute(
          "content",
          post.summary || `Leia ${post.title} no Café com Mapa.`
        );
      }
      const canonical = document.getElementById("canonical-link");
      if (canonical) {
        canonical.href = `${SITE_URL}/${getPostUrl(post.slug)}`;
      }

      container.innerHTML = `
        <div class="post-meta">
  ${window.SiteUtils.formatarData(post.date)} ${post.criador ? " · " + post.criador : ""}
</div>
        <h1>${post.title}</h1>
        <div class="post-body">${marked.parse(body)}</div>
      `;

      window.SiteLightbox?.ativarNasImagens?.();
    } catch (erro) {
      console.error(erro);
      container.innerHTML = `<p>Erro ao carregar o post:</p><pre>${erro.message}</pre>`;
    }
  }

  return { init };
})();
