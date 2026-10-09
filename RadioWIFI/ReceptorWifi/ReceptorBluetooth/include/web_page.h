#pragma once

#include <Arduino.h>

const char WEB_PAGE[] PROGMEM = R"HTML(
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Receptor Bluetooth</title>
  <style>
    :root { color-scheme: dark; font-family: system-ui, sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center;
      padding: 20px; color: #edf6ff; background: #07111f; }
    main { width: min(100%, 460px); padding: 26px; border: 1px solid #29415d;
      border-radius: 24px; background: #101d2d; box-shadow: 0 18px 60px #0008; }
    h1 { margin: 0 0 6px; color: #55d7ff; font-size: 1.7rem; }
    #status { margin-bottom: 24px; color: #74ef9a; }
    .card { padding: 18px; border-radius: 16px; background: #091522; }
    .row { display: flex; justify-content: space-between; align-items: center; }
    .label { color: #8ea6bd; font-size: .85rem; text-transform: uppercase; }
    #value { color: #ffd166; font-size: 1.5rem; }
    input { width: 100%; height: 52px; accent-color: #55d7ff; }
    small { display: block; margin-top: 18px; color: #8ea6bd; line-height: 1.6; }
  </style>
</head>
<body>
<main>
  <h1>Receptor Bluetooth</h1>
  <div id="status">Consultando o ESP32...</div>
  <section class="card">
    <div class="row">
      <span class="label">Volume</span>
      <strong id="value">70%</strong>
    </div>
    <input id="volume" type="range" min="0" max="100" step="1" value="70">
  </section>
  <small>
    Bluetooth: ReceptorBluetooth<br>
    Wi-Fi: use o endereco mostrado no display<br>
    Saida analogica: GPIO25
  </small>
</main>
<script>
  const statusElement = document.querySelector('#status');
  const volume = document.querySelector('#volume');
  const value = document.querySelector('#value');
  let sendTimer;

  function showVolume(percent) {
    volume.value = percent;
    value.textContent = percent + '%';
  }

  async function refresh() {
    try {
      const response = await fetch('/api/state', {cache: 'no-store'});
      if (!response.ok) throw new Error();
      const state = await response.json();
      statusElement.textContent = state.connected
        ? 'Bluetooth conectado'
        : 'Aguardando conexao Bluetooth';
      if (document.activeElement !== volume) showVolume(state.volume);
    } catch (_) {
      statusElement.textContent = 'ESP32 desconectado';
    }
  }

  volume.addEventListener('input', () => {
    showVolume(volume.value);
    clearTimeout(sendTimer);
    sendTimer = setTimeout(async () => {
      try {
        const response = await fetch('/api/volume?value=' + volume.value,
          {method: 'POST'});
        if (!response.ok) throw new Error();
      } catch (_) {
        statusElement.textContent = 'Falha ao enviar volume';
      }
    }, 100);
  });

  refresh();
  setInterval(refresh, 1500);
</script>
</body>
</html>
)HTML";
