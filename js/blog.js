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
let homeRenderizada = false;

async function abrirPostNaHome(slug) {
  const container = document.getElementById("posts-principais");
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

  document.getElementById("botao-voltar").addEventListener("click", async function(e){
    e.preventDefault();
    await renderizarPrincipais(postsCache);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function renderizarPrincipais(posts) {
  const container = document.getElementById("posts-principais");
  container.innerHTML = "";

  for (const [index, post] of posts.slice(0, 2).entries()) {
    const markdown = await buscarMarkdown(post.file);
    const corpo = removerFrontMatter(markdown);

    const artigo = document.createElement("article");
    artigo.className = index === 0 ? "card-post destaque" : "card-post secundario";

    artigo.innerHTML = `
      <a href="#" class="post-link-bloco" data-slug="${post.slug}">
        ${post.cover ? `<img src="${post.cover}" alt="${post.title}">` : ""}
        <div class="post-meta">${formatarData(post.date)}</div>
        <h2>${post.title}</h2>
        <p class="resumo">${post.summary}</p>
      </a>
      <div class="post-preview">
        ${marked.parse(corpo.substring(0, index === 0 ? 700 : 400) + (corpo.length > (index === 0 ? 700 : 400) ? "..." : ""))}
      </div>
    `;

    container.appendChild(artigo);
  }

  container.querySelectorAll(".post-link-bloco").forEach((link) => {
    link.addEventListener("click", async function(e) {
      e.preventDefault();
      const slug = this.dataset.slug;
      await abrirPostNaHome(slug);
    });
  });

  homeRenderizada = true;
}

function renderizarSidebar(posts) {
  const lista = document.getElementById("lista-posts");
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
    link.addEventListener("click", async function(e) {
      e.preventDefault();
      const slug = this.dataset.slug;
      await abrirPostNaHome(slug);
    });
  });
}

async function iniciar() {
  try {
    renderizarRelogios();
    postsCache = await buscarIndice();
    await renderizarPrincipais(postsCache);
    renderizarSidebar(postsCache);
  } catch (erro) {
    console.error(erro);
    document.getElementById("posts-principais").innerHTML =
      `<p>Erro ao carregar os posts: ${erro.message}</p>`;
  }
}

iniciar();