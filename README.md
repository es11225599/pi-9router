# pi-9router

A [pi](https://pi.dev) package that connects your agent to [9router](https://9router.com) and enriches its model catalog with metadata from [models.dev](https://models.dev).

## What it does

- Discovers the models exposed by your local (or remote) 9router instance.
- Looks up each model in the public **models.dev** API to obtain:
  - context window size
  - max output tokens
  - reasoning / thinking support
  - supported input modalities (text, image)
  - pricing (input / output / cache read / cache write)
- Registers 9router as a pi provider so you can select models with `/model`.
- Provides `/9router-status`, `/9router-refresh`, `/9router-set-key` and
  `/9router-remove-key` commands.

## Installation

Install as a pi package:

```bash
pi install git:github.com/es11225599/pi-9router
```

Or clone and install from the local path:

```bash
cd /path/to/pi-9router
pi install .
```

## Configuration

9router does not require an API key by default, so models appear in `/model`
without any configuration. If your 9router instance is protected by a key, set it
via environment variable:

```bash
export NINEROUTER_BASE_URL="http://localhost:20128/v1"   # default
export NINEROUTER_API_KEY="<your 9router dashboard API key>"
```

The API key is created in the 9router dashboard under **Settings → API Keys**.

If you prefer not to use an environment variable, you can save the key directly
from pi with:

```
/9router-set-key <your-9router-api-key>
```

The key is stored in pi's `auth.json`. Use `/9router-remove-key` to delete it.

> **Note:** If your 9router does not require a key, leave `NINEROUTER_API_KEY`
> unset and do not run `/9router-set-key`. All discovered models will still be
> available in `/model`.

## Usage

After installation, 9router models appear in pi automatically. Select one with:

```
/model 9router/openai/gpt-4o
```

Then send prompts as usual. pi forwards the request to 9router's OpenAI-compatible endpoint (`/v1/chat/completions`) using the model id without the provider prefix (e.g. `openai/gpt-4o`), which is exactly what 9router expects.

### Commands

- `/9router-status` — show the configured base URL, discovered model count,
  API key status and how many models are available in `/model`.
- `/9router-refresh` — re-fetch the model list from 9router and re-register the provider.
- `/9router-set-key <key>` — save the 9router API key to pi's `auth.json`.
- `/9router-remove-key` — remove the saved 9router API key.

## How the mapping works

9router models are exposed as `alias/modelId`, for example:

- `openai/gpt-4o`
- `gemini/gemini-2.5-pro`
- `kc/anthropic/claude-sonnet-4-20250514` (Kilo connection exposing Anthropic models)
- `openrouter/google/gemma-4-26b-a4b-it:free`

The extension maps the 9router alias to a **models.dev** provider id (e.g. `gemini` → `google`, `kc` → `kilo`), then matches the model id by:

1. exact id match
2. normalized id match (strips date suffixes such as `-20250514`)
3. model name matching
4. nested provider alias matching (e.g. `kc/anthropic/...` → `anthropic`)

Models that cannot be matched fall back to sensible defaults (128k context window, 8k output, no reasoning, zero cost).

## Project structure

```
pi-9router/
├── package.json          # npm + pi manifest
├── src/
│   ├── index.ts          # extension entry point
│   ├── config.ts         # env var / default configuration
│   ├── auth.ts           # pi auth.json persistence helpers
│   ├── ninerouter.ts     # 9router /v1/models client
│   ├── modelsdev.ts      # models.dev API client
│   └── mapping.ts        # alias mapping and model enrichment logic
├── scripts/
│   ├── test-mapping.ts            # unit test for the mapping
│   ├── test-extension-load.ts     # smoke test loading the extension
│   ├── test-auth.ts               # test API key persistence
│   └── test-real-mapping.ts       # live test against a running 9router
└── README.md
```

## Development

```bash
npm install
npm run check          # TypeScript type check
npm run test:mapping   # test mapping against cached models.dev data
npm run test:auth      # test API key persistence
npm run test:extension # smoke test loading the extension
```

To test against the live 9router instance:

```bash
node --import jiti/register scripts/test-real-mapping.ts
```

## License

MIT
