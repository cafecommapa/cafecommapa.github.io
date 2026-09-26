#include <Arduino.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <AudioFileSourceBuffer.h>
#include <AudioFileSourceICYStream.h>
#include <AudioGeneratorMP3.h>
#include <AudioOutputI2S.h>
#include <SPI.h>
#include <WiFi.h>
#include <WebServer.h>
#include <driver/i2s.h>

#include "radio_config.h"
#include "secrets.h"
#include "web_page.h"

namespace {

// ST7789 (ligacao original do projeto).
constexpr int8_t TFT_CS = -1;
constexpr int8_t TFT_RST = 26;
constexpr int8_t TFT_DC = 27;
constexpr int8_t TFT_SCLK = 14;
constexpr int8_t TFT_MOSI = 13;

constexpr uint8_t AUDIO_OUTPUT_PIN = 25;

// Coloque false para desativar o teste e voltar a radio web normalmente.
const bool TEST_TONE = false;

// Ajuste aqui a frequencia do tom de teste, em hertz.
constexpr uint16_t TEST_TONE_FREQUENCY_HZ = 1000;

// Ajuste aqui a amplitude: 0 = silencio, 127 = amplitude maxima do DAC.
// Comece com 60 para reduzir o risco de clipping no pre-amplificador.
int amplitude = 60;

constexpr uint8_t DAC_MIDPOINT = 128;
constexpr size_t TEST_TONE_SAMPLES_PER_CYCLE = 32;
constexpr uint32_t TEST_TONE_SAMPLE_RATE =
    TEST_TONE_FREQUENCY_HZ * TEST_TONE_SAMPLES_PER_CYCLE;
constexpr uint32_t TEST_TONE_BASE_INTERVAL_US =
    1000000UL / TEST_TONE_SAMPLE_RATE;
constexpr uint32_t TEST_TONE_INTERVAL_REMAINDER =
    1000000UL % TEST_TONE_SAMPLE_RATE;

// Uma volta completa de seno, normalizada para -127..127.
constexpr int8_t SINE_WAVE[TEST_TONE_SAMPLES_PER_CYCLE] = {
    0,    25,   49,   71,   90,   106,  117,  125,
    127,  125,  117,  106,  90,   71,   49,   25,
    0,    -25,  -49,  -71,  -90,  -106, -117, -125,
    -127, -125, -117, -106, -90,  -71,  -49,  -25};

constexpr uint32_t WIFI_RETRY_INTERVAL_MS = 10000;
constexpr uint32_t STREAM_RETRY_INTERVAL_MS = 5000;
constexpr size_t STREAM_BUFFER_SIZE = 32 * 1024;
constexpr uint8_t VOLUME_STEPS = 20;
constexpr float INITIAL_GAIN = 0.90F;  // Nivel 18 de 20.

SPIClass displaySPI(HSPI);
Adafruit_ST7789 display(&displaySPI, TFT_CS, TFT_DC, TFT_RST);
WebServer webServer(80);

AudioFileSourceICYStream *stream = nullptr;
AudioFileSourceBuffer *streamBuffer = nullptr;
AudioGeneratorMP3 *decoder = nullptr;
AudioOutputI2S *audioOutput = nullptr;

uint32_t lastWifiAttemptMs = 0;
uint32_t lastStreamAttemptMs = 0;
float audioGain = INITIAL_GAIN;
String currentTitle;
String statusText = "Iniciando...";
bool displayNeedsUpdate = true;
bool webServerStarted = false;
size_t currentStationIndex = INITIAL_STATION_INDEX;
uint8_t testToneSamples[TEST_TONE_SAMPLES_PER_CYCLE];
size_t testToneSampleIndex = 0;
uint32_t nextTestToneSampleUs = 0;
uint32_t testToneIntervalAccumulator = 0;

void setStatus(const String &status) {
  if (statusText != status) {
    statusText = status;
    displayNeedsUpdate = true;
  }
  Serial.println(status);
}

uint8_t getVolumeLevel() {
  return static_cast<uint8_t>(audioGain * VOLUME_STEPS + 0.5F);
}

void printWrapped(const String &text, int16_t x, int16_t y, int16_t width,
                  uint16_t color) {
  display.setTextColor(color);
  display.setTextSize(1);
  display.setCursor(x, y);

  const uint8_t charactersPerLine = width / 6;
  uint8_t column = 0;
  for (size_t index = 0; index < text.length(); ++index) {
    const char character = text[index];
    if (character == '\n' || column >= charactersPerLine) {
      y += 10;
      display.setCursor(x, y);
      column = 0;
      if (character == '\n') {
        continue;
      }
    }
    display.print(character);
    ++column;
  }
}

void updateDisplay() {
  if (!displayNeedsUpdate) {
    return;
  }
  displayNeedsUpdate = false;

  display.fillScreen(ST77XX_BLACK);
  display.setTextWrap(false);
  display.setTextSize(2);
  display.setTextColor(ST77XX_CYAN);
  display.setCursor(8, 8);
  display.print("RADIO WEB ESP32");
  display.drawFastHLine(0, 31, 240, ST77XX_BLUE);

  display.setTextSize(1);
  display.setTextColor(ST77XX_WHITE);
  display.setCursor(8, 43);
  display.print(RADIO_STATIONS[currentStationIndex].name);

  display.setTextColor(ST77XX_GREEN);
  display.setCursor(8, 55);
  display.print(statusText);

  printWrapped(currentTitle.length() ? currentTitle : "Aguardando metadados...",
               8, 72, 224, ST77XX_YELLOW);

  display.drawFastHLine(0, 179, 240, ST77XX_BLUE);
  display.setTextColor(ST77XX_WHITE);
  display.setTextSize(1);
  display.setCursor(8, 187);
  display.print("Controle no celular:");
  display.setTextColor(ST77XX_CYAN);
  display.setTextSize(2);
  display.setCursor(8, 200);
  display.print(WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString()
                                              : "Sem Wi-Fi");
  display.setTextSize(1);
  display.setTextColor(ST77XX_WHITE);
  display.setCursor(8, 224);
  display.printf("GPIO%u  Volume: %u/%u", AUDIO_OUTPUT_PIN, getVolumeLevel(),
                 VOLUME_STEPS);
}

void initializeDisplay() {
  display.init(240, 240, SPI_MODE3);
  display.setRotation(0);
  displayNeedsUpdate = true;
}

void initializeTestTone() {
  const int safeAmplitude = constrain(amplitude, 0, 127);
  for (size_t index = 0; index < TEST_TONE_SAMPLES_PER_CYCLE; ++index) {
    const int dacValue =
        DAC_MIDPOINT + (safeAmplitude * SINE_WAVE[index]) / 127;
    testToneSamples[index] = constrain(dacValue, 0, 255);
  }

  testToneSampleIndex = 0;
  testToneIntervalAccumulator = 0;
  nextTestToneSampleUs = micros();
  dacWrite(AUDIO_OUTPUT_PIN, DAC_MIDPOINT);

  display.fillScreen(ST77XX_BLACK);
  display.setTextWrap(false);
  display.setTextColor(ST77XX_CYAN);
  display.setTextSize(2);
  display.setCursor(20, 20);
  display.print("TESTE DO DAC");
  display.drawFastHLine(0, 48, 240, ST77XX_BLUE);
  display.setTextColor(ST77XX_YELLOW);
  display.setCursor(18, 78);
  display.printf("%u Hz", TEST_TONE_FREQUENCY_HZ);
  display.setTextColor(ST77XX_WHITE);
  display.setTextSize(1);
  display.setCursor(18, 120);
  display.printf("Saida: GPIO %u / DAC1", AUDIO_OUTPUT_PIN);
  display.setCursor(18, 140);
  display.printf("Centro: %u  Amplitude: %d", DAC_MIDPOINT, safeAmplitude);
  display.setTextColor(ST77XX_GREEN);
  display.setCursor(18, 180);
  display.print("Senoide continua ativa");

  Serial.printf("Teste DAC ativo: %u Hz, amplitude %d, GPIO%u\n",
                TEST_TONE_FREQUENCY_HZ, safeAmplitude, AUDIO_OUTPUT_PIN);
}

// Mantem a senoide continua no mesmo GPIO25 usado pela radio. Esta funcao deve
// ser chamada repetidamente e, por isso, o loop retorna imediatamente no modo
// de teste sem iniciar Wi-Fi, stream MP3 ou I2S.
void generateTestTone() {
  const uint32_t now = micros();
  if (static_cast<int32_t>(now - nextTestToneSampleUs) < 0) {
    return;
  }

  dacWrite(AUDIO_OUTPUT_PIN, testToneSamples[testToneSampleIndex]);
  testToneSampleIndex =
      (testToneSampleIndex + 1) % TEST_TONE_SAMPLES_PER_CYCLE;

  // Compensa a fracao de microssegundo para manter 1 kHz em media.
  nextTestToneSampleUs += TEST_TONE_BASE_INTERVAL_US;
  testToneIntervalAccumulator += TEST_TONE_INTERVAL_REMAINDER;
  if (testToneIntervalAccumulator >= TEST_TONE_SAMPLE_RATE) {
    ++nextTestToneSampleUs;
    testToneIntervalAccumulator -= TEST_TONE_SAMPLE_RATE;
  }
}

void metadataCallback(void *, const char *type, bool, const char *value) {
  Serial.printf("METADATA(%s): %s\n", type, value);
  if (!strcmp(type, "StreamTitle") && value && value[0]) {
    currentTitle = value;
    displayNeedsUpdate = true;
  }
}

void stopStream() {
  if (decoder) {
    if (decoder->isRunning()) {
      decoder->stop();
    }
    delete decoder;
    decoder = nullptr;
  }
  if (streamBuffer) {
    streamBuffer->close();
    delete streamBuffer;
    streamBuffer = nullptr;
  }
  if (stream) {
    stream->close();
    delete stream;
    stream = nullptr;
  }
}

String escapeJson(const String &value) {
  String escaped;
  escaped.reserve(value.length() + 8);
  for (size_t index = 0; index < value.length(); ++index) {
    const char character = value[index];
    if (character == '"' || character == '\\') {
      escaped += '\\';
      escaped += character;
    } else if (character == '\n' || character == '\r') {
      escaped += ' ';
    } else {
      escaped += character;
    }
  }
  return escaped;
}

void sendWebState() {
  String response;
  response.reserve(256);
  response = "{\"station\":";
  response += currentStationIndex;
  response += ",\"stationName\":\"";
  response += escapeJson(RADIO_STATIONS[currentStationIndex].name);
  response += "\",\"title\":\"";
  response += escapeJson(currentTitle);
  response += "\",\"volume\":";
  response += getVolumeLevel();
  response += ",\"status\":\"";
  response += escapeJson(statusText);
  response += "\"}";

  webServer.sendHeader("Cache-Control", "no-store");
  webServer.send(200, "application/json; charset=utf-8", response);
}

void selectStation(size_t stationIndex) {
  if (stationIndex >= RADIO_STATION_COUNT || stationIndex == currentStationIndex) {
    return;
  }

  currentStationIndex = stationIndex;
  currentTitle = "";
  setStatus("Mudando de estacao...");
  stopStream();
  lastStreamAttemptMs = millis() - STREAM_RETRY_INTERVAL_MS;
  displayNeedsUpdate = true;
}

void configureWebServer() {
  webServer.on("/", HTTP_GET, []() {
    webServer.sendHeader("Cache-Control", "no-store");
    webServer.send_P(200, "text/html; charset=utf-8", WEB_PAGE);
  });

  webServer.on("/api/state", HTTP_GET, sendWebState);

  webServer.on("/api/volume", HTTP_POST, []() {
    if (!webServer.hasArg("value")) {
      webServer.send(400, "text/plain", "Volume ausente");
      return;
    }

    const int requestedLevel =
        constrain(webServer.arg("value").toInt(), 0, VOLUME_STEPS);
    audioGain = requestedLevel / static_cast<float>(VOLUME_STEPS);
    if (audioOutput) {
      audioOutput->SetGain(audioGain);
    }
    displayNeedsUpdate = true;
    sendWebState();
  });

  webServer.on("/api/station", HTTP_POST, []() {
    if (!webServer.hasArg("id")) {
      webServer.send(400, "text/plain", "Estacao ausente");
      return;
    }

    const int stationIndex = webServer.arg("id").toInt();
    if (stationIndex < 0 || stationIndex >= static_cast<int>(RADIO_STATION_COUNT)) {
      webServer.send(400, "text/plain", "Estacao invalida");
      return;
    }

    selectStation(stationIndex);
    sendWebState();
  });

  webServer.onNotFound([]() {
    webServer.send(404, "text/plain", "Nao encontrado");
  });
}

void startWebServer() {
  if (webServerStarted) {
    return;
  }
  webServer.begin();
  webServerStarted = true;
  displayNeedsUpdate = true;
  Serial.printf("Controle web: http://%s/\n", WiFi.localIP().toString().c_str());
}

bool startStream() {
  stopStream();
  lastStreamAttemptMs = millis();
  setStatus("Conectando a radio...");

  stream = new AudioFileSourceICYStream(
      RADIO_STATIONS[currentStationIndex].streamUrl);
  streamBuffer = new AudioFileSourceBuffer(stream, STREAM_BUFFER_SIZE);
  decoder = new AudioGeneratorMP3();

  if (!stream || !streamBuffer || !decoder) {
    setStatus("Memoria insuficiente");
    stopStream();
    return false;
  }

  stream->RegisterMetadataCB(metadataCallback, nullptr);

  if (!decoder->begin(streamBuffer, audioOutput)) {
    setStatus("Falha ao abrir stream");
    stopStream();
    return false;
  }

  // A biblioteca habilita os dois DACs por padrao. Mantemos somente DAC1 no
  // GPIO25 para que o GPIO26 continue sendo o reset da tela.
  i2s_set_dac_mode(I2S_DAC_CHANNEL_RIGHT_EN);
  pinMode(TFT_RST, OUTPUT);
  initializeDisplay();

  setStatus("Reproduzindo");
  return true;
}

void connectWifi() {
  lastWifiAttemptMs = millis();
  setStatus("Conectando ao Wi-Fi...");
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void maintainWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    startWebServer();
    return;
  }

