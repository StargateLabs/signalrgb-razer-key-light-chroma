# Technical notes / Reverse engineering

[Italiano](TECHNICAL-IT.md)

Acknowledged setup on TCP 10003; streaming on UDP 10005. Original 95-byte reports with checksum over bytes 7…92. Software mode 3, effect 8, Chroma brightness 255; white panel disabled. TCP keepalive every 10 seconds and 500 ms static refresh. 25 Hz cap. No automatic IP scanning: the installer configures the supplied address.

Test: `node plugin/test/keylight.test.mjs` — 77 checks. Fixtures contain protocol packets only, no account credentials or vendor libraries. Unconfigured source does not announce controllers.
