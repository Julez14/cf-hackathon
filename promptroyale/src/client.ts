export const appClient = String.raw`
(() => {
  const app = document.querySelector("#app");
  const nameKey = "prompt-royale:name";
  const playerKey = "prompt-royale:player-id";
  const roomTokenKey = "prompt-royale:room-token:";
  const avatars = ["&#128572;", "&#128054;", "&#128056;", "&#129414;"];
  const avatarNames = ["Party Cat", "Chef Dog", "Disco Frog", "Business Duck"];
  const waitingCopy = ["Waiting for victim...", "Grab a friend!", "Your weird pal goes here", "Definitely not a trap"];
  let socket;
  let reconnectTimer;
  let activeRoomCode;

  function escapeHtml(value) {
    return String(value).replace(/[&<>\"]/g, (character) => {
      if (character === "&") return "&amp;";
      if (character === "<") return "&lt;";
      if (character === ">") return "&gt;";
      return "&quot;";
    });
  }

  function normaliseName(value) {
    const name = String(value || "").replace(/\s+/g, " ").trim();
    return name.length >= 2 && name.length <= 24 ? name : "";
  }

  function normaliseRoomCode(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  }

  function validRoomCode(value) {
    return /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(value);
  }

  function getPlayerId() {
    let playerId = localStorage.getItem(playerKey);
    if (!playerId) {
      playerId = typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Array.from(crypto.getRandomValues(new Uint32Array(4)), (value) => value.toString(36)).join("-");
      localStorage.setItem(playerKey, playerId);
    }
    return playerId;
  }

  function getRoomToken(code) {
    const key = roomTokenKey + code;
    let token = localStorage.getItem(key);
    if (!token) {
      token = typeof crypto.randomUUID === "function"
        ? crypto.randomUUID() + crypto.randomUUID()
        : Array.from(crypto.getRandomValues(new Uint32Array(8)), (value) => value.toString(36)).join("-");
      localStorage.setItem(key, token);
    }
    return token;
  }

  function storedName() {
    return normaliseName(localStorage.getItem(nameKey));
  }

  function saveName(value) {
    const name = normaliseName(value);
    if (name) localStorage.setItem(nameKey, name);
    return name;
  }

  function decorations() {
    return '<span class="floating-sticker one" aria-hidden="true">&#9733;</span>' +
      '<span class="floating-sticker two" aria-hidden="true">?!</span>' +
      '<span class="floating-sticker three" aria-hidden="true">BOOM</span>';
  }

  function topbar(phase, withConnection) {
    return '<header class="topbar">' +
      '<a class="brand" href="/" aria-label="Prompt Royale home">' +
        '<span class="brand-mark">PR!</span>' +
        '<span class="brand-copy"><strong>Prompt Royale</strong><small>Yell it. Generate it. Regret it.</small></span>' +
      '</a>' +
      (withConnection
        ? '<span id="connection-state" class="connection">Connecting</span>'
        : '<span class="phase-badge">' + escapeHtml(phase) + '</span>') +
    '</header>';
  }

  function frame(content, phase, withConnection) {
    app.innerHTML = decorations() + '<div class="app-frame">' + topbar(phase, withConnection) + content + '</div>';
  }

  function setFeedback(id, message) {
    const feedback = document.querySelector("#" + id);
    if (feedback) feedback.textContent = message;
  }

  function setBusy(button, busy, label) {
    button.disabled = busy;
    button.textContent = label;
  }

  function readLandingName() {
    const input = document.querySelector("#player-name");
    const name = saveName(input ? input.value : "");
    if (!name) setFeedback("landing-feedback", "Pick a stage name between 2 and 24 characters.");
    return name;
  }

  function fakeQrMarkup() {
    return Array.from({ length: 25 }, () => "<i></i>").join("");
  }

  function codeInputMarkup() {
    return Array.from({ length: 6 }, (_, index) =>
      '<input class="code-character" data-code-index="' + index + '" maxlength="1" inputmode="text" autocomplete="off" aria-label="Room code character ' + (index + 1) + '">'
    ).join("");
  }

  function renderLanding() {
    activeRoomCode = undefined;
    document.title = "Prompt Royale";
    frame(
      '<section class="screen">' +
        '<div class="gate-layout">' +
          '<div class="hero">' +
            '<div class="hero-kicker"><span aria-hidden="true">&#127881;</span> 4 players. 1 cursed winner.</div>' +
            '<h1 class="comic-title"><span class="prompt">Prompt</span><span class="royale">Royale</span></h1>' +
            '<p class="hero-copy">Yell a twist. Watch AI cook. Vote for the beautiful disaster.</p>' +
            '<div class="tag-row" aria-label="Game features"><span class="tag">VOICE</span><span class="tag">AI ART</span><span class="tag">BAD IDEAS</span></div>' +
          '</div>' +
          '<section class="gate-card party-panel" aria-label="Create or join a room">' +
            '<span class="spark-sticker" aria-hidden="true">&#10022;</span>' +
            '<div class="invite-preview" aria-hidden="true"><div><div class="fake-qr">' + fakeQrMarkup() + '</div><p>Invite the chaos</p></div></div>' +
            '<div class="gate-controls">' +
              '<div class="name-panel">' +
                '<label class="field-label" for="player-name">Your stage name</label>' +
                '<input class="text-input" id="player-name" maxlength="24" autocomplete="nickname" placeholder="e.g. Pixel Pirate">' +
              '</div>' +
              '<div class="tabs">' +
                '<div class="tab-list" role="tablist" aria-label="Room action">' +
                  '<button class="tab-button active" id="host-tab" type="button" role="tab" aria-selected="true" aria-controls="host-panel">Host</button>' +
                  '<button class="tab-button" id="join-tab" type="button" role="tab" aria-selected="false" aria-controls="join-panel">Join</button>' +
                '</div>' +
                '<div class="tab-panel" id="host-panel" role="tabpanel" aria-labelledby="host-tab">' +
                  '<button class="button full" id="create-room" type="button">Create room &rarr;</button>' +
                '</div>' +
                '<form class="tab-panel" id="join-panel" role="tabpanel" aria-labelledby="join-tab" hidden>' +
                  '<div class="code-inputs">' + codeInputMarkup() + '</div>' +
                  '<button class="button pink join-button" type="submit">Join the madness &rarr;</button>' +
                '</form>' +
              '</div>' +
              '<p id="landing-feedback" class="feedback" role="status" aria-live="polite"></p>' +
            '</div>' +
          '</section>' +
        '</div>' +
      '</section>',
      "Party hub",
      false
    );

    const nameInput = document.querySelector("#player-name");
    nameInput.value = localStorage.getItem(nameKey) || "";

    const hostTab = document.querySelector("#host-tab");
    const joinTab = document.querySelector("#join-tab");
    const hostPanel = document.querySelector("#host-panel");
    const joinPanel = document.querySelector("#join-panel");

    function selectTab(tab) {
      const showJoin = tab === "join";
      hostTab.classList.toggle("active", !showJoin);
      joinTab.classList.toggle("active", showJoin);
      hostTab.setAttribute("aria-selected", String(!showJoin));
      joinTab.setAttribute("aria-selected", String(showJoin));
      hostPanel.hidden = showJoin;
      joinPanel.hidden = !showJoin;
      setFeedback("landing-feedback", "");
      if (showJoin) document.querySelector(".code-character").focus();
    }

    hostTab.addEventListener("click", () => selectTab("host"));
    joinTab.addEventListener("click", () => selectTab("join"));

    document.querySelector("#create-room").addEventListener("click", async (event) => {
      const name = readLandingName();
      if (!name) return;

      const button = event.currentTarget;
      setBusy(button, true, "Opening...");
      setFeedback("landing-feedback", "");

      try {
        const response = await fetch("/api/rooms", { method: "POST" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to create a room.");
        window.location.assign("/room/" + payload.code);
      } catch (error) {
        setBusy(button, false, "Create room ->");
        setFeedback("landing-feedback", error instanceof Error ? error.message : "Unable to create a room.");
      }
    });

    const codeInputs = Array.from(document.querySelectorAll(".code-character"));

    function fillCode(value, startIndex) {
      const characters = normaliseRoomCode(value).split("");
      characters.forEach((character, offset) => {
        if (codeInputs[startIndex + offset]) codeInputs[startIndex + offset].value = character;
      });
      const focusIndex = Math.min(startIndex + characters.length, codeInputs.length - 1);
      codeInputs[focusIndex].focus();
    }

    codeInputs.forEach((input, index) => {
      input.addEventListener("input", () => {
        const value = normaliseRoomCode(input.value);
        input.value = value.slice(-1);
        if (value.length > 1) fillCode(value, index);
        else if (input.value && index < codeInputs.length - 1) codeInputs[index + 1].focus();
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" && !input.value && index > 0) codeInputs[index - 1].focus();
        if (event.key === "ArrowLeft" && index > 0) codeInputs[index - 1].focus();
        if (event.key === "ArrowRight" && index < codeInputs.length - 1) codeInputs[index + 1].focus();
      });
      input.addEventListener("paste", (event) => {
        event.preventDefault();
        fillCode(event.clipboardData.getData("text"), index);
      });
    });

    joinPanel.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = readLandingName();
      const code = codeInputs.map((input) => input.value).join("");
      if (!name) return;
      if (!validRoomCode(code)) {
        setFeedback("landing-feedback", "Enter the six-character code from the host screen.");
        return;
      }
      window.location.assign("/room/" + code);
    });
  }

  function renderIdentity(code) {
    document.title = "Join room " + code + " | Prompt Royale";
    frame(
      '<section class="screen">' +
        '<section class="identity-card party-panel">' +
          '<span class="badge purple">Room ' + escapeHtml(code) + '</span>' +
          '<h1 class="display-title">Who is joining?</h1>' +
          '<p class="subcopy">Pick the name the royal court will see.</p>' +
          '<form id="identity-form">' +
            '<label class="sr-only" for="identity-name">Your stage name</label>' +
            '<input class="text-input" id="identity-name" maxlength="24" autocomplete="nickname" placeholder="Your stage name">' +
            '<button class="button" type="submit">Enter lobby &rarr;</button>' +
          '</form>' +
          '<p id="identity-feedback" class="feedback" role="status" aria-live="polite"></p>' +
        '</section>' +
      '</section>',
      "Join room",
      false
    );

    const input = document.querySelector("#identity-name");
    input.value = localStorage.getItem(nameKey) || "";
    input.focus();
    document.querySelector("#identity-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const name = saveName(input.value);
      if (!name) {
        setFeedback("identity-feedback", "Pick a stage name between 2 and 24 characters.");
        return;
      }
      startRoom(code);
    });
  }

  function renderRoomShell(code) {
    document.title = "Room " + code + " | Prompt Royale";
    const roomUrl = window.location.origin + "/room/" + code;
    const qrUrl = "/api/qr?url=" + encodeURIComponent(roomUrl);
    frame(
      '<section class="screen lobby-screen">' +
        '<div class="lobby-head">' +
          '<div>' +
            '<span class="badge mint">&#127881; The waiting room</span>' +
            '<h1 class="display-title">Assemble the <span class="pink">weirdos!</span></h1>' +
            '<p class="subcopy">Phones out. Dignity away.</p>' +
          '</div>' +
          '<div class="room-tools">' +
            '<button class="room-code-button" id="copy-room-code" type="button">' +
              '<small>Room</small><strong>' + escapeHtml(code) + '</strong><span class="copy-chip">Copy</span>' +
            '</button>' +
            '<button class="button white small" id="show-qr" type="button">&#9638; Giant QR</button>' +
          '</div>' +
        '</div>' +
        '<section id="lobby-content" aria-live="polite">' +
          '<div class="player-grid">' + Array.from({ length: 4 }, (_, index) => emptySlot(index)).join("") + '</div>' +
        '</section>' +
      '</section>' +
      '<dialog id="qr-dialog" aria-labelledby="qr-title">' +
        '<form method="dialog"><button class="dialog-close" aria-label="Close QR code">X</button></form>' +
        '<h2 id="qr-title">Get in here!</h2>' +
        '<p>Scan this on another device to join the incoming disaster.</p>' +
        '<div class="qr-stage"><img src="' + qrUrl + '" width="320" height="320" alt="QR code for room ' + escapeHtml(code) + '"></div>' +
        '<div class="dialog-code"><strong>' + escapeHtml(code) + '</strong><button class="button white small" id="dialog-copy" type="button">Copy code</button></div>' +
      '</dialog>',
      "Waiting room",
      true
    );

    const dialog = document.querySelector("#qr-dialog");
    document.querySelector("#show-qr").addEventListener("click", () => dialog.showModal());
    document.querySelector("#copy-room-code").addEventListener("click", (event) => copyRoomCode(code, event.currentTarget.querySelector(".copy-chip")));
    document.querySelector("#dialog-copy").addEventListener("click", (event) => copyRoomCode(code, event.currentTarget));
  }

  async function copyRoomCode(code, label) {
    try {
      await navigator.clipboard.writeText(code);
      label.textContent = "Copied!";
    } catch {
      label.textContent = code;
    }
    window.setTimeout(() => {
      label.textContent = label.classList.contains("copy-chip") ? "Copy" : "Copy code";
    }, 1400);
  }

  function emptySlot(index) {
    return '<article class="player-card empty">' +
      '<div><div class="empty-mark">?</div><p class="empty-title">' + waitingCopy[index] + '</p><p class="empty-copy">Share the code to fill this seat.</p></div>' +
    '</article>';
  }

  function playerSlot(player, index, playerId) {
    const isSelf = player.id === playerId;
    const meta = player.isLeader ? "Host of the chaos" : player.online ? avatarNames[index] : "Reconnecting";
    return '<article class="player-card tone-' + (index % 4) + '">' +
      '<div class="player-main">' +
        '<div class="avatar" aria-hidden="true">' + avatars[index % avatars.length] + '</div>' +
        '<div class="player-copy">' +
          '<div class="player-name">' + escapeHtml(player.name) + (isSelf ? '<span class="you-chip">That\'s you!</span>' : "") + '</div>' +
          '<div class="player-meta">' + escapeHtml(meta) + '</div>' +
        '</div>' +
      '</div>' +
      '<span class="player-status badge ' + (player.online ? "mint" : "status-badge offline") + '">' + (player.online ? "Locked in" : "Offline") + '</span>' +
    '</article>';
  }

  function renderLobby(snapshot) {
    const lobby = document.querySelector("#lobby-content");
    if (!lobby) return;

    const playerId = getPlayerId();
    const cards = snapshot.players.map((player, index) => playerSlot(player, index, playerId));
    const empty = Array.from({ length: Math.max(0, snapshot.capacity - snapshot.players.length) }, (_, index) => emptySlot(snapshot.players.length + index));
    const isHost = snapshot.leader && snapshot.leader.id === playerId;
    const readyMessage = snapshot.players.length < 2
      ? "One more player unlocks the round."
      : "The court is assembled and ready for the first round.";

    lobby.innerHTML = '<div class="player-grid">' + cards.concat(empty).join("") + '</div>' +
      '<div class="lobby-footer">' +
        '<div class="ready-copy"><span class="phone-icon" aria-hidden="true">&#128241;</span><div>' +
          '<strong>' + snapshot.players.length + ' / ' + snapshot.capacity + ' chaos agents ready</strong>' +
          '<p>' + readyMessage + '</p>' +
        '</div></div>' +
        '<span class="host-chip">' + (isHost ? "You have the host seat" : snapshot.leader ? escapeHtml(snapshot.leader.name) + " is hosting" : "Waiting for host") + '</span>' +
      '</div>';
  }

  function updateConnection(label, state) {
    const indicator = document.querySelector("#connection-state");
    if (!indicator) return;
    indicator.textContent = label;
    indicator.className = "connection" + (state ? " " + state : "");
  }

  async function fetchRoomState(code) {
    try {
      const response = await fetch("/api/rooms/" + code + "/state", { cache: "no-store" });
      if (response.status === 404) return { kind: "missing" };
      if (!response.ok) return { kind: "unavailable" };
      const snapshot = await response.json();
      return { kind: "found", snapshot };
    } catch {
      return { kind: "unavailable" };
    }
  }

  function renderMissingRoom(code) {
    activeRoomCode = undefined;
    document.title = "Room not found | Prompt Royale";
    frame(
      '<section class="screen"><section class="missing-card party-panel">' +
        '<span class="badge purple">Room ' + escapeHtml(code) + '</span>' +
        '<h1 class="display-title">That room is gone.</h1>' +
        '<p class="subcopy">Double-check the code with the host, or open a fresh room for your crew.</p>' +
        '<a class="button" href="/">Back home</a>' +
      '</section></section>',
      "Room missing",
      false
    );
  }

  async function reconnect(code) {
    const result = await fetchRoomState(code);
    if (result.kind === "missing") {
      renderMissingRoom(code);
      return;
    }
    if (result.kind === "unavailable") {
      updateConnection("Retrying", "error");
      window.clearTimeout(reconnectTimer);
      reconnectTimer = window.setTimeout(() => reconnect(code), 1500);
      return;
    }
    const snapshot = result.snapshot;
    const isKnownPlayer = snapshot.players.some((player) => player.id === getPlayerId());
    if (!isKnownPlayer && snapshot.players.length >= snapshot.capacity) {
      updateConnection("Room full", "error");
      return;
    }
    connectRoom(code);
  }

  function connectRoom(code) {
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) return;

    const endpoint = new URL("/api/rooms/" + code + "/live", window.location.origin);
    endpoint.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    endpoint.searchParams.set("playerId", getPlayerId());
    endpoint.searchParams.set("sessionToken", getRoomToken(code));
    endpoint.searchParams.set("name", storedName());
    updateConnection("Connecting", "");

    socket = new WebSocket(endpoint);
    socket.addEventListener("open", () => updateConnection("Live", "live"));
    socket.addEventListener("message", (event) => {
      try {
        const snapshot = JSON.parse(event.data);
        if (snapshot.type === "room_state") renderLobby(snapshot);
      } catch {
        updateConnection("Sync error", "error");
      }
    });
    socket.addEventListener("close", () => {
      socket = undefined;
      if (activeRoomCode !== code) return;
      updateConnection("Reconnecting", "");
      window.clearTimeout(reconnectTimer);
      reconnectTimer = window.setTimeout(() => reconnect(code), 1200);
    });
    socket.addEventListener("error", () => updateConnection("Retrying", "error"));
  }

  async function startRoom(code) {
    const name = storedName();
    if (!name) {
      renderIdentity(code);
      return;
    }

    activeRoomCode = code;
    renderRoomShell(code);
    const result = await fetchRoomState(code);
    if (result.kind === "missing") {
      renderMissingRoom(code);
      return;
    }
    if (result.kind === "unavailable") {
      updateConnection("Retrying", "error");
      window.clearTimeout(reconnectTimer);
      reconnectTimer = window.setTimeout(() => reconnect(code), 1500);
      return;
    }
    const snapshot = result.snapshot;

    const isKnownPlayer = snapshot.players.some((player) => player.id === getPlayerId());
    if (!isKnownPlayer && snapshot.players.length >= snapshot.capacity) {
      updateConnection("Room full", "error");
      const lobby = document.querySelector("#lobby-content");
      lobby.innerHTML = '<section class="missing-card party-panel"><span class="badge purple">No open seats</span><h2 class="display-title">This room is full.</h2><p class="subcopy">Ask the host to open a fresh room.</p></section>';
      return;
    }

    renderLobby(snapshot);
    connectRoom(code);
  }

  const roomMatch = /^\/room\/([a-z0-9]{6})\/?$/i.exec(window.location.pathname);
  if (roomMatch && validRoomCode(roomMatch[1].toUpperCase())) startRoom(roomMatch[1].toUpperCase());
  else renderLanding();
})();
`;
