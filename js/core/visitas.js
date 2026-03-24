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
    if (!baseUrl || navegadorDoProprietario()) return;
    if (document.getElementById(TRACKER_SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = TRACKER_SCRIPT_ID;
    script.async = true;
    script.src = "https://gc.zgo.at/count.js";
    script.dataset.goatcounter = `${baseUrl}/count`;
    document.head.appendChild(script);
  }

  function renderizarContador() {
    const blocos = document.querySelectorAll("[data-visitas-total]");
    if (!blocos.length) return;

    if (!window.goatcounter?.visit_count) {
      blocos.forEach((bloco) => {
        bloco.hidden = true;
      });
      return;
    }

    blocos.forEach((bloco, index) => {
      bloco.hidden = false;

      const valor = bloco.querySelector("[data-visitas-valor]");
      if (valor) {
        valor.textContent = "";
        valor.id = valor.id || `visitas-valor-${index + 1}`;
      }

      try {
        window.goatcounter.visit_count({
          append: `#${valor.id}`,
          type: "html",
          no_branding: true,
          style: `
            div {
              border: 0;
              background: transparent;
              padding: 0;
              margin: 0;
              min-width: 0;
              min-height: 0;
              color: #f3d0a4;
              font-size: 18px;
              font-weight: 700;
              line-height: 1;
              box-shadow: none;
            }
            #gcvc-for {
              display: none;
            }
            #gcvc-views {
              color: #f3d0a4;
              font-size: 18px;
              font-weight: 700;
            }
            #gcvc-by {
              display: none;
            }
          `
        });
      } catch (erro) {
        console.error(erro);
        bloco.hidden = true;
      }
    });
  }

  function aguardarGoatCounter(tentativa = 0) {
    const maxTentativas = 40;

    if (window.goatcounter?.visit_count) {
      renderizarContador();
      return;
    }

    if (tentativa >= maxTentativas) {
      document.querySelectorAll("[data-visitas-total]").forEach((bloco) => {
        bloco.hidden = true;
      });
      return;
    }

    window.setTimeout(() => {
      aguardarGoatCounter(tentativa + 1);
    }, 250);
  }

  function init() {
    atualizarPainelAdmin();
    bindPainelAdmin();

    const baseUrl = obterBaseUrl();
    injetarTracker(baseUrl);

    if (!navegadorDoProprietario()) {
      aguardarGoatCounter();
    }
  }

  return { init };
})();
