const path = require("path");
const express = require("express");
const websocket = require("websocket");
const bodyParser = require("body-parser");
const uuid = require("uuid/v4");
const argv = require("minimist")(process.argv.slice(2));
const util = require("./util");

const port = process.env.PORT || 5000;

const lobbyStore = {};
setInterval(() => {
  Object.keys(lobbyStore).forEach((k) => {
    var l = lobbyStore[k];
    if (l.started == false && ((+new Date) - l.createdAt) > 24 * 3600 * 1000) {
      delete lobbyStore[k];
    }
  });
}, 1000);

const playerConnections = {};

const http = require("http");
const app = express();
const server = http.createServer(app);
const wss = new websocket.server({
  httpServer: server,
  autoAcceptConnections: false
});

app.use(express.static(path.join(__dirname, "../public")));
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.append("content-type", "application/json");
  next();
});

app.post("/createLobby", (req, res) => {
  var playerId = req.body.playerId,
    prettyName = req.body.prettyName,
    lobbyId = util.randomFourLetters();

  if (!playerId || !prettyName) {
    return res.status(500).send("invalid player id");
  }

  while(lobbyStore[lobbyId]) {
    lobbyId = util.randomFourLetters();
  }

  lobbyStore[lobbyId] = {
    createdAt: +(new Date),
    createdBy: playerId,
    started: false,
    players: [ playerId ],
    prettyNames: {}
  };

  lobbyStore[lobbyId].prettyNames[playerId] = prettyName;

  console.log(playerId + " created lobby " + lobbyId);

  res.send({ lobbyId: lobbyId });

  playerConnections[playerId] && playerConnections[playerId].forEach((conn) => {
    conn.lobby = lobbyStore[lobbyId];
  });
});

app.post("/joinLobby", (req, res) => {
  var lobbyId = req.body.lobbyId,
    playerId = req.body.playerId,
    prettyName = req.body.prettyName,
    lobby = lobbyStore[lobbyId];

  if (!playerId || !prettyName) {
    return res.status(500).send("invalid player id");
  }

  if (!lobby) {
    res.status(500).send("Invalid lobby code");
  } else {
    if (lobby.players.length == 4) {
      res.status(500).send("Lobby is full");
    } else {
      if (!lobby.players.includes(playerId)) {
        lobby.players.push(playerId);
        console.log(playerId + " joined lobby " + lobbyId);
      }
      lobby.prettyNames[playerId] = prettyName;
      if (lobby.started) {
        // TOOD
        res.status(500).send("TOOOOOOOD");
      } else {
        res.send({});
      }
      lobby.players.forEach((id) => {
        playerConnections[id] && playerConnections[id].forEach((conn) => {
          if (id == playerId) {
            conn.lobby = lobby;
          }
          conn.sendJson({ type: "updatePlayers", players: lobby.prettyNames });
        });
      });
    }
  }
});

app.post("/startGame", (req, res) => {
  var lobbyId = req.body.lobbyId,
    lobby = lobbyStore[lobbyId];

  if (!lobby ||
      (argv.env != "dev" && lobby.players.length < 2) ||
      lobby.createdBy != req.body.playerId) {
    return res.status(500).send("Invalid lobby id");
  }

  // set up game stuff

  res.send({});
});

app.post("nextCard", (req, res) => {
  var lobby = lobbyStore[req.body.lobbyId];
  if (!lobby) {
    return res.status(500).send("Invalid lobby id");
  }

  if (lobby.players.indexOf(req.body.playerId) == -1 || lobby.createdBy != req.body.playerId) {
    return res.status(500).send("Invalid player id");
  }

  // pick a next card, notify players
  lobby.players.forEach((id) => {
    playerConnections[id] && playerConnections[id].forEach((conn) => {
      if (id == playerId) {
        conn.lobby = lobby;
      } 
      conn.sendJson({ type: "nextCard", card: null });
    });
  });

});

// app.post("/choose", (req, res) => {
//   var lobby = lobbyStore[req.body.lobbyId];
//   if (!lobby) {
//     return res.status(500).send("Invalid lobby id");
//   }

//   if (lobby.players.indexOf(req.body.playerId) == -1) {
//     return res.status(500).send("Invalid player id");
//   }

//   try {
//     lobby.game.players.resolveChoice(req.body.playerId, req.body.response);
//     res.send({});
//   } catch (e) {
//     if (e instanceof InvalidChoiceException) {
//       console.log(e);
//       res.status(500).send("Invalid choice");
//     } else if (e instanceof NoPendingChoiceException) {
//       console.log(e);
//       res.status(500).send("No pending action");
//     } else {
//       console.log(e);
//       res.status(500).send("Unhandled exception");
//     }
//   }
// });

function originIsAllowed(origin) {
  return origin == "http://sovereignty.herokuapp.com";
}

wss.on("request", (req) => {
  if (!originIsAllowed(req.origin) && !(argv.env == "dev")) {
    console.log("Rejecting request from origin " + req.origin);
    return req.reject();
  }
  var connection = req.accept("echo-protocol", req.origin);
  console.log("Accepting request from origin " + req.origin);

  connection.sendJson = function(json) {
    this.send(JSON.stringify(json));
  };

  connection.sendJson({ type: "playerId", id: uuid() });

  connection.on("message", (message) => {
    if (message.type == "utf8") {
      try {
        var data = JSON.parse(message.utf8Data);

        console.log("received message");
        console.dir(data);

        if (data.type == "playerId" && data.id) {
          connection.playerId = data.id;
          playerConnections[data.id] = playerConnections[data.id] || [];
          playerConnections[data.id].push(connection);
        } else if (data.type == "chat" &&
                   data.lobbyId &&
                   lobbyStore[data.lobbyId] &&
                   lobbyStore[data.lobbyId].players.indexOf(data.playerId) != -1) {
          console.log("broadcasting to players:");
          lobbyStore[data.lobbyId].prettyNames[data.playerId] = data.prettyName;
          lobbyStore[data.lobbyId].players.forEach((p) => {
            console.log(p);
            if (playerConnections[p]) {
              playerConnections[p].forEach((c) => {
                console.log(c.socket.remoteAddress);
                c.sendJson({
                  type: "chat",
                  playerId: data.playerId,
                  prettyName: data.prettyName,
                  message: data.message
                });
                if (data.message == "play space lady") {
                  c.sendJson({ type: "playSpaceLady" });
                }
              });
            }
          });
        }
      } catch (e) {
        console.log("failed to parse message");
      }
    }
  });

  connection.on("close", () => {
    var connectionList = playerConnections[connection.playerId];
      i = connectionList ? connectionList.indexOf(connection) : -1;

    if (i != -1) {
      connectionList.splice(i, 1);
      if (connectionList.length == 0) {
        delete playerConnections[connection.playerId];
        if (connection.lobby) {
          connection.sendJson({ type: "updatePlayers", players: connection.lobby.prettyNames });
        }
      }
    }
  });
});

server.listen(port, () => console.log("Started server on port " + port));

