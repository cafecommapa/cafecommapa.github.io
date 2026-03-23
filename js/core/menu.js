window.SiteMenu = (function () {
  function initHeaderMobile() {
    const botaoCidade = document.getElementById("botao-cidade-mobile");
    const menuCidades = document.getElementById("menu-cidades-mobile");
    const botaoMenuMobile = document.getElementById("botao-menu-mobile");
    const menuMobileLinks = document.getElementById("menu-mobile-links");
    const botaoCategoriasMobile = document.getElementById("botao-categorias-mobile");
    const menuCategoriasMobile = document.getElementById("menu-categorias-mobile");
    const botaoAutoresMobile = document.getElementById("botao-autores-mobile");
    const menuAutoresMobile = document.getElementById("menu-autores-mobile");
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
        if (!abriu && menuCategoriasMobile) menuCategoriasMobile.classList.remove("aberto");
        if (!abriu && botaoCategoriasMobile) botaoCategoriasMobile.setAttribute("aria-expanded", "false");
        if (!abriu && menuAutoresMobile) menuAutoresMobile.classList.remove("aberto");
        if (!abriu && botaoAutoresMobile) botaoAutoresMobile.setAttribute("aria-expanded", "false");
      });

      menuMobileLinks.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", function () {
          menuMobileLinks.classList.remove("aberto");
          botaoMenuMobile.setAttribute("aria-expanded", "false");
          if (menuCategoriasMobile) menuCategoriasMobile.classList.remove("aberto");
          if (botaoCategoriasMobile) botaoCategoriasMobile.setAttribute("aria-expanded", "false");
          if (menuAutoresMobile) menuAutoresMobile.classList.remove("aberto");
          if (botaoAutoresMobile) botaoAutoresMobile.setAttribute("aria-expanded", "false");
        });
      });
    }

    if (botaoCategoriasMobile && menuCategoriasMobile) {
      botaoCategoriasMobile.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const abriu = menuCategoriasMobile.classList.toggle("aberto");
        botaoCategoriasMobile.setAttribute("aria-expanded", abriu ? "true" : "false");
      });
    }

    if (botaoAutoresMobile && menuAutoresMobile) {
      botaoAutoresMobile.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const abriu = menuAutoresMobile.classList.toggle("aberto");
        botaoAutoresMobile.setAttribute("aria-expanded", abriu ? "true" : "false");
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
        if (menuCategoriasMobile) menuCategoriasMobile.classList.remove("aberto");
        if (botaoCategoriasMobile) botaoCategoriasMobile.setAttribute("aria-expanded", "false");
        if (menuAutoresMobile) menuAutoresMobile.classList.remove("aberto");
        if (botaoAutoresMobile) botaoAutoresMobile.setAttribute("aria-expanded", "false");
      }
    });
  }

  function initMenuDesktop() {
    const botoesDropdown = document.querySelectorAll(".menu-dropdown > button");
    if (!botoesDropdown.length) return;

    botoesDropdown.forEach((botao) => {
      const dropdown = botao.parentElement;
      botao.addEventListener("click", function (e) {
        e.stopPropagation();
        document.querySelectorAll(".menu-dropdown.aberto").forEach((item) => {
          if (item !== dropdown) item.classList.remove("aberto");
        });
        dropdown.classList.toggle("aberto");
      });
    });

    document.addEventListener("click", function () {
      document.querySelectorAll(".menu-dropdown.aberto").forEach((item) => {
        item.classList.remove("aberto");
      });
    });
  }

  function init() {
    initHeaderMobile();
    initMenuDesktop();
  }

  return { init };
})();
