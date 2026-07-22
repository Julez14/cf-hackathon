# Prompt Royale Decisions

Record important product, architecture, implementation, and model decisions here. Keep entries concise and durable; do not add temporary task notes or session history.

## 2026-07-22: Use FLUX.2 [klein] 4B for image generation

**Status:** Accepted

**Decision:** Use the Workers AI model `@cf/black-forest-labs/flux-2-klein-4b` for the MVP's image generation.

**Rationale:** The model is optimized for latency-critical, real-time workflows with a fixed four-step inference process. It is the best fit among Workers AI-hosted models for showing independently generated player images quickly during a live game.

**Consequences:**

- The public Worker will send multipart requests to Workers AI.
- The MVP uses the model for text-to-image generation only. Its reference-image editing capability is not exposed because image-to-image editing is outside the current MVP scope.
- Do not add a quality fallback or a second image model; the MVP supports one image model.

**Alternatives considered:** `@cf/black-forest-labs/flux-2-klein-9b` offers enhanced quality, but its higher cost makes it less suitable as the default for this latency-sensitive MVP.

**Source:** [FLUX.2 [klein] 4B on Workers AI](https://developers.cloudflare.com/changelog/post/2026-01-15-flux-2-klein-4b-workers-ai/)
