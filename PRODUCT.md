# Product

## Register

brand

## Users

Students and self-learners who already live in a terminal: developers, CS and STEM students, people who keep notes as files. They find OpenStudy through GitHub, usually at a desk, often late, with a PDF or a notes folder open next to a shell. They want to study a document with an AI without switching to a browser tab.

## Product Purpose

OpenStudy is a keyboard-first study assistant for the terminal. A session carries five pieces of context (subject, model, reasoning level, source material, language) so a one-word prompt is enough to start. It runs on the Codex or OpenCode login already on the machine and keeps its state in `~/.openstudy`.

The website exists to show the product honestly and get a visitor from "what is this" to a running install. Summary mode works today. Quiz, FlashCards, Exercises, AI Teacher, and follow-up prompts are visible in the interface and not wired yet; the site says so.

## Brand Personality

Quiet, exact, candid. The voice of a focused study desk: a prompt, selected materials, and nothing competing for attention. Copy states what the product literally does and where it stops. Light dry humor is allowed in small places (the app's own loading messages set the precedent).

## Anti-references

- Generic dark SaaS landing pages: gradient glows, glass cards, three-up feature grids, invented metrics.
- Admin, analytics, or agent-tooling chrome. OpenStudy is not a dashboard.
- Fake terminal screenshots with macOS traffic lights and made-up output. Terminal renderings must match the real screens in `src/features`.
- Web-app concepts that do not map to the TUI (tabs, panels, workspaces).

## Design Principles

1. The product is the picture. Show real screens, real copy, real key bindings.
2. Say what works. Unfinished modes are labeled as unfinished.
3. One prompt, quiet edges. The primary action stays central; supporting information stays dim.
4. Keyboard-first, never keyboard-only. Every demo control is also a real button.
5. Inherit the app's identity: black, amber, subject colors, restrained rules.

## Accessibility & Inclusion

WCAG 2.2 AA. Text contrast at or above 4.5:1, visible focus, full keyboard operation without focus traps, reduced-motion alternatives for every animation, and no auto-moving content that cannot be stopped.
