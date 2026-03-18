window.SiteUtils = (function () {
  function formatarData(dataIso) {
    const [ano, mes, dia] = dataIso.split("-");
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
    removerFrontMatter,
    separarFrontMatter
  };
})();
