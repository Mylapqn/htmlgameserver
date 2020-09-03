//#region INIT
console.log("Start");
var http = require('http');
var server = http.createServer(function (request, response) {
});
var WebSocketServer = require('websocket').server;

var port = 20002;
var listenAddress = "wss://stuffgame.ws.coal.games/";
server.listen(webSocketsServerPort, function () {
  console.log((new Date()) + " WS Server is listening on address " + listenAddress + " and port " + port);
});

wsServer = new WebSocketServer({
  httpServer: server,
  keepaliveInterval: 5000,
  keepaliveGracePeriod: 1000,
  closeTimeout: 1000
});
//#endregion

wsServer.on('request', request => onRequest);

function onRequest(request) {
  console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
  var connection = request.accept(null, request.origin);
  connection.on('message', message => onMessage);
  connection.on('close', e => onClose);
}

function onMessage(message) {

  if (message.type === 'utf8') {
    messageData = JSON.parse(message.utf8Data);
  }
  if (message.type === "binary") {
    var receiveBuffer = message.binaryData;
    console.log(receiveBuffer);
    var bytesInput = [receiveBuffer.readDoubleLE(0), receiveBuffer.readDoubleLE(8)];
    var bytesRot = receiveBuffer.readFloatLE(16);
    var bytesShooting = receiveBuffer.readUInt8(20);
    console.log("Inp: " + bytesInput);
    console.log("Rot: " + bytesRot);
    console.log("Sht: " + bytesShooting);

  }
}

function onClose(e) {
  console.log((new Date()) + " Connection closed.");
}
