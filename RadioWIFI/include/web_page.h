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
    .volume-control + .volume-control { margin-top: 8px; }
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
  <div class="volume-control">
    <div class="volume"><label for="volume20">Volume (0 a 20)</label><strong id="volume20Value">18 / 20</strong></div>
    <input id="volume20" type="range" min="0" max="20" step="1" value="18">
  </div>
  <div class="volume-control">
    <div class="volume"><label for="volume100">Volume (0 a 100%)</label><strong id="volume100Value">90 / 100</strong></div>
    <input id="volume100" type="range" min="0" max="100" step="1" value="90">
  </div>
  <button id="toneButton" type="button" aria-pressed="false">Gerar senoide de 100 Hz</button>
  <button id="bluetoothButton" type="button" aria-pressed="false">Ativar Bluetooth</button>
  <div id="bluetoothHint" class="label">Para parear, procure por RadioWIFI no celular.</div>
  <div class="label" style="margin:18px 0 8px">Estações</div>
  <section class="stations">
    <button data-station="0">NPO Radio 2<small>Pop</small></button>
    <button data-station="1">NPO 3FM<small>Pop e alternativa</small></button>
    <button data-station="2">NPO Radio 5<small>Clássicos e pop</small></button>
    <button data-station="3">FunX<small>Urban e dance</small></button>
    <button data-station="4">NPO Klassiek<small>Música clássica</small></button>
    <button data-station="5">CBN São Paulo<small>Notícias</small></button>
  </section>
</main>
<script>
  const volume20 = document.querySelector('#volume20');
  const volume100 = document.querySelector('#volume100');
  const volume20Value = document.querySelector('#volume20Value');
  const volume100Value = document.querySelector('#volume100Value');
  const toneButton = document.querySelector('#toneButton');
  const bluetoothButton = document.querySelector('#bluetoothButton');
  const bluetoothHint = document.querySelector('#bluetoothHint');
  let volume20Timer;
  let volume100Timer;

  function showVolumeValues(level, percent) {
    volume20Value.textContent = level + ' / 20';
    volume100Value.textContent = percent + ' / 100';
  }

  async function refresh() {
    try {
      const state = await fetch('/api/state', {cache: 'no-store'}).then(r => r.json());
      document.querySelector('#status').textContent = state.status;
      document.querySelector('#station').textContent = state.stationName;
      document.querySelector('#title').textContent = state.bluetooth
        ? 'Áudio recebido por Bluetooth'
        : state.title || 'Aguardando metadados...';
      if (document.activeElement !== volume20) volume20.value = state.volume;
      if (document.activeElement !== volume100) volume100.value = state.volumePercent;
      showVolumeValues(volume20.value, volume100.value);
      toneButton.textContent = state.testTone
        ? 'Parar senoide de 100 Hz'
        : 'Gerar senoide de 100 Hz';
      toneButton.dataset.active = state.testTone;
      toneButton.setAttribute('aria-pressed', state.testTone);
      toneButton.classList.toggle('active', state.testTone);
      bluetoothButton.textContent = state.bluetooth
        ? 'Desativar Bluetooth'
        : 'Ativar Bluetooth';
      bluetoothButton.dataset.active = state.bluetooth;
      bluetoothButton.setAttribute('aria-pressed', state.bluetooth);
      bluetoothButton.classList.toggle('active', state.bluetooth);
      bluetoothButton.disabled = state.bluetoothStarting;
      bluetoothHint.textContent = state.bluetoothStarting
        ? 'Inicializando Bluetooth; aguarde alguns segundos.'
        : state.bluetoothConnected
          ? 'Celular conectado por Bluetooth.'
          : state.bluetooth
            ? 'Bluetooth ativo: pareie com RadioWIFI no Bluetooth do celular.'
            : 'Para parear, procure por RadioWIFI no Bluetooth do celular.';
      document.querySelectorAll('[data-station]').forEach(button =>
        {
          button.disabled = state.bluetoothStarting;
          button.classList.toggle('active', Number(button.dataset.station) === state.station);
        });
    } catch (_) {
      document.querySelector('#status').textContent = 'ESP32 desconectado';
    }
  }

  volume20.addEventListener('input', () => {
    volume100.value = Number(volume20.value) * 5;
    showVolumeValues(volume20.value, volume100.value);
    clearTimeout(volume20Timer);
    volume20Timer = setTimeout(() => fetch('/api/volume?value=' + volume20.value,
      {method: 'POST'}), 120);
  });

  volume100.addEventListener('input', () => {
    volume20.value = Math.round(Number(volume100.value) / 5);
    showVolumeValues(volume20.value, volume100.value);
    clearTimeout(volume100Timer);
    volume100Timer = setTimeout(() => fetch('/api/volume-percent?value=' + volume100.value,
      {method: 'POST'}), 120);
  });

  toneButton.addEventListener('click', async () => {
    const enabled = toneButton.dataset.active === 'true' ? 0 : 1;
    const response = await fetch('/api/tone?enabled=' + enabled, {method: 'POST'});
    if (response.ok) refresh();
  });

  bluetoothButton.addEventListener('click', async () => {
    const enabled = bluetoothButton.dataset.active === 'true' ? 0 : 1;
    bluetoothButton.disabled = true;
    try {
      const response = await fetch('/api/bluetooth?enabled=' + enabled, {method: 'POST'});
      if (!response.ok) throw new Error('Falha ao alterar o Bluetooth');
      await refresh();
    } catch {
      bluetoothHint.textContent = 'Não foi possível ativar o Bluetooth. Verifique a conexão com o ESP32.';
    } finally {
      bluetoothButton.disabled = false;
    }
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
