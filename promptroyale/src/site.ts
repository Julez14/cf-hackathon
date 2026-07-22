import { appClient } from "./client";
import { appStyles } from "./styles";

export function renderApp(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="A real-time multiplayer AI image game.">
    <meta name="theme-color" content="#fff7e6">
    <title>Prompt Royale</title>
    <style>${appStyles}</style>
  </head>
  <body>
    <main id="app" class="party-shell"></main>
    <script>${appClient}</script>
  </body>
</html>`;
}
