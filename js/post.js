function obterSlugDaUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug") || params.get("post");
}

async function buscarIndicePost() {
  const resposta = await fetch("posts/index.json");
  if (!resposta.ok) {
    throw new Error("Não foi possível carregar posts/index.json");
  }
  return await resposta.json();
}

async function buscarMarkdownPost(caminho) {
  const resposta = await fetch(caminho);
  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar o markdown em: ${caminho}`);
  }
  return await resposta.text();
}

function separarFrontMatter(texto) {
  if (!texto.startsWith("---")) {
    return { meta: {}, body: texto };
  }

  const partes = texto.split("---");
  const rawMeta = partes[1]?.trim() || "";
  const body = partes.slice(2).join("---").trim();

  const meta = {};
  rawMeta.split("\n").forEach((linha) => {
    const idx = linha.indexOf(":");
    if (idx > -1) {
      const chave = linha.slice(0, idx).trim();
      const valor = linha.slice(idx + 1).trim();
      meta[chave] = valor;
    }
  });

  return { meta, body };
}

function formatarDataPost(dataIso) {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

async function iniciarPostPage() {
  const container = document.getElementById("post-completo");
  if (!container) return;

  try {
    const slug = obterSlugDaUrl();

    if (!slug) {
      container.innerHTML = "<p>Slug não informado na URL.</p>";
      return;
    }

    const indice = await buscarIndicePost();
    const post = indice.find((p) => p.slug === slug);

    if (!post) {
      container.innerHTML = `<p>Post não encontrado para o slug: <strong>${slug}</strong></p>`;
      return;
    }

    const markdown = await buscarMarkdownPost(post.file);
    const { body } = separarFrontMatter(markdown);

    document.title = `${post.title} - Café com Mapa`;

    container.innerHTML = `
      <div class="post-meta">${formatarDataPost(post.date)}</div>
      <h1>${post.title}</h1>
      <div class="post-body">${marked.parse(body)}</div>
    `;

    if (typeof ativarLightboxNasImagens === "function") {
      ativarLightboxNasImagens();
    }
  } catch (erro) {
    console.error(erro);
    container.innerHTML = `<p>Erro ao carregar o post:</p><pre>${erro.message}</pre>`;
  }
}

document.addEventListener("DOMContentLoaded", iniciarPostPage);