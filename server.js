var http = require('http');
var server = http.createServer(function(request, response) {
  // process HTTP request. Since we're writing just WebSockets
  // server we don't have to implement anything.
});
var WebSocketServer = require('websocket').server;

var RSserver_port = process.env.PORT;
var RSserver_ip_address = process.env.IP;
var webSocketsServerPort = RSserver_port;

var users = [];
var availableIDs = [];

server.listen(webSocketsServerPort, function() {
  console.log((new Date()) + " RS Server is listening on IP " + RSserver_ip_address + " and port " + RSserver_port);
  console.log((new Date()) + " WS Server is listening on port " + webSocketsServerPort);
});

// create the server
wsServer = new WebSocketServer({
  httpServer: server
});

var userCount = 0;

function sendAll(s){
  for (var i=0; i<users.length;i++){
    users[i].sendUTF(s);
  }
}
function shiftAllIDs(from){
  for (var i=from; i<users.length;i++){
    users[i].emit('shiftID');
    users[i].sendUTF(JSON.stringify({type:"technical", subtype:"userID", data: i-1}));
  }
}

// WebSocket server
wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
  var connection = request.accept(null, request.origin);
  var userID;
  if(availableIDs.length > 0){
    userID = availableIDs[0];
    availableIDs.splice(0, 1);
  }
  else {
    userID = users.length;
  }
  console.log(" users: "+users.length);
  users.push(connection);
  console.log((new Date()) + ' Connection accepted. UserID = ' + userID);
  console.log(" new users: "+users.length);
 
  sendAll(JSON.stringify({type:"info", data: "User " + userID + " has joined the chat."}));
  sendAll(JSON.stringify({type:"technical", subtype:"userCount",data: users.length}));

  userCount++;
  connection.sendUTF(JSON.stringify({type:"technical", subtype:"userID", data: userID}));

  // This is the most important callback for us, we'll handle
  // all messages from users here.
  connection.on('message', function(message) {
    if (message.type === 'utf8') {
        console.log((new Date()) + ' New message: ' + message.utf8Data);
        
          sendAll(JSON.stringify({type:"message", data: "User " + userID + ": " + message.utf8Data}));
        
    }
  });

  connection.on('close', function(connection) {
    console.log((new Date()) + ' Connection closed. UserID = ' + userID);
    userCount--;
    users.splice(userID, 1);
    sendAll(JSON.stringify({type:"info", data: "User " + userID + " has left the chat. "}));
    if(userID < users.length){
      availableIDs.push(userID);
      shiftAllIDs(userID);
    }
    sendAll(JSON.stringify({type:"technical", subtype:"userCount",data: users.length}));

    console.log("remaining users: "+users.length);
  });
  connection.on('shiftID', function(){
    console.log("shifting ID from" + userID);
    userID--;
  });
});