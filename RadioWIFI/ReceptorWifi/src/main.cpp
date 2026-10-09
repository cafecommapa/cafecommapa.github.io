#include <Arduino.h>
#include <BluetoothA2DPSink.h>
#include <WebServer.h>
#include <WiFi.h>
#include <driver/i2s.h>
#include <esp_heap_caps.h>
#include <esp_system.h>

#include "web_page.h"

namespace {

constexpr char DEVICE_NAME[] = "ReceptorWifi";
constexpr char WIFI_NAME[] = "ReceptorWifi";
constexpr char WIFI_PASSWORD[] = "receptor123";
constexpr uint8_t INITIAL_VOLUME_PERCENT = 70;

BluetoothA2DPSink bluetoothSink;
WebServer webServer(80);

const char *resetReasonName(esp_reset_reason_t reason) {
  switch (reason) {
    case ESP_RST_POWERON:
      return "ligou/alimentacao";
    case ESP_RST_EXT:
      return "reset externo";
    case ESP_RST_SW:
      return "software";
    case ESP_RST_PANIC:
      return "panic/excecao";
    case ESP_RST_INT_WDT:
      return "watchdog de interrupcao";
    case ESP_RST_TASK_WDT:
      return "watchdog de tarefa";
    case ESP_RST_WDT:
      return "watchdog";
    case ESP_RST_DEEPSLEEP:
      return "deep sleep";
    case ESP_RST_BROWNOUT:
      return "brownout/alimentacao baixa";
    case ESP_RST_SDIO:
      return "SDIO";
    default:
      return "desconhecido";
  }
}

void printHeap(const char *stage) {
  Serial.printf("[%s] heap livre=%u, menor heap=%u, maior bloco=%u\n", stage,
                ESP.getFreeHeap(), ESP.getMinFreeHeap(),
                heap_caps_get_largest_free_block(MALLOC_CAP_8BIT));
}

void connectionStateChanged(esp_a2d_connection_state_t state, void *) {
  switch (state) {
    case ESP_A2D_CONNECTION_STATE_CONNECTING:
      Serial.println("Bluetooth: conectando");
      break;
    case ESP_A2D_CONNECTION_STATE_CONNECTED:
      Serial.println("Bluetooth: conectado");
      printHeap("conectado");
      break;
    case ESP_A2D_CONNECTION_STATE_DISCONNECTING:
      Serial.println("Bluetooth: desconectando");
      break;
    case ESP_A2D_CONNECTION_STATE_DISCONNECTED:
      Serial.println("Bluetooth: aguardando conexao");
      break;
    default:
      Serial.printf("Bluetooth: estado %d\n", static_cast<int>(state));
      break;
  }
}

uint8_t volumePercent() {
  return static_cast<uint8_t>((bluetoothSink.get_volume() * 100 + 63) / 127);
}

void setVolumePercent(int percent) {
  percent = constrain(percent, 0, 100);
  const uint8_t bluetoothVolume =
      static_cast<uint8_t>((percent * 127 + 50) / 100);
  bluetoothSink.set_volume(bluetoothVolume);
  Serial.printf("Volume: %d%% (A2DP %u/127)\n", percent, bluetoothVolume);
}

void configureWebServer() {
  webServer.on("/", HTTP_GET, []() {
    webServer.sendHeader("Cache-Control", "no-store");
    webServer.send_P(200, "text/html; charset=utf-8", WEB_PAGE);
  });

  webServer.on("/api/state", HTTP_GET, []() {
    String response = "{\"connected\":";
    response += bluetoothSink.is_connected() ? "true" : "false";
    response += ",\"volume\":";
    response += volumePercent();
    response += "}";
    webServer.sendHeader("Cache-Control", "no-store");
    webServer.send(200, "application/json", response);
  });

  webServer.on("/api/volume", HTTP_POST, []() {
    if (!webServer.hasArg("value")) {
      webServer.send(400, "text/plain", "Volume ausente");
      return;
    }
    setVolumePercent(webServer.arg("value").toInt());
    webServer.send(204);
  });

  webServer.onNotFound([]() {
    webServer.send(404, "text/plain", "Nao encontrado");
  });
  webServer.begin();
}

i2s_config_t internalDacConfig() {
  i2s_config_t config = {};
  config.mode = static_cast<i2s_mode_t>(I2S_MODE_MASTER | I2S_MODE_TX |
                                        I2S_MODE_DAC_BUILT_IN);
  config.sample_rate = 44100;
  config.bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT;
  config.channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT;
  config.communication_format = I2S_COMM_FORMAT_STAND_MSB;
  config.intr_alloc_flags = ESP_INTR_FLAG_LEVEL1;
  config.dma_buf_count = 8;
  config.dma_buf_len = 64;
  config.use_apll = false;
  config.tx_desc_auto_clear = true;
  config.fixed_mclk = 0;
  return config;
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(500);

  const esp_reset_reason_t resetReason = esp_reset_reason();
  Serial.println();
  Serial.println("=== ReceptorWifi: teste Bluetooth limpo ===");
  Serial.printf("Ultimo reset: %s (%d)\n", resetReasonName(resetReason),
                static_cast<int>(resetReason));
  printHeap("inicio");

  WiFi.mode(WIFI_AP);
  if (!WiFi.softAP(WIFI_NAME, WIFI_PASSWORD)) {
    Serial.println("ERRO: nao foi possivel criar a rede Wi-Fi");
  } else {
    configureWebServer();
    Serial.printf("Wi-Fi: %s | senha: %s\n", WIFI_NAME, WIFI_PASSWORD);
    Serial.printf("Controle web: http://%s/\n",
                  WiFi.softAPIP().toString().c_str());
  }
  printHeap("Wi-Fi iniciado");

  bluetoothSink.set_default_bt_mode(ESP_BT_MODE_CLASSIC_BT);
  bluetoothSink.set_auto_reconnect(false);
  bluetoothSink.set_on_connection_state_changed(connectionStateChanged);
  bluetoothSink.set_i2s_config(internalDacConfig());

  Serial.printf("Iniciando A2DP como %s...\n", DEVICE_NAME);
  bluetoothSink.start(DEVICE_NAME);
  setVolumePercent(INITIAL_VOLUME_PERCENT);

  // O DAC interno usa GPIO25 (canal direito) e GPIO26 (canal esquerdo).
  // Mantemos somente GPIO25 habilitado.
  const esp_err_t dacResult = i2s_set_dac_mode(I2S_DAC_CHANNEL_RIGHT_EN);
  Serial.printf("DAC GPIO25: %s\n",
                dacResult == ESP_OK ? "iniciado" : esp_err_to_name(dacResult));
  printHeap("A2DP iniciado");
  Serial.printf("Procure por '%s' no Bluetooth do celular.\n", DEVICE_NAME);
}

void loop() {
  webServer.handleClient();
  delay(2);
}