  stopStream();
  if (millis() - lastWifiAttemptMs >= WIFI_RETRY_INTERVAL_MS) {
    WiFi.disconnect();
    connectWifi();
  }
}

void handleSerialCommands() {
  if (!Serial.available()) {
    return;
  }

  const char command = Serial.read();
  if (command == '+' && audioGain < 1.0F) {
    audioGain += 0.05F;
    audioGain = min(audioGain, 1.0F);
    audioOutput->SetGain(audioGain);
    displayNeedsUpdate = true;
  } else if (command == '-' && audioGain > 0.0F) {
    audioGain -= 0.05F;
    audioGain = max(audioGain, 0.0F);
    audioOutput->SetGain(audioGain);
    displayNeedsUpdate = true;
  } else if (command == 'r' || command == 'R') {
    stopStream();
    lastStreamAttemptMs = 0;
  }
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(200);

  displaySPI.begin(TFT_SCLK, -1, TFT_MOSI, -1);
  initializeDisplay();

  if (TEST_TONE) {
    initializeTestTone();
    return;
  }

  configureWebServer();

  // O driver inicia o DAC interno; startStream() limita a saida ao GPIO25.
  audioOutput = new AudioOutputI2S(0, AudioOutputI2S::INTERNAL_DAC);
  audioOutput->SetOutputModeMono(true);
  audioOutput->SetGain(audioGain);

  Serial.println("Radio web ESP32");
  Serial.println("Audio analogico no GPIO25. Nao conecte alto-falante diretamente.");
  Serial.println("Comandos: + aumenta, - diminui, R reconecta a radio.");
  connectWifi();
  updateDisplay();
}

void loop() {
  if (TEST_TONE) {
    generateTestTone();
    return;
  }

  maintainWifi();

  if (WiFi.status() == WL_CONNECTED) {
    if (decoder && decoder->isRunning()) {
      if (!decoder->loop()) {
        setStatus("Stream interrompido");
        stopStream();
      }
    } else if (millis() - lastStreamAttemptMs >= STREAM_RETRY_INTERVAL_MS) {
      startStream();
    }
  }

  handleSerialCommands();
  if (webServerStarted) {
    webServer.handleClient();
  }
  updateDisplay();
  if (!decoder || !decoder->isRunning()) {
    delay(1);
  }
}
