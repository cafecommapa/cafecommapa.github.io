window.SitePopups = (function () {
  function templateContato() {
    return `
      <div id="popup-contato" class="popup-overlay" aria-hidden="true">
        <div class="popup-contato-card" role="dialog" aria-modal="true" aria-labelledby="titulo-popup-contato">
          <div class="popup-topo-contato">
            <div class="icone-instagram-popup" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="white">
                <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 2A3.75 3.75 0 0 0 4 7.75v8.5A3.75 3.75 0 0 0 7.75 20h8.5A3.75 3.75 0 0 0 20 16.25v-8.5A3.75 3.75 0 0 0 16.25 4h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"/>
              </svg>
            </div>
            <div class="foto-contato">
              <img src="imagens/nos.jpg" alt="Patrô e Márcia">
            </div>
          </div>
          <h2 id="titulo-popup-contato">Contato</h2>
          <p>Quer falar conosco ou acompanhar mais viagens e bastidores? Fale com a gente no Instagram.</p>
          <div class="popup-contato-acoes">
            <a href="https://instagram.com/cafecommapas" target="_blank" rel="noopener noreferrer" class="botao-instagram">Abrir Instagram</a>
            <button type="button" class="botao-fechar-popup" data-popup-close="contato">Fechar</button>
          </div>
        </div>
      </div>
    `;
  }

  function templateSobre() {
    return `
      <div id="popup-sobre" class="popup-overlay" aria-hidden="true">
        <div class="popup-contato-card" role="dialog" aria-modal="true" aria-labelledby="titulo-popup-sobre">
          <h2 id="titulo-popup-sobre">Sobre o blog</h2>
          <p>No Café com Mapas, compartilhamos nossas experiências de viagem, dicas de lugares, roteiros e inspirações pelo caminho, além de reflexões sobre séries, filmes e livros. Este é um espaço para reunir memórias, ideias e descobertas. Junte-se a nós nessa jornada.</p>
          <p class="assinatura-blog">Patrô e Márcia</p>
          <div class="popup-sobre-base">
            <button type="button" class="botao-fechar-popup" data-popup-close="sobre">Fechar</button>
            <div class="foto-sobre">
              <img src="imagens/nos.jpg" alt="Patrô e Márcia">
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function templateBoasVindas() {
    return `
      <div id="popup-boas-vindas" aria-hidden="true">
        <div class="popup-moldura">
          <div class="popup-card">
            <h2>Bem-vindo ao Café com Mapa</h2>
            <p>Explore nossas viagens, ideias e caminhos pelo mundo. Use o menu para navegar pelas matérias e visite também o mapa interativo com os destinos do blog.</p>
            <button id="fechar-popup">Começar a viagem</button>
          </div>
        </div>
      </div>
    `;
  }

  function ensureSharedMarkup(page) {
    if (!document.getElementById("popup-contato")) {
      document.body.insertAdjacentHTML("beforeend", templateContato());
    }
    if (!document.getElementById("popup-sobre")) {
      document.body.insertAdjacentHTML("beforeend", templateSobre());
    }
    if (page === "home" && !document.getElementById("popup-boas-vindas")) {
      document.body.insertAdjacentHTML("beforeend", templateBoasVindas());
    }
  }

  function abrir(nome) {
    const popup = document.getElementById(`popup-${nome}`);
    if (popup) {
      popup.classList.add("aberto");
      popup.style.display = popup.id === "popup-boas-vindas" ? "flex" : "";
      popup.setAttribute("aria-hidden", "false");
    }
  }

  function fechar(nome) {
    const popup = document.getElementById(`popup-${nome}`);
    if (popup) {
      popup.classList.remove("aberto");
      if (popup.id === "popup-boas-vindas") popup.style.display = "none";
      popup.setAttribute("aria-hidden", "true");
    }
  }

  function initBoasVindas() {
    const popup = document.getElementById("popup-boas-vindas");
    const botao = document.getElementById("fechar-popup");
    if (!popup || !botao) return;

    const hoje = new Date().toDateString();
    let ultimo = null;
    try {
      ultimo = localStorage.getItem("popupCafeMapa");
    } catch {
      ultimo = null;
    }

    if (ultimo === hoje) {
      popup.style.display = "none";
      return;
    }

    popup.style.display = "flex";

    botao.addEventListener("click", function () {
      popup.style.display = "none";
      try {
        localStorage.setItem("popupCafeMapa", hoje);
      } catch {
        // Ignora bloqueios de storage para não quebrar o popup.
      }
    });
  }

  function bindDelegation() {
    if (document.body.dataset.popupsBound === "true") return;
    document.body.dataset.popupsBound = "true";

    document.addEventListener("click", function (e) {
      const abrirEl = e.target.closest("[data-popup-open]");
      if (abrirEl) {
        e.preventDefault();
        abrir(abrirEl.dataset.popupOpen);
        return;
      }

      const fecharEl = e.target.closest("[data-popup-close]");
      if (fecharEl) {
        e.preventDefault();
        fechar(fecharEl.dataset.popupClose);
        return;
      }

      const overlay = e.target.closest(".popup-overlay");
      if (overlay && e.target === overlay) {
        if (overlay.id === "popup-contato") fechar("contato");
        if (overlay.id === "popup-sobre") fechar("sobre");
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      fechar("contato");
      fechar("sobre");
    });
  }

  function init(options = {}) {
    const page = options.page || document.body.dataset.page || "";
    ensureSharedMarkup(page);
    bindDelegation();
    if (page === "home") initBoasVindas();
  }

  return {
    init,
    abrir,
    fechar
  };
})();
