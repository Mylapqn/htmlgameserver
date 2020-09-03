//#region INIT
var http = require('http');
var server = http.createServer(function (request, response) {
});
var WebSocketServer = require('websocket').server;
var port = 20002;
var listenAddress = "wss://stuffgame.ws.coal.games/";
server.listen(port, function () {
  console.log((new Date()) + " WS Server is listening on address " + listenAddress + " and port " + port);
});

wsServer = new WebSocketServer({
  httpServer: server,
  keepaliveInterval: 5000,
  keepaliveGracePeriod: 1000,
  closeTimeout: 1000
});
wsServer.on('request', onRequest);
//#endregion

var nextUserID = 0;
var users = new Array();

function User(connection) {
  this.id = nextUserID;
  nextUserID++;
  this.connection = null;
  return this.id;
}



function onRequest(request) {
  console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
  var connection = request.accept(null, request.origin);
  var user = new User(connection);
  users.push(user);

  connection.on('message', message => {
    onMessage(message, user.id);
  });
  connection.on('close', e => {
    onClose(e, user.id);
  });
}

function onMessage(message, userID) {

  if (message.type === 'utf8') {
    messageData = JSON.parse(message.utf8Data);
  }
  if (message.type === "binary") {
    var receiveBuffer = message.binaryData;
    console.log("Received message from User "+userID)
    console.log(receiveBuffer);
    var type = receiveBuffer.readUInt8(0);
    if (type == 1) {
      var bytesInput = [receiveBuffer.readDoubleLE(1), receiveBuffer.readDoubleLE(9)];
      var bytesRot = receiveBuffer.readFloatLE(17);
      var bytesShooting = receiveBuffer.readUInt8(21);
      console.log("Inp: " + bytesInput);
      console.log("Rot: " + bytesRot);
      console.log("Sht: " + bytesShooting);
    }
    if (type == 2) {
      var nameLength = receiveBuffer.readUInt8(1);
      var name = readBufferString(receiveBuffer, 2, nameLength);
      var color = readBufferColor(receiveBuffer, 2 + nameLength);
      console.log("Nam: " + name);
      console.log("Col: " + color);
    }

  }
}

function onClose(e,userID) {
  console.log((new Date()) + " Connection closed from User " + userID);
}

function readBufferColor(buffer,position) {
  var r = buffer.readUInt8(position);
  var g = buffer.readUInt8(position+1);
  var b = buffer.readUInt8(position + 2);
  return { r: r, g: g, b: b };
}

function readBufferString(buffer, position, length) {
  var bytesString = [];
  for (var i = 0; i < length; i++) {
    bytesString.push(buffer.readUInt8(position + i));
    
  }
  var stringDecoded = new TextEncoder().decode(bytesString);
  return stringDecoded;
}
