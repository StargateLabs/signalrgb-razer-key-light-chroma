import QtQuick.Layouts

Item {
    anchors.fill: parent
    Column {
        width: parent.width
        spacing: 12
        Text { text: "Razer Key Light Chroma · Stargate Labs"; color: "white"; font.pixelSize: 22 }
        Text { text: "Wi-Fi diretto · TCP 10003 configurazione · UDP 10005 effetti"; color: "#cad6c5"; wrapMode: Text.WordWrap; width: parent.width }
        Text { text: "Il colore segue il canvas. Il pannello bianco resta separato dal canale RGB."; color: "#cad6c5" }
        SButton {
            width: 190
            height: 36
            label.text: "Riconnetti Key Light"
            onClicked: discovery.Reconnect()
        }
        Text { id: connectionStatus; text: "Verifica configurazione..."; color: "#cad6c5" }
        Text { text: "IP, frequenza e colore: Devices → Key Light → Settings / Lighting.\nLuminosità e streaming: controlli nativi del dispositivo."; color: "#cad6c5"; wrapMode: Text.WordWrap; width: parent.width }
    }
    Timer { interval: 1000; repeat: true; running: true; onTriggered: connectionStatus.text = discovery.status }
}
