window.SiteUtils = (function () {
  function formatarData(dataIso) {
    const valor = String(dataIso || "").trim();
    const match = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return valor;

    const [, ano, mes, dia] = match;
    return `${dia}/${mes}/${ano}`;
  }

  async function fetchJson(caminho) {
    const resposta = await fetch(caminho);
    if (!resposta.ok) {
      throw new Error(`Não foi possível carregar ${caminho}`);
    }
    return resposta.json();
  }

  async function fetchText(caminho) {
    const resposta = await fetch(caminho);
    if (!resposta.ok) {
      throw new Error(`Não foi possível carregar ${caminho}`);
    }
    return resposta.text();
  }

  function escapeHtml(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizeHtml(html) {
    const template = document.createElement("template");
    template.innerHTML = String(html || "");

    template.content.querySelectorAll("script, iframe, object, embed, style, link, meta").forEach((el) => {
      el.remove();
    });

    template.content.querySelectorAll("*").forEach((el) => {
      [...el.attributes].forEach((attr) => {
        const nome = attr.name.toLowerCase();
        const valor = attr.value.trim();

        if (nome.startsWith("on")) {
          el.removeAttribute(attr.name);
          return;
        }

        if ((nome === "href" || nome === "src" || nome === "xlink:href") && /^javascript:/i.test(valor)) {
          el.removeAttribute(attr.name);
        }
      });
    });

    return template.innerHTML;
  }

  function removerFrontMatter(texto) {
    if (!texto.startsWith("---")) {
      return texto;
    }

    const partes = texto.split("---");
    return partes.slice(2).join("---").trim();
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

  return {
    formatarData,
    fetchJson,
    fetchText,
    escapeHtml,
    sanitizeHtml,
    removerFrontMatter,
    separarFrontMatter
  };
})();
