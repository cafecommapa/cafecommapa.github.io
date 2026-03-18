window.SiteMenu = (function () {
  function initHeaderMobile() {
    const botaoCidade = document.getElementById("botao-cidade-mobile");
    const menuCidades = document.getElementById("menu-cidades-mobile");
    const botaoMenuMobile = document.getElementById("botao-menu-mobile");
    const menuMobileLinks = document.getElementById("menu-mobile-links");
    const estadoInicial = window.SiteRelogios?.getCidadeMobileAtual?.();

    if (botaoCidade && estadoInicial) {
      botaoCidade.textContent = `☰ ${estadoInicial.nome}`;
    }

    if (botaoCidade && menuCidades) {
      botaoCidade.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const abriu = menuCidades.classList.toggle("aberto");
        botaoCidade.setAttribute("aria-expanded", abriu ? "true" : "false");

        if (menuMobileLinks) menuMobileLinks.classList.remove("aberto");
        if (botaoMenuMobile) botaoMenuMobile.setAttribute("aria-expanded", "false");
      });

      menuCidades.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();

          const cidade = this.dataset.cidade;
          const timezone = this.dataset.timezone;
          window.SiteRelogios?.setCidadeMobile?.(cidade, timezone);
          botaoCidade.textContent = `☰ ${cidade}`;
          menuCidades.classList.remove("aberto");
          botaoCidade.setAttribute("aria-expanded", "false");
        });
      });
    }

    if (botaoMenuMobile && menuMobileLinks) {
      botaoMenuMobile.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const abriu = menuMobileLinks.classList.toggle("aberto");
        botaoMenuMobile.setAttribute("aria-expanded", abriu ? "true" : "false");

        if (menuCidades) menuCidades.classList.remove("aberto");
        if (botaoCidade) botaoCidade.setAttribute("aria-expanded", "false");
      });
    }

    document.addEventListener("click", function (e) {
      if (menuCidades && botaoCidade && !e.target.closest(".seletor-cidade-mobile")) {
        menuCidades.classList.remove("aberto");
        botaoCidade.setAttribute("aria-expanded", "false");
      }

      if (menuMobileLinks && botaoMenuMobile && !e.target.closest(".header-linha-2-esquerda")) {
        menuMobileLinks.classList.remove("aberto");
        botaoMenuMobile.setAttribute("aria-expanded", "false");
      }
    });
  }

  function initMenuDesktop() {
    const botaoCategorias = document.getElementById("botao-categorias");
    if (!botaoCategorias) return;
    const dropdown = botaoCategorias.parentElement;

    botaoCategorias.addEventListener("click", function (e) {
      e.stopPropagation();
      dropdown.classList.toggle("aberto");
    });

    document.addEventListener("click", function () {
      dropdown.classList.remove("aberto");
    });
  }

  function init() {
    initHeaderMobile();
    initMenuDesktop();
  }

  return { init };
})();
