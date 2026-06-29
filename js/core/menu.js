window.SiteMenu = (function () {
  function initHeaderMobile() {
    const seletoresCidade = Array.from(document.querySelectorAll(".seletor-cidade"));
    const botoesCidade = seletoresCidade
      .map((seletor) => seletor.querySelector(".botao-cidade"))
      .filter(Boolean);
    const menusCidade = seletoresCidade
      .map((seletor) => seletor.querySelector(".menu-cidades"))
      .filter(Boolean);
    const botaoMenuMobile = document.getElementById("botao-menu-mobile");
    const menuMobileLinks = document.getElementById("menu-mobile-links");
    const botaoCategoriasMobile = document.getElementById("botao-categorias-mobile");
    const menuCategoriasMobile = document.getElementById("menu-categorias-mobile");
    const botaoAutoresMobile = document.getElementById("botao-autores-mobile");
    const menuAutoresMobile = document.getElementById("menu-autores-mobile");
    const botaoLivrosMobile = document.getElementById("botao-livros-mobile");
    const menuLivrosMobile = document.getElementById("menu-livros-mobile");
    const estadoInicial = window.SiteRelogios?.getCidadeMobileAtual?.();

    function fecharMenusCidade() {
      menusCidade.forEach((menu) => menu.classList.remove("aberto"));
      botoesCidade.forEach((botao) => botao.setAttribute("aria-expanded", "false"));
    }

    function atualizarBotoesCidade(nome) {
      botoesCidade.forEach((botao) => {
        botao.textContent = `☰ ${nome}`;
      });
    }

    if (estadoInicial) {
      atualizarBotoesCidade(estadoInicial.nome);
    }

    seletoresCidade.forEach((seletor) => {
      const botaoCidade = seletor.querySelector(".botao-cidade");
      const menuCidade = seletor.querySelector(".menu-cidades");
      if (!botaoCidade || !menuCidade) return;

      botaoCidade.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        menusCidade.forEach((menu) => {
          if (menu !== menuCidade) menu.classList.remove("aberto");
        });
        botoesCidade.forEach((botao) => {
          if (botao !== botaoCidade) botao.setAttribute("aria-expanded", "false");
        });
        const abriu = menuCidade.classList.toggle("aberto");
        botaoCidade.setAttribute("aria-expanded", abriu ? "true" : "false");
      });

      menuCidade.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();

          const cidade = this.dataset.cidade;
          const timezone = this.dataset.timezone;
          window.SiteRelogios?.setCidadeMobile?.(cidade, timezone);
          atualizarBotoesCidade(cidade);
          fecharMenusCidade();
        });
      });
    });

    if (botaoMenuMobile && menuMobileLinks) {
      botaoMenuMobile.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const abriu = menuMobileLinks.classList.toggle("aberto");
        botaoMenuMobile.setAttribute("aria-expanded", abriu ? "true" : "false");

        fecharMenusCidade();
        if (!abriu && menuCategoriasMobile) menuCategoriasMobile.classList.remove("aberto");
        if (!abriu && botaoCategoriasMobile) botaoCategoriasMobile.setAttribute("aria-expanded", "false");
        if (!abriu && menuAutoresMobile) menuAutoresMobile.classList.remove("aberto");
        if (!abriu && botaoAutoresMobile) botaoAutoresMobile.setAttribute("aria-expanded", "false");
        if (!abriu && menuLivrosMobile) menuLivrosMobile.classList.remove("aberto");
        if (!abriu && botaoLivrosMobile) botaoLivrosMobile.setAttribute("aria-expanded", "false");
      });

      menuMobileLinks.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", function () {
          menuMobileLinks.classList.remove("aberto");
          botaoMenuMobile.setAttribute("aria-expanded", "false");
          if (menuCategoriasMobile) menuCategoriasMobile.classList.remove("aberto");
          if (botaoCategoriasMobile) botaoCategoriasMobile.setAttribute("aria-expanded", "false");
          if (menuAutoresMobile) menuAutoresMobile.classList.remove("aberto");
          if (botaoAutoresMobile) botaoAutoresMobile.setAttribute("aria-expanded", "false");
          if (menuLivrosMobile) menuLivrosMobile.classList.remove("aberto");
          if (botaoLivrosMobile) botaoLivrosMobile.setAttribute("aria-expanded", "false");
          fecharMenusCidade();
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

    if (botaoLivrosMobile && menuLivrosMobile) {
      botaoLivrosMobile.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const abriu = menuLivrosMobile.classList.toggle("aberto");
        botaoLivrosMobile.setAttribute("aria-expanded", abriu ? "true" : "false");
      });
    }

    document.addEventListener("click", function (e) {
      if (!e.target.closest(".seletor-cidade")) {
        fecharMenusCidade();
      }

      if (menuMobileLinks && botaoMenuMobile && !e.target.closest(".header-linha-2-esquerda")) {
        menuMobileLinks.classList.remove("aberto");
        botaoMenuMobile.setAttribute("aria-expanded", "false");
        if (menuCategoriasMobile) menuCategoriasMobile.classList.remove("aberto");
        if (botaoCategoriasMobile) botaoCategoriasMobile.setAttribute("aria-expanded", "false");
        if (menuAutoresMobile) menuAutoresMobile.classList.remove("aberto");
        if (botaoAutoresMobile) botaoAutoresMobile.setAttribute("aria-expanded", "false");
        if (menuLivrosMobile) menuLivrosMobile.classList.remove("aberto");
        if (botaoLivrosMobile) botaoLivrosMobile.setAttribute("aria-expanded", "false");
      }
    });
  }

  function initMenuDesktop() {
    const botoesDropdown = document.querySelectorAll(".menu-dropdown:not(.seletor-cidade) > button");
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
