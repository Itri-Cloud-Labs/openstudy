# OpenStudy

> [!IMPORTANT]
> **OpenStudy licensing roadmap**
> 
> OpenStudy is currently released under the **Open ICL License** to allow rapid development in its early stage.
> 
> It will transition to a fully open source license (**AGPL v3**) once the project reaches maturity.
> 
> This transition will occur when **ALL** of the following milestones are reached:
> 
> - Version **1.0** is released  
> - **2,000 weekly downloads** sustained for **2 consecutive weeks**  
> - **500 stars** on the repository  
> 
> If these milestones are not all reached, the project will still transition to an open source license after a reasonable period of time...
> 
> The goal is not to restrict the project long-term, but to ensure it reaches a stable and high-quality state before opening it to the community.

OpenStudy is an AI-powered study assistant that runs in your terminal. It is built as an OpenCode-inspired TUI for asking study questions, selecting a subject, choosing a model, adjusting reasoning effort, attaching study material, and working in a preferred study language without leaving the command line.

The project is currently focused on a local-first CLI experience using React, OpenTUI, TypeScript, and the Codex app-server protocol.

## Purpose

OpenStudy is designed to make AI-guided studying fast and lightweight. Instead of opening a browser or switching tools, you can launch a terminal interface, choose the context for your study session, and start with a simple prompt such as `Hi`.

Current goals:

- Provide a focused terminal UI for study sessions.
- Let users switch study subjects from the keyboard.
- Let users select the AI model used for guidance.
- Support reasoning-effort, material, and language controls.
- Keep local session settings in the user's home directory.

## Features

- Terminal UI built with OpenTUI (Zig-native renderer) and React.
- First-launch setup flow.
- Codex and OpenCode provider support.
- Subject selector with `tab`.
- Model selector with `ctrl+m`.
- Reasoning selector with `ctrl+r`.
- Material picker with `ctrl+f`.
- Study language selector with `ctrl+l`.
- Slash commands, including `/setup` and `/exit`.
- Local config and session storage in `~/.openstudy`.

## Requirements

- Bun 1.3 or newer (required by the OpenTUI renderer).
- npm 10 or newer.
- A terminal large enough for the TUI. The current minimum is `73x23`.
- Codex login/configuration available locally, if you want to use the Codex provider.

## Local setup

Clone the repository:

```bash
git clone https://github.com/ItriIbouanane/openstudy.git
cd openstudy
```

Install dependencies:

```bash
bun install --frozen-lockfile
```

Run the app in development mode:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

Run the compiled CLI:

```bash
npm start
```

Reset OpenStudy settings while preserving saved sessions and downloaded material:

```bash
npm run reset
```

To remove all local OpenStudy data, including saved sessions and downloaded material:

```bash
npm run reset:all -- --yes
```

## Usage

Start OpenStudy, then use the prompt at the center of the screen. If you are not sure what to ask, say `Hi` and the selected model will guide you.

Keyboard shortcuts:

- `tab`: choose a subject.
- `ctrl+m`: choose a model.
- `ctrl+r`: choose reasoning effort.
- `ctrl+f`: choose study material.
- `ctrl+l`: choose study language.
- `ctrl+c`: exit or close an active modal.
- Inside a session, `ctrl+l` moves to the next study mode.

Slash commands:

- `/setup`: open the setup flow.
- `/exit`: exit the CLI.
- `/sessions`: open saved sessions.

## Configuration

OpenStudy stores local settings under:

```text
~/.openstudy
```

Important files:

- `config.json`: provider configuration.
- `session.json`: current subject, model, reasoning effort, material, and study language.

## Development scripts

- `npm run dev`: run the TypeScript source with Bun.
- `npm run typecheck`: type-check source and tests without emitting files.
- `npm run lint`: run Biome's linter.
- `npm run format`: format supported project files.
- `npm test`: run the test suite once.
- `npm run test:watch`: re-run tests as files change.
- `npm run audit`: check production dependencies for high-severity advisories.
- `npm run build`: clean and compile TypeScript into `dist`.
- `npm run check`: run the complete local and CI quality gate.
- `npm start`: run `dist/index.js`.
- `npm run reset`: reset settings without deleting saved study data.

See `DEVELOPMENT.md` for the full workflow, project structure, package checks, and maintenance commands.

## Contributions

OpenStudy is not accepting external contributions at this time.

Users may still fork the project, as long as the fork follows the project license and policy:

- The fork must use a different project name and must not be distributed as `OpenStudy`.
- The fork must remain publicly source-available.
- The fork must preserve copyright notices and license terms.
- Internal use is allowed, including internal use by companies and other for-profit organizations.
- Selling the software, selling modified versions, paid distribution, or paid hosted access requires written permission from the project owner.

## License

OpenStudy is licensed under the Open ICL License 1.0.0. See `LICENSE` for the full terms.

This is a source-available, sale-restricted software license. It permits use, including internal business use, forking, modification, and redistribution under the same license, provided redistributed forks use a different name and keep their complete corresponding source publicly available.

This license is not OSI-approved open source because restrictions on selling and paid access are not compatible with the Open Source Definition.
