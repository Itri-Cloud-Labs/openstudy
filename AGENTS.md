# Agent Guide

This file gives future AI agents project context before they edit OpenStudy. Read it before making changes.

## Project Purpose

OpenStudy is an AI-powered study assistant that runs in the terminal. It is an OpenCode-inspired TUI focused on lightweight study sessions, guided prompts, subject selection, model selection, reasoning controls, study material, study language settings, and mode-based study flows.

The intended experience is local-first, keyboard-driven, calm, and focused. Users should be able to open the CLI, say `Hi`, and let the selected model guide them.

## Current Product Direction

- Keep the app centered on studying, not general software-agent workflows.
- Preserve the terminal-native feel. Avoid web-app concepts that do not map cleanly to OpenTUI renderables.
- Favor fast keyboard shortcuts and visible controls over hidden flows.
- Keep onboarding simple. First launch should guide users into setup without clutter.
- Keep settings local under `~/.openstudy` unless a future requirement explicitly changes this.
- Avoid noisy UI. The current visual language is black background, compact centered layout, amber accents, dim secondary text, and minimal status information.
- Active study sessions should stay focused on the selected study mode. Do not echo the user's initial prompt as a message unless that behavior is explicitly requested.

## Design Direction

- OpenStudy should feel calm, local, focused, and terminal-native. Avoid visual density, dashboard-like chrome, marketing-style panels, or anything that makes the app feel like a web product squeezed into a terminal.
- The home screen should stay visually centered around the logo and prompt input. Supporting information belongs around the edges or below the prompt, never competing with the main input.
- The prompt is the primary action. Do not surround it with heavy frames, large menus, multi-column choices, or decorative UI that distracts from typing a study request.
- The prompt placeholder should stay friendly and model-aware. Users who do not know what to ask should be invited to say `Hi`, and the selected model should feel like a guide rather than a configuration burden.
- The visual language is black background, compact centered layout, amber accents, dim secondary text, restrained separators, and minimal status information. Keep the tone quiet unless the UI needs to communicate an actionable state.
- Color should communicate meaning sparingly. Amber is the primary accent, subject colors may identify the selected subject, muted gray is for secondary text, and bright text is for the current focus or important content.
- Do not introduce large color palettes, gradients, shadows, emoji-heavy states, or decorative icon systems unless explicitly requested. Terminal clarity matters more than visual novelty.
- Use whitespace as the main layout tool. Prefer a few well-spaced elements over many bordered boxes. When the screen feels crowded, remove or dim information before adding more structure.
- The bottom status bar should remain quiet and low-contrast. It should provide context such as directory and version without drawing attention away from study activity.
- Keyboard hints should be visible but subtle. They should help users discover controls without turning the screen into a shortcut reference sheet.
- Preserve keyboard-first operation. Every modal or major interaction should be usable without a mouse, should have predictable navigation, and should be easy to dismiss.
- Modal interactions should feel consistent: compact, readable, centered when appropriate, and dismissible with `ctrl+c`. Selection state should be obvious, but the modal should not dominate the full product experience.
- Modal copy should be direct and calm. Prefer short labels and helpful descriptions over technical explanations. Avoid blaming the user for missing setup or invalid input.
- Respect the current minimum terminal size behavior. If a terminal is too small, show the minimum-size message instead of trying to squeeze the app into an unusable layout.
- When adapting to terminal width, remove secondary UI before compressing primary UI. The prompt and active study content are more important than sidebars, metadata, or decorative sections.
- The home screen and active session screen have different priorities. Home is for setup and starting a study session; the session screen is for focused learning, mode switching, and continued interaction.
- Active study sessions should not echo the user's initial prompt as a chat message unless explicitly requested. The prompt can be used as session context or title, but the main area should focus on the active study mode.
- Session mode content is intentionally minimal right now. Do not design full tab panels until requested; mode components may remain placeholders while provider wiring is built.
- Mode switching should feel lightweight. A mode change should make the active mode visible, but it should not reset unrelated session state or create noisy transitions.
- The right sidebar in `SessionScreen.tsx` is supportive context, not the main experience. Keep settings, AI info, and mode indicators compact and scannable.
- If the right sidebar is hidden on narrower terminals, the core session should still be usable. Do not put required actions only in the sidebar.
- Input areas should feel stable. Avoid layout jumps while typing unless additional lines are genuinely needed. Keep cursor behavior simple and legible.
- Avoid chat-app assumptions unless the feature explicitly requires chat behavior. OpenStudy is a study session interface first, not a generic assistant transcript.
- Follow existing OpenTUI patterns in `src/features` and `src/modals` before introducing abstractions. New components should earn their existence by reducing duplication or clarifying intent.
- Prefer small, readable UI components over generalized layout systems. Layout state can become fragile quickly, so keep alignment and sizing logic local when possible.
- Use plain text labels for early feature scaffolding. Do not design polished empty states, tab panels, cards, or metrics before the underlying behavior exists.
- Do not add animations, spinners, progress meters, or live status indicators unless they reflect real work in progress. Fake activity makes the app feel noisy and less trustworthy.
- Loading states should be calm and purposeful. The first-launch load may be more visible, but normal loading should avoid stealing focus from the main UI.
- Errors should be understandable and recoverable. Tell the user what happened and what to do next, especially for provider authentication or missing configuration.
- Study material labels should be compact. Long paths and URLs should be truncated in a way that preserves useful identifying information.
- Settings should be visible enough to confirm the session context, but changing settings should not feel like the main task. The user came to study, not configure software.
- Preserve current shortcuts unless explicitly asked to change them. If a shortcut conflicts with terminal behavior, choose a reliable terminal-friendly shortcut and update all visible hints.
- Be careful with `ctrl+m`: on legacy terminals it still reports as Enter (only Kitty-keyboard mode disambiguates it). The home prompt keeps an enter-on-empty fallback for the models modal; do not rely on ctrl+m for in-session behavior.
- When adding new UI, test mentally against a small terminal, a wide terminal, first launch, configured state, missing configuration, and active session state.
- Documentation and code should agree on the product language. Use `mode` for study flows inside sessions and avoid introducing competing terms such as tabs, agents, panels, or workspaces unless requested.
- The overall feel should be like a focused study desk: a prompt, selected materials, a helpful mode, and quiet context. Remove anything that feels like admin software, analytics software, or generic agent tooling.

