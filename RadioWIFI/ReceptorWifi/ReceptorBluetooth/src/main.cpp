#include <Arduino.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <BluetoothA2DPSink.h>
#include <DNSServer.h>
#include <SPI.h>
#include <WebServer.h>
#include <WiFi.h>
#include <driver/i2s.h>
#include <esp_heap_caps.h>
#include <esp_system.h>

#include "secrets.h"
#include "web_page.h"

namespace {

constexpr char DEVICE_NAME[] = "ReceptorBluetooth";
constexpr char FALLBACK_WIFI_NAME[] = "ReceptorBluetooth";
constexpr char FALLBACK_WIFI_PASSWORD[] = "receptor123";
constexpr uint8_t INITIAL_VOLUME_PERCENT = 70;
constexpr uint32_t WIFI_CONNECT_TIMEOUT_MS = 15000;

// ST7789 240x240, sem pino CS.
constexpr int8_t TFT_CS = -1;
constexpr int8_t TFT_RST = 26;
constexpr int8_t TFT_DC = 27;
constexpr int8_t TFT_SCLK = 14;
constexpr int8_t TFT_MOSI = 13;

const IPAddress AP_IP(192, 168, 4, 1);
const IPAddress AP_GATEWAY(192, 168, 4, 1);
const IPAddress AP_SUBNET(255, 255, 255, 0);

SPIClass displaySPI(HSPI);
Adafruit_ST7789 display(&displaySPI, TFT_CS, TFT_DC, TFT_RST);
BluetoothA2DPSink bluetoothSink;
WebServer webServer(80);
DNSServer dnsServer;

volatile esp_a2d_connection_state_t bluetoothState =
    ESP_A2D_CONNECTION_STATE_DISCONNECTED;
uint8_t currentVolumePercent = INITIAL_VOLUME_PERCENT;
volatile bool displayDirty = true;
uint8_t lastWifiClients = 255;
bool accessPointMode = false;

const char *resetReasonName(esp_reset_reason_t reason) {
  switch (reason) {
    case ESP_RST_POWERON:
      return "alimentacao";
    case ESP_RST_EXT:
      return "reset externo";
    case ESP_RST_SW:
      return "software";
    case ESP_RST_PANIC:
      return "panic/excecao";
    case ESP_RST_INT_WDT:
      return "watchdog interrupcao";
    case ESP_RST_TASK_WDT:
      return "watchdog tarefa";
    case ESP_RST_WDT:
      return "watchdog";
    case ESP_RST_BROWNOUT:
      return "brownout/fonte fraca";
    default:
      return "outro";
  }
}

void printHeap(const char *stage) {
  Serial.printf("[%s] heap=%u, minimo=%u, maior bloco=%u\n", stage,
                ESP.getFreeHeap(), ESP.getMinFreeHeap(),
                heap_caps_get_largest_free_block(MALLOC_CAP_8BIT));
}

bool bluetoothConnected() {
  return bluetoothState == ESP_A2D_CONNECTION_STATE_CONNECTED;
}

const char *bluetoothStatusText() {
  switch (bluetoothState) {
    case ESP_A2D_CONNECTION_STATE_CONNECTING:
      return "Conectando...";
    case ESP_A2D_CONNECTION_STATE_CONNECTED:
      return "Bluetooth conectado";
    case ESP_A2D_CONNECTION_STATE_DISCONNECTING:
      return "Desconectando...";
    default:
      return "Aguardando Bluetooth";
  }
}

void connectionStateChanged(esp_a2d_connection_state_t state, void *) {
  bluetoothState = state;
  displayDirty = true;
  Serial.printf("Bluetooth: %s\n", bluetoothStatusText());
  if (state == ESP_A2D_CONNECTION_STATE_CONNECTED) {
    printHeap("Bluetooth conectado");
  }
}

void setVolumePercent(int percent) {
  percent = constrain(percent, 0, 100);
  currentVolumePercent = static_cast<uint8_t>(percent);
  const uint8_t bluetoothVolume =
      static_cast<uint8_t>((percent * 127 + 50) / 100);
  bluetoothSink.set_volume(bluetoothVolume);
  displayDirty = true;
  Serial.printf("Volume: %d%%\n", percent);
}

void drawCentered(const String &text, int16_t y, uint16_t color,
                  uint8_t size) {
  int16_t x1;
  int16_t y1;
  uint16_t width;
  uint16_t height;
  display.setTextSize(size);
  display.getTextBounds(text, 0, y, &x1, &y1, &width, &height);
  display.setTextColor(color);
  display.setCursor(max(0, (240 - static_cast<int>(width)) / 2), y);
  display.print(text);
}

void updateDisplay() {
  const uint8_t wifiClients =
      accessPointMode ? WiFi.softAPgetStationNum() : 0;
  if (wifiClients != lastWifiClients) {
    lastWifiClients = wifiClients;
    displayDirty = true;
  }
  if (!displayDirty) {
    return;
  }
  displayDirty = false;

  display.fillScreen(ST77XX_BLACK);
  display.setTextWrap(false);
  drawCentered("RECEPTOR BT", 10, ST77XX_CYAN, 2);
  display.drawFastHLine(8, 36, 224, ST77XX_BLUE);

  drawCentered(bluetoothStatusText(), 54,
               bluetoothConnected() ? ST77XX_GREEN : ST77XX_YELLOW, 2);

  display.setTextSize(1);
  display.setTextColor(ST77XX_WHITE);
  display.setCursor(12, 94);
  display.print("Dispositivo Bluetooth:");
  display.setTextColor(ST77XX_CYAN);
  display.setCursor(12, 108);
  display.print(DEVICE_NAME);

  display.setTextColor(ST77XX_WHITE);
  display.setCursor(12, 132);
  display.print("Controle web:");
  display.setTextColor(ST77XX_CYAN);
  display.setTextSize(2);
  display.setCursor(12, 146);
  display.print(accessPointMode ? WiFi.softAPIP().toString()
                                : WiFi.localIP().toString());

  display.drawFastHLine(8, 178, 224, ST77XX_BLUE);
  display.setTextSize(2);
  display.setTextColor(ST77XX_WHITE);
  display.setCursor(12, 192);
  display.printf("Volume: %u%%", currentVolumePercent);

  display.setTextSize(1);
  display.setTextColor(ST77XX_WHITE);
  display.setCursor(12, 222);
  if (accessPointMode) {
    display.printf("Clientes Wi-Fi: %u", wifiClients);
  } else {
    display.print(WiFi.status() == WL_CONNECTED ? "Wi-Fi conectado"
                                                : "Wi-Fi desconectado");
  }
}

void sendWebPage() {
  webServer.sendHeader("Cache-Control", "no-store");
  webServer.send_P(200, "text/html; charset=utf-8", WEB_PAGE);
}

void configureWebServer() {
  webServer.on("/", HTTP_GET, sendWebPage);

  webServer.on("/api/state", HTTP_GET, []() {
    String response;
    response.reserve(40);
    response = "{\"connected\":";
    response += bluetoothConnected() ? "true" : "false";
    response += ",\"volume\":";
    response += currentVolumePercent;
    response += "}";
    webServer.sendHeader("Cache-Control", "no-store");
    webServer.send(200, "application/json; charset=utf-8", response);
  });

  webServer.on("/api/volume", HTTP_POST, []() {
    if (!webServer.hasArg("value")) {
      webServer.send(400, "text/plain; charset=utf-8", "Volume ausente");
      return;
    }
    setVolumePercent(webServer.arg("value").toInt());
    webServer.send(204);
  });

  // Enderecos consultados por Android, iOS e Windows ao entrar no Wi-Fi.
  webServer.on("/generate_204", HTTP_ANY, sendWebPage);
  webServer.on("/gen_204", HTTP_ANY, sendWebPage);
  webServer.on("/hotspot-detect.html", HTTP_ANY, sendWebPage);
  webServer.on("/connecttest.txt", HTTP_ANY, sendWebPage);
  webServer.on("/ncsi.txt", HTTP_ANY, sendWebPage);
  webServer.onNotFound(sendWebPage);
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

void initializeDisplay() {
  pinMode(TFT_RST, OUTPUT);
  display.init(240, 240, SPI_MODE3);
  display.setRotation(0);
  display.fillScreen(ST77XX_BLACK);
  drawCentered("INICIANDO...", 108, ST77XX_CYAN, 2);
  displayDirty = true;
}

void startWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf("Conectando ao Wi-Fi %s", WIFI_SSID);

  const uint32_t startedAt = millis();
  while (WiFi.status() != WL_CONNECTED &&
         millis() - startedAt < WIFI_CONNECT_TIMEOUT_MS) {
    Serial.print('.');
    delay(250);
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    accessPointMode = false;
    configureWebServer();
    Serial.printf("Pagina: http://%s/\n", WiFi.localIP().toString().c_str());
    return;
  }

  Serial.println("Roteador indisponivel; iniciando Wi-Fi de emergencia");
  WiFi.disconnect(true);
  WiFi.mode(WIFI_AP);
  WiFi.setTxPower(WIFI_POWER_19_5dBm);
  accessPointMode = true;
  if (!WiFi.softAPConfig(AP_IP, AP_GATEWAY, AP_SUBNET) ||
      !WiFi.softAP(FALLBACK_WIFI_NAME, FALLBACK_WIFI_PASSWORD, 6, false, 2)) {
    Serial.println("ERRO: nao foi possivel criar o Wi-Fi de emergencia");
    return;
  }

  dnsServer.start(53, "*", AP_IP);
  configureWebServer();
  Serial.printf("Wi-Fi de emergencia: %s | senha: %s\n", FALLBACK_WIFI_NAME,
                FALLBACK_WIFI_PASSWORD);
  Serial.println("Pagina: http://192.168.4.1/");
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(300);

  const esp_reset_reason_t resetReason = esp_reset_reason();
  Serial.println();
  Serial.println("=== Receptor Bluetooth ===");
  Serial.printf("Ultimo reset: %s (%d)\n", resetReasonName(resetReason),
                static_cast<int>(resetReason));
  printHeap("inicio");

  displaySPI.begin(TFT_SCLK, -1, TFT_MOSI, -1);
  initializeDisplay();

  startWiFi();
  printHeap("Wi-Fi e display");

  bluetoothSink.set_default_bt_mode(ESP_BT_MODE_CLASSIC_BT);
  bluetoothSink.set_auto_reconnect(false);
  bluetoothSink.set_on_connection_state_changed(connectionStateChanged);
  bluetoothSink.set_i2s_config(internalDacConfig());
  bluetoothSink.start(DEVICE_NAME);
  setVolumePercent(INITIAL_VOLUME_PERCENT);

  // O DAC interno tambem tentaria usar GPIO26. Desabilitamos esse canal para
  // manter GPIO26 exclusivamente como reset do display; o audio sai no GPIO25.
  const esp_err_t dacResult = i2s_set_dac_mode(I2S_DAC_CHANNEL_RIGHT_EN);
  Serial.printf("DAC GPIO25: %s\n",
                dacResult == ESP_OK ? "iniciado" : esp_err_to_name(dacResult));

  // O driver do DAC altera os pinos 25/26; reinicializamos o display depois
  // de liberar GPIO26 para garantir um reset limpo do ST7789.
  initializeDisplay();
  updateDisplay();
  printHeap("pronto");
  Serial.println("Sistema pronto.");
}

void loop() {
  if (accessPointMode) {
    dnsServer.processNextRequest();
  }
  webServer.handleClient();
  updateDisplay();
  delay(2);
}
