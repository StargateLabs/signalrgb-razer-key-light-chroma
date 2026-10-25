# Note tecniche / Reverse engineering

[English](TECHNICAL-EN.md)

Configurazione su TCP 10003 con ACK sequenziali; streaming su UDP 10005. Report originali da 95 byte, checksum sui byte 7…92. Software mode 3, effetto 8, luminosità Chroma 255; pannello bianco disattivato. Keepalive TCP ogni 10 secondi; refresh statico 500 ms. Limite 25 Hz. Nessuna scansione IP automatica: l’installer configura il controller per l’IP fornito.

Test: `node plugin/test/keylight.test.mjs` — 77 controlli. Le fixture conservano soltanto pacchetti di protocollo, non credenziali o librerie vendor. Il sorgente non configurato non annuncia controller.
