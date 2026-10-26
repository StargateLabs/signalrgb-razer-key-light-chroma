// Stargate Labs - Key Light Chroma TCP setup and original UDP Chroma streaming.
// Wire format independently implemented from the device commands documented by:
// https://github.com/thepolishdane/simple-razer-keylight-chroma-controller
import tcp from "@SignalRGB/tcp";
import udp from "@SignalRGB/udp";

const DEFAULT_HOST = "192.168.1.95";
const PORT = 10003;
const FRAME_PORT = 10005;
const HELLO = bytes("aa000013020912022026010900110000401500");
const REGISTER = bytes("48004901d45d645125220853796e6170736533");
const FRAME_MS = 40; // The lamp advertises a 25 Hz update rate for its Chroma regions.
const SESSION_TIMEOUT_MS = 2000;

export function Name() { return "Razer Key Light Chroma - Stargate Labs"; }
export function Publisher() { return "Stargate Labs"; }
export function ImageUrl() { return "https://raw.githubusercontent.com/StargateLabs/signalrgb-razer-key-light-chroma/main/assets/product.png"; }
export function Version() { return "1.2.0"; }
export function Type() { return "network"; }
export function Size() { return [1, 1]; }
export function DefaultPosition() { return [0, 0]; }
export function DefaultScale() { return 1.0; }
export function SubdeviceController() { return false; }
export function Validate() { return true; }
export function ControllableParameters() {
  return [
    {property:"keyLightEnabled",group:"lighting",label:"Key Light accesa",type:"boolean",default:true},
    {property:"lightingMode",group:"lighting",label:"Sorgente colore",type:"combobox",values:["Canvas","Colore fisso"],default:"Canvas"},
    {property:"forcedColor",group:"lighting",label:"Colore fisso",type:"color",default:"#ffffff"},
    {property:"keyLightHost",group:"settings",label:"Indirizzo IP Key Light (vuoto = rilevato)",type:"textfield",default:""},
    {property:"keyLightFrameRate",group:"settings",label:"Aggiornamenti massimi al secondo",type:"combobox",values:["5","10","15","20","25"],default:"25"}
  ];
}

function bytes(hex) {
  const result = [];
  for (let i = 0; i < hex.length; i += 2) result.push(parseInt(hex.slice(i, i + 2), 16));
  return result;
}

function buildPacket(payload) {
  const packet = bytes("aa00005f000000000000");
  for (let i = 0; i < 83; i++) packet.push(payload[i] || 0);
  let checksum = 0;
  for (let i = 7; i < packet.length; i++) checksum ^= packet[i];
  packet.push(checksum, 0);
  return packet;
}

function rgbPacket(rgb) {
  // Vendor SetChromaFrame: profile, region, row, columns, RGB and white LED off.
  return buildPacket(bytes("090f030005000000").concat(rgb, [0]));
}

function colorArray(value) {
  const color = value && typeof value.length === "number" ? value : [value?.r, value?.g, value?.b];
  return [0, 1, 2].map(i => Math.max(0, Math.min(255, Number(color[i]) || 0)) | 0);
}

let socket = null;
let frameSocket = null;
let phase = "idle";
let deadline = 0;
let nextTry = 0;
let backoff = 1000;
let received = [];
let ackReady = false;
let lastRGB = null;
let lastFrame = -Infinity;
let tcpSentAt = 0;
let lastKeepalive = 0;
let framesSent = 0;
let lastReport = 0;
let maxReplyMs = 0;
let replyTotalMs = 0;
let replyCount = 0;
let stopped = false;
let reportedPhase = "";
let reconnectToken = 0;
let expectedReply = [];
let unmatchedReplies = 0;

function host() {
  try { if (typeof keyLightHost === "string" && keyLightHost.trim()) return keyLightHost.trim(); } catch (_) {}
  return controller.ip;
}

function frameInterval() {
  try { const rate = Number(keyLightFrameRate); if ([5,10,15,20,25].includes(rate)) return Math.floor(1000/rate); } catch (_) {}
  return FRAME_MS;
}

export function onkeyLightHostChanged() {
  fail();
  nextTry = 0;
  backoff = 1000;
}

export function onkeyLightEnabledChanged() {
  lastRGB = null;
  lastFrame = -Infinity;
}

function fail() {
  if (phase === "idle" || stopped) return;
  phase = "idle";
  received = [];
  ackReady = false;
  deadline = 0;
  lastRGB = null;
  expectedReply = [];
  nextTry = Date.now() + backoff;
  backoff = Math.min(backoff * 2, 15000);
  try { socket.close(); } catch (_) {}
  try { if (frameSocket) frameSocket.close(); } catch (_) {}
}

