#pragma once

#include <Arduino.h>

struct RadioStation {
  const char *name;
  const char *description;
  const char *streamUrl;
};

constexpr RadioStation RADIO_STATIONS[] = {
    {"NPO Radio 2", "Pop", "http://icecast.omroep.nl/radio2-bb-mp3"},
    {"NPO 3FM", "Pop e alternativa", "http://icecast.omroep.nl/3fm-bb-mp3"},
    {"NPO Radio 5", "Classicos e pop", "http://icecast.omroep.nl/radio5-bb-mp3"},
    {"FunX", "Urban e dance", "http://icecast.omroep.nl/funx-bb-mp3"},
    {"NPO Klassiek", "Musica classica", "http://icecast.omroep.nl/radio4-bb-mp3"},
};

constexpr size_t RADIO_STATION_COUNT =
    sizeof(RADIO_STATIONS) / sizeof(RADIO_STATIONS[0]);
constexpr size_t INITIAL_STATION_INDEX = 0;
