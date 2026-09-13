#include <Arduino.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <SPI.h>
#include <WiFi.h>
#include <time.h>

// Crie include/secrets.h a partir de include/secrets.h.example.
#include "secrets.h"

namespace {

// Intervalos curtos e nao bloqueantes. Nenhum delay longo e utilizado.
constexpr uint32_t WIFI_CHECK_INTERVAL_MS = 1000;
constexpr uint32_t WIFI_RECONNECT_INTERVAL_MS = 10000;
constexpr uint32_t CLOCK_UPDATE_INTERVAL_MS = 250;

// Mesma ligacao usada no projeto esp32-st7789-test.
constexpr int8_t TFT_CS = -1;
constexpr int8_t TFT_RST = 26;
constexpr int8_t TFT_DC = 27;
constexpr int8_t TFT_SCLK = 14;
constexpr int8_t TFT_MOSI = 13;

constexpr char TIMEZONE[] = "BRT3";
constexpr char NTP_SERVER_1[] = "pool.ntp.org";
constexpr char NTP_SERVER_2[] = "time.nist.gov";

uint32_t lastWifiCheckMs = 0;
uint32_t lastReconnectAttemptMs = 0;
uint32_t lastClockUpdateMs = 0;
bool connectionWasAnnounced = false;
bool timeSynchronizationStarted = false;
int lastDisplayedSecond = -1;

SPIClass displaySPI(HSPI);
Adafruit_ST7789 display(&displaySPI, TFT_CS, TFT_DC, TFT_RST);

void printCentered(const char *text, int16_t y, uint8_t size, uint16_t color) {
  int16_t x1 = 0;
  int16_t y1 = 0;
  uint16_t width = 0;
  uint16_t height = 0;

  display.setTextSize(size);
  display.setTextColor(color);
  display.getTextBounds(text, 0, y, &x1, &y1, &width, &height);
  display.setCursor((240 - width) / 2, y);
  display.print(text);
}

void drawDisplayFrame() {
  display.fillScreen(ST77XX_BLACK);
  display.drawFastHLine(0, 37, 240, ST77XX_BLUE);
  display.drawFastHLine(0, 190, 240, ST77XX_BLUE);
  printCentered("TTLOCK MONITOR", 10, 2, ST77XX_CYAN);
  printCentered("Sincronizando...", 105, 2, ST77XX_YELLOW);
}

void initializeDisplay() {
  displaySPI.begin(TFT_SCLK, -1, TFT_MOSI, -1);
  display.init(240, 240, SPI_MODE3);
  display.setRotation(0);
  display.setTextWrap(false);
  drawDisplayFrame();
}

void startTimeSynchronization() {
  if (timeSynchronizationStarted) {
    return;
  }

  configTzTime(TIMEZONE, NTP_SERVER_1, NTP_SERVER_2);
  timeSynchronizationStarted = true;
  Serial.println("Sincronizando relogio pela internet...");
}

void drawClock() {
  const time_t now = time(nullptr);
  if (now < 1700000000) {
    return;
  }

  tm localTime{};
  localtime_r(&now, &localTime);
  if (localTime.tm_sec == lastDisplayedSecond) {
    return;
  }
  lastDisplayedSecond = localTime.tm_sec;

  char hourMinute[6];
  char seconds[3];
  char date[11];
  strftime(hourMinute, sizeof(hourMinute), "%H:%M", &localTime);
  strftime(seconds, sizeof(seconds), "%S", &localTime);
  strftime(date, sizeof(date), "%d/%m/%Y", &localTime);

  display.fillRect(0, 45, 240, 140, ST77XX_BLACK);
  printCentered(hourMinute, 62, 7, ST77XX_WHITE);
  printCentered(seconds, 133, 4, ST77XX_GREEN);

  display.fillRect(0, 199, 240, 41, ST77XX_BLACK);
  printCentered(date, 202, 2, ST77XX_YELLOW);
  printCentered(
    WiFi.status() == WL_CONNECTED ? "Wi-Fi conectado" : "Wi-Fi desconectado",
    222,
    1,
    WiFi.status() == WL_CONNECTED ? ST77XX_GREEN : ST77XX_RED
  );
}

void maintainClock() {
  const uint32_t now = millis();
  if (now - lastClockUpdateMs < CLOCK_UPDATE_INTERVAL_MS) {
    return;
  }
  lastClockUpdateMs = now;
  drawClock();
}

void printNetworkInformation() {
  Serial.println("Wi-Fi conectado.");
  Serial.print("SSID: ");
  Serial.println(WiFi.SSID());
  Serial.print("Endereco IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("Intensidade do sinal: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
}

void startWifiConnection() {
  Serial.print("Conectando ao Wi-Fi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.persistent(false);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  lastReconnectAttemptMs = millis();
}

void maintainWifiConnection() {
  const uint32_t now = millis();
  if (now - lastWifiCheckMs < WIFI_CHECK_INTERVAL_MS) {
    return;
  }
  lastWifiCheckMs = now;

  if (WiFi.status() == WL_CONNECTED) {
    if (!connectionWasAnnounced) {
      connectionWasAnnounced = true;
      printNetworkInformation();
      startTimeSynchronization();
    }
    return;
  }

  if (connectionWasAnnounced) {
    connectionWasAnnounced = false;
    Serial.println("Conexao Wi-Fi perdida.");
  }

  if (now - lastReconnectAttemptMs >= WIFI_RECONNECT_INTERVAL_MS) {
    lastReconnectAttemptMs = now;
    Serial.println("Tentando reconectar ao Wi-Fi...");
    WiFi.reconnect();
  }
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(200);

  initializeDisplay();

  Serial.println();
  Serial.println("Monitor TTLock - RELOGIO");
  startWifiConnection();
}

void loop() {
  maintainWifiConnection();
  maintainClock();
  yield();
}
