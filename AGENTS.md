# Prompt Royale Agent Guide

## Start Here

- Read `PROMPT_ROYALE_PRD.md` before planning or editing.
- Read `PROMPT_ROYALE_FUNCTIONAL_SPEC.md` after the PRD for detailed behavior and implementation requirements.
- Treat the PRD as the product-scope source of truth and the functional spec as the implementation source of truth.
- Surface conflicts between the documents before implementing the affected behavior.
- Read `repo_map.md` for the repository structure.
- Update `repo_map.md` only when adding, removing, or moving significant directories or entry points.

## Repository Layout

- This repository is an npm workspace with one directory per deployable Cloudflare Worker.
- `promptroyale/` is the public Worker. It serves the UI and API and binds to the room Worker through `ROOMS`.
- `promptroyale-do/` is the private room-state Worker. It exports the `Room` Durable Object and owns its migrations.
- Keep browser and public API code out of `promptroyale-do/`.
- Keep authoritative room state and game rules out of `promptroyale/`.
- Add another top-level workspace only when it is an independently deployable service or a genuinely shared package.

## Project Priorities

- Treat this as a hackathon MVP. Keep follow-on services and tournament features out unless explicitly requested.
- Choose the simplest implementation that meets the current requirements.
- Do not add abstractions or infrastructure for unproven scale.
- Keep touched code easy to understand, test, and change.

## Frontend

- Keep each component focused on one clear UI responsibility.
- Extract a component when it has independent behavior, state, or reuse. Do not split markup only to reduce file size.
- Keep authoritative room and game rules out of client components.

## Backend

- Keep each endpoint and function focused on one operation.
- Validate inputs and enforce room and game rules at the authoritative backend boundary.
- Prefer direct implementations over machinery designed for thousands of users.

## Verification

- Add or update tests for changed behavior when a test setup exists.
- Run the relevant lint, type-check, test, and build commands before finishing.
- Do not claim a check passed unless its command was actually run.
- Install all workspace dependencies from the repository root with `npm install`.
- Run both Workers locally from the repository root with `npm run dev`; the public app listens on `http://localhost:8790`.
- Generate Worker types for every project with `npm run generate-types`.
- Type-check every project with `npm run typecheck`.
- Deploy the Durable Object Worker followed by the public Worker with `npm run deploy`.
- Run one project command with `npm run <command> --workspace=@prompt-royale/app` or `npm run <command> --workspace=@prompt-royale/room-do`.

## Durable Context

- Add only stable, repository-wide rules, commands, and architecture decisions to this file.
- Do not add temporary plans, task notes, or session history.
- Never commit credentials or service tokens.
