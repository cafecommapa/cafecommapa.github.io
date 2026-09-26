#pragma once

const char WEB_PAGE[] PROGMEM = R"HTML(
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Radio ESP32</title>
  <style>
    :root { color-scheme: dark; font-family: system-ui, sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #07111f; color: #edf6ff;
      display: grid; place-items: center; padding: 20px; }
    main { width: min(100%, 480px); background: #101d2d; border: 1px solid #29415d;
      border-radius: 24px; padding: 24px; box-shadow: 0 18px 60px #0008; }
    h1 { margin: 0 0 4px; color: #55d7ff; font-size: 1.7rem; }
    #status { color: #74ef9a; margin-bottom: 20px; }
    .now { background: #091522; border-radius: 16px; padding: 16px; margin-bottom: 20px; }
    .label { color: #8ea6bd; font-size: .8rem; text-transform: uppercase; }
    #station { font-size: 1.25rem; font-weight: 700; margin: 4px 0; }
    #title { color: #ffd166; min-height: 2.6em; }
    .volume { display: flex; justify-content: space-between; margin-top: 8px; }
    input[type=range] { width: 100%; accent-color: #55d7ff; height: 38px; }
    .stations { display: grid; gap: 10px; }
    button { width: 100%; border: 1px solid #34506d; background: #172a3f; color: white;
      border-radius: 13px; padding: 14px; text-align: left; font-size: 1rem; }
    button small { display: block; color: #8ea6bd; margin-top: 2px; }
    button.active { border-color: #55d7ff; background: #123a50; }
    button:active { transform: scale(.985); }
  </style>
</head>
<body>
<main>
  <h1>Radio ESP32</h1>
  <div id="status">Conectando...</div>
  <section class="now">
    <div class="label">Tocando agora</div>
    <div id="station">--</div>
    <div id="title">Aguardando metadados...</div>
  </section>
  <div class="volume"><span>Volume</span><strong id="volumeValue">18 / 20</strong></div>
  <input id="volume" type="range" min="0" max="20" step="1" value="18">
  <div class="label" style="margin:18px 0 8px">Estações</div>
  <section class="stations">
    <button data-station="0">NPO Radio 2<small>Pop</small></button>
    <button data-station="1">NPO 3FM<small>Pop e alternativa</small></button>
    <button data-station="2">NPO Radio 5<small>Clássicos e pop</small></button>
    <button data-station="3">FunX<small>Urban e dance</small></button>
    <button data-station="4">NPO Klassiek<small>Música clássica</small></button>
  </section>
</main>
<script>
  const volume = document.querySelector('#volume');
  const volumeValue = document.querySelector('#volumeValue');
  let volumeTimer;

  async function refresh() {
    try {
      const state = await fetch('/api/state', {cache: 'no-store'}).then(r => r.json());
      document.querySelector('#status').textContent = state.status;
      document.querySelector('#station').textContent = state.stationName;
      document.querySelector('#title').textContent = state.title || 'Aguardando metadados...';
      if (document.activeElement !== volume) volume.value = state.volume;
      volumeValue.textContent = volume.value + ' / 20';
      document.querySelectorAll('[data-station]').forEach(button =>
        button.classList.toggle('active', Number(button.dataset.station) === state.station));
    } catch (_) {
      document.querySelector('#status').textContent = 'ESP32 desconectado';
    }
  }

  volume.addEventListener('input', () => {
    volumeValue.textContent = volume.value + ' / 20';
    clearTimeout(volumeTimer);
    volumeTimer = setTimeout(() => fetch('/api/volume?value=' + volume.value,
      {method: 'POST'}), 120);
  });

  document.querySelectorAll('[data-station]').forEach(button => {
    button.addEventListener('click', async () => {
      await fetch('/api/station?id=' + button.dataset.station, {method: 'POST'});
      refresh();
    });
  });

  refresh();
  setInterval(refresh, 2000);
</script>
</body>
</html>
)HTML";
