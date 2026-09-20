# @umituz/web-ai-content

> Provider-agnostic AI content generation suite: text, image, and video generation with multi-provider fallback, wizard flows, and React hooks.

## Design principles

- **Provider-agnostic core.** Application code depends on interfaces (`IAIProvider`, `ITextGenerator`), never on a specific AI vendor. Switching or adding providers must not require rewriting business logic.
- **Install only what you use.** All AI provider SDKs are *optional* peer dependencies, loaded lazily. A SaaS that only uses the Groq provider never installs or bundles the others.
- **Framework-agnostic layers.** `./domain`, `./application`, and `./wizard` entries contain zero React. Only the root and `./presentation` entries export hooks.
- **No hidden global state.** No module-level singletons, no auto-initialized clients, no side effects at import time.

## Installation

```bash
npm install @umituz/web-ai-content
```

Then install only the providers you actually use (all are optional peers):

```bash
npm install @umituz/web-ai-groq-provider   # Groq text generation
npm install @umituz/pruna-provider         # Pruna image/video generation
npm install @anthropic-ai/sdk              # Legacy text-only mode (see below)
```

| Peer | Required | Used by |
|---|---|---|
| `react` ≥18 | only for hooks (root & `./presentation` entries) | `useAIContent`, `useAIGeneration`, wizards |
| `@umituz/web-ai-groq-provider` | optional | `GroqProvider` |
| `@umituz/pruna-provider` | optional | `generateWithPruna`, `useAIGeneration` |
| `@anthropic-ai/sdk` | optional | Legacy string-key text mode |

## Quick start (multi-provider mode — recommended)

```tsx
import { useAIContent } from '@umituz/web-ai-content';

function BlogWriter() {
  const { generateBlogPost, isLoading, error, errorCode } = useAIContent({
    providers: {
      priority: ['groq'],
      fallbackEnabled: true,
      groq: { apiKey: getKeyFromYourBackend(), enabled: true },
    },
  });

  const handleGenerate = () =>
    generateBlogPost({
      topic: 'The future of AI',
      blogType: 'tutorial',
      targetKeywords: ['AI', 'LLM'],
      tone: 'professional',
      wordCount: 1500,
      targetAudience: 'developers',
      seoOptimization: true,
      includeImages: false,
      includeSchema: true,
    });

  return (
    <button onClick={handleGenerate} disabled={isLoading}>
      {isLoading ? 'Generating…' : 'Generate'}
    </button>
  );
}
```

> **Security:** never ship provider API keys in client-side bundles. Keys shown above should come from your backend (env vars are fine server-side; client apps should proxy through your own API). See [Security](#security).

### Legacy text-only mode

`new AIContentService(apiKey)` (or `useAIContent({ apiKey })`) runs text features through a single LLM backend using the optional `@anthropic-ai/sdk` peer, loaded lazily on first use. To decouple entirely, inject any text backend:

```ts
import { AIContentService, type ITextGenerator } from '@umituz/web-ai-content';

const myBackend: ITextGenerator = {
  generateText: async (prompt) => myServer.text(prompt),
  generateTextStream: async function* (prompt) { /* ... */ yield ''; },
};

const service = new AIContentService('unused', 'my-model', myBackend);
```

Media generation (image/video) is **not** available in text-only mode — it requires a `providers` configuration.

## Entry points

| Entry | Contents | React needed |
|---|---|---|
| `.` | Everything (services, providers, hooks, types) | yes |
| `./domain` | Types, entities, errors, pure calculations/validators | no |
| `./application` | Services, prompts, wizard flows | no |
| `./wizard` | Wizard step definitions + request builders | no |
| `./providers` | Provider classes + `ProviderFactory` | no |
| `./presentation` | React hooks | yes |

All entries ship ESM + CJS with `.d.ts`, `sideEffects: false`, and no barrel-only chunking — deep imports tree-shake cleanly.

## Architecture

```
src/
├── domain/           # Pure: types, entities, errors, limits, calculations,
│                     #       validators, predicates — no I/O, no React
├── application/      # Services (blog/social/SEO/A-B/…), prompts, wizard flows
├── infrastructure/   # Provider adapters (groq, fal, gemini, pruna) + queue
└── presentation/     # React hooks only
```

Dependency direction: `presentation → application → infrastructure → domain`. The domain layer imports nothing above it and works in any JS runtime (browser, Node, React Native — no platform-specific APIs).

### Error handling

Every failure surfaces as an `AIError` with a stable `code`:

```ts
import { AIError } from '@umituz/web-ai-content';

try {
  await service.generateImage(request);
} catch (error) {
  const aiError = AIError.from(error);
  switch (aiError.code) {
    case 'PROVIDER_UNAVAILABLE':  // show retry / config guidance
    case 'PROVIDER_QUOTA_EXHAUSTED': // surface upgrade prompt
    case 'TIMEOUT':
    case 'ABORTED':               // distinguish cancellation from failure
    default:                      // log aiError.message + aiError.cause
  }
}
```

`ProviderError` (thrown by adapters) extends `AIError` and additionally carries `providerId`.

### Cancellation

`useAIGeneration` supports cancellation via `AbortController` — `cancel()` aborts the in-flight request, marks status `'cancelled'` (not `'failed'`), and the abort signal propagates to the underlying provider call. The `RequestQueue` passes its signal to every executor so timeouts cancel the work, not just the promise.

## Security

- API keys travel in request headers, never in URL query strings.
- No secrets, environment variables, or telemetry are read by this package.
- Client-side API keys are exposed by definition — proxy generation through your backend in production SaaS apps.

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # eslint (errors, not warnings)
npm test            # vitest — 86 tests incl. public-API surface lock
npm run build       # tsup → dist (cjs + esm + dts)
```

The test suite includes a **public API surface lock** (`tests/public-api.test.ts`): any added/removed export fails CI, making semver decisions explicit.

## Migration: 2.1.x → 2.2.0

**Breaking changes**

1. `AnthropicDefaults` (from `./domain`) renamed to **`TextModelDefaults`** — provider-agnostic naming for the text-model defaults (`TEXT_MODEL`, `MAX_TOKENS`, `DEFAULT_TEMPERATURE`, `DEFAULT_TOP_P`).
2. `@anthropic-ai/sdk` moved from a runtime `dependency` to an **optional peer**. If you used `new AIContentService(apiKey)` in string mode, install it explicitly (`npm i @anthropic-ai/sdk`) or inject your own `ITextGenerator`.

**Compatible changes (already in 2.2.0)**

- All provider peers (`@umituz/pruna-provider`, `@umituz/web-ai-groq-provider`) are optional — no longer auto-installed.
- Video quality values (`720p`/`1080p`/`4k`) are now accepted anywhere a credit-cost quality is expected; they normalize to pricing tiers automatically.
- JSON extraction from fenced model output is more robust; parse failures can be observed via the optional `onError` callback (fallback behavior unchanged).
- Internal-only utilities (`memoryManager`, throttle/debounce helpers, JSON cache) were removed — they were never part of any published entry point.

## Platform compatibility

- **Browser:** fully supported (primary target).
- **Node.js ≥18:** supported for `./domain`, `./application`, `./wizard`, `./providers` (SSR-safe; image results are portable data URLs).
- **React Native:** domain/application layers are RN-safe; hooks are React-only and the `useAIGeneration` upload helper uses `File`/`fetch` (provide your own upload function on RN).
- No package-level initialization, no globals, no `process`/`Buffer` usage.

## License

MIT © umituz
