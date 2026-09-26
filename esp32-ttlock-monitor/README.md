# Radio web ESP32 com saida analogica

Receptor de radio MP3 pela internet para ESP32. O audio decodificado sai pelo
DAC interno no GPIO25 e pode alimentar uma entrada de alta impedancia de um
pre-amplificador. A tela ST7789 mostra conexao, estado, metadados da faixa e o
endereco do controle web para celular.

## Pino de audio correto

O GPIO34 e somente entrada e nao pode gerar audio. O GPIO31 nao esta disponivel
como pino de uso geral no ESP32 classico. A saida analogica deste projeto e:

| Funcao | ESP32 |
|---|---:|
| Audio analogico | GPIO25 / DAC1 |
| Terra do audio | GND |

O DAC interno tem 8 bits. Ele serve para testes e radios simples; para maior
qualidade, use futuramente um DAC I2S externo, como o PCM5102A.

## Ligacao ao pre-amplificador

O DAC possui nivel DC. Nao ligue o GPIO25 diretamente ao pre. Use pelo menos um
capacitor de acoplamento:

```text
GPIO25 ---- capacitor 1 uF a 10 uF ---- entrada do pre
GND ESP32 ----------------------------- GND do pre
```

Se o capacitor for eletrolitico, ligue o terminal positivo no GPIO25. O pre deve
ter entrada de alta impedancia. Nao conecte alto-falante ou fone diretamente ao
ESP32. Comece com volume baixo.

## Tela ST7789

| ST7789 | ESP32 |
|---|---:|
| SCL / CLK | GPIO14 |
| SDA / MOSI | GPIO13 |
| DC | GPIO27 |
| RST | GPIO26 |
| CS | Nao conectado |

O firmware habilita somente o canal DAC do GPIO25, mantendo o GPIO26 disponivel
para o reset da tela e preservando a ligacao original do projeto.

## Configuracao

1. Copie `include/secrets.h.example` para `include/secrets.h` e informe o Wi-Fi.
2. Edite `include/radio_config.h` para trocar o nome e a URL direta do stream.
3. A URL precisa apontar para um stream MP3/ICY, nao para a pagina do site.

A configuracao inicial usa o stream MP3 de musica pop da NPO Radio 2. O volume
inicia em 18 numa escala de 0 a 20, equivalente a 90% do sinal. As cinco
estacoes ficam em `include/radio_config.h`.

## Controle pelo celular

1. Conecte o celular na mesma rede Wi-Fi do ESP32.
2. Veja no display o endereco mostrado abaixo de `Controle no celular`.
3. Abra esse endereco no navegador, incluindo `http://`.

A pagina permite ajustar o volume em 20 passos inteiros, de 0 a 20. Cada passo
equivale a 5% do sinal: 0 e silencio, 10 e 50%, e 20 e 100%. Tambem e possivel
escolher entre NPO Radio 2, NPO 3FM, NPO Radio 5, FunX e NPO Klassiek. Nao e
necessario instalar aplicativo.

## Comandos pelo monitor serial

- `+`: aumenta o ganho em 5%.
- `-`: diminui o ganho em 5%.
- `R`: reconecta ao stream.

## Compilar e gravar

```sh
pio run
pio run --target upload
pio device monitor
```