function send(packet) {
  try {
    if (socket.send(packet) !== packet.length) throw new Error("TCP send failed");
    return true;
  } catch (_) {
    fail();
    return false;
  }
}

function waitForReply(stage, packet) {
  phase = stage;
  received = [];
  ackReady = false;
  expectedReply = ["hello", "keepalive"].includes(stage) ? packet.slice(4)
    : packet.slice(10, stage === "register" ? 29 : stage === "mode" ? 23 : stage === "effect" ? 25 : 16);
  tcpSentAt = Date.now();
  deadline = Date.now() + SESSION_TIMEOUT_MS;
  return send(packet);
}

function messageBytes(message) {
  if (message?.buffer !== undefined && message.length === undefined) return Array.from(new Uint8Array(message.buffer));
  if (message?.data !== undefined) return messageBytes(message.data);
  if (message?.response !== undefined) return messageBytes(message.response);
  if (typeof message === "string") return Array.from(message, c => c.charCodeAt(0) & 255);
  return Array.from(message || []);
}

function receiveReply(message) {
  if (!["hello", "register", "mode", "panel", "brightness", "effect", "keepalive", "ready"].includes(phase)) return;
  const chunk = messageBytes(message);
  if (received.length + chunk.length > 4096) { fail(); return; }
  received = received.concat(chunk);
  while (received.length >= 4) {
    const size = (received[2] << 8) | received[3];
    if (received[0] !== 0xaa || received[1] !== 0x02 || size < 4 || size > 2048) {
      fail();
      return;
    }
    if (received.length < size) return;
    const reply = received.slice(0, size);
    received = received.slice(size);
    const replyOffset = ["hello", "keepalive"].includes(phase) ? 4 : 10;
    if (!expectedReply.length || !expectedReply.every((value, i) => reply[replyOffset + i] === value)) {
      unmatchedReplies++;
      continue;
    }
    if (size === 95 && reply[5] !== 2) {
      if (typeof device.log === "function") device.log("Key Light: comando TCP rifiutato; fase=" + phase + "; stato=" + reply[5], { toFile: true });
      fail();
      return;
    }
    if (ackReady || phase === "ready") continue;
    const elapsed = Date.now() - tcpSentAt;
    maxReplyMs = Math.max(maxReplyMs, elapsed);
    replyTotalMs += elapsed;
    replyCount++;
    // Captured device replies: spontaneous greeting 95B, hello ACK 28B,
    // registration ACK 95B. The greeting must never acknowledge the hello.
    if ((["hello", "keepalive"].includes(phase) && size === 28) || (["register", "mode", "panel", "brightness", "effect"].includes(phase) && size === 95)) ackReady = true;
  }
}

function connect(now) {
  if (!host() || now < nextTry || stopped) return;
  phase = "connecting";
  deadline = now + SESSION_TIMEOUT_MS;
  try {
    frameSocket.connect(host(), FRAME_PORT);
    socket.connect(host(), PORT);
  } catch (_) { fail(); }
}

export function Initialize() {
  if (typeof device.setFrameRateTarget === "function") device.setFrameRateTarget(25);
  stopped = false;
  reconnectToken = Number(controller.reconnectToken) || 0;
  device.setName(controller.name || "Razer Key Light Chroma");
  device.setSize([1, 1]);
  device.setControllableLeds(["Chroma"], [[0, 0]]);
  socket = tcp.createSocket();
  frameSocket = udp.createSocket();
  frameSocket.on("error", fail);
  if (typeof device.log === "function") device.log("Key Light: inizializzazione TCP " + controller.ip, { toFile: true });
  const onConnected = () => {
    if (phase === "connecting" && !stopped) waitForReply("hello", HELLO);
  };
  socket.on("connected", onConnected);
  socket.on("connection", onConnected);
  socket.on("message", receiveReply);
  socket.on("error", fail);
  socket.on("disconnected", fail);
  nextTry = 0;
  phase = "idle";
  connect(Date.now());
}

