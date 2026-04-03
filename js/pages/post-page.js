window.SitePostPage = (function () {
  const LIMITE_SIDEBAR = 10;
  const SITE_URL = "https://cafecommapa.com";
  const DEFAULT_IMAGE = `${SITE_URL}/imagens/Logocafe.png`;

  function obterSlugDaUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("slug") || params.get("post");
  }

  function getPostUrl(slug) {
    return `post.html?slug=${encodeURIComponent(slug)}`;
  }

  function getAbsoluteUrl(path) {
    return `${SITE_URL}/${String(path || "").replace(/^\/+/, "")}`;
  }

  function atualizarHeadDoPost(post) {
    const pageUrl = `${SITE_URL}/${getPostUrl(post.slug)}`;
    const description = post.summary || `Leia ${post.title} no Café com Mapa.`;
    const image = post.cover ? getAbsoluteUrl(post.cover) : DEFAULT_IMAGE;

    document.title = `${post.title} - Café com Mapa`;

    const metaDescription = document.getElementById("meta-description");
    if (metaDescription) {
      metaDescription.setAttribute("content", description);
    }

    const canonical = document.getElementById("canonical-link");
    if (canonical) {
      canonical.href = pageUrl;
    }

    const ogTitle = document.getElementById("og-title");
    if (ogTitle) ogTitle.setAttribute("content", post.title);

    const ogDescription = document.getElementById("og-description");
    if (ogDescription) ogDescription.setAttribute("content", description);

    const ogUrl = document.getElementById("og-url");
    if (ogUrl) ogUrl.setAttribute("content", pageUrl);

    const ogImage = document.getElementById("og-image");
    if (ogImage) ogImage.setAttribute("content", image);

    const twitterTitle = document.getElementById("twitter-title");
    if (twitterTitle) twitterTitle.setAttribute("content", post.title);

    const twitterDescription = document.getElementById("twitter-description");
    if (twitterDescription) twitterDescription.setAttribute("content", description);

    const twitterImage = document.getElementById("twitter-image");
    if (twitterImage) twitterImage.setAttribute("content", image);

    const structuredData = document.getElementById("structured-data");
    if (structuredData) {
      structuredData.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description,
        url: pageUrl,
        image,
        datePublished: post.date,
        author: post.criador ? {
          "@type": "Person",
          name: post.criador
        } : undefined,
        publisher: {
          "@type": "Organization",
          name: "Café com Mapa",
          logo: {
            "@type": "ImageObject",
            url: DEFAULT_IMAGE
          }
        }
      });
    }
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
          <span class="sidebar-title">${window.SiteUtils.escapeHtml(post.title)}</span>
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

  function renderMediaTextBlock(rawBlock) {
    const match = String(rawBlock || "").match(/^::: texto-imagem-(esquerda|direita)\nimagem:\s*(.*)\nalt:\s*(.*)\n\n([\s\S]*?)\n:::$/);
    if (!match) {
      return window.marked ? marked.parse(rawBlock) : rawBlock;
    }

    const [, side, imageName, altText, content] = match;
    const sideClass = side === "direita" ? "direita" : "esquerda";
    const imagePath = `imagens/${String(imageName || "").trim()}`;
    const safeAlt = window.SiteUtils.escapeHtml((altText || "").trim());
    const safeSrc = window.SiteUtils.escapeHtml(imagePath);
    const contentHtml = window.marked ? marked.parse((content || "").trim()) : window.SiteUtils.escapeHtml(content || "");

    const imageHtml = String(imageName || "").trim()
      ? `<div class="texto-imagem-media"><img src="${safeSrc}" alt="${safeAlt}"></div>`
      : `<div class="texto-imagem-media texto-imagem-media-vazia"></div>`;

    const textHtml = `<div class="texto-imagem-conteudo">${contentHtml}</div>`;

    return `
      <div class="texto-imagem texto-imagem-${sideClass}">
        ${side === "direita" ? `${textHtml}${imageHtml}` : `${imageHtml}${textHtml}`}
      </div>
    `;
  }

  function renderBodyWithCustomBlocks(body) {
    const source = String(body || "").replace(/\r\n/g, "\n");
    const blockRegex = /::: texto-imagem-(esquerda|direita)\n[\s\S]*?\n:::/g;
    let result = "";
    let lastIndex = 0;
    let match;

    while ((match = blockRegex.exec(source))) {
      const before = source.slice(lastIndex, match.index);
      if (before.trim()) {
        result += window.marked ? marked.parse(before) : before;
      }

      result += renderMediaTextBlock(match[0]);
      lastIndex = match.index + match[0].length;
    }

    const after = source.slice(lastIndex);
    if (after.trim()) {
      result += window.marked ? marked.parse(after) : after;
    }

    return result;
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
      atualizarHeadDoPost(post);
      window.SiteVisitas?.refresh?.();
      const tituloSeguro = window.SiteUtils.escapeHtml(post.title);
      const criadorSeguro = post.criador ? ` · ${window.SiteUtils.escapeHtml(post.criador)}` : "";
      const corpoHtml = window.SiteUtils.sanitizeHtml(renderBodyWithCustomBlocks(body));

      container.innerHTML = `
        <div class="post-meta">
  ${window.SiteUtils.formatarData(post.date)}${criadorSeguro}
</div>
        <h1>${tituloSeguro}</h1>
        <div class="post-body">${corpoHtml}</div>
      `;

      window.SiteLightbox?.ativarNasImagens?.();
    } catch (erro) {
      console.error(erro);
      container.innerHTML = `<p>Erro ao carregar o post:</p><pre>${erro.message}</pre>`;
    }
  }

  return { init };
})();
