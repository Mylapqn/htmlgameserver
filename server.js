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
}, 1000 / 1);
var nextUserID = 0;
var users = new Array();
var newUsers = new Array();
var userCount = 0;

function User(connection) {
  this.id = nextUserID;
  nextUserID++;
  this.connection = connection;
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
  this.hp = 10;
  this.shieldHP = 5;
  this.shieldEnabled = true;
  this.shipID = 0;
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
  var data = generateUpdateData();
  users.forEach(u => {
    u.connection.send(data);
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
  41:[
    2:id
    16:pos
    8:vel
    4:rot
    4:hp
    4:shield
    1:shieldEnabled
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
  console.log("TRYING SERIALISATION " + p.id + " " + buf.byteLength + " " + p.nameLength);
  pos += writeBufferUInt16(buf, pos, user.id);
  pos += writeBufferUInt8(buf, pos, p.ai);
  pos += writeBufferUInt8(buf, pos, p.nameLength);
  pos += writeBufferString(buf, pos, p.nameLength, p.name);
  pos += writeBufferColor(buf, pos, p.color);
  console.log("NEW PLAYER SERIALISED");
  console.log("Pos: " + pos);
  return buf;
}

function serializePlayer(user) {
  let p = user.player;
  let buf = new ArrayBuffer(44);
  let pos = 0;
  pos += writeBufferUInt16(buf, pos, user.id);
  pos += writeBufferVector64(buf, pos, p.pos);
  pos += writeBufferVector32(buf, pos, p.velocity);
  pos += writeBufferFloat32(buf, pos, p.rot);
  pos += writeBufferFloat32(buf, pos, p.hp);
  pos += writeBufferFloat32(buf, pos, p.shieldHP);
  pos += writeBufferFloat32(buf, pos, p.shieldEnabled);
  pos += writeBufferUInt16(buf, pos, p.shipID);

  return buf;
}

function generateUpdateData() {
  var buf = new ArrayBuffer(1024);
  let pos = 0;
  pos += writeBufferUInt8(buf, pos, newUsers.length);
  for (let i = newUsers.length - 1; i >= 0; i--) {
    let u = newUsers.pop();
    console.log("SERIALISING NEW USER " + u.id);
    pos += writeBufferBuffer(buf, pos, serializeNewPlayer(u));

  }
  pos += writeBufferUInt8(buf, pos, users.length);
  users.forEach(u => {
    pos += writeBufferBuffer(buf, pos, serializePlayer(u));
  });
  console.log("UPDATE GENERATED, POS: " + pos);
  return buf.slice(0, pos);

}

function sendAll(data) {
  users.forEach(u => {
    if (u.connection != null) {
      u.connection.send(data);
    }
  });
}

function onConnection(connection, request) {
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

  //var receiveBuffer = message.buffer.slice(message.byteOffset,message.byteOffset+message.byteLength);
  var receiveBuffer = message;
  console.log(receiveBuffer);
  var pos = 0;
  var type = readBufferUInt8(receiveBuffer, pos);
  pos += 1;
  console.log("TYPE:" + type);
  if (type == 1) {
    let input = readBufferVector32(receiveBuffer, pos);
    pos += 8;
    let rot = readBufferFloat32(receiveBuffer, pos);
    pos += 4;
    let shoot = readBufferUInt8(receiveBuffer, pos);
    pos += 1;
    console.log("Inp: " + input.x + " " + input.y);
    console.log("Rot: " + rot);
    console.log("Sht: " + shoot);

  }
  if (type == 2) {
    var nameLength = readBufferUInt8(receiveBuffer, pos);
    console.log("AKLKKKKKKKKKKKKKKKKKKKKKKKKK" + nameLength);
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
      let print = "==|";
      for (let i = 0; i < name.length; i++) {
        print += name[i];
        print += "|"

      }
      print += "|=="
      console.log(print + name.length + " "+nameLength);

      user.player.name = name;
      user.player.color = color;
      user.player.nameLength = nameLength;
      newUsers.push(user);

    }


  }
}

function onClose(e, userID) {
  console.log((new Date()) + " Connection closed from User " + userID);
  removeUser(findUserWithID(userID));
}


function readBufferString(buffer, position, length) {
  /*var bytesString = new Uint8Array(buffer, position, length);
  console.log("------------------", bytesString);
  var stringDecoded = new TextDecoder().decode(bytesString);
  return stringDecoded;*/

  return buffer.toString("utf8",position, length);
}

function readBufferColor(buffer, position) {
  let color = {
    r: buffer.readUInt8(position),
    g: buffer.readUInt8(position + 1),
    b: buffer.readUInt8(position + 2)
  }
  return color;
}



function readBufferUInt8(buffer, position) {
  let value = buffer.readUInt8(position);
  return value;
}
function readBufferUInt16(buffer, position) {

  let value = buffer.readUInt16(position);
  return value;
}
function readBufferFloat32(buffer, position) {
  let value = buffer.readFloatBE(position);
  return value;
}
function readBufferFloat64(buffer, position) {
  let value = buffer.readDoubleBE(position);
  return value;
}
function readBufferVector32(buffer, position) {
  let vector = {
    x: buffer.readFloatBE(position),
    y: buffer.readFloatBE(position + 4)
  }
  return vector;
}
function readBufferVector64(buffer, position) {
  let vector = {
    x: buffer.readDoubleBE(position),
    y: buffer.readDoubleBE(position + 8)
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
  let print = "--|";
  for (let i = 0; i < string.length; i++) {
    print += string[i];
    print += "|"

  }
  print += "|--"
  console.log(print);
  console.log("POPPPPPPPPPPPPPPPPPPPP" + string.length + " " + new TextEncoder().encode(string).byteLength + " " + length);
  bytesString.set(new TextEncoder().encode(string), 0);
  console.log("iiiiiiiii" + new TextDecoder().decode(new TextEncoder().encode(string)));
  console.log("KOOOOOOOOOOOOOOOOOOOOO");
  console.log("lllllllll" + string);
  console.log("|||||||||" + new TextDecoder().decode(bytesString));
  return length;
}

function writeBufferUInt8(buffer, position, value) {
  let bytesInt = new Uint8Array(buffer, position, 1);
  bytesInt[0] = value;
  return 1;
}
function writeBufferUInt16(buffer, position, value) {
  let bytesInt = new DataView(buffer, position, 2);
  bytesInt.setUint16(0, value);
  return 2;
}
function writeBufferFloat32(buffer, position, value) {
  let bytesFloat = new DataView(buffer, position, 4);
  bytesFloat.setFloat32(0, value);
  return 4;
}
function writeBufferFloat64(buffer, position, value) {
  let bytesDouble = new DataView(buffer, position, 8);
  bytesDouble.setFloat64(0, value);
  return 8;
}
function writeBufferVector32(buffer, position, vector) {
  let bytesFloat = new DataView(buffer, position, 8);
  bytesFloat.setFloat32(0, vector.x);
  bytesFloat.setFloat32(4, vector.y);
  return 8;
}
function writeBufferVector64(buffer, position, vector) {
  let bytesDouble = new DataView(buffer, position, 16);
  bytesDouble.setFloat64(0, vector.x);
  bytesDouble.setFloat64(8, vector.y);
  return 16;
}

function writeBufferBuffer(target, position, source) {
  var s = new Uint8Array(source);
  var t = new Uint8Array(target);
  t.set(s, position);
  return s.byteLength;
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

