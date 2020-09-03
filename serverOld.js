var http = require('http');
var server = http.createServer(function(request, response) {
  // process HTTP request. Since we're writing just WebSockets
  // server we don't have to implement anything.
});
var WebSocketServer = require('websocket').server;

/*var RSserver_port = process.env.PORT;
var RSserver_ip_address = process.env.IP;
var webSocketsServerPort = RSserver_port;*/
var RSserver_port = 20002;
var RSserver_ip_address = "wss://stuffgame.ws.coal.games/";
var webSocketsServerPort = RSserver_port;

//var maxPingTimeout = 10;

var users = [];
var availableIDs = [];

function Player(id) {
	this.name = "unnamed";
	this.ai = false;
	this.id = id;
	this.pos = { x: 0, y: 0 };
	this.rot = 0;
	this.speed = 850;
	this.thrust = 1000;
	this.velocity = { x: 0, y: 0 };
	this.rotationSpeed = 4;
	this.color = { r: 100, g: 80, b: 200 };
	this.hitbox = [];
	this.hp = 10;
	this.maxHp = 10;
	this.team = 1;
	this.level = 0;
	this.size = 100;
	this.energy = 100;
	this.maxEnergy = 100;
	this.energyRecharge = 15;
	this.shield = 3;
	this.maxShield = 3;
	this.shieldRecharge = .4;
	this.shieldEnergyCost = 20;
	this.shieldEnabled = true;
	this.engineEnergyCost = 5;
	this.shipID = 0;
	this.score = 0;
	this.initialised = false;
	//this.ship = ships[0];
};

var nextUserID = 0;

server.listen(webSocketsServerPort, function() {
  console.log((new Date()) + " RS Server is listening on address " + RSserver_ip_address + " and port " + RSserver_port);
  console.log((new Date()) + " WS Server is listening on port " + webSocketsServerPort);
});

/*setInterval(function(){
  for (var i=0; i<users.length;i++){
    users[i].connection.emit('pingTimer');
  }
}, 1000);*/

// create the server
wsServer = new WebSocketServer({
  httpServer: server,
  keepaliveInterval: 5000,
  keepaliveGracePeriod: 1000,
  closeTimeout: 1000
});

var userCount = 0;


function sendAll(s){
  for (var i=0; i<users.length;i++){
    users[i].connection.sendUTF(s);

  }
}
/*function shiftAllIDs(from){
  for (var i=from; i<users.length;i++){
    users[i].connection.emit('shiftID');
    users[i].connection.sendUTF(JSON.stringify({type:"technical", subtype:"userID", data: i}));
  }
}*/

// WebSocket server
wsServer.on('request', function(request) {
  console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
  var connection = request.accept(null, request.origin);
  var userID, userName;

  //var pingTimeout = 0;
  /*if(availableIDs.length > 0){
    userID = availableIDs[0];
    availableIDs.splice(0, 1);
  }
  else {*/
    userID = nextUserID;
    nextUserID++;

    userCount++;
    users.push({connection:connection, id:userID/*, score:0*/});

  //}
  connection.sendUTF(JSON.stringify({type:"technical", subtype:"init", data: userID}));
  connection.sendUTF(JSON.stringify({type:"technical", subtype:"userID", data: userID}));
  var userIDs = [];
  for(var i=0;i<users.length;i++){
    userIDs.push(users[i].id);
  }
  console.log("PlayerIDs",userIDs, users);
  connection.sendUTF(JSON.stringify({type:"technical", subtype:"playerIDs", data: userIDs.toString()}));
  
  console.log(" users: "+userCount);
  console.log((new Date()) + ' Connection accepted. UserID = ' + userID);
  console.log(" new users: "+userCount);
  



  connection.sendUTF(JSON.stringify({type:"technical", subtype:"start"}));


  // This is the most important callback for us, we'll handle
  // all messages from users here.
  connection.on('message', function(message) {
    if (message.type === 'utf8') {
        //console.log((new Date()) + ' New message: ' + message.utf8Data);
        messageData = JSON.parse(message.utf8Data);
        
        if(messageData.type != "technical"){
          sendAll(JSON.stringify({type:"message", userID:userID, data: message.utf8Data}));
          /*if(messageData.type == "score"){
            var messageContent = JSON.parse(messageData.data);
            users[userIDtoIndex(messageContent.killer)].score = messageContent.score;
          }*/
        }
        else{
          if(messageData.subtype == "initData"){
            userName = messageData.name;
            sendAll(JSON.stringify({type:"info", data: "User " + userID + " has joined the chat."}));
            sendAll(JSON.stringify({type:"technical", subtype:"newUser",data: userID,name:userName,color:messageData.color}));
            sendAll(JSON.stringify({type:"technical", subtype:"userCount",data: userCount}));
          }
          /*if(messageData.subtype == "ping"){
            pingTimeout = 0;
            if(messageData.requestReply){
              connection.sendUTF(JSON.stringify({type:"technical", subtype:"ping", requestReply:false}));
            }
          }*/
        }
        
    }
    if (message.type === "binary") {
      var receiveBuffer = message.binaryData;
      console.log(receiveBuffer);
      var bytesInput = [receiveBuffer.readDoubleLE(0),receiveBuffer.readDoubleLE(8)];
      var bytesRot = receiveBuffer.readFloatLE(16);
      var bytesShooting = receiveBuffer.readUInt8(20);
      console.log("Inp: " + bytesInput);
      console.log("Rot: " + bytesRot);
      console.log("Sht: " + bytesShooting);

    }
  });

  connection.on('close', function(connection) {
    console.log((new Date()) + ' Connection closed. UserID = ' + userID);
    userCount--;
    users.splice(userIDtoIndex(userID), 1);
    sendAll(JSON.stringify({type:"info", data: "User " + userID + " has left the chat. "}));
    sendAll(JSON.stringify({type:"technical", subtype:"leaveUser",data: userID}));
    sendAll(JSON.stringify({type:"technical", subtype:"userCount",data: userCount}));
    if(userID < users.length){
      //availableIDs.push(userID);
      //shiftAllIDs(userID);
    }

    console.log("remaining users: "+users.length);
  });
  /*connection.on('shiftID', function(){
    console.log("shifting ID from" + userID);
    userID--;
  });*/

  /*connection.on('pingTimer', function(){
    pingTimeout++;
    if(pingTimeout > maxPingTimeout){
      console.log("Disconnecting user " + userID + " due to inactivity");
      connection.close();
    }
  });*/
});

function userIDtoIndex(userID) {
	for (var i = 0; i < users.length; i++) {
		//console.log("Player index from id: scanning index " + i + " for ID " + playerID + ". Found ID: " + players[i].ID);
		if (users[i].id == userID) {
			return i;
		}
	}
	return null;
}