export function Render() {
  const now = Date.now();
  if (reportedPhase !== phase) {
    if (typeof device.log === "function") device.log("Key Light: fase " + phase + "; socket=" + (socket ? socket.state : "assente"), { toFile: true });
    reportedPhase = phase;
  }
  if (stopped) return;
  const requested = Number(controller.reconnectToken) || 0;
  if (requested !== reconnectToken) {
    reconnectToken = requested;
    fail();
    nextTry = 0;
    backoff = 1000;
  }
  if (phase === "idle") { connect(now); return; }
  if (phase !== "ready" && now >= deadline) { fail(); return; }
  if (["hello", "register", "mode", "panel", "brightness", "effect"].includes(phase)) {
    if (!ackReady) return;
    if (phase === "hello") { waitForReply("register", buildPacket(REGISTER)); return; }
    if (phase === "register") {
      waitForReply("mode", buildPacket(bytes("0a000403").concat(Array(9).fill(0))));
      return;
    }
    if (phase === "mode") {
      waitForReply("panel", buildPacket(bytes("030303002000")));
      return;
    }
    if (phase === "panel") {
      waitForReply("brightness", buildPacket(bytes("030f040000ff")));
      return;
    }
    if (phase === "brightness") {
      waitForReply("effect", buildPacket(bytes("0c0f02000508").concat(Array(9).fill(0))));
      return;
    }
    phase = "ready";
    lastKeepalive = now;
    if (typeof device.log === "function") device.log("Key Light: streaming Chroma UDP pronto, porta " + FRAME_PORT, { toFile: true });
    backoff = 1000;
    lastRGB = null;
    lastFrame = -Infinity;
    // Setup acknowledged one command at a time before streaming RGB.
  }
  if (phase === "keepalive" && ackReady) {
    phase = "ready";
    lastKeepalive = now;
  }
  if (!["ready", "keepalive"].includes(phase)) return;
  if (phase === "ready" && now - lastKeepalive >= 10000 && !waitForReply("keepalive", HELLO)) return;
  if (now - lastFrame < frameInterval()) return;
  const mapped = typeof device.getColors === "function" ? device.getColors("Inline", "RGB") : null;
  const rgb = typeof keyLightEnabled !== "undefined" && keyLightEnabled === false
    ? [0, 0, 0] : colorArray(lightingMode === "Colore fisso"
      ? device.createColorArray(forcedColor, 1, "Inline")
      : mapped && mapped.length >= 3 ? [mapped[0], mapped[1], mapped[2]] : device.color(0, 0));
  const key = rgb.join(",");
  // Latest frame only; refresh static UDP state without a backlog of TCP commands.
  if (key === lastRGB && now - lastFrame < 500) return;
  const packet = rgbPacket(rgb);
  try {
    if (frameSocket.send(packet) !== packet.length) { fail(); return; }
    framesSent++;
    lastRGB = key;
    lastFrame = now;
    if (now - lastReport >= 5000 && typeof device.log === "function") {
      device.log("Key Light: UDP frame=" + framesSent + "; RGB=" + key + "; TCP_ACK=" + replyCount + "; TCP_risposta_massima_ms=" + maxReplyMs + "; risposte_estranee=" + unmatchedReplies + "; sorgente=" + lightingMode, { toFile: true });
      lastReport = now;
      maxReplyMs = 0;
      replyTotalMs = 0;
      replyCount = 0;
      unmatchedReplies = 0;
    }
  } catch (_) { fail(); }
}

export function Shutdown() {
  try { if (["ready", "keepalive"].includes(phase)) frameSocket.send(rgbPacket([0, 0, 0])); } catch (_) {}
  stopped = true;
  phase = "idle";
  lastRGB = null;
  try { if (socket) socket.close(); } catch (_) {}
  try { if (frameSocket) frameSocket.close(); } catch (_) {}
}

export function DiscoveryService() {
  this.IconUrl = "";
  this.announced = false;
  this.status = "Ricerca Key Light...";
  this.Initialize = function () {
    service.log("Key Light: discovery avviato");
    this.Update();
  };
  this.Update = function () {
    if (this.announced || !DEFAULT_HOST) return;
    const id = "razer-keylight-" + DEFAULT_HOST;
    let light;
    try { if (service.hasController(id)) light = service.getController(id); } catch (_) {}
    if (!light) {
      light = {id, name:"Razer Key Light Chroma", ip:DEFAULT_HOST, port:PORT, update:function () {}};
      service.addController(light);
    } else {
      light.ip = DEFAULT_HOST;
      light.port = PORT;
      if (typeof light.update !== "function") light.update = function () {};
    }
    service.announceController(light);
    this.light = light;
    this.status = "Key Light configurata Â· " + light.ip + ":" + PORT;
    service.log("Key Light: controller annunciato su " + DEFAULT_HOST);
    this.announced = true;
  };
  this.Reconnect = function () {
    if (!this.light) { this.Update(); return; }
    this.light.reconnectToken = (Number(this.light.reconnectToken) || 0) + 1;
    service.updateController(this.light);
    this.status = "Riconnessione richiesta; stato TCP nella console del dispositivo";
  };
}

