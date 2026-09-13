#include <Arduino.h>

constexpr uint8_t SIGNAL_PIN = D5;  // GPIO14
constexpr uint32_t CHANGE_INTERVAL_MS = 6000;
constexpr uint16_t FREQUENCIES_HZ[] = {3, 10};
constexpr size_t FREQUENCY_COUNT =
  sizeof(FREQUENCIES_HZ) / sizeof(FREQUENCIES_HZ[0]);

size_t frequencyIndex = 0;
uint32_t lastFrequencyChangeMs = 0;

void selectFrequency(size_t index) {
  tone(SIGNAL_PIN, FREQUENCIES_HZ[index]);

  Serial.print("Saida D5/GPIO14: ");
  Serial.print(FREQUENCIES_HZ[index]);
  Serial.println(" Hz");
}

void setup() {
  Serial.begin(115200);
  pinMode(SIGNAL_PIN, OUTPUT);
  digitalWrite(SIGNAL_PIN, LOW);

  selectFrequency(frequencyIndex);
  lastFrequencyChangeMs = millis();
}

void loop() {
  const uint32_t now = millis();
  if (now - lastFrequencyChangeMs >= CHANGE_INTERVAL_MS) {
    lastFrequencyChangeMs += CHANGE_INTERVAL_MS;
    frequencyIndex = (frequencyIndex + 1) % FREQUENCY_COUNT;
    selectFrequency(frequencyIndex);
  }
}
