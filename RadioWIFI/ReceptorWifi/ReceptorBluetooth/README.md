# Receptor Bluetooth ESP32

Projeto independente para receber audio Bluetooth A2DP em um ESP32 classico,
controlar o volume pela pagina web e mostrar o estado em um display ST7789
240x240.

## Acesso

1. Conecte o celular à mesma rede Wi-Fi usada pelo ESP32.
2. Abra no navegador o endereço exibido em `Controle web` no display.
3. No Bluetooth do celular, conecte ao dispositivo `ReceptorBluetooth`.

Se o roteador estiver indisponivel por 15 segundos, o ESP32 cria a rede de
emergencia `ReceptorBluetooth`, senha `receptor123`. Nesse modo, use
`http://192.168.4.1/` e escolha permanecer conectado mesmo sem internet.

As credenciais ficam em `include/secrets.h`. O projeto nesta arvore tambem
aceita o arquivo de configuracao compartilhado em `../../include/secrets.h`.

## Ligacoes

| Funcao | ESP32 |
|---|---:|
| Audio analogico / DAC1 | GPIO25 |
| ST7789 SCL / CLK | GPIO14 |
| ST7789 SDA / MOSI | GPIO13 |
| ST7789 DC | GPIO27 |
| ST7789 RST | GPIO26 |
| ST7789 CS | Nao conectado |
| ST7789 VCC | 3,3 V |
| ST7789 GND | GND |
| ST7789 BL / LED | 3,3 V |

Use um capacitor de acoplamento de 1 uF a 10 uF entre o GPIO25 e a entrada de
alta impedancia de um pre-amplificador. Nao conecte alto-falante ou fone
diretamente ao ESP32.

## Compilar e gravar

```sh
pio run
pio run --target upload
pio device monitor
```

O monitor serial informa o motivo do ultimo reset. Se aparecer
`brownout/fonte fraca`, use outra fonte ou cabo USB; Wi-Fi e Bluetooth ligados
ao mesmo tempo provocam picos de corrente.
