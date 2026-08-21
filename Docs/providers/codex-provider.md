# Codex provider

OpenStudy registers Codex in `src/infrastructure/providers/registry.ts`. Most callers should use the shared registry instead of constructing the adapter directly.

```ts
import { createProvider, getAvailableProviders } from '../../src/providers/index.js';

const providers = getAvailableProviders();
const codex = createProvider('codex');
```

The compatibility adapter supports the existing `AIProvider` interface:

```ts
await codex.CheckLoginStatus();

for await (const event of codex.Prompt('Explain recursion.', {
  model: 'gpt-5.5',
  reasoningEffort: 'medium',
  workingDirectory: process.cwd(),
})) {
  console.log(event);
}
```

New infrastructure code should use the methods from `StudyProvider`: `checkAuth`, `listModels`, `streamPrompt`, and `dispose`. These methods accept abort signals where the operation can wait on a subprocess, provider server, or model response.

Codex uses read-only sandboxing and an approval policy of `never` for study requests. File options attach local study material, while `responseSchema` requests structured output. Authentication uses the local Codex login or `OPENAI_API_KEY`.

The registry owns provider metadata, factories, and cleanup. Add a provider in one registration and test it with a fake adapter before wiring a real SDK.

Authenticate outside OpenStudy with:

```bash
codex login
```
