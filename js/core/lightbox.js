window.SiteLightbox = (function () {
  function garantirLightbox() {
    let lightbox = document.getElementById("lightbox");

    if (!lightbox) {
      lightbox = document.createElement("div");
      lightbox.id = "lightbox";
      lightbox.className = "lightbox";
      lightbox.style.display = "none";

      lightbox.innerHTML = `
        <span id="fechar-lightbox" class="lightbox-fechar">×</span>
        <img id="lightbox-img" class="lightbox-img" src="" alt="">
      `;

      document.body.appendChild(lightbox);
    }

    const lightboxImg = document.getElementById("lightbox-img");
    const fechar = document.getElementById("fechar-lightbox");

    fechar.onclick = function () {
      lightbox.style.display = "none";
      lightboxImg.src = "";
      lightboxImg.alt = "";
    };

    lightbox.onclick = function (e) {
      if (e.target === lightbox) {
        lightbox.style.display = "none";
        lightboxImg.src = "";
        lightboxImg.alt = "";
      }
    };
  }

  function ativarNasImagens(selector = ".post-body img") {
    garantirLightbox();

    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");

    document.querySelectorAll(selector).forEach((img) => {
      img.style.cursor = "zoom-in";
      img.onclick = function () {
        lightboxImg.src = this.src;
        lightboxImg.alt = this.alt || "";
        lightbox.style.display = "flex";
      };
    });
  }

  return {
    garantirLightbox,
    ativarNasImagens
  };
})();
