window.onload = () => {
  
  const request = {
    send: (method, endpoint, body) => {
      if (request.pendingRequest) {
        return new Promise((resolve, reject) => reject("api request in progress"));
      }

      request.pendingRequest = true;

      return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();

        xhr.open(method, endpoint);
        xhr.setRequestHeader("content-type", "application/json");

        xhr.onreadystatechange = () => {
          if (xhr.readyState == 4) {
            request.pendingRequest = false;
            if (xhr.status == 200) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error(xhr.status + ": " + xhr.responseText));
            }
          }
        }

        xhr.send(JSON.stringify(body));
      }).catch((e) => {
        request.pendingRequest = false;
        throw e;
      });
    },
    post: (endpoint, body) => {
      return request.send("POST", endpoint, body);
    },
    get: (endpoint) => {
      return request.send("GET", endpoint);
    }
  };

  const webSocket = new WebSocket("ws://" + window.location.host, "echo-protocol");

  webSocket.onopen = (event) => {
    if (state.playerId) {
      sendMessage({ type: "playerId", id: state.playerId });
    }
  };

  webSocket.onmessage = (message) => {
    var data = message.data && JSON.parse(message.data);
    console.log(data);
    notify(data.type, data);
  };

  function sendMessage(json) {
    webSocket.send(JSON.stringify(json));
  }

  var subscriptions = {};

  function subscribe(event, callback) {
    subscriptions[event] = subscriptions[event] || [];
    subscriptions[event].push(callback);
  }

  function notify(event, message) {
    subscriptions[event] && subscriptions[event].forEach((sub) => {
      sub(message);
    });
  }

  subscribe("playerId", (event) => {
    if (state.playerId) {
      return;
    }
    state.playerId = event.id;
    localStorage.setItem("playerId", state.playerId);
    webSocket.sendJson({ type: "playerId", id: state.playerId });
  });

  subscribe("chat", (event) => {
    updateChat(event.prettyName, event.message);
  });

  subscribe("updatePlayers", (event) => {
    updatePlayers(event.players);
  });

  const MenuState = {
    HOME: 0,
    IN_MY_LOBBY: 1,
    IN_OTHER_LOBBY: 2,
    IN_GAME: 3,
    GAME_OVER: 4
  };

  var state = {
    playerId: localStorage.getItem("playerId"),
    lobby: {
      id: "",
      players: {}
    },
    prettyName: "",
    menuState: MenuState.HOME,
    gameState: null
  };

  function setLobby(id) {
    state.lobby.id = id;
    lobbyIdDisplay.innerText = id;
    joinLobbyButton.classList.add("hidden");
    lobbyIdEntry.classList.add("hidden");
    createLobbyButton.classList.add("hidden");
  }

  function updatePlayers(players) {
    state.lobby.players = players;
    playerList.innerText = Object.keys(players).map((id) => {
      return players[id] || id;
    }).join("\n");
    if (players.length > 1) {
      startGameButton.classList.remove("disabled");
    } else {
      startGameButton.classList.add("disabled");
    }
  }

  function createLobby() {
    if (!state.prettyName) {
      return;
    }
    request.post("createLobby", { playerId: state.playerId, prettyName: state.prettyName }).then((res) => {
      state.menuState = MenuState.IN_MY_LOBBY;
      startGameButton.classList.remove("hidden");
      setLobby(res.lobbyId);
      var players = {}
      players[state.playerId] = state.prettyName;
      updatePlayers(players);
    });
  }


  function joinLobby() {
    var code = lobbyIdEntry.value.toUpperCase();
    if (code.length != 4 || !state.prettyName) {
      return;
    }
    request.post("joinLobby", { lobbyId: code, playerId: state.playerId, prettyName: state.prettyName }).then((res) => {
      state.menuState = MenuState.IN_OTHER_LOBBY;
      state.lobby.players = res.players;
      setLobby(code);
    });
  }

  function lobbyIdKeyPress(event) {
    var char = event.charCode;
    if (lobbyIdEntry.value.length == 4 || char < 65 || char > 122) {
      event.preventDefault();
      return false;
    }
  }

  function lobbyIdKeyUp() {
    if (lobbyIdEntry.value.length == 4 && state.prettyName) {
      joinLobbyButton.classList.remove("disabled");
    } else {
      joinLobbyButton.classList.add("disabled");
    }
  }

  function startGame() {
    /* if (Object.keys(state.lobby.players).length < 2) { return; } */
    if (state.menuState != MenuState.IN_MY_LOBBY) {
      throw new Error("wrong state to start game");
    }
    request.post("startGame", { playerId: state.playerId, lobbyId: state.lobby.id }).then((update) => {
      state.menuState = MenuState.IN_GAME;
      homeSection.classList.add("in-game");
      gameSection.classList.add("in-game");
      // do stuff
    });
  }

  function chatContainerKeyPress(event) {
    if (event.keyCode == 13) {
      sendChat();
    }
  }

  function sendChat() {
    if (!chatEntry.value) { return; }
    if (!state.prettyName) {
      state.prettyName = chatEntry.value;
      chatEntry.value = "";
      chatSubmit.innerText = "submit";
      chatEntry.focus();
      createLobbyButton.classList.remove("disabled");
      if (lobbyIdEntry.value.length == 4) {
        joinLobbyButton.classList.remove("disabled");
      }
      return;
    }
    if (!state.lobby.id || !chatEntry.value) {
      return;
    }
    var message = chatEntry.value;
    chatEntry.value = "";
    sendMessage({
      type: "chat",
      lobbyId: state.lobby.id,
      playerId: state.playerId,
      prettyName: state.prettyName,
      message: message
    });
    chatEntry.focus();
    if (message == "play space lady") {
      (new Audio("audio/Space_Lady.mp3")).play();
    }
  }

  function updateChat(player, message) {
    chatWindow.innerText = chatWindow.innerText + player + ": " + message + "\n";
    chatWindow.scrollTo(0, chatWindow.scrollHeight);
  }

  var lobbyIdDisplay = document.getElementById("lobbyIdDisplay");
  var chatEntry = document.getElementById("chatEntry");
  var chatContainer = document.getElementById("chatContainer");
  var chatSubmit = document.getElementById("chatSubmit");
  var createLobbyButton = document.getElementById("createLobby");
  var joinLobbyButton = document.getElementById("joinLobby");
  var lobbyIdEntry = document.getElementById("lobbyIdEntry");
  var startGameButton = document.getElementById("startGame");
  var homeSection = document.getElementById("home");
  var gameSection = document.getElementById("game");
  var playerList = document.getElementById("playerList");

  startGameButton.onclick = startGame;
  lobbyIdEntry.onkeyup = lobbyIdKeyUp;
  lobbyIdEntry.onkeypress = lobbyIdKeyPress;
  createLobbyButton.onclick = createLobby;
  joinLobbyButton.onclick = joinLobby;
  chatSubmit.onclick = sendChat;
  chatContainer.onkeypress = chatContainerKeyPress;
};
