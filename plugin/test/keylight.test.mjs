import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../Razer_Key_Light_Chroma.js',import.meta.url),'utf8');
const vendor=JSON.parse(readFileSync(new URL('./fixtures/keylight-vendor-protocol.json',import.meta.url),'utf8'));
const hello=Buffer.from('aa02001c020912022026010900110000401500000001c43c0001c43c','hex');
const greeting=Buffer.alloc(95);
Buffer.from('aa02005f00020000000050004901','hex').copy(greeting);
let checks=0;
function check(name,value){assert(value,name);checks++;console.log('ok - '+name);}
function response(packet){
  if(packet.length===19)return hello;
  const reply=Buffer.from(packet);reply[1]=2;reply[5]=2;
  reply[93]=reply.subarray(7,93).reduce((a,b)=>a^b,0);return reply;
}
function load(host=''){
  let now=1000;
  const tcpSockets=[],udpSockets=[],added=[],announced=[],updated=[];
  function factory(list,port){return {createSocket(){
    const socket={state:0,ConnectedState:3,packets:[],handlers:{},connections:0,closed:0,
      on(name,fn){assert(!this.handlers[name],'duplicate socket callback');this.handlers[name]=fn;},
      connect(ip,p){assert.equal(p,port);this.lastHost=ip;this.connections++;this.state=3;},
      send(packet){this.packets.push(Array.from(packet));return packet.length;},
      close(){this.closed++;this.state=0;}};
    list.push(socket);return socket;
  }};}
  const context={Date:{now:()=>now},controller:{ip:'192.0.2.10',name:'Key Light'},
    lightingMode:'Canvas',forcedColor:'#ffffff',keyLightFrameRate:'25',
    device:{setName(){},setSize(){},setControllableLeds(){},color(){return [255,255,255];},
      createColorArray(c){return c.slice(1).match(/../g).map(v=>parseInt(v,16));}},
    service:{log(){},hasController(){return false;},getController(){},
      addController(c){added.push(c);},announceController(c){announced.push(c);},updateController(c){updated.push(c);}},
    tcp:factory(tcpSockets,10003),udp:factory(udpSockets,10005)};
  vm.createContext(context);
  vm.runInContext(source.replace(/^import .*;\r?$/gm,'').replace(/export function /g,'function ')
    .replace(/const DEFAULT_HOST = "[^"]*";/,'const DEFAULT_HOST = '+JSON.stringify(host)+';'),context);
  return {context,tcpSockets,udpSockets,added,announced,updated,tick(ms=40){now+=ms;context.Render();},evaluate(code){return vm.runInContext(code,context);}};
}
function ack(t){const s=t.tcpSockets[0];s.handlers.message(response(s.packets.at(-1)));t.tick(1);}
function ready(t){t.context.Initialize();t.tcpSockets[0].handlers.connection();for(let i=0;i<6;i++)ack(t);assert.equal(t.evaluate('phase'),'ready');}
function rgb(s){return s.packets.at(-1).slice(18,21);}
const codec=load();
for(const item of vendor){
  const cmd={SetDeviceMode:'0a0004',SetChromaEffect:'0c0f02',SetChromaBrightness:'030f04',SetLEDBrightness:'030303'}[item.command];
  const expression=item.command==='SetChromaFrame'?'rgbPacket('+JSON.stringify(item.args.slice(5,8))+')'
    :'buildPacket(bytes('+JSON.stringify(cmd)+').concat('+JSON.stringify(item.args)+'))';
  check('exact vendor SDK parity '+item.command+' '+item.args.join(','),Buffer.from(codec.evaluate(expression)).toString('hex')===item.hex);
  check('vendor destination UDP 10005',item.destination_port===10005);
}
for(const c of [[0,0,0],[255,255,255],[0,255,0],[255,0,255]]){
  const p=Array.from(codec.evaluate('rgbPacket('+JSON.stringify(c)+')'));
  check('95-byte frame matches declared size',p.length===95 && p[3]===95);
  check('RGB exact and white off',JSON.stringify(p.slice(18,21))===JSON.stringify(c) && p[21]===0);
  check('CRC covers inner report',p[93]===p.slice(7,93).reduce((a,b)=>a^b,0) && p[94]===0);
}
const test=load();test.context.Initialize();const tcp=test.tcpSockets[0],udp=test.udpSockets[0];
check('one socket per transport',test.tcpSockets.length===1 && test.udpSockets.length===1);
check('no commands before TCP connection',tcp.packets.length===0 && udp.packets.length===0);
tcp.handlers.connection();check('only hello before ACK',tcp.packets.length===1 && tcp.packets[0].length===19);
tcp.handlers.message(greeting);test.tick();check('greeting cannot acknowledge hello',tcp.packets.length===1);
tcp.handlers.message({buffer:Uint8Array.from(hello.slice(0,3)).buffer});test.tick();check('partial hello waits',tcp.packets.length===1);
tcp.handlers.message({data:hello.slice(3)});test.tick(1);check('hello ACK starts registration',tcp.packets.length===2);
tcp.handlers.message(greeting);test.tick();check('unrelated same-size ACK ignored',tcp.packets.length===2);
ack(test);check('software mode selected',Buffer.from(tcp.packets.at(-1)).toString('hex')===vendor.find(x=>x.command==='SetDeviceMode').hex);
const mode=response(tcp.packets.at(-1));tcp.handlers.message(mode.slice(0,94));test.tick();check('partial mode ACK holds setup',test.evaluate('phase')==='mode');
tcp.handlers.message(mode.slice(94));test.tick();check('white panel off',Buffer.from(tcp.packets.at(-1).slice(10,16)).toString('hex')==='030303002000');
ack(test);check('full Chroma brightness',Buffer.from(tcp.packets.at(-1).slice(10,16)).toString('hex')==='030f040000ff');
ack(test);check('custom effect profile zero',Buffer.from(tcp.packets.at(-1).slice(10,16)).toString('hex')==='0c0f02000508');
check('no UDP before setup completes',udp.packets.length===0);
ack(test);check('first white is UDP',udp.packets.length===1 && JSON.stringify(rgb(udp))==='[255,255,255]');
const setup=tcp.packets.length;
test.context.device.color=()=>[255,0,0];test.tick(10);check('frame cap holds intermediate',udp.packets.length===1);
test.context.device.color=()=>[0,255,0];test.tick(30);check('latest color without TCP RGB ACK',udp.packets.length===2 && JSON.stringify(rgb(udp))==='[0,255,0]');
check('RGB never enters TCP queue',tcp.packets.length===setup);
const unchanged=udp.packets.length;test.tick(499);check('static frame deduplicated',udp.packets.length===unchanged);
test.tick(1);check('static keepalive 500 ms',udp.packets.length===unchanged+1);
test.context.lightingMode='Colore fisso';test.context.forcedColor='#0000ff';test.tick(40);check('fixed RGB exact',JSON.stringify(rgb(udp))==='[0,0,255]');
test.context.keyLightFrameRate='5';test.context.forcedColor='#ff0000';const gated=udp.packets.length;
test.tick(199);check('five FPS waits 199 ms',udp.packets.length===gated);test.tick(1);check('five FPS sends at 200 ms',udp.packets.length===gated+1);
test.context.keyLightFrameRate='60';check('invalid rate keeps device-advertised 25 Hz',test.evaluate('frameInterval()')===40);
test.tick(10000);check('heartbeat uses hello',tcp.packets.length===setup+1 && tcp.packets.at(-1).length===19);
const heartbeat=udp.packets.length;test.context.forcedColor='#00ffff';test.tick(40);
check('UDP continues during heartbeat',udp.packets.length===heartbeat+1 && JSON.stringify(rgb(udp))==='[0,255,255]');
ack(test);check('heartbeat ACK returns ready',test.evaluate('phase')==='ready');
const beforeOff=udp.packets.length;test.context.Shutdown();check('shutdown one UDP black',udp.packets.length===beforeOff+1 && JSON.stringify(rgb(udp))==='[0,0,0]');
check('both sockets close',tcp.closed===1 && udp.closed===1);test.tick(10000);check('no reconnect after shutdown',tcp.connections===1 && udp.connections===1);
const failed=load();ready(failed);const broken=failed.udpSockets[0];broken.send=()=>-1;failed.context.device.color=()=>[1,2,3];failed.tick();
check('failed UDP closes both',failed.evaluate('phase')==='idle' && broken.closed===1 && failed.tcpSockets[0].closed===1);
failed.tick(999);check('initial backoff one second',broken.connections===1);failed.tick(1);check('retry reuses sockets',broken.connections===2 && failed.udpSockets.length===1 && failed.tcpSockets.length===1);
failed.tick(2000);check('connection timeout backs off',failed.evaluate('phase')==='idle');failed.tick(1999);check('backoff doubles',broken.connections===2);failed.tick(1);check('doubled backoff retry once',broken.connections===3);
for(const bad of [[0,2,0,28],[0xaa,2,0,3],[0xaa,2,8,1],Array(4097).fill(0)]){
  const t=load();t.context.Initialize();t.tcpSockets[0].handlers.connected();t.tcpSockets[0].handlers.message(Uint8Array.from(bad));
  check('invalid header length or overflow '+bad.length,t.evaluate('phase')==='idle' && t.evaluate('received.length')===0);
}
const rejected=load();rejected.context.Initialize();rejected.tcpSockets[0].handlers.connected();ack(rejected);ack(rejected);const refusal=response(rejected.tcpSockets[0].packets.at(-1));refusal[5]=5;rejected.tcpSockets[0].handlers.message(refusal);check('device rejection cannot enable UDP streaming',rejected.evaluate('phase')==='idle' && rejected.udpSockets[0].packets.length===0);
const merged=load();merged.context.Initialize();merged.tcpSockets[0].handlers.connected();merged.tcpSockets[0].handlers.message(Buffer.concat([greeting,hello]));merged.tick();check('coalesced greeting and ACK',merged.tcpSockets[0].packets.length===2);
const timeout=load();ready(timeout);timeout.tick(10000);timeout.tick(2000);check('heartbeat timeout reconnects',timeout.evaluate('phase')==='idle');
const managed=load();managed.context.keyLightHost=' 192.0.2.42 ';managed.context.Initialize();check('host applies to both transports',managed.tcpSockets[0].lastHost==='192.0.2.42' && managed.udpSockets[0].lastHost==='192.0.2.42');
managed.context.controller.reconnectToken=1;managed.tick(1);check('token reconnects both once',managed.tcpSockets[0].connections===2 && managed.udpSockets[0].connections===2);managed.tick(1);check('same token does not repeat',managed.tcpSockets[0].connections===2);
managed.context.keyLightHost='192.0.2.43';managed.context.onkeyLightHostChanged();managed.tick(1);check('host change reaches both',managed.tcpSockets[0].lastHost==='192.0.2.43' && managed.udpSockets[0].lastHost==='192.0.2.43');
const empty=load();vm.runInContext('this.discovery=new DiscoveryService()',empty.context);empty.context.discovery.Update();check('empty discovery no controller',empty.announced.length===0);
const discovery=load('192.0.2.10');vm.runInContext('this.discovery=new DiscoveryService()',discovery.context);discovery.context.discovery.Update();discovery.context.discovery.Update();check('one controller',discovery.added.length===1 && discovery.announced.length===1 && discovery.announced[0].port===10003);
discovery.context.discovery.Reconnect();check('reconnect existing controller',discovery.updated.length===1 && discovery.updated[0].reconnectToken===1 && discovery.announced.length===1);
console.log('\n'+checks+' passati, 0 falliti; sincronizzazione ottica da verificare.');
