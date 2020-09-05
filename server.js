//#region INIT
var http = require('http');
var server = http.createServer(function (request, response) {
});
var WebSocketServer = require('ws').Server;
var port = 20002;
var listenAddress = "wss://stuffgame.ws.coal.games/";
server.listen(port, function () {
  console.log((new Date()) + " WS Server is listening on address " + listenAddress + " and port " + port);
});

/*wsServer = new WebSocketServer({
  httpServer: server,
  keepaliveInterval: 5000,
  keepaliveGracePeriod: 1000,
  closeTimeout: 1000
});*/
wsServer = new WebSocketServer({ server });
wsServer.on('connection', onConnection);
//#endregion

setInterval(() => {
  update();
}, 1000 / 30);
var nextUserID = 0;
var users = new Array();
var userCount = 0;

function User(connection) {
  this.id = nextUserID;
  nextUserID++;
  this.connection = null;
  this.player = new Player(this);
  return this.id;
}

function Player(user) {
  this.id = user.id;
  this.user = user;
  this.pos = { x: 0, y: 0 };
  this.velocity = { x: 0, y: 0 };
  this.input = { x: 0, y: 0 };
  this.targetRot = 0;
  this.rot = 0;
  this.name = "unnamedPlayer";
  this.color = { r: 0, g: 0, b: 0 };
}

var deltaTime = 1 / 30;
function update() {
  users.forEach(user => {
    var player = user.player;

    if (player == undefined) {
    }
    else {
      player.velocity = vector2add(player.velocity, player.input);
      player.pos = vector2add(player.pos, player.velocity);
      player.rot = player.targetRot;
      //console.log("Velocity of player "+player.id+": "+player.velocity.x);

    }
  });
}

/*
UPDATE MSG STRUCTURE:
  1:NewPlayerCount
  8-250:[
    2:id
    1:ai
    1:nameLength
    ?:name
    3:color
  ]
  1:PlayerCount
  40:[
    2:id
    16:pos
    8:vel
    4:rot
    4:hp
    4:shield
    2:shipID
  ]
  1:NewProjectileCount
  37:[
    2:id
    16:pos
    8:vel
    4:rot
    2:shooterid
    1:type
    4:dmg
  ]
  2:GuidedProjectileCount
  37:[
    2:id
    16:pos
    8:vel
    4:rot
    2:shooterid
    1:type
    4:dmg
  ]
  1:HitCount
  9:[
    2:id
    2:projectileID
    4:dmg
    1:death
  ]
*/

function serializeNewPlayer(user) {
  let p = user.player;
  let buf = new ArrayBuffer(7 + p.nameLength);
  let pos = 0;
  pos += writeBufferUInt16(buf, pos, user.id);
  pos += writeBufferUInt8(buf, pos, p.ai);
  pos += writeBufferUInt8(buf, pos, p.nameLength);
  pos += writeBufferString(buf, pos, p.nameLength, p.name);
  pos += writeBufferColor(buf, pos, p.color);
  console.log("Pos: " + pos);
  return buf;
}

function serializePlayer(user) {
  let p = user.player;
  let buf = new Buffer(40);
  let bytesID = new Uint16Array(buf, 0, 1);
  let bytesAI = new Uint8Array(buf, 2, 1);
  let bytesNameLength = new Uint8Array(buf, 3, 1);
  writeBufferString(buf, 4, p.nameLength, p.name);
  writeBufferColor(buf, 4 + p.nameLength, p.color);

  bytesID[0] = user.id;
  bytesAI[0] = p.ai;
  bytesNameLength[0] = p.nameLength;
}

function generateUpdateData() {
  var sendBuffer = Buffer.alloc(1024);

}

function sendAll(data) {
  users.forEach(u => {
    if (u.connection != null) {
      u.connection.send(data);
    }
  });
}

function onConnection(connection,request) {
  console.log((new Date()) + ' Connection from origin ' + request);
  var user = addUser(connection);
  connection.on('message', message => {
    onMessage(message, user.id);
  });
  connection.on('close', e => {
    onClose(e, user.id);
  });
}

