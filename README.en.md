<p align="center"><img src="assets/hero.svg" alt="Stargate Labs — Razer Key Light Chroma" width="100%"></p>

<p align="center"><b>STARGATE LABS · SIGNALRGB INTEGRATIONS</b><br>[Italiano](README.md) · [English](README.en.md) · [Installazione IT](docs/INSTALL-IT.md) · [Installation EN](docs/INSTALL-EN.md)</p>

<p align="center"><img src="assets/brand/razer-logo.svg" alt="razer" height="30"> &nbsp; <img src="assets/brand/signalrgb-logo.svg" alt="signalrgb" height="30"></p>

# Razer Key Light Chroma

Local control of the Razer Key Light’s **Chroma RGB** lighting directly from the SignalRGB canvas. An implementation of the original protocol with acknowledged TCP setup before UDP streaming, rate limiting and connection recovery.

| Setup | Streaming | Maximum configured rate |
|---|---|---|
| TCP 10003 | UDP 10005 · 95-byte packets | 25 updates/s |

## Installation

Download the ZIP from [Releases](https://github.com/StargateLabs/signalrgb-razer-key-light-chroma/releases), extract it and follow the [English installation guide](docs/INSTALL-EN.md). Rollback instructions are included.

## Architecture and verification

**77 checks** cover packet parity with the original SDK, checksums, fragmented ACKs, device rejection, keepalive, reconnect and shutdown. RGB streaming keeps the latest color without a TCP command backlog.

## Known limits

The lamp IP must be configured; full automatic network scanning is not implemented. This controls the Chroma section, not the white panel as a studio light. The 77 automated checks validate protocol and plugin state; optical synchronization is not certified across every lamp, network or firmware.

## Documentation and contributions

- [Technical notes / Note tecniche](docs/TECHNICAL-EN.md)
- [Changelog](CHANGELOG.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)
- [MIT license](LICENSE)
- [Stargate Labs](https://github.com/StargateLabs) · [Lab portfolio](https://stargatelabs.github.io/StargateLabs/)

Independent project, not affiliated with Razer, SignalRGB, Tuya or LSC. Trademarks belong to their respective owners.

<sub>Observe. Decode. Build. Verify. — Created by Stargate Labs.</sub>
