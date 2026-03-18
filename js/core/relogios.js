window.SiteRelogios = (function () {
  const cidadesRelogio = [
    { nome: "Nova York", timezone: "America/New_York" },
    { nome: "Londres", timezone: "Europe/London" },
    { nome: "Paris", timezone: "Europe/Paris" },
    { nome: "Los Angeles", timezone: "America/Los_Angeles" },
    { nome: "Brasil", timezone: "America/Sao_Paulo" }
  ];

  let mobileTimezoneAtual = "America/New_York";
  let mobileCidadeAtual = "Nova York";
  let relogioMiniIntervalo = null;
  let relogiosGrandesIntervalo = null;

  function renderizarRelogios() {
    const container = document.getElementById("clocks-grid");
    if (!container) return;

    container.innerHTML = cidadesRelogio.map((cidade, i) => `
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
      const horaLocal = new Date(agora.toLocaleString("en-US", { timeZone: timezone }));
      const hora = horaLocal.getHours() % 12;
      const minuto = horaLocal.getMinutes();
      const segundo = horaLocal.getSeconds();

      const angHora = (hora * Math.PI / 6) + (minuto * Math.PI / (6 * 60)) + (segundo * Math.PI / (360 * 60));
      const angMin = (minuto * Math.PI / 30) + (segundo * Math.PI / (30 * 60));
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

    function atualizarRelogiosGrandes() {
      cidadesRelogio.forEach((cidade, i) => desenharRelogio(`clock-${i}`, cidade.timezone));
    }

    atualizarRelogiosGrandes();

    if (relogiosGrandesIntervalo) clearInterval(relogiosGrandesIntervalo);
    relogiosGrandesIntervalo = setInterval(atualizarRelogiosGrandes, 1000);
  }

  function atualizarRelogioMini() {
    const ponteiroHora = document.getElementById("ponteiro-hora");
    const ponteiroMinuto = document.getElementById("ponteiro-minuto");
    const ponteiroSegundo = document.getElementById("ponteiro-segundo");
    if (!ponteiroHora || !ponteiroMinuto || !ponteiroSegundo) return;

    const agora = new Date();
    const horaCidade = new Date(agora.toLocaleString("en-US", { timeZone: mobileTimezoneAtual }));
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

  function init() {
    renderizarRelogios();
    atualizarRelogioMini();
    if (relogioMiniIntervalo) clearInterval(relogioMiniIntervalo);
    relogioMiniIntervalo = setInterval(atualizarRelogioMini, 1000);
  }

  function setCidadeMobile(cidade, timezone) {
    mobileCidadeAtual = cidade;
    mobileTimezoneAtual = timezone;
    atualizarRelogioMini();
  }

  function getCidadeMobileAtual() {
    return { nome: mobileCidadeAtual, timezone: mobileTimezoneAtual };
  }

  return {
    init,
    setCidadeMobile,
    getCidadeMobileAtual,
    atualizarRelogioMini
  };
})();
