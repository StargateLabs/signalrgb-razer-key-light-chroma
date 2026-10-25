# Installation — Stargate Labs

[Italiano](INSTALL-IT.md) · [README](../README.en.md)

1. Pair the lamp to your network with Razer Synapse or Razer Streaming App. The PC and lamp must be reachable on the LAN.
2. Obtain the lamp IPv4 address from your router. A DHCP reservation avoids address changes.
3. Exit SignalRGB and any other Key Light controller.
4. Download and extract the release ZIP, open PowerShell there and replace the example with your lamp IP:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -IPAddress 192.168.1.123
```

5. Restart SignalRGB. The **Razer Key Light Chroma** controller provides Canvas or fixed color, IP override and 5/10/15/20/25 Hz limits. Its service panel provides Reconnect.

## Troubleshooting

A catalog entry alone does not prove connectivity. Check the device console for `streaming Chroma UDP pronto`. Setup uses TCP 10003; colors use UDP 10005. Check Wi-Fi client isolation, incorrect IP and competing Synapse control. Do not expose these ports to the Internet.

Setup turns off the white panel and enables Chroma RGB. To return to Razer control, exit SignalRGB and reopen the Razer software.

## Remove and rollback

Exit SignalRGB and move `Razer_Key_Light_Chroma.js` and `.qml` out of `Documents\WhirlwindFX\Plugins`. Restore the `.before-stargatelabs` backup if required. Do not keep both `.js` and `.mjs` copies of the same plugin in the plugin folder.
