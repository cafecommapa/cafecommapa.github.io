window.SiteMapa = (function () {
  function normalizarVisitadoPor(valor) {
    return String(valor || "").trim().toLowerCase();
  }

  function classePinDaCidade(cidade) {
    const visitadoPor = normalizarVisitadoPor(cidade.visitadoPor);

    if (visitadoPor === "patro") return "pin-mapa pin-mapa-patro";
    if (visitadoPor === "marcia") return "pin-mapa pin-mapa-marcia";
    return "pin-mapa pin-mapa-ambos";
  }

  function popupCidade(cidade) {
    const bandeira = cidade.codigoPais
      ? `<img class="popup-bandeira" src="https://flagcdn.com/24x18/${cidade.codigoPais}.png" alt="Bandeira de ${cidade.pais}" loading="lazy">`
      : "";

    return `
      <div class="popup-cidade">
        <div class="popup-titulo">
          <div class="popup-cabecalho-cidade">
            ${bandeira}
            <span class="popup-nome-cidade">${cidade.nome}</span>
          </div>
        </div>
        <div class="popup-texto">${cidade.texto}</div>
      </div>
    `;
  }

  function init() {
    const mapaEl = document.getElementById("mapa");
    if (!mapaEl || typeof L === "undefined" || !window.cidadesMapa) return;

    const mapa = L.map("mapa", { minZoom: 2, maxZoom: 7 });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      noWrap: true,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(mapa);

    const pontos = [];
    window.cidadesMapa.forEach((cidade) => {
      const iconePin = L.divIcon({
        className: "",
        html: `<div class="${classePinDaCidade(cidade)}"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      L.marker([cidade.lat, cidade.lng], { icon: iconePin })
        .addTo(mapa)
        .bindPopup(popupCidade(cidade));
      pontos.push([cidade.lat, cidade.lng]);
    });

    if (pontos.length > 0) {
      mapa.fitBounds(pontos, { padding: [50, 50] });
    }
  }

  return { init };
})();
