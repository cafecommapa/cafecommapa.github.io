window.SiteVisitas = (function () {
  const STORAGE_KEY = "cafecomapa-owner-exclude-visits";
  const ADMIN_QUERY_KEY = "visitas";
  const ADMIN_QUERY_VALUE = "admin";
  const TRACKER_SCRIPT_ID = "site-visitas-tracker";
  const CONTAGEM_POST_ATTR = "data-visitas-post-counted";

  // Lemos a configuração do site em um arquivo separado para evitar editar a lógica.
  function obterConfig() {
    return {
      goatcounterCode: "",
      ...(window.SiteAnalyticsConfig || {})
    };
  }

  function obterBaseUrl() {
    const codigo = String(obterConfig().goatcounterCode || "").trim();
    if (!codigo) return "";

    if (/^https?:\/\//i.test(codigo)) {
      return codigo.replace(/\/+$/, "");
    }

    return `https://${codigo}.goatcounter.com`;
  }

  function navegadorDoProprietario() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }

  function salvarPreferenciaDoProprietario(ignorarVisitas) {
    try {
      window.localStorage.setItem(STORAGE_KEY, ignorarVisitas ? "1" : "0");
    } catch {
      // Ignora falhas de armazenamento local para não quebrar o site.
    }
  }

  // O painel admin só aparece para quem abrir a URL com o parâmetro especial.
  function modoAdminAtivo() {
    const params = new URLSearchParams(window.location.search);
    return params.get(ADMIN_QUERY_KEY) === ADMIN_QUERY_VALUE || window.location.hash.includes("visitas-admin");
  }

  function atualizarPainelAdmin() {
    const paineis = document.querySelectorAll("[data-visitas-admin]");
    if (!paineis.length) return;

    const adminAtivo = modoAdminAtivo();
    const ignorandoVisitas = navegadorDoProprietario();

    paineis.forEach((painel) => {
      painel.hidden = !adminAtivo;

      const status = painel.querySelector("[data-visitas-status]");
      const botao = painel.querySelector("[data-visitas-toggle]");

      if (status) {
        status.textContent = ignorandoVisitas
          ? "Este navegador está marcado para não contar suas visitas."
          : "Este navegador está contando visitas normalmente.";
      }

      if (botao) {
        botao.textContent = ignorandoVisitas
          ? "Voltar a contar minhas visitas"
          : "Ignorar minhas visitas neste navegador";
      }
    });
  }

  function bindPainelAdmin() {
    document.querySelectorAll("[data-visitas-toggle]").forEach((botao) => {
      botao.addEventListener("click", function () {
        const proximoEstado = !navegadorDoProprietario();
        salvarPreferenciaDoProprietario(proximoEstado);
        atualizarPainelAdmin();
        window.location.reload();
      });
    });
  }

  function injetarTracker(baseUrl) {
    if (!baseUrl) return;
    if (document.getElementById(TRACKER_SCRIPT_ID)) return;

    const ignorarVisitas = navegadorDoProprietario();
    const pathAtual = obterPathAtual();
    const page = document.body.dataset.page || "";
    const script = document.createElement("script");
    script.id = TRACKER_SCRIPT_ID;
    script.async = true;
    script.src = "https://gc.zgo.at/count.js";
    script.dataset.goatcounter = `${baseUrl}/count`;
    script.dataset.goatcounterSettings = JSON.stringify({
      path: pathAtual,
      ...((ignorarVisitas || page === "post") ? { no_onload: true } : {})
    });
    document.head.appendChild(script);
  }

  function obterPathAtual() {
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical?.href) {
      try {
        const url = new URL(canonical.href, window.location.origin);
        if (url.origin === window.location.origin) {
          return `${url.pathname}${url.search}` || "/";
        }
      } catch {
        // Se a canonical estiver inválida, usa a URL atual.
      }
    }

    return `${window.location.pathname}${window.location.search}` || "/";
  }

  function atualizarBlocos(total) {
    const blocos = document.querySelectorAll("[data-visitas-total]");
    if (!blocos.length) return;

    blocos.forEach((bloco) => {
      const valor = bloco.querySelector("[data-visitas-valor]");
      if (valor) {
        valor.textContent = total;
      }

      bloco.hidden = false;
    });
  }

  function ocultarBlocos() {
    document.querySelectorAll("[data-visitas-total]").forEach((bloco) => {
      bloco.hidden = true;
    });
  }

  async function buscarContador(baseUrl, pathAtual) {
    const resposta = await fetch(`${baseUrl}/counter/${encodeURIComponent(pathAtual)}.json?_=${Date.now()}`);
    if (!resposta.ok) {
      throw new Error("Não foi possível carregar o contador.");
    }

    const dados = await resposta.json();
    return dados.count ?? "0";
  }

  // Usamos o path resolvido pelo próprio GoatCounter e exibimos só o número no rodapé.
  async function renderizarContador(baseUrl) {
    const blocos = document.querySelectorAll("[data-visitas-total]");
    if (!blocos.length) return;

    const pathAtual = obterPathAtual();
    if (!baseUrl || !pathAtual) {
      ocultarBlocos();
      return;
    }

    try {
      const total = await buscarContador(baseUrl, pathAtual);
      atualizarBlocos(total);
    } catch (erro) {
      console.error(erro);
      ocultarBlocos();
    }
  }

  function aguardarGoatCounter(baseUrl, tentativa = 0) {
    const maxTentativas = 40;

    if (window.goatcounter) {
      renderizarContador(baseUrl);
      return;
    }

    if (tentativa >= maxTentativas) {
      ocultarBlocos();
      return;
    }

    window.setTimeout(() => {
      aguardarGoatCounter(baseUrl, tentativa + 1);
    }, 250);
  }

  function contarPostAtual(baseUrl, tentativa = 0) {
    const maxTentativas = 40;
    const page = document.body.dataset.page || "";
    const pathAtual = obterPathAtual();

    if (page !== "post" || navegadorDoProprietario()) return;
    if (document.body.getAttribute(CONTAGEM_POST_ATTR) === pathAtual) return;

    if (!window.goatcounter?.count) {
      if (tentativa >= maxTentativas) return;
      window.setTimeout(() => {
        contarPostAtual(baseUrl, tentativa + 1);
      }, 250);
      return;
    }

    document.body.setAttribute(CONTAGEM_POST_ATTR, pathAtual);
    window.goatcounter.count({
      path: pathAtual,
      title: document.title
    });
  }

  function renderizarContadorPostComRetry(baseUrl, tentativa = 0) {
    const maxTentativas = 8;
    const pathAtual = obterPathAtual();

    if (!baseUrl || !pathAtual) {
      ocultarBlocos();
      return;
    }

    buscarContador(baseUrl, pathAtual)
      .then((total) => {
        atualizarBlocos(total);
      })
      .catch(() => {
        if (tentativa >= maxTentativas) {
          ocultarBlocos();
          return;
        }

        window.setTimeout(() => {
          renderizarContadorPostComRetry(baseUrl, tentativa + 1);
        }, 600);
      });
  }

  function init() {
    atualizarPainelAdmin();
    bindPainelAdmin();

    const baseUrl = obterBaseUrl();
    injetarTracker(baseUrl);

    aguardarGoatCounter(baseUrl);
  }

  function refresh() {
    const baseUrl = obterBaseUrl();
    contarPostAtual(baseUrl);
    renderizarContadorPostComRetry(baseUrl);
  }

  return { init, refresh };
})();
