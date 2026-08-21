# Codex provider

OpenStudy defines Codex in `src/providers/codex-provider.ts` and creates providers through the factory map in `src/providers/index.ts`.

```ts
import { createProvider, PROVIDER_METADATA } from '../../src/providers/index.js';

const metadata = PROVIDER_METADATA;
const codex = createProvider('codex');
```

All providers implement the single `StudyProvider` contract:

```ts
await codex.checkAuth();

const { text } = await codex.prompt('Explain recursion.', {
  model: 'gpt-5.5',
  reasoningEffort: 'medium',
  workingDirectory: process.cwd(),
});
console.log(text);
```

The contract has four methods: `checkAuth`, `getModels`, `prompt`, and `dispose`. `prompt` resolves once with the final response text; there is no streaming. Methods accept abort signals where the operation can wait on a subprocess, provider server, or model response.

Codex talks NDJSON JSON-RPC 2.0 to a spawned `codex app-server` child process (`src/providers/codex-app-server.ts`). Auth status comes from `account/read`, and models are discovered live through paginated `model/list` calls, so the model and reasoning lists always reflect the installed Codex CLI.
Codex uses read-only sandboxing and an approval policy of `never` for study requests. File options attach local study material, while `responseSchema` maps to the turn's structured output schema. Authentication uses the local Codex login or `OPENAI_API_KEY`.

Add a provider by implementing `StudyProvider`, adding its metadata to `PROVIDER_METADATA`, and registering a factory in `src/providers/index.ts`. Test it with a fake adapter before wiring a real SDK.

Authenticate outside OpenStudy with:

```bash
codex login
```
