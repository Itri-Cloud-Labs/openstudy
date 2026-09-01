# OpenStudy

Study with an AI without leaving your terminal.

OpenStudy gives a study session enough context to be useful: your subject, model, reasoning level, source material, and preferred language. Pick those once, write a prompt, and keep the rest of the screen quiet.

It is a young project. Summary and Quiz modes work. FlashCards, Exercises, AI Teacher, and follow-up prompts are visible in the interface but are not wired up yet.

## What works today

- A keyboard-first terminal interface built with React and OpenTUI
- Codex and OpenCode providers, using their existing local authentication
- Model and reasoning options discovered from the selected provider
- Local files and HTTP or HTTPS documents as study material
- AI-generated summaries with structured sections
- Five-question quizzes with immediate feedback and saved question sets
- Saved preferences and study sessions under `~/.openstudy`
- A setup wizard and slash commands for setup, sessions, and exit

OpenStudy runs provider requests without tools. The Codex adapter also uses a read-only sandbox and never asks for approval to change files.

## Before you install

You need:

- [Bun](https://bun.sh) 1.3 or newer
- npm 10 or newer
- A terminal at least 73 columns wide and 23 rows tall
- Either the [Codex CLI](https://github.com/openai/codex) or [OpenCode](https://opencode.ai) installed and authenticated

For Codex:

```bash
codex login
```

For OpenCode:

```bash
opencode auth login
```

## Run it

```bash
git clone https://github.com/Itri-Cloud-Labs/openstudy.git
cd openstudy
bun install --frozen-lockfile
npm run dev
```

The first launch opens setup. Choose a provider, then return to the home screen and fill in the session options. If you have no prompt in mind, type `Hi`.

To build and run the compiled CLI:

```bash
npm run build
npm start
```

## Controls

| Key | Home screen | Study session |
| --- | --- | --- |
| `enter` | Start a session | Submit the prompt |
| `tab` | Choose a subject | |
| `ctrl+m` | Choose a model | |
| `ctrl+r` | Choose reasoning effort | |
| `ctrl+f` | Choose study material | |
| `ctrl+l` | Choose a language | Move to the next study mode |
| `ctrl+c` | Close a modal or exit | Close a modal or exit |

Slash commands work in both prompts:

- `/setup` opens provider setup.
- `/sessions` opens saved sessions.
- `/exit` closes OpenStudy.

## Study material

The material picker accepts supported documents from your home directory. It can also download a document from an HTTP or HTTPS URL. Downloads have a 25 MB limit and go into `~/.openstudy/documents`.

Supported formats include PDF, EPUB, Markdown, plain text, Office documents, OpenDocument files, CSV, JSON, XML, YAML, and LaTeX.

Provider behavior differs slightly. Codex reads local files through its read-only sandbox. OpenCode receives the material reference in the study prompt.

## Local data

OpenStudy keeps its state in `~/.openstudy`:

```text
~/.openstudy/
├── config.json       provider choice and credentials
├── session.json      current study preferences
├── documents/        material downloaded from URLs
└── <session-id>/     one directory per saved session
```

Reset preferences while keeping saved sessions and downloaded documents:

```bash
npm run reset
```

Delete all OpenStudy data:

```bash
npm run reset:all -- --yes
```

## Development

Run the complete local quality gate before opening a change:

```bash
npm run check
```

That command checks formatting, lint rules, TypeScript, tests, the production build, and package contents. The narrower commands are documented in [DEVELOPMENT.md](DEVELOPMENT.md).

Do not edit `dist`. The build recreates it from `src`.

## Contributions

OpenStudy is not accepting external contributions yet. You can still fork, study, and modify the code under GPLv3. The license does not grant rights to the OpenStudy name or trademarks for modified versions.

## License

OpenStudy is free software under the [GNU General Public License v3.0](LICENSE).
