window.SiteFooter = (function () {
  function templateFooter() {
    return `
      <footer class="rodape">
        <div class="rodape-linha"></div>
        <div class="rodape-container">
          <div class="rodape-redes">
            <a href="https://instagram.com/cafecommapas" target="_blank" rel="noopener noreferrer">
              <span class="icone-instagram-rodape"></span>
              @cafecommapas
            </a>
            <a href="https://instagram.com/patrocarlos" target="_blank" rel="noopener noreferrer">
              <span class="icone-instagram-rodape"></span>
              @patrocarlos
            </a>
          </div>
          <div class="rodape-visitas" data-visitas-total hidden>
            <span class="rodape-visitas-label">Visitas desta página</span>
            <div class="rodape-visitas-valor" data-visitas-valor aria-live="polite">carregando...</div>
          </div>
          <div class="rodape-visitas-admin" data-visitas-admin hidden>
            <button type="button" class="rodape-visitas-botao" data-visitas-toggle>Ignorar minhas visitas neste navegador</button>
            <p class="rodape-visitas-status" data-visitas-status></p>
          </div>
          <div class="rodape-info">© 2026 Café com Mapa — Powered by GitHub Pages</div>
        </div>
      </footer>
    `;
  }

  function init() {
    document.querySelectorAll("[data-site-footer]").forEach((container) => {
      if (container.dataset.footerRendered === "true") return;
      container.innerHTML = templateFooter();
      container.dataset.footerRendered = "true";
    });
  }

  return { init };
})();
