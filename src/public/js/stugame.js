var stugame = (function() {
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

  var webSocket;

  function sendMessage(json) {
    webSocket.sendJson(json);
  }

  const MenuState = {
    HOME: 0,
    IN_MY_LOBBY: 1,
    IN_OTHER_LOBBY: 2,
    IN_GAME: 3,
    GAME_OVER: 4
  };

  var state = {
    playerId: localStorage.getItem("playerId"),
    lobbyId: "",
    players: {},
    prettyName: "",
    menuState: MenuState.HOME,
    gameState: null,
    stateLoaded: false
  };

  function setLobby(id) {
    state.lobbyId = id;
    elements.lobbyIdDisplay.innerText = id;
    elements.joinLobbyButton.classList.add("hidden");
    elements.lobbyIdEntry.classList.add("hidden");
    elements.createLobbyButton.classList.add("hidden");
  }

  function updatePlayers(players) {
    state.players = players;
    elements.playerList.innerText = Object.keys(players).map((id) => {
      return players[id] || id;
    }).join("\n");
    if (Object.keys(players).length > 1) {
      elements.startGameButton.classList.remove("disabled");
    } else {
      elements.startGameButton.classList.add("disabled");
    }
  }

  function createLobby() {
    if (!state.prettyName) {
      return;
    }
    request.post("createLobby", { playerId: state.playerId, prettyName: state.prettyName }).then((res) => {
      state.menuState = MenuState.IN_MY_LOBBY;
      elements.startGameButton.classList.remove("hidden");
      setLobby(res.lobbyId);
      saveParams();
      var players = {}
      players[state.playerId] = state.prettyName;
      updatePlayers(players);
    });
  }

  function joinLobby() {
    var code = elements.lobbyIdEntry.value.toUpperCase();
    if (code.length != 4 || !state.prettyName) {
      return;
    }
    request.post("joinLobby", { lobbyId: code, playerId: state.playerId, prettyName: state.prettyName }).then((res) => {
      state.menuState = MenuState.IN_OTHER_LOBBY;
      state.players = res.players;
      setLobby(code);
      if (res.started) {
        state.menuState = MenuState.IN_GAME;
        elements.homeSection.classList.add("in-game");
        elements.gameSection.classList.add("in-game");
      } else if (res.createdBy == state.playerId) {
        elements.startGameButton.classList.remove("hidden");
        state.menuState = MenuState.IN_MY_LOBBY;
      }
      saveParams();
    });
  }

  function lobbyIdKeyPress(event) {
    var char = event.charCode;
    if (elements.lobbyIdEntry.value.length == 4 || char < 65 || char > 122) {
      event.preventDefault();
      return false;
    }
  }

  function lobbyIdKeyUp() {
    if (elements.lobbyIdEntry.value.length == 4 && state.prettyName) {
      elements.joinLobbyButton.classList.remove("disabled");
    } else {
      elements.joinLobbyButton.classList.add("disabled");
    }
  }

  function startGame() {
    /* if (Object.keys(state.players).length < 2) { return; } */
    if (state.menuState != MenuState.IN_MY_LOBBY) {
      throw new Error("wrong state to start game");
    }
    sendMessage({
      type: "startGame",
      playerId: state.playerId,
      lobbyId: state.lobbyId
    });
  }

  function chatContainerKeyPress(event) {
    if (event.keyCode == 13) {
      sendChat();
    }
  }

  function sendChat() {
    if (!elements.chatEntry.value) { return; }
    if (!state.prettyName) {
      setPrettyName(elements.chatEntry.value);
      saveParams();
      elements.chatEntry.focus();
      return;
    }
    if (!state.lobbyId || !elements.chatEntry.value) {
      return;
    }
    var message = elements.chatEntry.value;
    elements.chatEntry.value = "";
    sendMessage({
      type: "chat",
      lobbyId: state.lobbyId,
      playerId: state.playerId,
      prettyName: state.prettyName,
      message: message
    });
    elements.chatEntry.focus();
    if (message == "play space lady") {
      (new Audio("audio/Space_Lady.mp3")).play();
    }
  }

  function updateChat(player, message) {
    chatWindow.innerText = chatWindow.innerText + player + ": " + message + "\n";
    chatWindow.scrollTo(0, chatWindow.scrollHeight);
  }

  function setPrettyName(value) {
    state.prettyName = value;
    elements.chatEntry.value = "";
    elements.chatSubmit.innerText = "submit";
    elements.createLobbyButton.classList.remove("disabled");
    if (elements.lobbyIdEntry.value.length == 4) {
      elements.joinLobbyButton.classList.remove("disabled");
    }
  }

  function saveParams() {
    var url = window.location.href;
    var params = [
      "prettyName",
      "lobbyId"
    ];
    var hashPos = url.search("#");
    if (hashPos != -1) {
      url = url.substring(0, hashPos);
    }
    url += "#";

    for (var i = 0; i < params.length; i++) {
      if (state[params[i]]) {
        url += params[i] + "=" + state[params[i]] + "&";
      }
    }

    window.location.href = url;
  }

  function loadParams() {
    var url = window.location.href;
    var hashPos = url.search("#");
    if (hashPos != -1) {
      var params = {};
      url.substring(hashPos + 1).split("&").forEach(function(kv) {
        params[kv.split("=")[0]] = kv.split("=")[1];
      });

      if (params.prettyName) {
        setPrettyName(params.prettyName);
      }

      if (params.lobbyId && params.lobbyId.length == 4) {
        elements.lobbyIdEntry.value = params.lobbyId;
        joinLobby();
      }
    }
  }

  var elements = {};

  window.onload = () => {
    elements.lobbyIdDisplay = document.getElementById("lobbyIdDisplay");
    elements.chatEntry = document.getElementById("chatEntry");
    elements.chatContainer = document.getElementById("chatContainer");
    elements.chatSubmit = document.getElementById("chatSubmit");
    elements.createLobbyButton = document.getElementById("createLobby");
    elements.joinLobbyButton = document.getElementById("joinLobby");
    elements.lobbyIdEntry = document.getElementById("lobbyIdEntry");
    elements.startGameButton = document.getElementById("startGame");
    elements.homeSection = document.getElementById("home");
    elements.gameSection = document.getElementById("game");
    elements.playerList = document.getElementById("playerList");

    elements.startGameButton.onclick = startGame;
    elements.lobbyIdEntry.onkeyup = lobbyIdKeyUp;
    elements.lobbyIdEntry.onkeypress = lobbyIdKeyPress;
    elements.createLobbyButton.onclick = createLobby;
    elements.joinLobbyButton.onclick = joinLobby;
    elements.chatSubmit.onclick = sendChat;
    elements.chatContainer.onkeypress = chatContainerKeyPress;

    webSocket = new WebSocket("ws://" + window.location.host, "echo-protocol");

    webSocket.sendJson = function(json) {
      webSocket.send(JSON.stringify(json));
    }

    webSocket.onopen = (event) => {
      if (state.playerId) {
        sendMessage({ type: "playerId", id: state.playerId });
      }
    };

    webSocket.onmessage = (message) => {console.log("got message");console.log(message);
      var data = message.data && JSON.parse(message.data);
      console.log(data);
      notify(data.type, data);
    };

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
      if (!state.playerId) {
        state.playerId = event.id;
        localStorage.setItem("playerId", state.playerId);
        webSocket.sendJson({ type: "playerId", id: state.playerId });
      }
      loadParams();
    });

    subscribe("chat", (event) => {
      updateChat(event.prettyName, event.message);
    });

    subscribe("updatePlayers", (event) => {
      updatePlayers(event.players);
    });

    subscribe("playSpaceLady", (event) => {
      (new Audio("audio/Space_Lady.mp3")).play();
    });

    subscribe("updateGameState", (event) => {
      state.gameState = event.gameState;
      grid_state = event.gameState.grid;
      console.log("got new game state");
      console.log(event.gameState);
      redraw();
    });

    subscribe("gameStarted", (event) => {
      state.menuState = MenuState.IN_GAME;
      elements.homeSection.classList.add("in-game");
      elements.gameSection.classList.add("in-game");
    });
  };

  return {
    setGameState: function(gameState) {
      sendMessage({
        type: "updateGameState",
        gameState: gameState,
        lobbyId: state.lobbyId,
        playerId: state.playerId
      });
    }
  }
})();