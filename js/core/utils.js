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

  function titleCase(valor) {
    return String(valor || "")
      .split(/\s+/)
      .filter(Boolean)
      .map((palavra) => {
        const minusculas = ["a", "as", "com", "da", "das", "de", "do", "dos", "e", "em", "na", "nas", "no", "nos", "o", "os", "para", "por", "x"];
        const lower = palavra.toLowerCase();
        if (minusculas.includes(lower)) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(" ");
  }

  function tituloCurtoPost(post) {
    const titulo = String(post?.title || "").trim();
    const slug = String(post?.slug || "").trim().toLowerCase();
    const base = `${slug} ${titulo.toLowerCase()}`;

    const atalhos = [
      { padrao: /figurinhas?/, titulo: "Figurinhas" },
      { padrao: /copa-do-mundo|copa do mundo/, titulo: "Copa do Mundo" },
      { padrao: /ameaca-nuclear|ameaça nuclear/, titulo: "Ameaça Nuclear" },
      { padrao: /amsterdam/, titulo: "Amsterdam" },
      { padrao: /destinos-cruzados|destinos cruzados/, titulo: "Destinos Cruzados" },
      { padrao: /jennifer/, titulo: "Jennifer" },
      { padrao: /cinema/, titulo: "Cinema" },
      { padrao: /netflix/, titulo: "Netflix" },
      { padrao: /chile/, titulo: "Chile" },
      { padrao: /new-york|nova-york|nova york/, titulo: "New York" },
      { padrao: /miami/, titulo: "Miami" },
      { padrao: /orlando/, titulo: "Orlando" },
      { padrao: /europa/, titulo: "Europa" },
      { padrao: /paris/, titulo: "Paris" },
      { padrao: /porto/, titulo: "Porto" },
      { padrao: /praga/, titulo: "Praga" },
      { padrao: /receita/, titulo: "Receita" },
      { padrao: /carne-de-panela|carne de panela/, titulo: "Carne de Panela" },
      { padrao: /molho-gorgonzola|molho gorgonzola/, titulo: "Molho Gorgonzola" },
      { padrao: /krispy-kreme|krispy/, titulo: "Krispy Kreme" }
    ];

    const atalho = atalhos.find((item) => item.padrao.test(base));
    if (atalho) return atalho.titulo;

    const origem = slug || titulo;
    const palavrasIgnoradas = new Set([
      "a", "as", "ao", "aos", "com", "da", "das", "de", "do", "dos", "e", "em", "na", "nas", "no", "nos", "o", "os", "para", "por", "que", "um", "uma"
    ]);

    const palavras = origem
      .replace(/[-_]+/g, " ")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((palavra) => palavra && !palavrasIgnoradas.has(palavra.toLowerCase()))
      .slice(0, 3);

    return titleCase(palavras.join(" ") || titulo);
  }

  return {
    formatarData,
    fetchJson,
    fetchText,
    escapeHtml,
    sanitizeHtml,
    removerFrontMatter,
    separarFrontMatter,
    tituloCurtoPost
  };
})();
