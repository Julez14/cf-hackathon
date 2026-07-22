export function renderApp(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#221049">
    <title>Prompt Royale</title>
    <style>
      :root {
        color-scheme: dark;
        --ink: #21103f;
        --purple: #6f39e8;
        --purple-deep: #4e1fb1;
        --violet: #a572ff;
        --cream: #fffaf2;
        --muted: #c7bde0;
        --mint: #6ee7bf;
        --mint-deep: #059669;
        --sun: #ffd75d;
        --coral: #ff7878;
        --sky: #6dd6ff;
        --line: rgba(255, 255, 255, 0.18);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      * { box-sizing: border-box; }

      body {
        min-width: 320px;
        min-height: 100svh;
        margin: 0;
        overflow-x: hidden;
        color: var(--cream);
        background: #221049;
      }

      body::before,
      body::after {
        position: fixed;
        z-index: -1;
        width: 32rem;
        height: 32rem;
        content: "";
        border-radius: 999px;
        filter: blur(8px);
        opacity: 0.42;
      }

      body::before {
        top: -14rem;
        right: -9rem;
        background: #9e5cff;
      }

      body::after {
        bottom: -18rem;
        left: -12rem;
        background: #e64e94;
      }

      button,
      input { font: inherit; }

      button { cursor: pointer; }

      a { color: inherit; }

      .app-shell {
        width: min(100%, 1120px);
        min-height: 100svh;
        margin: 0 auto;
        padding: 24px;
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        color: var(--cream);
        font-size: 1.1rem;
        font-weight: 900;
        letter-spacing: -0.05em;
        text-decoration: none;
      }

      .brand-mark {
        display: grid;
        width: 34px;
        height: 34px;
        place-items: center;
        color: var(--ink);
        background: var(--sun);
        border: 2px solid var(--ink);
        border-radius: 10px 4px 10px 4px;
        box-shadow: 3px 3px 0 var(--ink);
        font-size: 0.75rem;
        letter-spacing: -0.09em;
      }

      .topbar-note,
      .eyebrow {
        margin: 0;
        color: var(--mint);
        font-size: 0.74rem;
        font-weight: 900;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .landing {
        display: grid;
        align-content: center;
        min-height: calc(100svh - 82px);
        padding: 52px 0 38px;
      }

      .hero {
        max-width: 760px;
        margin: 0 auto 36px;
        text-align: center;
      }

      h1,
      h2,
      h3,
      p { margin-top: 0; }

      h1 {
        max-width: 720px;
        margin: 14px auto 18px;
        font-size: clamp(2.9rem, 8vw, 5.9rem);
        font-weight: 950;
        letter-spacing: -0.085em;
        line-height: 0.91;
      }

      h1 em {
        color: var(--sun);
        font-style: normal;
        text-shadow: 4px 4px 0 rgba(33, 16, 63, 0.7);
      }

      .hero-copy {
        max-width: 560px;
        margin: 0 auto;
        color: var(--muted);
        font-size: clamp(1rem, 2vw, 1.16rem);
        line-height: 1.5;
      }

      .setup-card {
        width: min(100%, 850px);
        margin: 0 auto;
        padding: clamp(18px, 4vw, 32px);
        background: rgba(37, 18, 76, 0.9);
        border: 1px solid var(--line);
        border-radius: 24px;
        box-shadow: 0 20px 56px rgba(14, 4, 39, 0.33);
        backdrop-filter: blur(14px);
      }

      .name-field {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
        gap: 14px;
        max-width: 510px;
        margin: 0 auto 24px;
      }

      .field-label {
        display: block;
        margin-bottom: 8px;
        color: var(--cream);
        font-size: 0.83rem;
        font-weight: 800;
      }

      .field-hint {
        margin: 0 0 6px;
        color: var(--muted);
        font-size: 0.78rem;
      }

      .text-input {
        width: 100%;
        min-height: 52px;
        padding: 0 15px;
        color: var(--ink);
        background: var(--cream);
        border: 2px solid transparent;
        border-radius: 12px;
        outline: none;
        font-weight: 750;
      }

      .text-input:focus {
        border-color: var(--sun);
        box-shadow: 0 0 0 4px rgba(255, 215, 93, 0.22);
      }

      .action-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      .action-tile {
        min-height: 224px;
        padding: 24px;
        overflow: hidden;
        color: var(--ink);
        border: 2px solid var(--ink);
        border-radius: 18px;
        box-shadow: 6px 6px 0 var(--ink);
      }

      .action-tile.create { background: var(--mint); }
      .action-tile.join { background: var(--sky); }

      .tile-kicker {
        display: inline-grid;
        width: 32px;
        height: 32px;
        margin-bottom: 25px;
        place-items: center;
        border: 2px solid var(--ink);
        border-radius: 8px 3px 8px 3px;
        background: rgba(255, 255, 255, 0.65);
        font-size: 0.78rem;
        font-weight: 950;
      }

      .action-tile h2 {
        margin-bottom: 6px;
        font-size: clamp(1.65rem, 4vw, 2.1rem);
        letter-spacing: -0.065em;
      }

      .action-tile p {
        min-height: 44px;
        margin-bottom: 17px;
        font-size: 0.92rem;
        font-weight: 650;
        line-height: 1.35;
      }

      .button {
        min-height: 50px;
        padding: 0 18px;
        border: 2px solid var(--ink);
        border-radius: 11px;
        box-shadow: 3px 3px 0 var(--ink);
        font-size: 0.92rem;
        font-weight: 900;
        letter-spacing: -0.02em;
        transition: transform 120ms ease, box-shadow 120ms ease;
      }

      .button:hover { transform: translate(-1px, -1px); box-shadow: 5px 5px 0 var(--ink); }
      .button:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--ink); }
      .button:disabled { cursor: wait; opacity: 0.7; transform: none; }

      .button-dark { color: var(--cream); background: var(--ink); }
      .button-light { color: var(--ink); background: var(--cream); }
      .button-outline { color: var(--cream); background: transparent; border-color: var(--line); box-shadow: none; }

      .join-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 9px; }

      .code-input {
        min-width: 0;
        letter-spacing: 0.16em;
        text-align: center;
        text-transform: uppercase;
      }

      .feedback {
        min-height: 1.25rem;
        margin: 16px 0 0;
        color: var(--sun);
        font-size: 0.88rem;
        font-weight: 700;
        text-align: center;
      }

      .landing-footer {
        margin: 26px 0 0;
        color: var(--muted);
        font-size: 0.84rem;
        text-align: center;
      }

      .room-page {
        padding: 20px 0 42px;
      }

      .connection {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 32px;
        padding: 0 11px;
        color: var(--cream);
        background: rgba(255, 255, 255, 0.09);
        border: 1px solid var(--line);
        border-radius: 999px;
        font-size: 0.77rem;
        font-weight: 750;
      }

      .connection::before {
        width: 8px;
        height: 8px;
        content: "";
        border-radius: 50%;
        background: var(--sun);
      }

      .connection.live::before { background: var(--mint); }
      .connection.error::before { background: var(--coral); }

      .room-intro {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 28px;
        margin: clamp(35px, 7vw, 70px) 0 26px;
      }

      .room-intro h1 {
        max-width: 650px;
        margin: 10px 0 0;
        font-size: clamp(2.55rem, 7vw, 5rem);
        text-align: left;
      }

      .room-code-card {
        min-width: min(100%, 270px);
        padding: 17px;
        color: var(--ink);
        background: var(--sun);
        border: 2px solid var(--ink);
        border-radius: 18px;
        box-shadow: 6px 6px 0 var(--ink);
        text-align: center;
      }

      .room-code-card span {
        display: block;
        margin-bottom: 5px;
        font-size: 0.68rem;
        font-weight: 950;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .room-code-card strong {
        display: block;
        font-size: clamp(1.7rem, 5vw, 2.4rem);
        letter-spacing: 0.12em;
      }

      .copy-code {
        width: 100%;
        min-height: 34px;
        margin-top: 11px;
        color: var(--cream);
        background: var(--ink);
        border: 0;
        border-radius: 8px;
        font-size: 0.76rem;
        font-weight: 850;
      }

      .lobby-card {
        padding: clamp(20px, 4vw, 34px);
        background: rgba(37, 18, 76, 0.88);
        border: 1px solid var(--line);
        border-radius: 24px;
        box-shadow: 0 20px 56px rgba(14, 4, 39, 0.28);
      }

      .lobby-header {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 20px;
      }

      .lobby-header h2 {
        margin-bottom: 0;
        font-size: 1.45rem;
        letter-spacing: -0.055em;
      }

      .player-count {
        flex: none;
        color: var(--mint);
        font-size: 0.9rem;
        font-weight: 900;
      }

      .player-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 13px;
      }

      .player-card {
        position: relative;
        display: flex;
        align-items: center;
        min-height: 104px;
        gap: 14px;
        padding: 16px;
        overflow: hidden;
        color: var(--ink);
        border: 2px solid var(--ink);
        border-radius: 15px;
      }

      .player-card.tone-0 { background: var(--mint); }
      .player-card.tone-1 { background: var(--sky); }
      .player-card.tone-2 { background: var(--sun); }
      .player-card.tone-3 { background: #ffb0d2; }

      .player-card.empty {
        color: var(--muted);
        border: 2px dashed rgba(255, 255, 255, 0.32);
        background: rgba(255, 255, 255, 0.05);
      }

      .player-number {
        display: grid;
        flex: 0 0 auto;
        width: 40px;
        height: 40px;
        place-items: center;
        color: var(--cream);
        background: var(--ink);
        border-radius: 10px 4px 10px 4px;
        font-size: 0.85rem;
        font-weight: 950;
      }

      .player-name {
        overflow: hidden;
        font-size: 1.05rem;
        font-weight: 900;
        letter-spacing: -0.04em;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .player-meta {
        margin-top: 3px;
        font-size: 0.75rem;
        font-weight: 760;
      }

      .presence {
        position: absolute;
        top: 13px;
        right: 13px;
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: var(--mint-deep);
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.42);
      }

      .presence.offline { background: #9a8db7; }

      .lobby-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid var(--line);
      }

      .lobby-footer p {
        margin: 0;
        color: var(--muted);
        font-size: 0.9rem;
        line-height: 1.42;
      }

      .host-label {
        flex: none;
        padding: 8px 10px;
        color: var(--ink);
        background: var(--sun);
        border-radius: 8px;
        font-size: 0.75rem;
        font-weight: 950;
      }

      .identity-card,
      .missing-card {
        width: min(100%, 480px);
        margin: clamp(84px, 16vh, 150px) auto 0;
        padding: 30px;
        background: rgba(37, 18, 76, 0.92);
        border: 1px solid var(--line);
        border-radius: 22px;
        box-shadow: 0 20px 56px rgba(14, 4, 39, 0.34);
        text-align: center;
      }

      .identity-card h1,
      .missing-card h1 {
        margin: 13px 0;
        font-size: clamp(2.25rem, 7vw, 3.6rem);
        text-align: center;
      }

      .identity-card p,
      .missing-card p { color: var(--muted); line-height: 1.5; }

      .identity-card .text-input { margin: 14px 0; }

      .identity-card .button,
      .missing-card .button { width: 100%; }

      @media (max-width: 680px) {
        .app-shell { padding: 17px; }
        .topbar-note { display: none; }
        .landing { padding-top: 36px; }
        .name-field,
        .action-grid,
        .room-intro,
        .player-grid { grid-template-columns: 1fr; }
        .name-field { align-items: stretch; }
        .action-tile { min-height: auto; }
        .action-tile p { min-height: 0; }
        .room-intro { align-items: stretch; gap: 20px; }
        .room-code-card { min-width: 0; }
        .lobby-header,
        .lobby-footer { align-items: flex-start; flex-direction: column; }
      }

      @media (max-width: 420px) {
        .join-form { grid-template-columns: 1fr; }
        .join-form .button { width: 100%; }
      }
    </style>
  </head>
  <body>
    <main id="app" class="app-shell"></main>
    <script>
      (() => {
        const app = document.querySelector("#app");
        const nameKey = "prompt-royale:name";
        const playerKey = "prompt-royale:player-id";
        let socket;
        let reconnectTimer;
        let activeRoomCode;

        function escapeHtml(value) {
          return String(value).replace(/[&<>"]/g, (character) => {
            if (character === "&") return "&amp;";
            if (character === "<") return "&lt;";
            if (character === ">") return "&gt;";
            return "&quot;";
          });
        }

        function normaliseName(value) {
          const name = value.replace(/\\s+/g, " ").trim();
          return name.length >= 2 && name.length <= 24 ? name : "";
        }

        function normaliseRoomCode(value) {
          return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
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

        function storedName() {
          return normaliseName(localStorage.getItem(nameKey) || "");
        }

        function saveName(value) {
          const name = normaliseName(value);
          if (name) {
            localStorage.setItem(nameKey, name);
          }
          return name;
        }

        function setFeedback(message) {
          const feedback = document.querySelector("#landing-feedback");
          if (feedback) {
            feedback.textContent = message;
          }
        }

        function setBusy(button, busy, label) {
          button.disabled = busy;
          if (label) {
            button.textContent = label;
          }
        }

        function readName() {
          const input = document.querySelector("#player-name");
          const name = saveName(input ? input.value : "");
          if (!name) {
            setFeedback("Choose a stage name between 2 and 24 characters.");
          }
          return name;
        }

        function renderLanding() {
          document.title = "Prompt Royale";
          app.innerHTML = \`
            <header class="topbar">
              <a class="brand" href="/" aria-label="Prompt Royale home"><span class="brand-mark">PR</span><span>Prompt Royale</span></a>
              <p class="topbar-note">Voice prompts. Shared mayhem.</p>
            </header>
            <section class="landing">
              <div class="hero">
                <p class="eyebrow">Live image party</p>
                <h1>Same spark.<br><em>Make yours weird.</em></h1>
                <p class="hero-copy">Grab a few friends, add a voice twist, and see whose idea hijacks the image first.</p>
              </div>
              <section class="setup-card" aria-label="Start or join a room">
                <div class="name-field">
                  <div>
                    <label class="field-label" for="player-name">Your stage name</label>
                    <input class="text-input" id="player-name" maxlength="24" autocomplete="nickname" placeholder="e.g. Pixel Pirate">
                  </div>
                  <p class="field-hint">You can change this when you rejoin.</p>
                </div>
                <div class="action-grid">
                  <section class="action-tile create">
                    <span class="tile-kicker">01</span>
                    <h2>Open a room</h2>
                    <p>Get a short code, invite the crew, and take the host seat.</p>
                    <button class="button button-dark" id="create-room" type="button">Create room</button>
                  </section>
                  <section class="action-tile join">
                    <span class="tile-kicker">02</span>
                    <h2>Join the chaos</h2>
                    <p>Enter the six-character code on the big screen.</p>
                    <form class="join-form" id="join-room">
                      <input class="text-input code-input" id="room-code" inputmode="text" maxlength="6" autocomplete="off" placeholder="ABC234" aria-label="Room code">
                      <button class="button button-light" type="submit">Join</button>
                    </form>
                  </section>
                </div>
                <p id="landing-feedback" class="feedback" role="status" aria-live="polite"></p>
              </section>
              <p class="landing-footer">2 to 4 players. One room. Unlimited bad ideas.</p>
            </section>
          \`;

          const nameInput = document.querySelector("#player-name");
          nameInput.value = localStorage.getItem(nameKey) || "";

          document.querySelector("#create-room").addEventListener("click", async (event) => {
            const name = readName();
            if (!name) {
              return;
            }

            const button = event.currentTarget;
            setBusy(button, true, "Opening...");
            setFeedback("");

            try {
              const response = await fetch("/api/rooms", { method: "POST" });
              const payload = await response.json();
              if (!response.ok) {
                throw new Error(payload.error || "Unable to create a room.");
              }

              window.location.assign("/room/" + payload.code);
            } catch (error) {
              setBusy(button, false, "Create room");
              setFeedback(error instanceof Error ? error.message : "Unable to create a room.");
            }
          });

          document.querySelector("#join-room").addEventListener("submit", (event) => {
            event.preventDefault();
            const name = readName();
            const roomInput = document.querySelector("#room-code");
            const code = normaliseRoomCode(roomInput.value);
            roomInput.value = code;

            if (!name) {
              return;
            }

            if (!validRoomCode(code)) {
              setFeedback("Enter the six-character room code from the host screen.");
              return;
            }

            window.location.assign("/room/" + code);
          });
        }

        function renderIdentity(code) {
          document.title = "Join room " + code + " | Prompt Royale";
          app.innerHTML = \`
            <header class="topbar"><a class="brand" href="/" aria-label="Prompt Royale home"><span class="brand-mark">PR</span><span>Prompt Royale</span></a></header>
            <section class="identity-card">
              <p class="eyebrow">Room \${escapeHtml(code)}</p>
              <h1>Who is joining?</h1>
              <p>Pick the name the room will see.</p>
              <form id="identity-form">
                <input class="text-input" id="identity-name" maxlength="24" autocomplete="nickname" placeholder="Your stage name" autofocus>
                <button class="button button-light" type="submit">Enter lobby</button>
              </form>
              <p id="identity-feedback" class="feedback" role="status" aria-live="polite"></p>
            </section>
          \`;

          const input = document.querySelector("#identity-name");
          input.value = localStorage.getItem(nameKey) || "";
          document.querySelector("#identity-form").addEventListener("submit", (event) => {
            event.preventDefault();
            const name = saveName(input.value);
            const feedback = document.querySelector("#identity-feedback");
            if (!name) {
              feedback.textContent = "Choose a stage name between 2 and 24 characters.";
              return;
            }

            startRoom(code);
          });
        }

        function renderRoomShell(code) {
          document.title = "Room " + code + " | Prompt Royale";
          app.innerHTML = \`
            <header class="topbar">
              <a class="brand" href="/" aria-label="Prompt Royale home"><span class="brand-mark">PR</span><span>Prompt Royale</span></a>
              <span id="connection-state" class="connection">Connecting</span>
            </header>
            <section class="room-page">
              <div class="room-intro">
                <div>
                  <p class="eyebrow">Live lobby</p>
                  <h1>Assemble the <em>royal court.</em></h1>
                </div>
                <div class="room-code-card">
                  <span>Room code</span>
                  <strong>\${escapeHtml(code)}</strong>
                  <button class="copy-code" id="copy-room-code" type="button">Copy code</button>
                </div>
              </div>
              <section id="lobby-content" class="lobby-card" aria-live="polite">
                <div class="lobby-header"><div><p class="eyebrow">Loading room</p><h2>Finding your players...</h2></div></div>
              </section>
            </section>
          \`;

          document.querySelector("#copy-room-code").addEventListener("click", async (event) => {
            try {
              await navigator.clipboard.writeText(code);
              event.currentTarget.textContent = "Copied!";
              window.setTimeout(() => { event.currentTarget.textContent = "Copy code"; }, 1400);
            } catch {
              event.currentTarget.textContent = code;
            }
          });
        }

        function renderLobby(snapshot) {
          const lobby = document.querySelector("#lobby-content");
          if (!lobby) {
            return;
          }

          const playerId = getPlayerId();
          const playerCards = snapshot.players.map((player, index) => \`
            <article class="player-card tone-\${index % 4}">
              <span class="presence \${player.online ? "" : "offline"}" aria-label="\${player.online ? "Online" : "Offline"}"></span>
              <span class="player-number">0\${index + 1}</span>
              <div>
                <div class="player-name">\${escapeHtml(player.name)}\${player.id === playerId ? ' <span aria-label="you">(you)</span>' : ""}</div>
                <div class="player-meta">\${player.isLeader ? "Host" : player.online ? "In the lobby" : "Reconnecting"}</div>
              </div>
            </article>
          \`).join("");
          const emptySlots = Array.from({ length: snapshot.capacity - snapshot.players.length }, (_, index) => \`
            <article class="player-card empty"><span class="player-number">0\${snapshot.players.length + index + 1}</span><div><div class="player-name">Open seat</div><div class="player-meta">Share the code to fill it.</div></div></article>
          \`).join("");
          const isHost = snapshot.leader && snapshot.leader.id === playerId;
          const footerMessage = isHost
            ? "You are hosting. Let the room fill up, then the first round can begin."
            : snapshot.leader
              ? escapeHtml(snapshot.leader.name) + " is hosting. Your seat is saved."
              : "Waiting for a host to enter the room.";

          lobby.innerHTML = \`
            <div class="lobby-header">
              <div><p class="eyebrow">The court is gathering</p><h2>Players in the lobby</h2></div>
              <div class="player-count">\${snapshot.players.length} / \${snapshot.capacity} joined</div>
            </div>
            <div class="player-grid">\${playerCards}\${emptySlots}</div>
            <div class="lobby-footer">
              <p>\${footerMessage}</p>
              \${isHost ? '<span class="host-label">HOST SEAT</span>' : ""}
            </div>
          \`;
        }

        function updateConnection(label, state) {
          const indicator = document.querySelector("#connection-state");
          if (!indicator) {
            return;
          }

          indicator.textContent = label;
          indicator.className = "connection" + (state ? " " + state : "");
        }

        async function fetchRoomState(code) {
          const response = await fetch("/api/rooms/" + code + "/state", { cache: "no-store" });
          if (!response.ok) {
            return null;
          }
          return response.json();
        }

        function renderMissingRoom(code) {
          app.innerHTML = \`
            <header class="topbar"><a class="brand" href="/" aria-label="Prompt Royale home"><span class="brand-mark">PR</span><span>Prompt Royale</span></a></header>
            <section class="missing-card">
              <p class="eyebrow">Room \${escapeHtml(code)}</p>
              <h1>That room is gone.</h1>
              <p>Double-check the code with the host, or open a fresh room for your crew.</p>
              <a class="button button-light" href="/">Back home</a>
            </section>
          \`;
        }

        async function reconnect(code) {
          const snapshot = await fetchRoomState(code);
          if (!snapshot) {
            renderMissingRoom(code);
            return;
          }

          const isKnownPlayer = snapshot.players.some((player) => player.id === getPlayerId());
          if (!isKnownPlayer && snapshot.players.length >= snapshot.capacity) {
            updateConnection("Room full", "error");
            return;
          }

          connectRoom(code);
        }

        function connectRoom(code) {
          if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
            return;
          }

          const endpoint = new URL("/api/rooms/" + code + "/live", window.location.origin);
          endpoint.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
          endpoint.searchParams.set("playerId", getPlayerId());
          endpoint.searchParams.set("name", storedName());
          updateConnection("Connecting", "");

          socket = new WebSocket(endpoint);
          socket.addEventListener("open", () => updateConnection("Live", "live"));
          socket.addEventListener("message", (event) => {
            try {
              const snapshot = JSON.parse(event.data);
              if (snapshot.type === "room_state") {
                renderLobby(snapshot);
              }
            } catch {
              updateConnection("Sync error", "error");
            }
          });
          socket.addEventListener("close", () => {
            if (activeRoomCode !== code) {
              return;
            }
            updateConnection("Reconnecting", "");
            window.clearTimeout(reconnectTimer);
            reconnectTimer = window.setTimeout(() => { reconnect(code); }, 1200);
          });
        }

        async function startRoom(code) {
          const name = storedName();
          if (!name) {
            renderIdentity(code);
            return;
          }

          activeRoomCode = code;
          renderRoomShell(code);
          const snapshot = await fetchRoomState(code);
          if (!snapshot) {
            renderMissingRoom(code);
            return;
          }

          const isKnownPlayer = snapshot.players.some((player) => player.id === getPlayerId());
          if (!isKnownPlayer && snapshot.players.length >= snapshot.capacity) {
            updateConnection("Room full", "error");
            document.querySelector("#lobby-content").innerHTML = '<div class="lobby-header"><div><p class="eyebrow">No open seats</p><h2>This room is full.</h2></div></div>';
            return;
          }

          renderLobby(snapshot);
          connectRoom(code);
        }

        const roomMatch = /^\\/room\\/([a-z0-9]{6})$/i.exec(window.location.pathname);
        if (roomMatch && validRoomCode(roomMatch[1].toUpperCase())) {
          startRoom(roomMatch[1].toUpperCase());
        } else {
          renderLanding();
        }
      })();
    </script>
  </body>
</html>`;
}
