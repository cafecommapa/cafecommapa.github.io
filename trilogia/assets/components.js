(function () {
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function createCTAButton(label, href) {
    return `
      <a class="tc-button" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">
        ${escapeHtml(label)}
      </a>
    `;
  }

  function createSectionBlock(title, content) {
    return `
      <section class="tc-section-block" aria-labelledby="section-${slugify(title)}">
        <div class="tc-section-heading">
          <p class="tc-section-eyebrow">Trilogia de livros</p>
          <h2 id="section-${slugify(title)}">${escapeHtml(title)}</h2>
        </div>
        <div class="tc-section-content">
          ${content}
        </div>
      </section>
    `;
  }

  function createBookCard(book) {
    return `
      <article class="tc-book-card">
        <div class="tc-book-card-cover">
          <img
            class="tc-book-card-image"
            src="${escapeHtml(book.image || "")}"
            alt="Capa do livro ${escapeHtml(book.title)}"
            loading="lazy"
            onerror="this.style.display='none'; this.nextElementSibling.hidden = false;"
          >
          <span class="tc-book-card-fallback" hidden>${escapeHtml(book.title)}</span>
        </div>
        <div class="tc-book-card-body">
          <p class="tc-book-kicker">${escapeHtml(book.kicker)}</p>
          <h2>${escapeHtml(book.title)}</h2>
          <p class="tc-book-card-headline">${escapeHtml(book.headline)}</p>
          <p class="tc-book-card-copy">${escapeHtml(book.shortDescription || book.synopsis)}</p>
          <div class="tc-book-card-actions">
            <a class="tc-link" href="/trilogia/${escapeHtml(book.slug)}/">Ver detalhes</a>
            ${createCTAButton("Comprar agora", book.buyUrl)}
          </div>
        </div>
      </article>
    `;
  }

  function createList(items, className) {
    const safeItems = (items || []).map(function (item) {
      return `<li>${escapeHtml(item)}</li>`;
    }).join("");

    return `<ul class="${className}">${safeItems}</ul>`;
  }

  function createQuoteList(items) {
    return `
      <div class="tc-quotes">
        ${(items || []).map(function (item) {
          return `<blockquote class="tc-quote">${escapeHtml(item)}</blockquote>`;
        }).join("")}
      </div>
    `;
  }

  function createKeywordList(items) {
    return `
      <div class="tc-keywords" aria-label="Palavras-chave">
        ${(items || []).map(function (item) {
          return `<span class="tc-keyword">${escapeHtml(item)}</span>`;
        }).join("")}
      </div>
    `;
  }

  function createBookHero(book) {
    return `
      <section class="tc-hero tc-hero-book">
        <div class="tc-hero-copy">
          <p class="tc-book-kicker">${escapeHtml(book.kicker)}</p>
          <h1>${escapeHtml(book.title)}</h1>
          <p class="tc-hero-headline">${escapeHtml(book.headline)}</p>
          <p class="tc-hero-text">${escapeHtml(book.synopsis)}</p>
          <div class="tc-hero-actions">
            ${createCTAButton("Compre agora", book.buyUrl)}
            <a class="tc-link" href="/trilogia/">Voltar para a trilogia</a>
          </div>
        </div>
        <div class="tc-hero-cover">
          <div class="tc-book-cover-panel">
            <img
              class="tc-book-hero-image"
              src="${escapeHtml(book.image || "")}"
              alt="Capa do livro ${escapeHtml(book.title)}"
              loading="eager"
              onerror="this.style.display='none'; this.nextElementSibling.hidden = false;"
            >
            <span class="tc-book-hero-fallback" hidden>${escapeHtml(book.title)}</span>
          </div>
        </div>
      </section>
    `;
  }

  function createTestimonialCard(item) {
    return `
      <article class="tc-testimonial-card">
        <p class="tc-testimonial-copy">${escapeHtml(item.quote)}</p>
        <p class="tc-testimonial-author">${escapeHtml(item.author)}</p>
      </article>
    `;
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  window.TrilogiaComponents = {
    createBookCard: createBookCard,
    createBookHero: createBookHero,
    createCTAButton: createCTAButton,
    createKeywordList: createKeywordList,
    createList: createList,
    createTestimonialCard: createTestimonialCard,
    createQuoteList: createQuoteList,
    createSectionBlock: createSectionBlock
  };
})();
