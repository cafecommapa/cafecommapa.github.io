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
  if (texto.startsWith("---")) {
    const partes = texto.split("---");
    return partes.slice(2).join("---").trim();
  }
  return texto;
}

function renderizarRelogios() {
  const cidades = [
    { nome: "Nova York", timezone: "America/New_York", clima: "☀️ 12°C" },
    { nome: "Londres", timezone: "Europe/London", clima: "☁️ 8°C" },
    { nome: "Paris", timezone: "Europe/Paris", clima: "🌤️ 10°C" },
    { nome: "Los Angeles", timezone: "America/Los_Angeles", clima: "☀️ 19°C" },
    { nome: "Brasil", timezone: "America/Sao_Paulo", clima: "⛅ 27°C" }
  ];

  const container = document.getElementById("clocks-grid");
  if (!container) return;

  container.innerHTML = cidades.map((cidade, i) => `
    <div class="clock-card">
      <div class="clock-title">${cidade.nome}</div>
      <canvas id="clock-${i}" width="90" height="90"></canvas>
      <div class="clock-weather">${cidade.clima}</div>
    </div>
  `).join("");

  function desenharRelogio(canvasId, timezone) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const raio = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(raio, raio);

    ctx.beginPath();
    ctx.arc(0, 0, raio - 4, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#333";
    ctx.stroke();

    for (let num = 1; num <= 12; num++) {
      const ang = num * Math.PI / 6;
      ctx.rotate(ang);
      ctx.translate(0, -raio + 16);
      ctx.rotate(-ang);
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#222";
      ctx.fillText(num.toString(), 0, 0);
      ctx.rotate(ang);
      ctx.translate(0, raio - 16);
      ctx.rotate(-ang);
    }

    const agora = new Date();
    const horaLocal = new Date(
      agora.toLocaleString("en-US", { timeZone: timezone })
    );

    let hora = horaLocal.getHours();
    let minuto = horaLocal.getMinutes();
    let segundo = horaLocal.getSeconds();

    hora = hora % 12;

    const angHora = (hora * Math.PI / 6) +
      (minuto * Math.PI / (6 * 60)) +
      (segundo * Math.PI / (360 * 60));

    const angMin = (minuto * Math.PI / 30) +
      (segundo * Math.PI / (30 * 60));

    const angSeg = segundo * Math.PI / 30;

    desenharPonteiro(ctx, angHora, raio * 0.45, 4, "#222");
    desenharPonteiro(ctx, angMin, raio * 0.65, 3, "#444");
    desenharPonteiro(ctx, angSeg, raio * 0.75, 1, "#cc0000");

    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, 2 * Math.PI);
    ctx.fillStyle = "#222";
    ctx.fill();

    ctx.restore();
  }

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

  function atualizar() {
    cidades.forEach((cidade, i) => {
      desenharRelogio(`clock-${i}`, cidade.timezone);
    });
  }

  atualizar();
  setInterval(atualizar, 1000);
}

async function renderizarPrincipais(posts) {
  const container = document.getElementById("posts-principais");
  container.innerHTML = "";

  for (const post of posts.slice(0, 2)) {
    const markdown = await buscarMarkdown(post.file);
    const corpo = removerFrontMatter(markdown);

    const artigo = document.createElement("article");
    artigo.className = "card-post";

    artigo.innerHTML = `
      <a href="post.html?slug=${encodeURIComponent(post.slug)}" class="post-link-bloco">
        ${post.cover ? `<img src="${post.cover}" alt="${post.title}">` : ""}
        <div class="post-meta">${formatarData(post.date)}</div>
        <h2>${post.title}</h2>
        <p class="resumo">${post.summary}</p>
      </a>
      <div class="post-preview">
        ${marked.parse(corpo.substring(0, 500) + (corpo.length > 500 ? "..." : ""))}
      </div>
    `;

    container.appendChild(artigo);
  }
}

function renderizarSidebar(posts) {
  const lista = document.getElementById("lista-posts");
  lista.innerHTML = "";

  posts.slice(0, 10).forEach((post) => {
    const item = document.createElement("li");
    item.className = "sidebar-item";

    item.innerHTML = `
      <a href="post.html?slug=${encodeURIComponent(post.slug)}">
        <span class="sidebar-title">${post.title}</span>
        <span class="sidebar-date">${formatarData(post.date)}</span>
      </a>
    `;

    lista.appendChild(item);
  });
}

async function iniciar() {
  try {
    renderizarRelogios();
    const posts = await buscarIndice();
    await renderizarPrincipais(posts);
    renderizarSidebar(posts);
  } catch (erro) {
    console.error(erro);
    document.getElementById("posts-principais").innerHTML =
      "<p>Erro ao carregar os posts.</p>";
  }
}

iniciar();