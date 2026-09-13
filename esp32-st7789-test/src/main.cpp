#include <Arduino.h>
#include <SPI.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <driver/dac.h>
#include <driver/adc.h>
#include <driver/i2s.h>
#include <esp_adc_cal.h>
#include <soc/soc.h>
#include <soc/rtc_io_reg.h>

constexpr int8_t TFT_CS = -1;
constexpr int8_t TFT_RST = 26;
constexpr int8_t TFT_DC = 27;
constexpr int8_t TFT_SCLK = 14;
constexpr int8_t TFT_MOSI = 13;
constexpr uint8_t OSCILLOSCOPE_INPUT_PIN = 34;
constexpr uint8_t FREQUENCY_CONTROL_PIN = 36;
constexpr uint32_t MINIMUM_FREQUENCY_HZ = 130;
constexpr uint32_t MAXIMUM_FREQUENCY_HZ = 10000;
constexpr uint32_t POTENTIOMETER_READ_INTERVAL_MS = 200;
constexpr uint16_t SAMPLE_COUNT = 240;
constexpr uint32_t ADC_SAMPLE_RATE_HZ = 40000;
// O I2S entrega uma conversao do ADC em cada slot do quadro estereo.
constexpr uint32_t EFFECTIVE_ADC_SAMPLE_RATE_HZ = ADC_SAMPLE_RATE_HZ * 2;
constexpr uint16_t DMA_BUFFER_SAMPLES = 512;
// 450 ms cobrem mais de tres periodos de um sinal de 7 Hz.
constexpr uint16_t CAPTURE_BUFFER_SAMPLES = 36000;
constexpr float MINIMUM_VALID_SIGNAL_VPP = 0.10f;
constexpr float MINIMUM_MEASURED_FREQUENCY_HZ = 3.0f;
constexpr float MAXIMUM_MEASURED_FREQUENCY_HZ = 12000.0f;
constexpr int16_t PLOT_LEFT = 32;
constexpr int16_t PLOT_RIGHT = 237;
constexpr int16_t PLOT_TOP = 54;
constexpr int16_t PLOT_BOTTOM = 184;
constexpr uint8_t HORIZONTAL_DIVISIONS = 5;
constexpr uint8_t VERTICAL_DIVISIONS = 4;
constexpr uint16_t DISPLAY_MAX_VOLTAGE_MV = 3300;
constexpr char WIFI_NAME[] = "OSC-ESP32";
constexpr char WIFI_PASSWORD[] = "osc12345";
constexpr uint32_t WAVEFORM_TIMER_CLOCK_HZ = 10000000;
constexpr uint8_t MAX_WAVEFORM_STEPS = 128;
constexpr uint8_t DAC_MINIMUM_VALUE = 128;
constexpr uint8_t DAC_MAXIMUM_VALUE = 192;

enum class WaveformType : uint8_t {
  Sine,
  Square,
  Triangle,
  Sawtooth
};

