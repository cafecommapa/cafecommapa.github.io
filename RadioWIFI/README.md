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

A pagina oferece dois controles sincronizados para o mesmo volume: uma escala
de 0 a 20, com passos de 5%, e outra de 0 a 100%, com passos de 1%. Em ambas,
0 e silencio e 100% e o nivel maximo. Tambem e possivel escolher entre
NPO Radio 2, NPO 3FM, NPO Radio 5, FunX, NPO Klassiek e CBN Sao Paulo. Nao e
necessario instalar aplicativo.

O botao `Gerar senoide de 100 Hz` pausa a radio e envia um tom de teste pela
saida de audio; ao parar o tom, a radio volta a reproduzir. O nivel do tom segue
o controle de volume. Comece com volume baixo e use somente uma entrada de
pre-amplificador, nunca um alto-falante ou fone diretamente no ESP32.

O botao `Ativar Bluetooth` pausa a radio e torna o ESP32 visivel como
`RadioWIFI` para receber audio Bluetooth A2DP. Selecione esse dispositivo nas
configuracoes Bluetooth do celular. Ao desativar o Bluetooth, a radio volta a
reproduzir. O tom de 100 Hz, o Bluetooth e a radio usam a mesma saida de audio;
somente uma fonte toca por vez.

A inicializacao do receptor Bluetooth e agendada pelo controle web e executada
no loop principal depois que o decoder MP3 libera a memoria. Aguarde alguns
segundos ate a pagina indicar que o Bluetooth esta aguardando conexao.

Se ainda houver reinicio ao ligar o Bluetooth, abra o monitor serial. O firmware
mostra o motivo do ultimo reset e o heap antes/depois de iniciar o A2DP. Um
reset por brownout normalmente indica fonte ou cabo USB insuficiente para o pico
de corrente do radio Bluetooth.

O Bluetooth aumenta o tamanho do firmware; por isso a compilacao usa a tabela
`huge_app.csv`, com uma particao maior para o programa e sem suporte a OTA.
Depois de atualizar, grave o firmware pelo USB.

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
