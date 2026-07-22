# Start Here

This map points agents to the repository's important directories and entry points. Update it when significant directories or entry points are added, removed, or moved.

## Map

- `AGENTS.md`: Stable repository rules, project boundaries, and development commands.
- `PROMPT_ROYALE_PRD.md`: Product scope and MVP requirements.
- `PROMPT_ROYALE_FUNCTIONAL_SPEC.md`: Detailed game behavior and implementation flow.
- `package.json`: npm workspace definition and root commands for all projects.
- `promptroyale/`: Public Cloudflare Worker project for the browser UI and API.
- `promptroyale/package.json`: Public Worker scripts and workspace identity.
- `promptroyale/wrangler.jsonc`: Public Worker deployment config and external `ROOMS` Durable Object binding.
- `promptroyale/src/index.ts`: Public Worker entry point and room API routing.
- `promptroyale/src/site.ts`: Server-rendered Prompt Royale browser application.
- `promptroyale-do/`: Private Cloudflare Worker project that owns live room state.
- `promptroyale-do/package.json`: Durable Object Worker scripts and workspace identity.
- `promptroyale-do/wrangler.jsonc`: Durable Object deployment config and storage migrations.
- `promptroyale-do/src/room.ts`: `Room` Durable Object implementation and Worker entry point.