const char WEB_PAGE[] PROGMEM = R"rawliteral(
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Osciloscopio ESP32</title>
<style>
  :root { color-scheme: dark; font-family: Arial, sans-serif; }
  body { margin: 0; background: #101318; color: #f4f4f4; }
  main { max-width: 760px; margin: auto; padding: 14px; }
  h1 { font-size: 1.35rem; margin: 4px 0 12px; }
  canvas { width: 100%; height: auto; background: #000; border: 1px solid #ddd; border-radius: 8px; }
  .readings, .controls { display: grid; gap: 10px; margin-top: 12px; }
  .readings { grid-template-columns: repeat(2, 1fr); }
  .card { background: #1b2028; padding: 12px; border-radius: 8px; }
  .value { display: block; color: #62e8ff; font-size: 1.25rem; font-weight: bold; }
  label { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  input[type=range] { flex: 1; }
  input[type=color] { width: 54px; height: 36px; border: 0; background: transparent; }
  button { width: 100%; padding: 12px; border: 0; border-radius: 8px; font-size: 1rem; font-weight: bold; background: #25bcd6; color: #071014; }
  small { color: #aeb7c4; }
</style>
</head>
<body><main>
  <h1>Osciloscopio ESP32</h1>
  <canvas id="scope" width="720" height="420"></canvas>
  <div class="readings">
    <div class="card">Saida <span class="value" id="out">--</span></div>
    <div class="card">Medida <span class="value" id="measured">--</span></div>
    <div class="card">Vpp <span class="value" id="vpp">--</span></div>
    <div class="card">RMS AC <span class="value" id="rms">--</span></div>
  </div>
  <div class="controls card">
    <label>Forma de onda
      <select id="shape">
        <option value="sine">Senoidal</option>
        <option value="square">Quadrada</option>
        <option value="triangle">Triangular</option>
        <option value="sawtooth">Dente de serra</option>
      </select>
    </label>
    <label>Ciclos <input id="cycles" type="range" min="1" max="10" value="10"><strong id="cycleValue">10</strong></label>
    <label>Cor da onda <input id="wave" type="color" value="#00ffff"></label>
    <label>Cor da grade <input id="grid" type="color" value="#202020"></label>
    <label>Fundo do grafico <input id="background" type="color" value="#000000"></label>
    <button id="run">Pausar visualizacao</button>
    <small>As configuracoes de ciclos e cores tambem alteram o display fisico.</small>
  </div>
</main>
<script>
const canvas = document.getElementById('scope');
const ctx = canvas.getContext('2d');
const cycles = document.getElementById('cycles');
let running = true;
let colors = { wave:'#00ffff', grid:'#202020', background:'#000000' };

function frequencyText(value) {
  return value >= 1000 ? (value / 1000).toFixed(3) + ' kHz' : value.toFixed(1) + ' Hz';
}

function draw(data) {
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 2;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath(); ctx.moveTo(i*w/6, 0); ctx.lineTo(i*w/6, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i*h/6); ctx.lineTo(w, i*h/6); ctx.stroke();
  }
  const values = data.samples;
  let low = Math.min(...values), high = Math.max(...values);
  let range = Math.max(40, high-low), margin = Math.max(20, range*0.1);
  low -= margin; high += margin;
  ctx.strokeStyle = colors.wave;
  ctx.lineWidth = 4;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = i * w / (values.length-1);
    const y = h - (v-low) * h / (high-low);
    i ? ctx.lineTo(x,y) : ctx.moveTo(x,y);
  });
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 25px Arial';
  ctx.fillText('CICLOS: ' + data.displayedCycles, w-165, 34);
}

async function updateData() {
  if (running) {
    try {
      const response = await fetch('/data', {cache:'no-store'});
      const data = await response.json();
      draw(data);
      document.getElementById('out').textContent = frequencyText(data.out);
      document.getElementById('measured').textContent = frequencyText(data.measured);
      document.getElementById('vpp').textContent = data.vpp.toFixed(2) + ' V';
      document.getElementById('rms').textContent = data.rms.toFixed(2) + ' V';
      cycles.value = data.cycles;
      document.getElementById('cycleValue').textContent = data.cycles;
      document.getElementById('shape').value = data.shape;
    } catch (_) {}
  }
  setTimeout(updateData, 220);
}

function sendSettings() {
  const query = new URLSearchParams({
    cycles: cycles.value,
    shape: document.getElementById('shape').value,
    wave: colors.wave,
    grid: colors.grid,
    background: colors.background
  });
  fetch('/settings?' + query.toString()).catch(() => {});
}

cycles.addEventListener('input', () => document.getElementById('cycleValue').textContent = cycles.value);
cycles.addEventListener('change', sendSettings);
document.getElementById('shape').addEventListener('change', sendSettings);
['wave','grid','background'].forEach(id => {
  document.getElementById(id).addEventListener('change', event => {
    colors[id] = event.target.value;
    sendSettings();
  });
});
document.getElementById('run').addEventListener('click', event => {
  running = !running;
  event.target.textContent = running ? 'Pausar visualizacao' : 'Continuar visualizacao';
});
updateData();
</script></body></html>
)rawliteral";

uint16_t samples[SAMPLE_COUNT];
uint16_t filteredSamples[SAMPLE_COUNT];
uint16_t dmaBuffer[DMA_BUFFER_SAMPLES];
uint16_t captureBuffer[CAPTURE_BUFFER_SAMPLES];
uint16_t displayedSpanSamples = SAMPLE_COUNT;
uint32_t outputFrequencyHz = 1000;
uint32_t lastPotentiometerReadMs = 0;
uint16_t smoothedPotentiometer = 0;
bool potentiometerInitialized = false;
float measuredFrequencyHz = 0.0f;
bool measuredFrequencyInitialized = false;
uint32_t lastHeaderUpdateMs = 0;
float signalVpp = 0.0f;
float signalVdc = 0.0f;
float signalVrmsAc = 0.0f;
esp_adc_cal_characteristics_t adcCalibration;
uint8_t cyclesOnScreen = 10;
uint8_t displayedCyclesOnScreen = 10;
uint16_t graphWaveColor = ST77XX_CYAN;
uint16_t graphGridColor = 0x2104;
uint16_t graphBackgroundColor = ST77XX_BLACK;
WaveformType waveformType = WaveformType::Sine;
hw_timer_t *waveformTimer = nullptr;
volatile uint8_t waveformTable[MAX_WAVEFORM_STEPS];
volatile uint8_t waveformStepCount = 32;
volatile uint8_t waveformStepIndex = 0;

SPIClass displaySPI(HSPI);
Adafruit_ST7789 display(&displaySPI, TFT_CS, TFT_DC, TFT_RST);
WebServer webServer(80);

void IRAM_ATTR onWaveformTimer() {
  const uint8_t value = waveformTable[waveformStepIndex];
  REG_SET_FIELD(RTC_IO_PAD_DAC1_REG, RTC_IO_PDAC1_DAC, value);
  waveformStepIndex++;
  if (waveformStepIndex >= waveformStepCount) {
    waveformStepIndex = 0;
  }
}

uint8_t waveformStepsForFrequency(uint32_t frequencyHz) {
  if (frequencyHz <= 1250) {
    return 128;
  }
  if (frequencyHz <= 2500) {
    return 64;
  }
  if (frequencyHz <= 5000) {
    return 32;
  }
  return 16;
}

void configureSoftwareWaveform(uint32_t frequencyHz) {
  timerAlarmDisable(waveformTimer);

  const uint8_t steps = waveformStepsForFrequency(frequencyHz);
  const uint8_t amplitude = DAC_MAXIMUM_VALUE - DAC_MINIMUM_VALUE;
  const uint8_t halfSteps = steps / 2;

  for (uint8_t index = 0; index < steps; index++) {
    uint8_t value = DAC_MINIMUM_VALUE;
    if (waveformType == WaveformType::Square) {
      value = index < halfSteps ? DAC_MAXIMUM_VALUE : DAC_MINIMUM_VALUE;
    } else if (waveformType == WaveformType::Triangle) {
      if (index < halfSteps) {
        value = DAC_MINIMUM_VALUE +
          static_cast<uint16_t>(amplitude) * index / (halfSteps - 1);
      } else {
        value = DAC_MAXIMUM_VALUE -
          static_cast<uint16_t>(amplitude) * (index - halfSteps) /
          (halfSteps - 1);
      }
    } else if (waveformType == WaveformType::Sawtooth) {
      value = DAC_MINIMUM_VALUE +
        static_cast<uint16_t>(amplitude) * index / (steps - 1);
    }
    waveformTable[index] = value;
  }

  waveformStepCount = steps;
  waveformStepIndex = 0;
  dac_cw_generator_disable();
  dac_output_enable(DAC_CHANNEL_1);
  dac_output_voltage(DAC_CHANNEL_1, waveformTable[0]);

  const uint32_t updatesPerSecond = frequencyHz * steps;
  uint32_t timerTicks =
    (WAVEFORM_TIMER_CLOCK_HZ + updatesPerSecond / 2) / updatesPerSecond;
  if (timerTicks < 2) {
    timerTicks = 2;
  }
  timerWrite(waveformTimer, 0);
  timerAlarmWrite(waveformTimer, timerTicks, true);
  timerAlarmEnable(waveformTimer);
}

bool configureInternalDacOscillator(uint32_t frequencyHz) {
  dac_cw_config_t configuration = {};
  configuration.en_ch = DAC_CHANNEL_1;
  configuration.scale = DAC_CW_SCALE_4;
  configuration.phase = DAC_CW_PHASE_0;
  configuration.freq = frequencyHz;
  // Com escala 1/4, o cosseno tem amplitude aproximada de +/-32 passos.
  // O offset de 32 centraliza a onda sem saturar a entrada do ADC.
  configuration.offset = 32;

  if (dac_cw_generator_config(&configuration) != ESP_OK) {
    return false;
  }

  return dac_cw_generator_enable() == ESP_OK;
}

void configureSelectedWaveform(uint32_t frequencyHz) {
  if (waveformType == WaveformType::Sine) {
    timerAlarmDisable(waveformTimer);
    configureInternalDacOscillator(frequencyHz);
  } else {
    configureSoftwareWaveform(frequencyHz);
  }
}

bool startInternalDacOscillator() {
  if (dac_output_enable(DAC_CHANNEL_1) != ESP_OK) {
    return false;
  }

  return configureInternalDacOscillator(outputFrequencyHz);
}

bool startContinuousAdc() {
  i2s_config_t i2sConfiguration = {};
  i2sConfiguration.mode = static_cast<i2s_mode_t>(
    I2S_MODE_MASTER | I2S_MODE_RX | I2S_MODE_ADC_BUILT_IN
  );
  i2sConfiguration.sample_rate = ADC_SAMPLE_RATE_HZ;
  i2sConfiguration.bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT;
  i2sConfiguration.channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT;
  i2sConfiguration.communication_format = I2S_COMM_FORMAT_STAND_I2S;
  i2sConfiguration.intr_alloc_flags = ESP_INTR_FLAG_LEVEL1;
  i2sConfiguration.dma_buf_count = 4;
  i2sConfiguration.dma_buf_len = DMA_BUFFER_SAMPLES;
  i2sConfiguration.use_apll = false;
  i2sConfiguration.tx_desc_auto_clear = false;
  i2sConfiguration.fixed_mclk = 0;

  if (i2s_driver_install(I2S_NUM_0, &i2sConfiguration, 0, nullptr) != ESP_OK) {
    return false;
  }

  if (i2s_set_adc_mode(ADC_UNIT_1, ADC1_CHANNEL_6) != ESP_OK) {
    return false;
  }

  if (adc1_config_width(ADC_WIDTH_BIT_12) != ESP_OK) {
    return false;
  }

  if (adc1_config_channel_atten(ADC1_CHANNEL_6, ADC_ATTEN_DB_12) != ESP_OK) {
    return false;
  }

  return i2s_adc_enable(I2S_NUM_0) == ESP_OK;
}

void drawOscilloscopeFrame(bool oscillatorReady) {
  display.init(240, 240, SPI_MODE3);
  display.setRotation(0);
  display.fillScreen(ST77XX_BLACK);

  display.setTextWrap(false);
  display.drawRect(0, 31, 240, 174, ST77XX_WHITE);
}

void drawFrequencyHeader(bool oscillatorReady = true) {
  display.fillRect(0, 0, 240, 30, ST77XX_BLACK);
  display.setTextSize(2);
  display.setCursor(3, 7);
  display.setTextColor(oscillatorReady ? ST77XX_GREEN : ST77XX_RED);
  display.print("OUT ");

  if (outputFrequencyHz >= 1000) {
    display.print(
      outputFrequencyHz / 1000.0f,
      outputFrequencyHz >= 9950 ? 1 : 2
    );
    display.print("k ");
  } else {
    display.print(outputFrequencyHz);
    display.print(" ");
  }

  display.setTextColor(ST77XX_YELLOW);
  display.print("MED ");
  if (!measuredFrequencyInitialized) {
    display.print("---");
  } else if (measuredFrequencyHz >= 1000.0f) {
    display.print(
      measuredFrequencyHz / 1000.0f,
      measuredFrequencyHz >= 9950.0f ? 1 : 2
    );
    display.print("k");
  } else {
    display.print(measuredFrequencyHz, 0);
  }
}

void measureInputFrequency(
  const uint16_t *buffer,
  uint16_t receivedSamples,
  uint16_t minimum,
  uint16_t maximum
) {
  const uint16_t range = maximum - minimum;
  if (range < 40) {
    measuredFrequencyHz = 0.0f;
    measuredFrequencyInitialized = false;
    return;
  }

  const uint16_t center = (minimum + maximum) / 2;
  uint16_t hysteresis = range / 20;
  if (hysteresis < 10) {
    hysteresis = 10;
  }
  const uint16_t lowLevel = center > hysteresis ? center - hysteresis : 0;
  const uint32_t expandedHighLevel = static_cast<uint32_t>(center) + hysteresis;
  const uint16_t highLevel = expandedHighLevel < 4095
    ? expandedHighLevel
    : 4095;

  bool armed = false;
  uint16_t firstCrossing = 0;
  uint16_t lastCrossing = 0;
  uint16_t crossingCount = 0;

  for (uint16_t index = 0; index < receivedSamples; index++) {
    const uint16_t value = buffer[index];
    if (value <= lowLevel) {
      armed = true;
    }
    if (armed && value >= highLevel) {
      if (crossingCount == 0) {
        firstCrossing = index;
      }
      lastCrossing = index;
      crossingCount++;
      armed = false;
    }
  }

  if (crossingCount < 2 || lastCrossing <= firstCrossing) {
    // Uma janela de sinal lento pode conter apenas uma borda de subida.
    // Conserva a ultima medida ate uma proxima janela completar um periodo.
    return;
  }

  const float frequency =
    static_cast<float>(crossingCount - 1) * EFFECTIVE_ADC_SAMPLE_RATE_HZ /
    (lastCrossing - firstCrossing);

  if (frequency < MINIMUM_MEASURED_FREQUENCY_HZ ||
      frequency > MAXIMUM_MEASURED_FREQUENCY_HZ) {
    return;
  }

  if (!measuredFrequencyInitialized) {
    measuredFrequencyHz = frequency;
    measuredFrequencyInitialized = true;
  } else {
    const float relativeChange = fabsf(frequency - measuredFrequencyHz) /
      max(measuredFrequencyHz, 1.0f);
    if (relativeChange >= 0.35f) {
      measuredFrequencyHz = frequency;
    } else {
      measuredFrequencyHz = measuredFrequencyHz * 0.75f + frequency * 0.25f;
    }
  }
}

void measureInputVoltage(uint16_t receivedSamples) {
  uint16_t minimumRaw = 4095;
  uint16_t maximumRaw = 0;
  uint64_t voltageSumMv = 0;
  uint64_t voltageSquareSum = 0;

  for (uint16_t index = 0; index < receivedSamples; index++) {
    const uint16_t raw = captureBuffer[index];
    minimumRaw = min(minimumRaw, raw);
    maximumRaw = max(maximumRaw, raw);

    const uint32_t millivolts = esp_adc_cal_raw_to_voltage(raw, &adcCalibration);
    voltageSumMv += millivolts;
    voltageSquareSum += static_cast<uint64_t>(millivolts) * millivolts;
  }

  const float averageMv =
    static_cast<float>(voltageSumMv) / receivedSamples;
  float varianceMv =
    static_cast<float>(voltageSquareSum) / receivedSamples -
    averageMv * averageMv;
  if (varianceMv < 0.0f) {
    varianceMv = 0.0f;
  }

  const uint32_t minimumMv =
    esp_adc_cal_raw_to_voltage(minimumRaw, &adcCalibration);
  const uint32_t maximumMv =
    esp_adc_cal_raw_to_voltage(maximumRaw, &adcCalibration);

  signalVpp = (maximumMv - minimumMv) / 1000.0f;
  signalVdc = averageMv / 1000.0f;
  signalVrmsAc = sqrtf(varianceMv) / 1000.0f;
}

bool readFrequencyPotentiometer() {
  if (millis() - lastPotentiometerReadMs < POTENTIOMETER_READ_INTERVAL_MS) {
    return false;
  }
  lastPotentiometerReadMs = millis();

  // O ADC1 esta sob controle do I2S. Portanto, o potenciometro tambem deve
  // ser lido pelo I2S: mudamos temporariamente do GPIO34 para o GPIO36.
  if (i2s_adc_disable(I2S_NUM_0) != ESP_OK) {
    return false;
  }

  adc1_config_channel_atten(ADC1_CHANNEL_0, ADC_ATTEN_DB_12);
  if (i2s_set_adc_mode(ADC_UNIT_1, ADC1_CHANNEL_0) != ESP_OK ||
      i2s_adc_enable(I2S_NUM_0) != ESP_OK) {
    return false;
  }

  // Descarta um bloco que ainda pode conter amostras do canal anterior.
  size_t bytesRead = 0;
  i2s_read(I2S_NUM_0, dmaBuffer, sizeof(dmaBuffer), &bytesRead, portMAX_DELAY);
  if (i2s_read(
        I2S_NUM_0,
        dmaBuffer,
        sizeof(dmaBuffer),
        &bytesRead,
        portMAX_DELAY
      ) != ESP_OK || bytesRead == 0) {
    i2s_adc_disable(I2S_NUM_0);
    i2s_set_adc_mode(ADC_UNIT_1, ADC1_CHANNEL_6);
    i2s_adc_enable(I2S_NUM_0);
    return false;
  }

  const uint16_t readingCount = bytesRead / sizeof(uint16_t);
  uint32_t sum = 0;
  for (uint16_t index = 0; index < readingCount; index++) {
    sum += dmaBuffer[index] & 0x0FFF;
  }
  const uint16_t reading = sum / readingCount;

  i2s_adc_disable(I2S_NUM_0);
  adc1_config_channel_atten(ADC1_CHANNEL_6, ADC_ATTEN_DB_12);
  i2s_set_adc_mode(ADC_UNIT_1, ADC1_CHANNEL_6);
  if (i2s_adc_enable(I2S_NUM_0) != ESP_OK) {
    return false;
  }

  // Descarta as amostras restantes do GPIO36 antes de desenhar a onda.
  i2s_read(I2S_NUM_0, dmaBuffer, sizeof(dmaBuffer), &bytesRead, portMAX_DELAY);

  if (!potentiometerInitialized) {
    smoothedPotentiometer = reading;
    potentiometerInitialized = true;
  } else {
    smoothedPotentiometer =
      (static_cast<uint32_t>(smoothedPotentiometer) * 3 + reading) / 4;
  }

  uint32_t requestedFrequency = map(
    smoothedPotentiometer,
    0,
    4095,
    MINIMUM_FREQUENCY_HZ,
    MAXIMUM_FREQUENCY_HZ
  );
  requestedFrequency = ((requestedFrequency + 5) / 10) * 10;
  requestedFrequency = constrain(
    requestedFrequency,
    MINIMUM_FREQUENCY_HZ,
    MAXIMUM_FREQUENCY_HZ
  );

  const int32_t frequencyDifference =
    static_cast<int32_t>(requestedFrequency) -
    static_cast<int32_t>(outputFrequencyHz);
  if (abs(frequencyDifference) < 30) {
    return false;
  }

  outputFrequencyHz = requestedFrequency;
  configureSelectedWaveform(outputFrequencyHz);
  drawFrequencyHeader();
  Serial.print("Frequencia do DAC: ");
  Serial.print(outputFrequencyHz);
  Serial.println(" Hz");
  return true;
}

void drawGrid() {
  display.fillRect(1, 32, 238, 172, graphBackgroundColor);

  for (uint8_t division = 0; division <= HORIZONTAL_DIVISIONS; division++) {
    const int16_t x = PLOT_LEFT +
      static_cast<int32_t>(PLOT_RIGHT - PLOT_LEFT) * division /
      HORIZONTAL_DIVISIONS;
    display.drawFastVLine(x, PLOT_TOP, PLOT_BOTTOM - PLOT_TOP + 1,
                          graphGridColor);
  }

  for (uint8_t division = 0; division <= VERTICAL_DIVISIONS; division++) {
    const int16_t y = PLOT_TOP +
      static_cast<int32_t>(PLOT_BOTTOM - PLOT_TOP) * division /
      VERTICAL_DIVISIONS;
    display.drawFastHLine(PLOT_LEFT, y, PLOT_RIGHT - PLOT_LEFT + 1,
                          graphGridColor);
  }

  display.drawRect(PLOT_LEFT, PLOT_TOP,
                   PLOT_RIGHT - PLOT_LEFT + 1,
                   PLOT_BOTTOM - PLOT_TOP + 1,
                   ST77XX_WHITE);

  display.setTextSize(2);
  display.setTextColor(ST77XX_WHITE);
  display.setCursor(5, 36);
  switch (waveformType) {
    case WaveformType::Sine:
      display.print("SENO");
      break;
    case WaveformType::Square:
      display.print("QUAD");
      break;
    case WaveformType::Triangle:
      display.print("TRI");
      break;
    case WaveformType::Sawtooth:
      display.print("SERRA");
      break;
  }
  display.setCursor(displayedCyclesOnScreen < 10 ? 126 : 114, 36);
  display.print("CICLOS: ");
  display.print(displayedCyclesOnScreen);

  display.setTextSize(1);
  display.setTextColor(ST77XX_WHITE, graphBackgroundColor);
  for (uint8_t division = 0; division <= VERTICAL_DIVISIONS; division++) {
    const int16_t y = PLOT_TOP +
      static_cast<int32_t>(PLOT_BOTTOM - PLOT_TOP) * division /
      VERTICAL_DIVISIONS;
    const float voltage =
      static_cast<float>(DISPLAY_MAX_VOLTAGE_MV) *
      (VERTICAL_DIVISIONS - division) /
      VERTICAL_DIVISIONS / 1000.0f;
    display.setCursor(1, constrain(y - 3, PLOT_TOP - 3, PLOT_BOTTOM - 6));
    display.print(voltage, 2);
    display.print("V");
  }

  const float microsecondsPerDivision =
    static_cast<float>(displayedSpanSamples) * 1000000.0f /
    EFFECTIVE_ADC_SAMPLE_RATE_HZ / HORIZONTAL_DIVISIONS;
  display.setCursor(174, 194);
  if (microsecondsPerDivision >= 1000.0f) {
    display.print(microsecondsPerDivision / 1000.0f,
                  microsecondsPerDivision >= 10000.0f ? 0 : 1);
    display.print("ms/d");
  } else {
    display.print(microsecondsPerDivision, 0);
    display.print("us/d");
  }
}

bool captureWaveform() {
  uint16_t receivedSamples = 0;

  while (receivedSamples < CAPTURE_BUFFER_SAMPLES) {
    size_t bytesRead = 0;
    if (i2s_read(
          I2S_NUM_0,
          dmaBuffer,
          sizeof(dmaBuffer),
          &bytesRead,
          portMAX_DELAY
        ) != ESP_OK || bytesRead == 0) {
      return false;
    }

    const uint16_t blockSamples = bytesRead / sizeof(uint16_t);
    const uint16_t remainingSamples = CAPTURE_BUFFER_SAMPLES - receivedSamples;
    const uint16_t samplesToCopy = blockSamples < remainingSamples
      ? blockSamples
      : remainingSamples;

    for (uint16_t index = 0; index < samplesToCopy; index++) {
      captureBuffer[receivedSamples + index] = dmaBuffer[index] & 0x0FFF;
    }
    receivedSamples += samplesToCopy;
  }

  if (receivedSamples < SAMPLE_COUNT) {
    return false;
  }

  uint16_t bufferMinimum = 4095;
  uint16_t bufferMaximum = 0;
  for (uint16_t index = 0; index < receivedSamples; index++) {
    bufferMinimum = min(bufferMinimum, captureBuffer[index]);
    bufferMaximum = max(bufferMaximum, captureBuffer[index]);
  }

  measureInputVoltage(receivedSamples);

  if (signalVpp >= MINIMUM_VALID_SIGNAL_VPP) {
    measureInputFrequency(
      captureBuffer,
      receivedSamples,
      bufferMinimum,
      bufferMaximum
    );
  } else {
    measuredFrequencyHz = 0.0f;
    measuredFrequencyInitialized = false;
  }

  const uint16_t triggerLevel = (bufferMinimum + bufferMaximum) / 2;
  uint16_t triggerHysteresis = (bufferMaximum - bufferMinimum) / 20;
  if (triggerHysteresis < 10) {
    triggerHysteresis = 10;
  }

  const uint16_t triggerLow = triggerLevel > triggerHysteresis
    ? triggerLevel - triggerHysteresis
    : 0;
  const uint32_t triggerHighExpanded =
    static_cast<uint32_t>(triggerLevel) + triggerHysteresis;
  const uint16_t triggerHigh = triggerHighExpanded < 4095
    ? triggerHighExpanded
    : 4095;

  if (measuredFrequencyInitialized && measuredFrequencyHz > 0.0f) {
    const float capturedCycles =
      measuredFrequencyHz * (receivedSamples - 1) /
      EFFECTIVE_ADC_SAMPLE_RATE_HZ;
    uint8_t maximumStableCycles = 1;
    if (capturedCycles >= 2.0f) {
      // Deixa um periodo de margem para localizar sempre a mesma borda.
      maximumStableCycles = static_cast<uint8_t>(capturedCycles) - 1;
    }
    displayedCyclesOnScreen = min(cyclesOnScreen, maximumStableCycles);
    displayedSpanSamples = constrain(
      static_cast<uint32_t>(
        EFFECTIVE_ADC_SAMPLE_RATE_HZ * displayedCyclesOnScreen /
        measuredFrequencyHz
      ),
      static_cast<uint32_t>(4),
      static_cast<uint32_t>(receivedSamples - 1)
    );
  } else {
    displayedCyclesOnScreen = cyclesOnScreen;
    displayedSpanSamples = SAMPLE_COUNT;
  }

  uint16_t startIndex = 0;
  const uint16_t latestTrigger = receivedSamples - displayedSpanSamples - 1;
  bool triggerArmed = false;

  for (uint16_t index = 1; index <= latestTrigger; index++) {
    if (captureBuffer[index] <= triggerLow) {
      triggerArmed = true;
    }

    if (triggerArmed && captureBuffer[index] >= triggerHigh) {
      startIndex = index;
      break;
    }
  }

  // Reamostra a quantidade selecionada de periodos na largura da tela.
  for (uint16_t index = 0; index < SAMPLE_COUNT; index++) {
    const uint32_t scaledPosition =
      static_cast<uint32_t>(index) * (displayedSpanSamples - 1) * 256 /
      (SAMPLE_COUNT - 1);
    const uint16_t sourceIndex = startIndex + scaledPosition / 256;
    const uint8_t fraction = scaledPosition & 0xFF;
    const uint16_t first = captureBuffer[sourceIndex];
    const uint16_t nextSourceIndex = sourceIndex + 1 < receivedSamples
      ? sourceIndex + 1
      : receivedSamples - 1;
    const uint16_t second = captureBuffer[nextSourceIndex];
    samples[index] =
      (static_cast<uint32_t>(first) * (256 - fraction) +
       static_cast<uint32_t>(second) * fraction) /
      256;
  }

  return true;
}

void filterWaveform() {
  for (uint16_t index = 0; index < SAMPLE_COUNT; index++) {
    uint32_t sum = 0;
    uint8_t count = 0;

    for (int8_t offset = -2; offset <= 2; offset++) {
      const int16_t sampleIndex = static_cast<int16_t>(index) + offset;
      if (sampleIndex >= 0 && sampleIndex < SAMPLE_COUNT) {
        sum += samples[sampleIndex];
        count++;
      }
    }

    filteredSamples[index] = sum / count;
  }
}

void drawWaveform() {
  drawGrid();

  const uint32_t firstMillivolts =
    esp_adc_cal_raw_to_voltage(filteredSamples[0], &adcCalibration);
  int16_t previousY = constrain(
    map(firstMillivolts, 0, DISPLAY_MAX_VOLTAGE_MV,
        PLOT_BOTTOM, PLOT_TOP),
    PLOT_TOP,
    PLOT_BOTTOM
  );

  for (uint16_t x = 1; x < SAMPLE_COUNT; x++) {
    const uint32_t millivolts =
      esp_adc_cal_raw_to_voltage(filteredSamples[x], &adcCalibration);
    const int16_t y = constrain(
      map(millivolts, 0, DISPLAY_MAX_VOLTAGE_MV,
          PLOT_BOTTOM, PLOT_TOP),
      PLOT_TOP,
      PLOT_BOTTOM
    );

    const int16_t previousX = PLOT_LEFT +
      static_cast<int32_t>(x - 1) * (PLOT_RIGHT - PLOT_LEFT) /
      (SAMPLE_COUNT - 1);
    const int16_t currentX = PLOT_LEFT +
      static_cast<int32_t>(x) * (PLOT_RIGHT - PLOT_LEFT) /
      (SAMPLE_COUNT - 1);

    display.drawLine(previousX, previousY, currentX, y, graphWaveColor);
    previousY = y;
  }

  display.fillRect(0, 208, 240, 32, ST77XX_BLACK);
  display.setTextColor(ST77XX_RED);
  display.setTextSize(2);
  display.setCursor(5, 216);
  display.print("Vpp ");
  display.print(signalVpp, 2);
  display.print("V RMS ");
  display.print(signalVrmsAc, 2);
  display.print("V");
}

uint16_t htmlColorToRgb565(String color) {
  color.trim();
  if (color.startsWith("#")) {
    color.remove(0, 1);
  }
  if (color.length() != 6) {
    return ST77XX_WHITE;
  }

  const uint32_t rgb = strtoul(color.c_str(), nullptr, 16);
  const uint8_t red = (rgb >> 16) & 0xFF;
  const uint8_t green = (rgb >> 8) & 0xFF;
  const uint8_t blue = rgb & 0xFF;
  return ((red & 0xF8) << 8) | ((green & 0xFC) << 3) | (blue >> 3);
}

const char *waveformName() {
  switch (waveformType) {
    case WaveformType::Square:
      return "square";
    case WaveformType::Triangle:
      return "triangle";
    case WaveformType::Sawtooth:
      return "sawtooth";
    default:
      return "sine";
  }
}

void handleWebPage() {
  webServer.sendHeader("Cache-Control", "no-store");
  webServer.send_P(200, "text/html; charset=utf-8", WEB_PAGE);
}

void handleWebData() {
  String json;
  json.reserve(1800);
  json += "{\"out\":";
  json += outputFrequencyHz;
  json += ",\"measured\":";
  if (measuredFrequencyInitialized) {
    json += String(measuredFrequencyHz, 2);
  } else {
    json += "null";
  }
  json += ",\"vpp\":";
  json += String(signalVpp, 3);
  json += ",\"rms\":";
  json += String(signalVrmsAc, 3);
  json += ",\"cycles\":";
  json += String(cyclesOnScreen);
  json += ",\"displayedCycles\":";
  json += String(displayedCyclesOnScreen);
  json += ",\"shape\":\"";
  json += waveformName();
  json += "\"";
  json += ",\"samples\":[";

  for (uint16_t index = 0; index < SAMPLE_COUNT; index++) {
    if (index > 0) {
      json += ',';
    }
    json += filteredSamples[index];
  }
  json += "]}";

  webServer.sendHeader("Cache-Control", "no-store");
  webServer.send(200, "application/json", json);
}

void handleWebSettings() {
  if (webServer.hasArg("shape")) {
    const String requestedShape = webServer.arg("shape");
    WaveformType requestedType = WaveformType::Sine;
    if (requestedShape == "square") {
      requestedType = WaveformType::Square;
    } else if (requestedShape == "triangle") {
      requestedType = WaveformType::Triangle;
    } else if (requestedShape == "sawtooth") {
      requestedType = WaveformType::Sawtooth;
    }

    if (requestedType != waveformType) {
      waveformType = requestedType;
      configureSelectedWaveform(outputFrequencyHz);
    }
  }
  if (webServer.hasArg("cycles")) {
    cyclesOnScreen = constrain(webServer.arg("cycles").toInt(), 1, 10);
  }
  if (webServer.hasArg("wave")) {
    graphWaveColor = htmlColorToRgb565(webServer.arg("wave"));
  }
  if (webServer.hasArg("grid")) {
    graphGridColor = htmlColorToRgb565(webServer.arg("grid"));
  }
  if (webServer.hasArg("background")) {
    graphBackgroundColor = htmlColorToRgb565(webServer.arg("background"));
  }
  webServer.send(200, "text/plain", "OK");
}

void startWebInterface() {
  WiFi.mode(WIFI_AP);
  const bool accessPointReady = WiFi.softAP(WIFI_NAME, WIFI_PASSWORD);

  webServer.on("/", HTTP_GET, handleWebPage);
  webServer.on("/data", HTTP_GET, handleWebData);
  webServer.on("/settings", HTTP_GET, handleWebSettings);
  webServer.onNotFound(handleWebPage);
  webServer.begin();

  Serial.println(accessPointReady ? "Wi-Fi do osciloscopio iniciado."
                                  : "Falha ao iniciar o Wi-Fi.");
  Serial.print("Rede: ");
  Serial.println(WIFI_NAME);
  Serial.print("Senha: ");
  Serial.println(WIFI_PASSWORD);
  Serial.print("Pagina: http://");
  Serial.println(WiFi.softAPIP());
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("ESP32 iniciado.");
  Serial.println("Inicializando ST7789...");
  Serial.println("CLK=GPIO14 MOSI=GPIO13 RST=GPIO26 DC=GPIO27 CS=ausente");

  displaySPI.begin(TFT_SCLK, -1, TFT_MOSI, -1);
  waveformTimer = timerBegin(0, 8, true);
  timerAttachInterrupt(waveformTimer, &onWaveformTimer, true);
  const esp_adc_cal_value_t calibrationSource = esp_adc_cal_characterize(
    ADC_UNIT_1,
    ADC_ATTEN_DB_12,
    ADC_WIDTH_BIT_12,
    1100,
    &adcCalibration
  );
  const bool oscillatorReady = startInternalDacOscillator();
  const bool adcReady = startContinuousAdc();
  drawOscilloscopeFrame(oscillatorReady && adcReady);
  drawFrequencyHeader(oscillatorReady && adcReady);

  Serial.println("ST7789 inicializado com SPI_MODE3.");
  Serial.print("Calibracao do ADC: ");
  if (calibrationSource == ESP_ADC_CAL_VAL_EFUSE_VREF) {
    Serial.println("Vref do eFuse.");
  } else if (calibrationSource == ESP_ADC_CAL_VAL_EFUSE_TP) {
    Serial.println("dois pontos do eFuse.");
  } else {
    Serial.println("Vref padrao de 1100 mV.");
  }
  if (oscillatorReady) {
    Serial.println("DAC1 ativo: senoide de 1000 Hz em GPIO25.");
  } else {
    Serial.println("Falha ao iniciar o gerador interno do DAC.");
  }
  Serial.println(adcReady ? "ADC DMA ativo: 80000 amostras/s efetivas em GPIO34."
                          : "Falha ao iniciar ADC DMA em GPIO34.");
  startWebInterface();
}

void loop() {
  webServer.handleClient();
  readFrequencyPotentiometer();

  if (captureWaveform()) {
    filterWaveform();
    drawWaveform();
  }

  if (millis() - lastHeaderUpdateMs >= 200) {
    lastHeaderUpdateMs = millis();
    drawFrequencyHeader();
  }
  webServer.handleClient();
  delay(5);
}