function onMessage(message, userID) {
  var user = findUserWithID(userID);
  console.log("Message from " + userID + ":");
  console.log(message);

  var receiveBuffer = message;
  let pos = 0;
  var type = readBufferUInt8(receiveBuffer, pos);
  pos += 1;
  console.log("TYPE:" + type);
  if (type == 1) {
    let input = readBufferVector64(receiveBuffer, pos);
    pos += 16;
    let rot = readBufferFloat32(receiveBuffer, pos);
    pos += 4;
    let shoot = readBufferUInt8(receiveBuffer, pos);
    pos += 1;
    console.log("Inp: " + input);
    console.log("Rot: " + rot);
    console.log("Sht: " + shoot);

  }
  if (type == 2) {
    var nameLength = readBufferUInt8(receiveBuffer,pos);
    pos += 1;
    var name = readBufferString(receiveBuffer, pos, nameLength);
    pos += nameLength;
    var color = readBufferColor(receiveBuffer, pos);
    console.log("Nam: " + name);
    console.log("Col: " + color);
    if (user.player == undefined) {
      //user.player = new Player(user);
      console.log("No player wotrf");
    }
    else {
      user.player.name = name;
      user.player.color = color;
      user.player.nameLength = nameLength;

      serializeNewPlayer(user);
    }


  }
}

function onClose(e, userID) {
  console.log((new Date()) + " Connection closed from User " + userID);
  removeUser(findUserWithID(userID));
}


function readBufferString(buffer, position, length) {
  var bytesString = new Uint8Array(buffer, position, length);
  var stringDecoded = new TextDecoder().decode(bytesString);
  return stringDecoded;
}

function readBufferColor(buffer, position) {
  let bytesColor = new Uint8Array(buffer, position, 3);
  let color = {
    r: bytesColor[0],
    g: bytesColor[1],
    b: bytesColor[2]
  }
  return color;
}



function readBufferUInt8(buffer, position) {
  let bytesInt = new Uint8Array(buffer, position, 1);
  let value = bytesInt[0];
  return value;
}
function readBufferUInt16(buffer, position) {
  let bytesInt = new Uint16Array(buffer, position, 1);
  let value = bytesInt[0];
  return value;
}
function readBufferFloat32(buffer, position) {
  let bytesFloat = new Float32Array(buffer, position, 1);
  let value = bytesFloat[0];
  return value;
}
function readBufferFloat64(buffer, position) {
  let bytesDouble = new Float64Array(buffer, position, 1);
  let value = bytesDouble[0];
  return value;
}
function readBufferVector32(buffer, position) {
  let bytesFloat = new Float32Array(buffer, position, 2);
  let vector = {
    x: bytesFloat[0],
    y: bytesFloat[1]
  }
  return vector;
}
function readBufferVector64(buffer, position) {
  let bytesDouble = new Float64Array(buffer, position, 2);
  let vector = {
    x: bytesDouble[0],
    y: bytesDouble[1]
  }
  return vector;
}

function writeBufferColor(buffer, position, color) {
  let bytesColor = new Uint8Array(buffer, position, 3);
  bytesColor[0] = color.r;
  bytesColor[1] = color.g;
  bytesColor[2] = color.b;
  return 3;
}

function writeBufferString(buffer, position, length, string) {
  let bytesString = new Uint8Array(buffer, position, length);
  new TextEncoder().encodeInto(string, bytesString);
  return length;
}

function writeBufferUInt8(buffer, position, value) {
  let bytesInt = new Uint8Array(buffer, position, 1);
  bytesInt[0] = value;
  return 1;
}
function writeBufferUInt16(buffer, position, value) {
  let bytesInt = new Uint16Array(buffer, position, 1);
  bytesInt[0] = value;
  return 2;
}
function writeBufferFloat32(buffer, position, value) {
  let bytesFloat = new Float32Array(buffer, position, 1);
  bytesFloat[0] = value;
  return 4;
}
function writeBufferFloat64(buffer, position, value) {
  let bytesDouble = new Float64Array(buffer, position, 1);
  bytesDouble[0] = value;
  return 8;
}
function writeBufferVector32(buffer, position, vector) {
  let bytesFloat = new Float32Array(buffer, position, 2);
  bytesFloat[0] = vector.x;
  bytesFloat[1] = vector.y;
  return 8;
}
function writeBufferVector64(buffer, position, vector) {
  let bytesDouble = new Float64Array(buffer, position, 2);
  bytesDouble[0] = vector.x;
  bytesDouble[1] = vector.y;
  return 16;
}

function findUserWithID(id) {
  for (let i = 0; i < users.length; i++) {
    if (id == users[i].id) return users[i];

  }
  return null;
}

function userIDtoIndex(id) {
  for (let i = 0; i < users.length; i++) {
    if (id == users[i].id) return i;

  }
  return null;
}

function addUser(connection) {
  var user = new User(connection);
  users.push(user);
  userCount++;
  return user;

}

function removeUser(user) {
  if (user.connection != null) {
    if (user.connection.connected) {
      user.connection.close(1000, "User removed");
    }
  }
  users.splice(userIDtoIndex(user.id), 1);
  userCount--;

}

function vector2add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}
function vector2multiply(vector, number) {
  return { x: vector.x * number, y: vector.y * number };
}
function vector2copy(vector) {
  return { x: vector.x, y: vector.y };
}

