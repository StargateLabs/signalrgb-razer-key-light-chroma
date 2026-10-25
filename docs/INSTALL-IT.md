# Installazione — Stargate Labs

[English](INSTALL-EN.md) · [README](../README.md)

1. Abbina la lampada alla tua rete con Razer Synapse o Razer Streaming App. PC e lampada devono potersi raggiungere sulla LAN.
2. Recupera l'IPv4 della lampada dal router. Una prenotazione DHCP evita cambi di indirizzo.
3. Chiudi SignalRGB e gli altri programmi che controllano la Key Light.
4. Scarica ed estrai lo ZIP della release, apri PowerShell nella cartella ed esegui, sostituendo l'esempio con l'IP reale:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -IPAddress 192.168.1.123
```

5. Riavvia SignalRGB. Troverai il controller **Razer Key Light Chroma**. Nei controlli puoi scegliere Canvas o Colore fisso, modificare l'IP e limitare la frequenza a 5/10/15/20/25 Hz. Il pannello di servizio offre Riconnetti.

## Diagnostica

Una voce nel catalogo non prova una connessione: verifica nella console del dispositivo il messaggio `streaming Chroma UDP pronto`. Il setup usa TCP 10003; i colori usano UDP 10005. Verifica isolamento Wi-Fi, IP errato e conflitti con Synapse. Non aprire queste porte verso Internet.

Il plugin spegne il pannello bianco durante il setup e attiva la sezione Chroma RGB. Per tornare alla gestione Razer chiudi SignalRGB e riapri il software Razer.

## Rimozione e ripristino

Chiudi SignalRGB e sposta fuori da `Documenti\WhirlwindFX\Plugins` i file `Razer_Key_Light_Chroma.js` e `.qml`. Ripristina, se necessaria, la copia `.before-stargatelabs` creata dall'installer. Non lasciare copie `.js` e `.mjs` dello stesso plugin nella cartella.
