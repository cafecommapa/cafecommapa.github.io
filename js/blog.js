marked.setOptions({
  gfm: true,
  breaks: true
});

function formatarData(dataIso) {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

async function buscarIndice() {
  const resposta = await fetch("posts/index.json");
  if (!resposta.ok) {
    throw new Error("Não foi possível carregar posts/index.json");
  }
  return await resposta.json();
}

async function buscarMarkdown(caminho) {
  const resposta = await fetch(caminho);
  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar ${caminho}`);
  }
  return await resposta.text();
}

function removerFrontMatter(texto) {
  if (!texto.startsWith("---")) {
    return texto;
  }

  const partes = texto.split("---");
  return partes.slice(2).join("---").trim();
}

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

function ativarLightboxNasImagens() {
  garantirLightbox();

  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");

  document.querySelectorAll(".post-body img").forEach((img) => {
    img.style.cursor = "zoom-in";

    img.onclick = function () {
      lightboxImg.src = this.src;
      lightboxImg.alt = this.alt || "";
      lightbox.style.display = "flex";
    };
  });
}

function renderizarRelogios() {
  const cidades = [
    { nome: "Nova York", timezone: "America/New_York" },
    { nome: "Londres", timezone: "Europe/London" },
    { nome: "Paris", timezone: "Europe/Paris" },
    { nome: "Los Angeles", timezone: "America/Los_Angeles" },
    { nome: "Brasil", timezone: "America/Sao_Paulo" }
  ];

  const container = document.getElementById("clocks-grid");
  if (!container) return;

  container.innerHTML = cidades.map((cidade, i) => `
    <div class="clock-card">
      <div class="clock-title">${cidade.nome}</div>
      <canvas id="clock-${i}" width="70" height="70"></canvas>
    </div>
  `).join("");

  function desenharPonteiro(ctx, pos, comprimento, largura, cor) {
    ctx.beginPath();
    ctx.lineWidth = largura;
    ctx.lineCap = "round";
    ctx.strokeStyle = cor;
    ctx.moveTo(0, 0);
    ctx.rotate(pos);
    ctx.lineTo(0, -comprimento);
    ctx.stroke();
    ctx.rotate(-pos);
  }

  function desenharRelogio(canvasId, timezone) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const raio = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(raio, raio);

    ctx.beginPath();
    ctx.arc(0, 0, raio - 3, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#333";
    ctx.stroke();

    for (let num = 1; num <= 12; num++) {
      const ang = num * Math.PI / 6;

      ctx.rotate(ang);
      ctx.translate(0, -raio + 12);
      ctx.rotate(-ang);

      ctx.font = "9px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#222";
      ctx.fillText(num.toString(), 0, 0);

      ctx.rotate(ang);
      ctx.translate(0, raio - 12);
      ctx.rotate(-ang);
    }

    const agora = new Date();
    const horaLocal = new Date(
      agora.toLocaleString("en-US", { timeZone: timezone })
    );

    let hora = horaLocal.getHours() % 12;
    const minuto = horaLocal.getMinutes();
    const segundo = horaLocal.getSeconds();

    const angHora =
      (hora * Math.PI / 6) +
      (minuto * Math.PI / (6 * 60)) +
      (segundo * Math.PI / (360 * 60));

    const angMin =
      (minuto * Math.PI / 30) +
      (segundo * Math.PI / (30 * 60));

    const angSeg = segundo * Math.PI / 30;

    desenharPonteiro(ctx, angHora, raio * 0.42, 4, "#222");
    desenharPonteiro(ctx, angMin, raio * 0.60, 3, "#444");
    desenharPonteiro(ctx, angSeg, raio * 0.70, 1, "#cc0000");

    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, 2 * Math.PI);
    ctx.fillStyle = "#222";
    ctx.fill();

    ctx.restore();
  }

  function atualizar() {
    cidades.forEach((cidade, i) => {
      desenharRelogio(`clock-${i}`, cidade.timezone);
    });
  }

  atualizar();
  setInterval(atualizar, 1000);
}

let postsCache = [];
let mobileTimezoneAtual = "America/New_York";
let mobileCidadeAtual = "Nova York";
let relogioMiniIntervalo = null;

function atualizarRelogioMini() {
  const ponteiroHora = document.getElementById("ponteiro-hora");
  const ponteiroMinuto = document.getElementById("ponteiro-minuto");
  const ponteiroSegundo = document.getElementById("ponteiro-segundo");

  if (!ponteiroHora || !ponteiroMinuto || !ponteiroSegundo) return;

  const agora = new Date();
  const horaCidade = new Date(
    agora.toLocaleString("en-US", { timeZone: mobileTimezoneAtual })
  );

  const hora = horaCidade.getHours() % 12;
  const minuto = horaCidade.getMinutes();
  const segundo = horaCidade.getSeconds();

  const angHora = (hora * 30) + (minuto * 0.5);
  const angMinuto = (minuto * 6) + (segundo * 0.1);
  const angSegundo = segundo * 6;

  ponteiroHora.style.transform = `translateX(-50%) rotate(${angHora}deg)`;
  ponteiroMinuto.style.transform = `translateX(-50%) rotate(${angMinuto}deg)`;
  ponteiroSegundo.style.transform = `translateX(-50%) rotate(${angSegundo}deg)`;
}

function iniciarHeaderMobile() {
  const botaoCidade = document.getElementById("botao-cidade-mobile");
  const menuCidades = document.getElementById("menu-cidades-mobile");
  const botaoMenuMobile = document.getElementById("botao-menu-mobile");
  const menuMobileLinks = document.getElementById("menu-mobile-links");

  if (botaoCidade) {
    botaoCidade.textContent = `☰ ${mobileCidadeAtual}`;
  }

  if (botaoCidade && menuCidades) {
    botaoCidade.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const abriu = menuCidades.classList.toggle("aberto");
      botaoCidade.setAttribute("aria-expanded", abriu ? "true" : "false");

      if (menuMobileLinks) {
        menuMobileLinks.classList.remove("aberto");
      }
      if (botaoMenuMobile) {
        botaoMenuMobile.setAttribute("aria-expanded", "false");
      }
    });

    menuCidades.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        mobileCidadeAtual = this.dataset.cidade;
        mobileTimezoneAtual = this.dataset.timezone;

        botaoCidade.textContent = `☰ ${mobileCidadeAtual}`;
        menuCidades.classList.remove("aberto");
        botaoCidade.setAttribute("aria-expanded", "false");

        atualizarRelogioMini();
      });
    });
  }

  if (botaoMenuMobile && menuMobileLinks) {
    botaoMenuMobile.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const abriu = menuMobileLinks.classList.toggle("aberto");
      botaoMenuMobile.setAttribute("aria-expanded", abriu ? "true" : "false");

      if (menuCidades) {
        menuCidades.classList.remove("aberto");
      }
      if (botaoCidade) {
        botaoCidade.setAttribute("aria-expanded", "false");
      }
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

  atualizarRelogioMini();

  if (!relogioMiniIntervalo) {
    relogioMiniIntervalo = setInterval(atualizarRelogioMini, 1000);
  }
}

async function abrirPostNaHome(slug) {
  const container = document.getElementById("posts-principais");
  if (!container) return;

  const post = postsCache.find((p) => p.slug === slug);

  if (!post) {
    container.innerHTML = "<p>Post não encontrado.</p>";
    return;
  }

  const markdown = await buscarMarkdown(post.file);
  const corpo = removerFrontMatter(markdown);

  container.innerHTML = `
    <article class="post-full">
      <a href="#" class="botao-voltar" id="botao-voltar">← Voltar</a>
      <div class="post-meta">${formatarData(post.date)}</div>
      <h1>${post.title}</h1>
      <div class="post-body">
        ${marked.parse(corpo)}
      </div>
    </article>
  `;

  const botaoVoltar = document.getElementById("botao-voltar");
  if (botaoVoltar) {
    botaoVoltar.addEventListener("click", async function (e) {
      e.preventDefault();
      await renderizarPrincipais(postsCache);
      destacarPostAberto(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  destacarPostAberto(slug);
  ativarLightboxNasImagens();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function destacarPostAberto(slugAtivo) {
  document.querySelectorAll(".sidebar-link").forEach((link) => {
    if (link.dataset.slug === slugAtivo) {
      link.classList.add("ativo");
    } else {
      link.classList.remove("ativo");
    }
  });
}

async function renderizarPrincipais(posts) {
  const container = document.getElementById("posts-principais");
  if (!container) return;

  container.innerHTML = "";

  for (const [index, post] of posts.slice(0, 2).entries()) {
    const markdown = await buscarMarkdown(post.file);
    const corpo = removerFrontMatter(markdown);
    const limite = index === 0 ? 700 : 400;

    const artigo = document.createElement("article");
    artigo.className = index === 0 ? "card-post destaque" : "card-post secundario";

    artigo.innerHTML = `
      <a href="#" class="post-link-bloco" data-slug="${post.slug}">
        ${post.cover ? `<img src="${post.cover}" alt="${post.title}">` : ""}
        <div class="post-meta">${formatarData(post.date)}</div>
        <h2>${post.title}</h2>
        ${post.summary ? `<p class="resumo">${post.summary}</p>` : ""}
      </a>
      <div class="post-preview">
        ${marked.parse(corpo.substring(0, limite) + (corpo.length > limite ? "..." : ""))}
      </div>
    `;

    container.appendChild(artigo);
  }

  container.querySelectorAll(".post-link-bloco").forEach((link) => {
    link.addEventListener("click", async function (e) {
      e.preventDefault();
      const slug = this.dataset.slug;
      await abrirPostNaHome(slug);
    });
  });
}

function renderizarSidebar(posts) {
  const lista = document.getElementById("lista-posts");
  if (!lista) return;

  lista.innerHTML = "";

  posts.slice(0, 10).forEach((post) => {
    const item = document.createElement("li");
    item.className = "sidebar-item";

    item.innerHTML = `
      <a href="#" class="sidebar-link" data-slug="${post.slug}">
        <span class="sidebar-title">${post.title}</span>
        <span class="sidebar-date">${formatarData(post.date)}</span>
      </a>
    `;

    lista.appendChild(item);
  });

  lista.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", async function (e) {
      e.preventDefault();
      const slug = this.dataset.slug;
      await abrirPostNaHome(slug);
    });
  });
}

function iniciarMenuDesktop() {
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

async function iniciar() {
  try {
    iniciarHeaderMobile();
    iniciarMenuDesktop();
    renderizarRelogios();

    const postsPrincipais = document.getElementById("posts-principais");
    if (postsPrincipais) {
      postsCache = await buscarIndice();
      await renderizarPrincipais(postsCache);
      renderizarSidebar(postsCache);
    }
  } catch (erro) {
    console.error(erro);

    const postsPrincipais = document.getElementById("posts-principais");
    if (postsPrincipais) {
      postsPrincipais.innerHTML =
        `<p>Erro ao carregar os posts: ${erro.message}</p>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", iniciar);


// popup boas vindas
document.addEventListener("DOMContentLoaded", function(){

  const popup = document.getElementById("popup-boas-vindas");
  const botao = document.getElementById("fechar-popup");

  const hoje = new Date().toDateString();
  const ultimo = localStorage.getItem("popupCafeMapa");

  const modoTeste = true;

  if(!modoTeste && ultimo === hoje){
    popup.style.display = "none";
  }

  botao.addEventListener("click", function(){

    popup.style.display = "none";
    localStorage.setItem("popupCafeMapa", hoje);

  });

});


