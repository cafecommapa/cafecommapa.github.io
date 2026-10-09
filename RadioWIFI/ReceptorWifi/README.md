# ReceptorWifi

Receptor Bluetooth A2DP para ESP32 com saída analógica e controle de volume por
página web. O projeto não usa display nem decoder MP3, evitando concorrência
pelo periférico I2S.

## Saída de áudio

O áudio analógico sai pelo DAC interno no **GPIO25**. Use um capacitor de
acoplamento de 1 uF a 10 uF antes da entrada de um pré-amplificador. Não ligue
alto-falante ou fone diretamente ao ESP32.

## Teste

```sh
pio run
pio run --target upload
pio device monitor
```

Depois da gravação, procure por `ReceptorWifi` no Bluetooth do celular, conecte
e reproduza áudio.

Para abrir o controle de volume:

1. Conecte o celular à rede Wi-Fi `ReceptorWifi`.
2. Use a senha `receptor123`.
3. Abra `http://192.168.4.1` no navegador.

O controle vai de 0 a 100%. O monitor serial informa o motivo do último reset,
o estado da conexão Bluetooth e o heap disponível.

Se aparecer `brownout/alimentacao baixa`, teste outra fonte e outro cabo USB.
Se aparecer `panic/excecao` ou `watchdog`, copie todo o log do monitor serial,
incluindo o backtrace.

O ESP32 funciona como ponto de acesso Wi-Fi, portanto não precisa das
credenciais do roteador e a página continua disponível mesmo sem internet.
