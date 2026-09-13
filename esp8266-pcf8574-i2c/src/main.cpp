#include <Arduino.h>
#include <Wire.h>

constexpr uint8_t PCF8574_ADDRESS = 0x20;
constexpr uint8_t BUTTON_PIN = D7;  // GPIO13, botao ligado ao GND
constexpr uint8_t BUZZER_PIN = D2;  // GPIO4, buzzer ativo em nivel LOW
constexpr unsigned long COUNT_INTERVAL_MS = 1000;
constexpr unsigned long FAST_COUNT_INTERVAL_MS = 100;
constexpr unsigned long ACCELERATION_DURATION_MS = 5000;
constexpr unsigned long DEBOUNCE_MS = 40;

bool pcf8574Available = false;
uint8_t currentDigit = 0;
bool accelerated = false;
bool lastButtonReading = HIGH;
bool stableButtonState = HIGH;
unsigned long lastDebounceTime = 0;
unsigned long lastCountTime = 0;
unsigned long accelerationStartTime = 0;

// Mapeamento real identificado no teste:
// P0=a, P1=b, P2=d, P3=c, P4=DP, P5=g, P6=f, P7=e.
// A tabela usa 1 para indicar cada segmento que deve ficar aceso.
constexpr uint8_t DIGIT_SEGMENTS[10] = {
  0b11001111,  // 0
  0b00001010,  // 1
  0b10100111,  // 2
  0b00101111,  // 3
  0b01101010,  // 4
  0b01101101,  // 5
  0b11101101,  // 6
  0b00001011,  // 7
  0b11101111,  // 8
  0b01101111   // 9
};

bool scanI2CBus() {
  uint8_t devicesFound = 0;
  bool pcf8574Found = false;

  Serial.println();
  Serial.println("Iniciando varredura do barramento I2C...");

  // Os enderecos I2C validos para dispositivos de 7 bits vao de 0x01 a 0x7E.
  for (uint8_t address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    const uint8_t error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("Dispositivo encontrado no endereco 0x");
      if (address < 0x10) {
        Serial.print('0');
      }
      Serial.println(address, HEX);

      devicesFound++;
      if (address == PCF8574_ADDRESS) {
        pcf8574Found = true;
      }
    } else if (error == 4) {
      Serial.print("Erro desconhecido no endereco 0x");
      if (address < 0x10) {
        Serial.print('0');
      }
      Serial.println(address, HEX);
    }

    yield();
  }

  Serial.println();
  if (devicesFound == 0) {
    Serial.println("Nenhum dispositivo I2C foi encontrado.");
  } else {
    Serial.print("Total de dispositivos encontrados: ");
    Serial.println(devicesFound);
  }

  if (pcf8574Found) {
    Serial.println("OK: PCF8574P encontrado no endereco esperado 0x20.");
    Serial.println("A comunicacao I2C esta funcionando.");
  } else {
    Serial.println("FALHA: PCF8574P nao foi encontrado no endereco 0x20.");
    Serial.println("Confira alimentacao, GND comum, SDA em D6, SCL em D5 e A0-A2 em GND.");
  }

  return pcf8574Found;
}

bool displayDigit(uint8_t digit) {
  if (digit > 9) {
    return false;
  }

  // O 5161BS-1 e de anodo comum: 0 acende e 1 apaga cada saida.
  // A inversao tambem mantem o ponto decimal apagado.
  const uint8_t pcfOutput = static_cast<uint8_t>(~DIGIT_SEGMENTS[digit]);

  Wire.beginTransmission(PCF8574_ADDRESS);
  Wire.write(pcfOutput);
  return Wire.endTransmission() == 0;
}

void updateBuzzer(uint8_t digit) {
  digitalWrite(BUZZER_PIN, digit == 0 ? LOW : HIGH);
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, HIGH);

  Serial.println();
  Serial.println("ESP8266 - teste I2C do PCF8574P");
  Serial.println("SDA: D6 (GPIO12) | SCL: D5 (GPIO14)");
  Serial.println("Botao: D7 (GPIO13) ligado ao GND");
  Serial.println("Buzzer: D2 (GPIO4)");

  Wire.begin(D6, D5);
  Wire.setClock(100000);

  pcf8574Available = scanI2CBus();

  if (pcf8574Available) {
    Serial.println();
    if (displayDigit(0)) {
      Serial.println("Contagem progressiva iniciada: 0 a 9.");
      Serial.println("Pressione o botao para acelerar 10 vezes por 5 segundos.");
      lastCountTime = millis();
    } else {
      Serial.println("FALHA: nao foi possivel mostrar o primeiro digito.");
      pcf8574Available = false;
    }
  } else {
    Serial.println("A contagem nao foi iniciada porque o PCF8574P nao respondeu.");
  }
}

void loop() {
  const unsigned long now = millis();
  const bool buttonReading = digitalRead(BUTTON_PIN);

  if (buttonReading != lastButtonReading) {
    lastDebounceTime = now;
    lastButtonReading = buttonReading;
  }

  if ((now - lastDebounceTime) >= DEBOUNCE_MS &&
      buttonReading != stableButtonState) {
    stableButtonState = buttonReading;

    if (stableButtonState == LOW) {
      accelerated = true;
      accelerationStartTime = now;
      lastCountTime = now;
      Serial.println("Aceleracao ativada por 5 segundos.");
    }
  }

  if (accelerated &&
      (now - accelerationStartTime) >= ACCELERATION_DURATION_MS) {
    accelerated = false;
    lastCountTime = now;
    Serial.println("Velocidade normal restaurada.");
  }

  const unsigned long activeCountInterval =
    accelerated ? FAST_COUNT_INTERVAL_MS : COUNT_INTERVAL_MS;

  if (pcf8574Available &&
      (now - lastCountTime) >= activeCountInterval) {
    lastCountTime = now;
    currentDigit = (currentDigit + 1) % 10;

    if (displayDigit(currentDigit)) {
      updateBuzzer(currentDigit);
      Serial.print("Digito: ");
      Serial.println(currentDigit);
    } else {
      Serial.println("Erro de comunicacao ao atualizar o display.");
    }
  }
}
