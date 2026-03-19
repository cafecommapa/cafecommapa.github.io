window.SitePostPage = (function () {
  function obterSlugDaUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("slug") || params.get("post");
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

      const markdown = await window.SiteUtils.fetchText(post.file);
      const { body } = window.SiteUtils.separarFrontMatter(markdown);
      document.title = `${post.title} - Café com Mapa`;

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

