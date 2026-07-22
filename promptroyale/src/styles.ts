export const appStyles = String.raw`
:root {
  color-scheme: light;
  --ink: #171221;
  --cream: #fff7e6;
  --purple: #8b5cf6;
  --yellow: #facc15;
  --pink: #ec4899;
  --mint: #34d399;
  --orange: #fb923c;
  --sky: #60a5fa;
  --lilac: #eee7ff;
  --white: #ffffff;
  font-family: "Arial Rounded MT Bold", "Trebuchet MS", ui-rounded, system-ui, sans-serif;
  font-synthesis: none;
}

* { box-sizing: border-box; }

html,
body { min-width: 320px; min-height: 100%; }

body {
  margin: 0;
  overflow-x: hidden;
  color: var(--ink);
  background: var(--cream);
  text-rendering: geometricPrecision;
}

button,
input { font: inherit; }

h1,
h2,
h3,
p { margin: 0; }

button,
a { -webkit-tap-highlight-color: transparent; }

button { color: inherit; cursor: pointer; }
a { color: inherit; }

::selection { color: var(--ink); background: var(--yellow); }

.party-shell {
  position: relative;
  min-height: 100svh;
  isolation: isolate;
  overflow: hidden;
  background:
    radial-gradient(circle at 8% 12%, rgba(250, 204, 21, 0.9) 0 4px, transparent 5px),
    radial-gradient(circle at 91% 21%, rgba(236, 72, 153, 0.8) 0 5px, transparent 6px),
    radial-gradient(circle at 75% 88%, rgba(52, 211, 153, 0.85) 0 5px, transparent 6px),
    var(--cream);
  background-size: 48px 48px, 72px 72px, 64px 64px, auto;
}

.party-shell::before {
  position: fixed;
  z-index: -2;
  inset: 0;
  content: "";
  background-image:
    linear-gradient(rgba(23, 18, 33, 0.055) 2px, transparent 2px),
    linear-gradient(90deg, rgba(23, 18, 33, 0.055) 2px, transparent 2px);
  background-size: 32px 32px;
  transform: rotate(-3deg) scale(1.08);
}

.party-shell::after {
  position: fixed;
  z-index: -1;
  inset: 0;
  pointer-events: none;
  content: "";
  background:
    radial-gradient(circle at 50% -15%, rgba(139, 92, 246, 0.28), transparent 34rem),
    radial-gradient(circle at -5% 75%, rgba(236, 72, 153, 0.18), transparent 28rem),
    radial-gradient(circle at 105% 68%, rgba(52, 211, 153, 0.2), transparent 26rem);
}

.app-frame {
  position: relative;
  z-index: 2;
  display: flex;
  width: min(100%, 1280px);
  min-height: 100svh;
  margin: 0 auto;
  padding: 14px 24px 34px;
  flex-direction: column;
}

.topbar {
  display: flex;
  min-height: 66px;
  padding: 10px 13px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: rgba(255, 255, 255, 0.94);
  border: 3px solid var(--ink);
  border-radius: 18px;
  box-shadow: 5px 5px 0 var(--ink);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--ink);
  font-weight: 950;
  text-decoration: none;
  text-transform: uppercase;
}

.brand-mark {
  display: grid;
  width: 42px;
  height: 42px;
  flex: none;
  place-items: center;
  color: var(--white);
  background: var(--pink);
  border: 3px solid var(--ink);
  border-radius: 12px;
  box-shadow: 3px 3px 0 var(--ink);
  font-family: Impact, "Arial Black", sans-serif;
  font-size: 0.78rem;
  letter-spacing: -0.04em;
  transform: rotate(-6deg);
}

.brand-copy strong { display: block; font-size: 0.9rem; letter-spacing: 0.015em; }
.brand-copy small { display: block; margin-top: 2px; color: rgba(23, 18, 33, 0.58); font-size: 0.68rem; text-transform: none; }

.phase-badge,
.badge {
  display: inline-flex;
  width: fit-content;
  min-height: 28px;
  padding: 4px 11px;
  align-items: center;
  gap: 6px;
  color: var(--ink);
  background: var(--yellow);
  border: 2px solid var(--ink);
  border-radius: 999px;
  box-shadow: 2px 2px 0 var(--ink);
  font-size: 0.65rem;
  font-weight: 900;
  letter-spacing: 0.11em;
  line-height: 1;
  text-transform: uppercase;
}

.badge.mint { background: var(--mint); }
.badge.white { background: var(--white); }
.badge.purple { color: var(--white); background: var(--purple); }

.connection {
  display: inline-flex;
  min-height: 32px;
  padding: 0 12px;
  align-items: center;
  gap: 8px;
  background: var(--lilac);
  border: 2px solid var(--ink);
  border-radius: 999px;
  box-shadow: 2px 2px 0 var(--ink);
  font-size: 0.69rem;
  font-weight: 900;
  text-transform: uppercase;
}

.connection::before {
  width: 9px;
  height: 9px;
  content: "";
  background: var(--yellow);
  border: 1px solid var(--ink);
  border-radius: 50%;
}

.connection.live::before { background: var(--mint); }
.connection.error::before { background: var(--pink); }

.screen {
  display: grid;
  flex: 1;
  padding: clamp(28px, 5vw, 64px) 0 20px;
  place-items: center;
  animation: screen-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.gate-layout {
  display: grid;
  width: 100%;
  align-items: center;
  grid-template-columns: minmax(0, 1.08fr) minmax(420px, 0.92fr);
  gap: clamp(36px, 5vw, 70px);
}

.player-record { display: flex; margin-top: 46px; padding: 17px 20px; align-items: center; gap: 18px; background: var(--yellow); border: 4px solid var(--ink); border-radius: 20px; box-shadow: 6px 6px 0 var(--ink); }
.player-record > strong { font-family: Impact, "Arial Black", sans-serif; font-size: 1.25rem; text-transform: uppercase; }
.player-record > span { font-size: 0.82rem; font-weight: 850; }
.personal-wins { display: flex; margin-left: auto; gap: 7px; }
.personal-wins img { width: 54px; height: 54px; object-fit: cover; border: 3px solid var(--ink); border-radius: 10px; }
.leaderboard { margin-top: 20px; padding: 24px; background: var(--mint); border: 4px solid var(--ink); border-radius: 28px; box-shadow: 9px 9px 0 var(--ink); }
.leaderboard-row { display: grid; padding: 11px 13px; grid-template-columns: minmax(120px, 1fr) repeat(3, 90px); align-items: center; gap: 10px; background: var(--white); border: 3px solid var(--ink); border-bottom-width: 0; font-size: 0.78rem; font-weight: 850; }
.leaderboard-row:last-child { border-bottom-width: 3px; border-radius: 0 0 14px 14px; }
.leaderboard-labels { color: var(--white); background: var(--purple); border-radius: 14px 14px 0 0; font-size: 0.62rem; text-transform: uppercase; }
.leaderboard-row strong { display: flex; align-items: center; gap: 9px; font-family: Impact, "Arial Black", sans-serif; font-size: 1rem; text-transform: uppercase; }
.leaderboard-row strong i { display: grid; width: 30px; height: 30px; place-items: center; background: var(--yellow); border: 2px solid var(--ink); border-radius: 8px; font: 800 0.65rem inherit; }
.winner-gallery { margin-top: 20px; padding: 24px; background: var(--white); border: 4px solid var(--ink); border-radius: 28px; box-shadow: 9px 9px 0 var(--ink); }
.gallery-head { display: flex; margin-bottom: 18px; align-items: center; gap: 14px; }
.gallery-head h2 { font-family: Impact, "Arial Black", sans-serif; font-size: 1.8rem; text-transform: uppercase; }
.gallery-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.gallery-card { overflow: hidden; background: var(--cream); border: 3px solid var(--ink); border-radius: 18px; box-shadow: 4px 4px 0 var(--ink); }
.gallery-card img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; border-bottom: 3px solid var(--ink); }
.gallery-card div { display: grid; padding: 11px; gap: 3px; }
.gallery-card strong { font-family: Impact, "Arial Black", sans-serif; font-size: 1rem; text-transform: uppercase; }
.gallery-card span { color: rgba(23, 18, 33, 0.62); font-size: 0.65rem; font-weight: 850; text-transform: uppercase; }

.hero { position: relative; text-align: left; transform: rotate(-1deg); }

.hero-kicker {
  display: inline-flex;
  padding: 9px 15px;
  align-items: center;
  gap: 8px;
  background: var(--yellow);
  border: 3px solid var(--ink);
  border-radius: 999px;
  box-shadow: 4px 4px 0 var(--ink);
  font-size: 0.74rem;
  font-weight: 900;
  text-transform: uppercase;
  transform: rotate(-2deg);
}

.comic-title,
.display-title {
  margin: 0;
  font-family: Impact, "Arial Black", sans-serif;
  font-weight: 900;
  letter-spacing: -0.055em;
  line-height: 0.82;
  text-transform: uppercase;
}

.comic-title {
  margin-top: 26px;
  font-size: clamp(4.4rem, 9.5vw, 8.5rem);
}

.comic-title span {
  display: block;
  -webkit-text-stroke: 3px var(--ink);
  paint-order: stroke fill;
  text-shadow: 7px 7px 0 var(--ink);
}

.comic-title .prompt { color: var(--yellow); transform: rotate(-1.5deg); }
.comic-title .royale { margin: 12px 0 0 0.08em; color: var(--pink); transform: rotate(1deg); }

.hero-copy {
  max-width: 590px;
  margin: 30px 0 0;
  color: rgba(23, 18, 33, 0.73);
  font-size: clamp(1.1rem, 2vw, 1.45rem);
  font-weight: 750;
  line-height: 1.38;
}

.tag-row { display: flex; margin-top: 20px; flex-wrap: wrap; gap: 9px; }

.tag {
  padding: 7px 10px;
  border: 3px solid var(--ink);
  border-radius: 11px;
  box-shadow: 3px 3px 0 var(--ink);
  font-family: Impact, "Arial Black", sans-serif;
  font-size: 0.67rem;
  letter-spacing: 0.05em;
}

.tag:nth-child(1) { color: var(--white); background: var(--purple); transform: rotate(-2deg); }
.tag:nth-child(2) { background: var(--mint); transform: rotate(1deg); }
.tag:nth-child(3) { background: var(--orange); transform: rotate(-1deg); }

.party-panel {
  background: var(--white);
  border: 4px solid var(--ink);
  border-radius: 32px;
  box-shadow: 8px 8px 0 var(--ink);
}

.gate-card {
  position: relative;
  display: grid;
  padding: 20px;
  gap: 18px;
  grid-template-columns: minmax(150px, 0.76fr) minmax(0, 1.24fr);
  transform: rotate(0.7deg);
}

.spark-sticker {
  position: absolute;
  z-index: 3;
  top: -20px;
  right: -17px;
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  color: var(--white);
  background: var(--pink);
  border: 3px solid var(--ink);
  border-radius: 999px;
  box-shadow: 4px 4px 0 var(--ink);
  font-size: 1.45rem;
  transform: rotate(8deg);
  animation: float 3s ease-in-out infinite;
}

.invite-preview {
  display: grid;
  min-height: 280px;
  padding: 15px;
  place-items: center;
  overflow: hidden;
  background:
    repeating-conic-gradient(from -8deg at 50% 50%, rgba(255, 255, 255, 0.28) 0deg 8deg, transparent 8deg 18deg),
    var(--purple);
  border: 3px solid var(--ink);
  border-radius: 24px;
}

.fake-qr {
  position: relative;
  display: grid;
  width: min(100%, 180px);
  aspect-ratio: 1;
  padding: 14px;
  grid-template-columns: repeat(5, 1fr);
  gap: 5px;
  background: var(--white);
  border: 3px solid var(--ink);
  border-radius: 16px;
  box-shadow: 4px 4px 0 var(--ink);
  transform: rotate(-2deg);
}

.fake-qr i { background: var(--ink); border-radius: 2px; }
.fake-qr i:nth-child(2n) { background: transparent; }
.fake-qr i:nth-child(3n) { border-radius: 999px; }

.invite-preview p {
  margin: 12px 0 0;
  padding: 5px 9px;
  background: var(--yellow);
  border: 2px solid var(--ink);
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 900;
  text-align: center;
  text-transform: uppercase;
}

.gate-controls { min-width: 0; }

.name-panel {
  padding: 12px;
  background: var(--mint);
  border: 3px solid var(--ink);
  border-radius: 17px;
  box-shadow: 3px 3px 0 var(--ink);
  text-align: center;
}

.field-label {
  display: block;
  margin-bottom: 7px;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.text-input {
  width: 100%;
  height: 47px;
  padding: 0 12px;
  color: var(--ink);
  background: var(--white);
  border: 3px solid var(--ink);
  border-radius: 12px;
  box-shadow: 3px 3px 0 var(--ink);
  outline: 0;
  font-weight: 800;
}

.text-input:focus { background: var(--cream); box-shadow: 4px 4px 0 var(--purple); transform: rotate(-0.5deg); }

.tabs { margin-top: 18px; }

.tab-list {
  display: grid;
  padding: 5px;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  background: var(--lilac);
  border: 3px solid var(--ink);
  border-radius: 16px;
  box-shadow: 3px 3px 0 var(--ink);
}

.tab-button {
  min-height: 44px;
  padding: 0 10px;
  color: var(--purple);
  background: transparent;
  border: 3px solid transparent;
  border-radius: 11px;
  font-family: Impact, "Arial Black", sans-serif;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.tab-button.active {
  color: var(--ink);
  background: var(--yellow);
  border-color: var(--ink);
  box-shadow: 2px 2px 0 var(--ink);
}

.tab-panel { margin-top: 17px; }
.tab-panel[hidden] { display: none; }

.button {
  display: inline-flex;
  min-height: 52px;
  padding: 0 20px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  color: var(--ink);
  background: var(--yellow);
  border: 3px solid var(--ink);
  border-radius: 15px;
  box-shadow: 4px 4px 0 var(--ink);
  font-family: Impact, "Arial Black", sans-serif;
  font-size: 0.78rem;
  letter-spacing: 0.035em;
  line-height: 1;
  text-decoration: none;
  text-transform: uppercase;
  transition: transform 130ms ease, box-shadow 130ms ease, filter 130ms ease;
}

.button:hover { box-shadow: 6px 6px 0 var(--ink); transform: translate(-2px, -2px) rotate(1deg); }
.button:active { box-shadow: 1px 1px 0 var(--ink); transform: translate(3px, 3px) rotate(-1deg); }
.button:focus-visible { outline: 4px solid rgba(139, 92, 246, 0.4); outline-offset: 3px; }
.button:disabled { cursor: wait; filter: grayscale(0.5); opacity: 0.52; transform: none; }
.button.full { width: 100%; }
.button.purple { color: var(--white); background: var(--purple); }
.button.pink { color: var(--white); background: var(--pink); }
.button.white { background: var(--white); }
.button.small { min-height: 44px; padding: 0 14px; font-size: 0.69rem; }

.code-inputs { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px; }

.code-character {
  width: 100%;
  min-width: 0;
  height: 52px;
  padding: 0;
  color: var(--ink);
  background: var(--white);
  border: 3px solid var(--ink);
  border-radius: 10px;
  box-shadow: 2px 2px 0 var(--ink);
  outline: 0;
  font-family: Impact, "Arial Black", sans-serif;
  font-size: 1rem;
  text-align: center;
  text-transform: uppercase;
}

.code-character:focus { background: var(--yellow); box-shadow: 3px 3px 0 var(--purple); transform: rotate(-2deg); }
.join-button { width: 100%; margin-top: 14px; }

.feedback {
  min-height: 1.2rem;
  margin: 15px 0 0;
  color: #b52069;
  font-size: 0.76rem;
  font-weight: 850;
  line-height: 1.35;
  text-align: center;
}

.floating-sticker {
  position: fixed;
  z-index: 1;
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  pointer-events: none;
  background: var(--white);
  border: 3px solid var(--ink);
  border-radius: 15px;
  box-shadow: 4px 4px 0 var(--ink);
  font-family: Impact, "Arial Black", sans-serif;
  animation: float 3.4s ease-in-out infinite;
}

.floating-sticker.one { top: 18%; left: 3%; background: var(--yellow); transform: rotate(-7deg); }
.floating-sticker.two { top: 15%; right: 3%; color: var(--white); background: var(--pink); animation-delay: 0.5s; }
.floating-sticker.three { right: 3%; bottom: 14%; background: var(--orange); animation-delay: 1s; font-size: 0.65rem; }

.lobby-screen { display: block; width: 100%; place-self: center; }

.lobby-head {
  display: flex;
  margin-bottom: 26px;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
}

.display-title { margin-top: 12px; font-size: clamp(2.4rem, 5vw, 4.25rem); line-height: 0.95; }
.display-title .pink { color: var(--pink); text-shadow: 3px 3px 0 var(--ink); }
.subcopy { margin: 9px 0 0; color: rgba(23, 18, 33, 0.64); font-size: 1rem; font-weight: 750; }

.room-tools {
  display: flex;
  padding: 12px;
  align-items: center;
  justify-content: center;
  gap: 11px;
  background: rgba(255, 255, 255, 0.94);
  border: 3px solid var(--ink);
  border-radius: 18px;
  box-shadow: 5px 5px 0 var(--ink);
  transform: rotate(1deg);
}

.room-code-button {
  display: flex;
  min-height: 52px;
  padding: 6px 14px;
  align-items: center;
  gap: 12px;
  color: var(--white);
  background: var(--purple);
  border: 3px solid var(--ink);
  border-radius: 13px;
  box-shadow: 3px 3px 0 var(--ink);
  transition: transform 130ms ease;
}

.room-code-button:hover { transform: rotate(-2deg) scale(1.03); }
.room-code-button small { font-size: 0.65rem; font-weight: 900; text-transform: uppercase; }
.room-code-button strong { font-family: Impact, "Arial Black", sans-serif; font-size: 1.55rem; letter-spacing: 0.13em; }
.copy-chip { padding: 4px 7px; color: var(--ink); background: var(--yellow); border: 2px solid var(--ink); border-radius: 999px; font-size: 0.56rem; font-weight: 900; text-transform: uppercase; }

.player-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }

.player-card {
  position: relative;
  display: flex;
  min-height: 174px;
  padding: 22px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  overflow: hidden;
  border: 4px solid var(--ink);
  border-radius: 28px;
  box-shadow: 8px 8px 0 var(--ink);
  animation: card-in 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.player-card.tone-0 { background: var(--purple); transform: rotate(-1deg); }
.player-card.tone-1 { background: var(--pink); transform: rotate(1deg); animation-delay: 60ms; }
.player-card.tone-2 { background: var(--mint); transform: rotate(1deg); animation-delay: 120ms; }
.player-card.tone-3 { background: var(--orange); transform: rotate(-1deg); animation-delay: 180ms; }

.player-card::after {
  position: absolute;
  top: -45px;
  right: -30px;
  width: 130px;
  height: 130px;
  content: "";
  background: rgba(255, 255, 255, 0.2);
  border: 4px solid var(--ink);
  border-radius: 50%;
}

.player-card.empty {
  display: grid;
  place-items: center;
  background: var(--lilac);
  border-style: dashed;
  text-align: center;
  animation: waiting 2.2s ease-in-out infinite;
}

.player-card.empty::after { display: none; }

.player-main { position: relative; z-index: 1; display: flex; min-width: 0; align-items: center; gap: 17px; }

.avatar {
  display: grid;
  width: 78px;
  height: 78px;
  flex: none;
  place-items: center;
  background: var(--yellow);
  border: 4px solid var(--ink);
  border-radius: 22px;
  box-shadow: 4px 4px 0 var(--ink);
  font-size: 2.65rem;
  animation: avatar-bob 2.2s ease-in-out infinite;
}

.tone-1 .avatar { background: var(--mint); animation-delay: 0.2s; }
.tone-2 .avatar { background: var(--orange); animation-delay: 0.4s; }
.tone-3 .avatar { background: var(--sky); animation-delay: 0.6s; }

.player-copy { min-width: 0; }

.player-name {
  overflow: hidden;
  color: var(--white);
  font-family: Impact, "Arial Black", sans-serif;
  font-size: clamp(1.2rem, 2.3vw, 1.7rem);
  letter-spacing: 0.01em;
  text-overflow: ellipsis;
  text-shadow: 3px 3px 0 var(--ink);
  text-transform: uppercase;
  white-space: nowrap;
}

.tone-2 .player-name,
.tone-3 .player-name { color: var(--white); }

.player-meta {
  display: inline-block;
  margin-top: 9px;
  padding: 5px 8px;
  background: var(--white);
  border: 2px solid var(--ink);
  border-radius: 8px;
  box-shadow: 2px 2px 0 var(--ink);
  font-size: 0.63rem;
  font-weight: 900;
  text-transform: uppercase;
  transform: rotate(-1deg);
}

.player-status { position: relative; z-index: 2; flex: none; }
.status-badge { background: var(--mint); }
.status-badge.offline { background: var(--lilac); }

.you-chip {
  display: inline-block;
  margin-left: 7px;
  padding: 4px 7px;
  color: var(--ink);
  background: var(--yellow);
  border: 2px solid var(--ink);
  border-radius: 999px;
  box-shadow: 2px 2px 0 var(--ink);
  font-family: "Arial Rounded MT Bold", sans-serif;
  font-size: 0.55rem;
  text-shadow: none;
  vertical-align: middle;
}

.empty-mark {
  display: grid;
  width: 50px;
  height: 50px;
  margin: 0 auto 12px;
  place-items: center;
  background: var(--white);
  border: 3px solid var(--ink);
  border-radius: 50%;
  box-shadow: 3px 3px 0 var(--ink);
  font-family: Impact, "Arial Black", sans-serif;
  font-size: 1.3rem;
}

.empty-title { margin: 0; color: var(--purple); font-family: Impact, "Arial Black", sans-serif; font-size: 0.9rem; text-transform: uppercase; }
.empty-copy { margin: 6px 0 0; color: rgba(23, 18, 33, 0.58); font-size: 0.73rem; font-weight: 750; }

.lobby-footer {
  display: flex;
  margin-top: 23px;
  padding: 17px 20px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  background: var(--white);
  border: 4px solid var(--ink);
  border-radius: 27px;
  box-shadow: 8px 8px 0 var(--ink);
}

.ready-copy { display: flex; align-items: center; gap: 13px; }

.phone-icon {
  display: grid;
  width: 49px;
  height: 49px;
  flex: none;
  place-items: center;
  background: var(--orange);
  border: 3px solid var(--ink);
  border-radius: 13px;
  box-shadow: 3px 3px 0 var(--ink);
  font-size: 1.35rem;
  transform: rotate(-5deg);
}

.ready-copy strong { display: block; font-family: Impact, "Arial Black", sans-serif; font-size: 0.85rem; letter-spacing: 0.03em; text-transform: uppercase; }
.ready-copy p { margin: 4px 0 0; color: rgba(23, 18, 33, 0.6); font-size: 0.77rem; font-weight: 750; }

.host-chip { padding: 9px 12px; background: var(--yellow); border: 3px solid var(--ink); border-radius: 11px; box-shadow: 3px 3px 0 var(--ink); font-size: 0.68rem; font-weight: 950; text-transform: uppercase; }
.host-actions { display: flex; align-items: center; gap: 12px; }
.timer-setting { display: grid; gap: 3px; font-size: 0.58rem; font-weight: 950; letter-spacing: 0.04em; text-transform: uppercase; }
.timer-setting select { min-height: 40px; padding: 0 30px 0 11px; color: var(--ink); background: var(--white); border: 3px solid var(--ink); border-radius: 10px; box-shadow: 3px 3px 0 var(--ink); font: inherit; }

.game-screen { display: block; width: 100%; }
.game-wrap { width: 100%; }
.game-head { display: flex; margin-bottom: 22px; align-items: center; justify-content: space-between; gap: 24px; }
.game-head .display-title { color: var(--pink); text-shadow: 3px 3px 0 var(--ink); }
.game-clock { display: grid; width: 112px; height: 92px; flex: none; place-items: center; color: var(--white); background: var(--purple); border: 4px solid var(--ink); border-radius: 24px; box-shadow: 7px 7px 0 var(--ink); font-family: Impact, "Arial Black", sans-serif; font-size: 2.4rem; transform: rotate(2deg); }
.countdown-burst { display: grid; min-height: 430px; place-items: center; color: var(--white); background: var(--pink); border: 5px solid var(--ink); border-radius: 40px; box-shadow: 12px 12px 0 var(--ink); font-family: Impact, "Arial Black", sans-serif; font-size: clamp(3.2rem, 10vw, 7rem); text-align: center; text-shadow: 6px 6px 0 var(--ink); text-transform: uppercase; transform: rotate(-1deg); }
.brief-card { display: flex; margin-bottom: 22px; padding: 18px 22px; align-items: center; gap: 18px; background: var(--yellow); border: 4px solid var(--ink); border-radius: 22px; box-shadow: 6px 6px 0 var(--ink); }
.brief-card small { padding: 6px 9px; background: var(--white); border: 2px solid var(--ink); border-radius: 999px; font-size: 0.65rem; font-weight: 900; text-transform: uppercase; }
.brief-card strong { font-size: clamp(1.05rem, 2.2vw, 1.45rem); }
.prompt-form { margin-bottom: 24px; padding: 20px; background: var(--mint); border: 4px solid var(--ink); border-radius: 24px; box-shadow: 7px 7px 0 var(--ink); }
.prompt-form label { display: block; margin-bottom: 9px; font-family: Impact, "Arial Black", sans-serif; font-size: 1rem; text-transform: uppercase; }
.prompt-row { display: grid; grid-template-columns: 1fr auto; gap: 12px; }
.voice-row { display: flex; margin-top: 12px; align-items: center; justify-content: flex-end; gap: 12px; }
.voice-row span { color: rgba(23, 18, 33, 0.65); font-size: 0.72rem; font-weight: 900; text-transform: uppercase; }
.voice-row.is-recording { padding: 10px 12px; justify-content: space-between; background: var(--white); border: 3px solid var(--pink); border-radius: 15px; }
.voice-row.is-recording span { color: var(--ink); font-size: 0.82rem; }
.recording-dot { display: inline-block; width: 11px; height: 11px; margin-right: 7px; background: var(--pink); border: 2px solid var(--ink); border-radius: 50%; animation: recording-pulse 0.8s ease-in-out infinite alternate; vertical-align: -1px; }
.prompt-form .feedback { margin-top: 10px; text-align: left; }
.waiting-banner { margin-bottom: 22px; padding: 14px 18px; background: var(--mint); border: 3px solid var(--ink); border-radius: 16px; box-shadow: 4px 4px 0 var(--ink); font-weight: 900; text-align: center; }
.entry-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
.entry-card { position: relative; overflow: hidden; background: var(--white); border: 4px solid var(--ink); border-radius: 28px; box-shadow: 8px 8px 0 var(--ink); }
.entry-visual { position: relative; border-bottom: 4px solid var(--ink); }
.entry-image, .entry-placeholder { display: block; width: 100%; aspect-ratio: 1; border-bottom: 4px solid var(--ink); object-fit: cover; }
.entry-visual .entry-image { border-bottom: 0; }
.image-status { position: absolute; right: 14px; bottom: 14px; left: 14px; padding: 10px 13px; color: var(--ink); background: rgba(255, 247, 230, 0.94); border: 3px solid var(--ink); border-radius: 13px; box-shadow: 4px 4px 0 var(--ink); font-size: 0.7rem; font-weight: 950; text-align: center; text-transform: uppercase; }
.entry-placeholder { display: grid; padding: 22px; place-content: center; gap: 8px; background: var(--lilac); text-align: center; }
.entry-placeholder strong { font-family: Impact, "Arial Black", sans-serif; font-size: 1.6rem; text-transform: uppercase; }
.entry-placeholder span { color: rgba(23, 18, 33, 0.65); font-size: 0.8rem; font-weight: 800; }
.entry-copy { padding: 17px; }
.entry-copy h2 { font-family: Impact, "Arial Black", sans-serif; font-size: 1.35rem; text-transform: uppercase; }
.entry-copy h2 small { font-family: inherit; font-size: 0.65rem; color: var(--purple); }
.entry-prompt { margin: 8px 0 0; color: rgba(23, 18, 33, 0.68); font-size: 0.82rem; font-weight: 750; }
.prompt-stack { margin-top: 10px; padding: 9px 10px; background: var(--lilac); border: 2px solid var(--ink); border-radius: 12px; }
.prompt-stack summary { cursor: pointer; font-size: 0.68rem; font-weight: 950; text-transform: uppercase; }
.prompt-stack ol { display: grid; margin: 9px 0 0; padding: 0; gap: 6px; list-style: none; }
.prompt-stack li { display: grid; grid-template-columns: 25px 1fr; align-items: start; gap: 7px; color: rgba(23, 18, 33, 0.74); font-size: 0.72rem; font-weight: 750; line-height: 1.35; }
.prompt-stack li span { display: grid; width: 23px; height: 23px; place-items: center; color: var(--white); background: var(--purple); border: 2px solid var(--ink); border-radius: 7px; font-size: 0.55rem; font-weight: 950; }
.prompt-stack li.base-prompt span { color: var(--ink); background: var(--yellow); }
.entry-copy .button { width: 100%; margin-top: 14px; }
.vote-total { display: block; margin-top: 10px; color: var(--purple); font-size: 1.1rem; }
.winner-ribbon { position: absolute; z-index: 2; top: 15px; right: -34px; width: 150px; padding: 8px; background: var(--yellow); border: 3px solid var(--ink); font-family: Impact, "Arial Black", sans-serif; text-align: center; text-transform: uppercase; transform: rotate(35deg); }
.play-again { margin-top: 28px; }

.identity-card,
.missing-card {
  width: min(100%, 500px);
  padding: clamp(24px, 5vw, 40px);
  text-align: center;
  transform: rotate(-1deg);
}

.identity-card .display-title,
.missing-card .display-title { font-size: clamp(2.7rem, 9vw, 4.6rem); }
.identity-card .text-input { margin-top: 18px; }
.identity-card .button { width: 100%; margin-top: 15px; }
.missing-card .button { width: 100%; margin-top: 12px; }

dialog {
  width: min(calc(100% - 32px), 450px);
  padding: 25px;
  color: var(--ink);
  background: var(--yellow);
  border: 4px solid var(--ink);
  border-radius: 30px;
  box-shadow: 12px 12px 0 var(--ink);
  transform: rotate(-1deg);
}

dialog::backdrop { background: rgba(81, 48, 145, 0.55); backdrop-filter: blur(5px); }
dialog h2 { margin: 0; padding-right: 42px; font-family: Impact, "Arial Black", sans-serif; font-size: 1.65rem; text-transform: uppercase; }
dialog p { margin: 7px 0 0; color: rgba(23, 18, 33, 0.68); font-size: 0.84rem; font-weight: 750; line-height: 1.45; }

.dialog-close {
  position: absolute;
  top: 17px;
  right: 17px;
  display: grid;
  width: 37px;
  height: 37px;
  padding: 0;
  place-items: center;
  background: var(--white);
  border: 2px solid var(--ink);
  border-radius: 50%;
  box-shadow: 2px 2px 0 var(--ink);
  font-weight: 950;
}

.qr-stage {
  margin-top: 20px;
  padding: 20px;
  background:
    repeating-conic-gradient(from -8deg at 50% 50%, rgba(255, 255, 255, 0.28) 0deg 8deg, transparent 8deg 18deg),
    var(--purple);
  border: 3px solid var(--ink);
  border-radius: 24px;
}

.qr-stage img { display: block; width: 100%; height: auto; padding: 10px; background: var(--white); border: 3px solid var(--ink); border-radius: 16px; box-shadow: 4px 4px 0 var(--ink); }

.dialog-code { display: flex; margin-top: 16px; padding: 12px; align-items: center; justify-content: space-between; gap: 12px; background: var(--mint); border: 3px solid var(--ink); border-radius: 15px; box-shadow: 3px 3px 0 var(--ink); }
.dialog-code strong { font-family: Impact, "Arial Black", sans-serif; font-size: 1.5rem; letter-spacing: 0.15em; }
.dialog-code button { min-height: 38px; }

.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

@keyframes screen-in {
  from { opacity: 0; transform: translateY(34px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes card-in {
  from { opacity: 0; scale: 0.75; translate: 0 -40px; }
  to { opacity: 1; scale: 1; translate: 0 0; }
}

@keyframes avatar-bob {
  0%, 100% { transform: translateY(0) rotate(-4deg); }
  50% { transform: translateY(-7px) rotate(4deg); }
}

@keyframes float {
  0%, 100% { translate: 0 0; rotate: -6deg; }
  50% { translate: 0 -12px; rotate: 6deg; }
}

@keyframes waiting {
  0%, 100% { translate: 0 0; rotate: -0.6deg; }
  50% { translate: 0 -4px; rotate: 0.8deg; }
}

@keyframes recording-pulse {
  from { opacity: 0.45; transform: scale(0.75); }
  to { opacity: 1; transform: scale(1.15); }
}

@media (max-width: 1020px) {
  .gate-layout { grid-template-columns: 1fr; }
  .hero { max-width: 760px; margin: 0 auto; text-align: center; }
  .hero-copy { margin-right: auto; margin-left: auto; }
  .tag-row { justify-content: center; }
  .gate-card { width: min(100%, 720px); margin: 0 auto; }
  .floating-sticker { display: none; }
}

@media (max-width: 760px) {
  .app-frame { padding: 10px 14px 28px; }
  .brand-copy small { display: none; }
  .screen { padding-top: 34px; }
  .comic-title { font-size: clamp(4rem, 20vw, 6.6rem); }
  .gate-card { grid-template-columns: 1fr; transform: none; }
  .invite-preview { display: none; }
  .lobby-head { align-items: stretch; flex-direction: column; }
  .room-tools { justify-content: space-between; transform: none; }
  .player-grid { grid-template-columns: 1fr; }
  .player-card { min-height: 150px; }
  .game-head { align-items: flex-start; }
  .gallery-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 520px) {
  .topbar { min-height: 58px; }
  .brand-mark { width: 36px; height: 36px; }
  .phase-badge { display: none; }
  .brand-copy strong { font-size: 0.78rem; }
  .comic-title span { -webkit-text-stroke-width: 2px; text-shadow: 5px 5px 0 var(--ink); }
  .hero-kicker { font-size: 0.62rem; }
  .hero-copy { margin-top: 23px; font-size: 1rem; }
  .gate-card { padding: 15px; border-radius: 25px; box-shadow: 6px 6px 0 var(--ink); }
  .code-inputs { gap: 4px; }
  .code-character { height: 47px; border-width: 2px; font-size: 0.88rem; }
  .room-tools { align-items: stretch; flex-direction: column; }
  .room-code-button { justify-content: space-between; }
  .room-tools .button { width: 100%; }
  .player-card { min-height: 132px; padding: 17px; border-radius: 23px; box-shadow: 6px 6px 0 var(--ink); }
  .avatar { width: 64px; height: 64px; border-radius: 17px; font-size: 2rem; }
  .player-status { display: none; }
  .lobby-footer { align-items: flex-start; flex-direction: column; }
  .phone-icon { display: none; }
  .host-chip { align-self: stretch; text-align: center; }
  .host-actions { width: 100%; align-items: stretch; flex-direction: column; }
  .host-actions .button { width: 100%; }
  .game-head { flex-direction: column; }
  .player-record { align-items: flex-start; flex-direction: column; }
  .personal-wins { width: 100%; margin-left: 0; overflow-x: auto; }
  .leaderboard { padding: 16px; }
  .leaderboard-row { grid-template-columns: minmax(100px, 1fr) repeat(3, 55px); gap: 5px; font-size: 0.68rem; }
  .leaderboard-row strong { font-size: 0.82rem; }
  .game-clock { width: 100%; height: 70px; }
  .prompt-row { grid-template-columns: 1fr; }
  .voice-row { align-items: stretch; flex-direction: column; }
  .entry-grid { grid-template-columns: 1fr; }
  .gallery-grid { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;
