<p align="center"><img src="assets/hero.svg" alt="Stargate Labs — Razer Key Light Chroma" width="100%"></p>

<p align="center"><b>STARGATE LABS · SIGNALRGB INTEGRATIONS</b><br>[Italiano](README.md) · [English](README.en.md) · [Installazione IT](docs/INSTALL-IT.md) · [Installation EN](docs/INSTALL-EN.md)</p>

<p align="center"><img src="assets/brand/razer-logo.svg" alt="razer" height="30"> &nbsp; <img src="assets/brand/signalrgb-logo.svg" alt="signalrgb" height="30"></p>

# Razer Key Light Chroma

Controllo locale dell’illuminazione **Chroma RGB** della Razer Key Light, direttamente dal canvas di SignalRGB. Implementazione del protocollo originale con configurazione TCP confermata prima dello streaming UDP, controllo della frequenza e recupero delle connessioni.

| Setup | Streaming | Maximum configured rate |
|---|---|---|
| TCP 10003 | UDP 10005 · 95-byte packets | 25 updates/s |

## Installazione

Scarica lo ZIP da [Releases](https://github.com/StargateLabs/signalrgb-razer-key-light-chroma/releases), estrailo e segui la [guida in italiano](docs/INSTALL-IT.md). Le istruzioni spiegano anche come tornare alla versione precedente.

## Architettura e verifiche

**77 controlli**: pacchetti confrontati con il SDK originale, checksum, ACK frammentati, rifiuti del dispositivo, keepalive, riconnessione e spegnimento. Il flusso RGB conserva il colore recente senza una coda di comandi TCP.

## Limiti dichiarati

L’IP va configurato: non è presente una scansione automatica completa della rete. Si controlla la sezione Chroma, non il pannello bianco come luce da studio. I 77 controlli automatici provano protocollo e stato del plugin; la sincronizzazione ottica non è certificata su ogni lampada, rete o firmware.

## Documentazione e contributi

- [Technical notes / Note tecniche](docs/TECHNICAL-IT.md)
- [Changelog](CHANGELOG.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)
- [MIT license](LICENSE)
- [Stargate Labs](https://github.com/StargateLabs) · [Lab portfolio](https://stargatelabs.github.io/StargateLabs/)

Progetto indipendente, non affiliato a Razer, SignalRGB, Tuya o LSC. I marchi appartengono ai rispettivi titolari.

<sub>Observe. Decode. Build. Verify. — Created by Stargate Labs.</sub>
