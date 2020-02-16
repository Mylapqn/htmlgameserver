var http = require('http');
var server = http.createServer(function(request, response) {
  // process HTTP request. Since we're writing just WebSockets
  // server we don't have to implement anything.
});
var WebSocketServer = require('websocket').server;

var RSserver_port = process.env.PORT;
var RSserver_ip_address = process.env.IP;
var webSocketsServerPort = RSserver_port;

//var maxPingTimeout = 10;

var users = [];
var availableIDs = [];



var nextUserID = 0;

server.listen(webSocketsServerPort, function() {
  console.log((new Date()) + " RS Server is listening on IP " + RSserver_ip_address + " and port " + RSserver_port);
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
    users.push({connection:connection, id:userID});

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
        }
        else{
          if(messageData.subtype == "initName"){
            userName = messageData.name;
            sendAll(JSON.stringify({type:"info", data: "User " + userID + " has joined the chat."}));
            sendAll(JSON.stringify({type:"technical", subtype:"newUser",data: userID,name:userName}));
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