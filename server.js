var WebSocketServer = require('websocket').server;
var http = require('http');
var webSocketsServerPort = 8000;

var RSserver_port = process.env.OPENSHIFT_NODEJS_PORT;
var RSserver_ip_address = process.env.OPENSHIFT_NODEJS_IP;

var users = [];

var server = http.createServer(function(request, response) {
  // process HTTP request. Since we're writing just WebSockets
  // server we don't have to implement anything.
});
server.listen(webSocketsServerPort, function() {
  console.log((new Date()) + " RS Server is listening on IP " + RSserver_ip_address + " and port " + RSserver_port);
  console.log((new Date()) + " WS Server is listening on port " + webSocketsServerPort);
});

// create the server
wsServer = new WebSocketServer({
  httpServer: server
});

var userCount = 0;

// WebSocket server
wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
  var connection = request.accept(null, request.origin);
  var userID = userCount;
  console.log(" users: "+users.length);
  users.push(connection);
  console.log((new Date()) + ' Connection accepted. UserID = ' + userID);
  console.log(" new users: "+users.length);
  userCount++;
  connection.sendUTF("ConnectionServerTest");
  connection.sendUTF(JSON.stringify({type:"technical", subtype:"userID", data: userID}));

  // This is the most important callback for us, we'll handle
  // all messages from users here.
  connection.on('message', function(message) {
    if (message.type === 'utf8') {
        console.log((new Date()) + ' New message: ' + message.utf8Data);
        for (var i=0; i<users.length;i++){
            users[i].sendUTF(JSON.stringify({type:"message", data: "User " + userID + ": " + message.utf8Data}));
        }
    }
  });

  connection.on('close', function(connection) {
    console.log((new Date()) + ' Connection closed. UserID = ' + userID);
    userCount--;
    users.splice(userID, 1);
    console.log("remaining users: "+users.length);
  });
});