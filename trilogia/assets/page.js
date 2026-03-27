(function () {
  const books = window.TrilogiaBooks || {};
  const components = window.TrilogiaComponents || {};
  const testimonials = [
    {
      quote: "\"Eu li Destinos Cruzados e achei emocionante\"",
      author: "Renata"
    },
    {
      quote: "\"Li Destinos Cruzados e achei uma leitura envolvente do início ao fim, eu recomendo.\"",
      author: "Valéria"
    },
    {
      quote: "Mais depoimentos em breve.",
      author: ""
    }
  ];

  function renderLanding() {
    const shelf = document.querySelector("[data-trilogia-shelf]");
    const testimonialsRoot = document.querySelector("[data-trilogia-testimonials]");
    if (shelf) {
      shelf.innerHTML = Object.keys(books).map(function (key) {
        return components.createBookCard(books[key]);
      }).join("");
    }

    if (testimonialsRoot) {
      testimonialsRoot.innerHTML = testimonials.map(function (item) {
        return components.createTestimonialCard(item);
      }).join("");
    }
  }

  function renderBookPage() {
    const root = document.body;
    const slug = root.dataset.bookSlug;
    const book = books[slug];
    if (!book) return;

    const hero = document.querySelector("[data-trilogia-hero]");
    const content = document.querySelector("[data-trilogia-content]");

    if (hero) {
      hero.innerHTML = components.createBookHero(book);
    }

    if (content) {
      content.innerHTML = [
        components.createSectionBlock(
          "Sinopse",
          `<p>${escapeHtml(book.synopsis)}</p>`
        ),
        components.createSectionBlock(
          "Personagens principais",
          components.createList(book.characters, "tc-feature-list")
        ),
        components.createSectionBlock(
          "Frases em destaque",
          components.createQuoteList(book.quotes)
        ),
        components.createSectionBlock(
          "Leitura recomendada para",
          `<p>Leitores que buscam ${escapeHtml(book.keywords.join(", "))} com forte carga emocional, suspense e relações humanas intensas.</p>`
        ),
        components.createSectionBlock(
          "Compre agora",
          `<p>Garanta este volume da trilogia e acompanhe a jornada completa dos personagens.</p>${components.createCTAButton("Compre agora", book.buyUrl)}`
        )
      ].join("");
    }

    const keywords = document.querySelector("[data-trilogia-keywords]");
    if (keywords) {
      keywords.innerHTML = components.createKeywordList(book.keywords);
    }
  }

  function initMobileMenu() {
    const menuButton = document.querySelector("[data-trilogia-menu-button]");
    const nav = document.querySelector("[data-trilogia-nav]");
    if (!menuButton || !nav) return;

    function closeMenu() {
      nav.classList.remove("aberto");
      menuButton.setAttribute("aria-expanded", "false");
    }

    menuButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      const isOpen = nav.classList.toggle("aberto");
      menuButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        closeMenu();
      });
    });

    document.addEventListener("click", function (event) {
      if (!event.target.closest(".tc-header-bar")) {
        closeMenu();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 768) {
        closeMenu();
      }
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.SiteVisitas?.init?.();
    renderLanding();
    renderBookPage();
    initMobileMenu();
  });
})();
