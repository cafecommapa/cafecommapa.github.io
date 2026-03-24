window.SiteVisitas = (function () {
  const STORAGE_KEY = "cafecomapa-owner-exclude-visits";
  const ADMIN_QUERY_KEY = "visitas";
  const ADMIN_QUERY_VALUE = "admin";
  const TRACKER_SCRIPT_ID = "site-visitas-tracker";

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

  function modoAdminAtivo() {
    const params = new URLSearchParams(window.location.search);
    return params.get(ADMIN_QUERY_KEY) === ADMIN_QUERY_VALUE || window.location.hash.includes("visitas-admin");
  }

  function formatarContagem(total) {
    if (typeof total === "string") return total;
    return Number(total || 0).toLocaleString("pt-BR");
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
        // Se a canonical estiver inválida, cai para a URL atual.
      }
    }

    return `${window.location.pathname}${window.location.search}` || "/";
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

  async function carregarContadorTotal(baseUrl) {
    const blocos = document.querySelectorAll("[data-visitas-total]");
    if (!blocos.length) return;

    if (!baseUrl) {
      blocos.forEach((bloco) => {
        bloco.hidden = true;
      });
      return;
    }

    try {
      const pathAtual = obterPathAtual();
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      const timeoutId = window.setTimeout(() => controller?.abort(), 8000);
      const resposta = await fetch(`${baseUrl}/counter/${encodeURIComponent(pathAtual)}.json?_=${Date.now()}`, {
        signal: controller?.signal
      });
      window.clearTimeout(timeoutId);

      if (!resposta.ok) {
        throw new Error("Não foi possível carregar o contador.");
      }

      const dados = await resposta.json();
      const total = typeof dados.count === "number" ? dados.count : 0;

      blocos.forEach((bloco) => {
        const valor = bloco.querySelector("[data-visitas-valor]");
        if (valor) {
          valor.textContent = formatarContagem(total);
        }

        bloco.hidden = false;
      });
    } catch (erro) {
      console.error(erro);
      blocos.forEach((bloco) => {
        bloco.hidden = true;
      });
    }
  }

  function injetarTracker(baseUrl) {
    if (!baseUrl || navegadorDoProprietario()) return;
    if (document.getElementById(TRACKER_SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = TRACKER_SCRIPT_ID;
    script.async = true;
    script.src = "https://gc.zgo.at/count.js";
    script.dataset.goatcounter = `${baseUrl}/count`;
    document.head.appendChild(script);
  }

  function init() {
    atualizarPainelAdmin();
    bindPainelAdmin();

    const baseUrl = obterBaseUrl();
    carregarContadorTotal(baseUrl);
    injetarTracker(baseUrl);
  }

  return { init };
})();