## Architecture Overview

- `src/index.tsx`: app entrypoint; creates the OpenTUI CLI renderer (alternate screen), wires signals and provider disposal.
- `src/shared/ui`: primary reusable UI components (prompt, logo, loading screen).
- `src/features/home/HomeScreen.tsx`: main screen, modal triggers, prompt configuration.
- `src/features/study-session/SessionScreen.tsx`: active study session screen, bottom prompt input, right sidebar, and mode rotation.
- `src/features/setup/SetupScreen.tsx`: first-run/setup flow for provider configuration.
- `src/modals`: modal modules and manifests. Each modal should have a manifest when it is user-triggerable.
- `src/commands`: slash command modules loaded dynamically by `loadCommands`.
- `src/providers`: the single `StudyProvider` contract (`checkAuth`, `getModels`, `prompt`, `dispose`), one adapter per backend, provider metadata, and the factory map. Prompts resolve once with final text; do not reintroduce streaming events or status callbacks.
- `src/prompts`: study-mode system prompts. Each file should export a plain string prompt for one mode; keep schemas and runtime prompt-building logic elsewhere.
- `src/options`: static options such as study subjects.
- `src/utils/config.ts`: local config/session persistence under `~/.openstudy`.
- `src/utils/input.ts`: shared terminal input helpers, including mouse-report filtering.
- `dist`: generated build output and ignored by git. Do not edit or commit it unless project policy changes.

## Current Controls

- `tab`: subject selector.
- `ctrl+m`: model selector.
- `ctrl+r`: reasoning selector.
- `ctrl+f`: material picker.
- `ctrl+l`: study language selector.
- `ctrl+l`: next session mode while inside an active study session.
- `ctrl+c`: exit or close an active modal.
- Enter from the home prompt starts a study session only when required session options are complete.
- `/setup`: setup flow.
- `/exit`: exit the CLI.

## Current Session Modes

- Summary
- Quiz
- FlashCards
- Exercises
- AI Teacher
- `ctrl+l` rotates through modes inside `SessionScreen.tsx`.
- Each mode currently has a placeholder component that renders the active mode name.

## Development Workflow

- Package manager: `npm` scripts executed with Bun available (`bun test`, `bun run`).
- Runtime: Bun >=1.3 (OpenTUI requirement).
- Development command: `npm run dev`.
- Build command: `npm run build`.
- Start compiled app: `npm start`.
- Reset local config: `npm run reset`.
- TypeScript is strict and uses ES modules; JSX runs through the `@opentui/react` reconciler.
- Prefer small, direct changes over broad rewrites.
- Run `npm run build` after TypeScript or behavior changes when feasible.
- Documentation-only changes do not require a build unless package metadata or generated outputs are touched.

## Coding Protocols

- Treat `src` as the source of truth.
- Do not manually edit generated files in `dist`.
- Preserve existing keyboard shortcuts unless explicitly asked to change them.
- When adding a modal, add or update its manifest so it can be discovered consistently.
- When adding a slash command, follow the module shape in `src/commands/types.ts`.
- Keep provider additions behind provider definitions in `src/providers` and compatible session/config types.
- Keep study-mode system prompts in `src/prompts` as TypeScript string exports only. Do not put response schemas, provider calls, or UI logic in prompt files.
- Keep response schemas outside `src/prompts`; provider options may pass schemas separately when needed.
- The Codex provider supports `file`, `files`, and `responseSchema` prompt options. File options are appended to the prompt as material references the model reads from disk, and `responseSchema` maps to the AI SDK's structured `output`.
- The OpenTUI renderer owns mouse reporting and keyboard parsing; input handlers receive parsed keys through `useAppKeys`/the shared key adapter in `src/shared/terminal/keymap.ts`.
- Do not introduce API keys, secrets, or local user config into the repository.
- Do not change license or contribution policy casually. Ask first if the task touches legal terms.

## Repository Policy

- External contributions are currently not accepted.
- OpenStudy is licensed under the GNU General Public License v3.0 only.
- Users may use, modify, and distribute the project under the GPLv3 terms.
- Distributed modified versions must remain under GPLv3 and include corresponding source as required by the license.
- The license does not grant trademark rights to the OpenStudy name.

## Agent Behavior Expectations

- Build context by reading relevant files before editing.
- Prefer minimal, correct patches.
- Keep the README, license, package metadata, and app behavior consistent when touching project-level policy.
- Do not commit or push unless the user explicitly asks.
- If the worktree has unrelated changes, leave them alone.
- If a requested change conflicts with the license, contribution policy, or design direction, stop and ask a concise clarifying question.
