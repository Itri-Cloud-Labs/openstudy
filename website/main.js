// Replicas of HomeScreen.tsx and SessionScreen.tsx. Labels, colors, and behavior follow src/; nothing is sent anywhere.

const SUBJECTS = [
  { name: 'Biology', color: '#22c55e' },
  { name: 'Chemistry', color: '#f97316' },
  { name: 'Computer Science', color: '#3b82f6' },
  { name: 'History', color: '#a855f7' },
  { name: 'Mathematics', color: '#eab308' },
  { name: 'Physics', color: '#06b6d4' },
  { name: 'Literature', color: '#ec4899' },
  { name: 'General', color: '#13248b' },
];

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Arabic',
  'Chinese',
  'Japanese',
  'Korean',
  'Hindi',
  'Dutch',
  'Russian',
  'Turkish',
];

const REASONING = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Extra High', value: 'xhigh' },
];

const COMMANDS = [
  { name: 'setup', description: 'Start the setup process', note: 'In OpenStudy this opens provider setup.' },
  { name: 'sessions', description: 'Open saved sessions', note: 'In OpenStudy this lists your saved sessions.' },
  { name: 'exit', description: 'Exit the cli', note: 'Nothing to exit here. In a terminal this closes OpenStudy.' },
];

const MODES = [
  { label: 'Summary', works: true },
  { label: 'Quiz', works: false },
  { label: 'FlashCards', works: false },
  { label: 'Exercises', works: false },
  { label: 'AI Teacher', works: false },
];

const LOGO = [
  ['   ___                   ', '____  _             _       '],
  ['  / _ \\ _ __   ___ _ __ ', '/ ___|| |_ _   _  __| |_   _ '],
  [" | | | | '_ \\ / _ \\ '_ \\\\", '___ \\| __| | | |/ _` | | | |'],
  [' | |_| | |_) |  __/ | | |', '__) | |_| |_| | (_| | |_| |'],
  ['  \\___/| .__/ \\___|_| |_|', '___/ \\__|\\__,_|\\__,_|\\__, |'],
  ['       |_|               ', '                      |___/ '],
];

const SUMMARY = `<p class="md-h1">Sorting algorithms</p>
<p class="md-rule" aria-hidden="true">------------------</p>
<p class="md-p">Sorting arranges items into a defined order. The right algorithm depends on input size, whether the data is already nearly sorted, and whether equal items must keep their original order.</p>
<p class="md-h2">Key ideas</p>
<ul class="md-list">
<li>A stable sort keeps equal items in their original order.</li>
<li>An in-place sort needs only constant extra memory.</li>
<li>No comparison sort beats O(n log n) in the worst case.</li>
</ul>
<p class="md-h2">Comparison</p>
<pre class="md-pre"><b>Algorithm  Average     Worst       Stable</b>
Insertion  O(n²)       O(n²)       yes
Merge      O(n log n)  O(n log n)  yes
Quick      O(n log n)  O(n²)       no
Heap       O(n log n)  O(n log n)  no</pre>
<p class="md-h2">Insertion sort</p>
<p class="md-p">Builds the sorted list one item at a time by shifting larger items to the right. Fast on small or nearly sorted input.</p>
<pre class="md-pre md-code"><i>python</i>
for i in range(1, len(a)):
    key = a[i]
    j = i - 1
    while j >= 0 and a[j] > key:
        a[j + 1] = a[j]
        j -= 1
    a[j + 1] = key</pre>
<p class="md-h2">Merge sort</p>
<p class="md-p">Splits the list in half, sorts each half, then merges the two sorted halves. Predictable O(n log n), at the cost of O(n) extra memory.</p>
<p class="md-h2">Remember</p>
<ul class="md-list">
<li>Nearly sorted data: insertion sort.</li>
<li>Stability required: merge sort.</li>
<li>Tight memory: heap sort.</li>
</ul>`;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = value => value.replace(/[&<>"]/g, char => `&#${char.charCodeAt(0)};`);

const state = {
  subject: 'Computer Science',
  provider: 'Codex',
  model: 'gpt-5.5',
  reasoning: 'high',
  material: 'notes/sorting.md',
  language: 'English',
  mode: 0,
  summary: 'loading',
};

// Colors

function luminance(hex) {
  const channels = [1, 3, 5].map(index => {
    const value = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function mixWithWhite(hex, amount) {
  const mixed = [1, 3, 5].map(index => {
    const value = Number.parseInt(hex.slice(index, index + 2), 16);
    return Math.round(value + (255 - value) * amount)
      .toString(16)
      .padStart(2, '0');
  });
  return `#${mixed.join('')}`;
}

// Subject colors are tuned for fills. As text on the raised prompt they need a lighter shade to stay readable.
function readableSubject(hex) {
  let color = hex;
  for (let step = 1; contrast(color, '#1f1f23') < 4.5 && step <= 10; step += 1) color = mixWithWhite(hex, step / 10);
  return color;
}

// Bindings

function sync() {
  const subject = SUBJECTS.find(item => item.name === state.subject) ?? SUBJECTS[2];
  const root = document.documentElement.style;
  root.setProperty('--subject', subject.color);
  root.setProperty('--subject-text', readableSubject(subject.color));
  root.setProperty('--on-subject', contrast(subject.color, '#000000') >= 4.5 ? '#000000' : '#ffffff');

  const values = { ...state, modelLabel: `${state.provider}/${state.model}`, modeTitle: MODES[state.mode].label };
  for (const node of $$('[data-bind]')) node.textContent = values[node.dataset.bind];
  for (const button of $$('.swatches button'))
    button.setAttribute('aria-pressed', button.dataset.subject === subject.name);
}

// Logo

for (const logo of $$('.logo')) {
  logo.innerHTML = LOGO.map(
    ([open, study], index) => `<span style="--i:${index}">${escapeHtml(open)}<b>${escapeHtml(study)}</b></span>`,
  ).join('');
}

// Modals

const MAX_ROWS = 6;

function openModal(term, spec, returnFocus) {
  const layer = $('.modal-layer', term);
  let selected = spec.selected ?? 0;
  let filter = '';

  const close = (restoreFocus = true) => {
    layer.hidden = true;
    layer.replaceChildren();
    layer.onclick = null;
    if (restoreFocus) returnFocus?.focus({ preventScroll: true });
  };

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-label', spec.title);

  const head = `<div class="modal-head"><strong>${escapeHtml(spec.title)}</strong><button type="button" data-close aria-label="Close">esc</button></div>`;

  if (spec.message) {
    modal.innerHTML = `${head}<p class="modal-sub">${escapeHtml(spec.message)}</p><div class="modal-foot"><span></span><button type="button" class="modal-ok" data-close>enter close</button></div>`;
    modal.addEventListener('keydown', event => {
      if (event.key !== 'Escape' && event.key !== 'Enter') return;
      event.preventDefault();
      close();
    });
  } else {
    modal.innerHTML = `${head}${spec.sub ? `<p class="modal-sub">${escapeHtml(spec.sub)}</p>` : ''}${
      spec.search ? '<p class="modal-search" aria-hidden="true">Search <span></span><i></i></p>' : ''
    }<ul class="modal-list" role="listbox" tabindex="0" aria-label="${escapeHtml(spec.title)}"></ul><div class="modal-foot"><span data-range></span><span>${spec.footRight ?? 'enter select'}</span></div>`;

    const list = $('.modal-list', modal);
    const filtered = () => spec.items.filter(item => item.label.toLowerCase().includes(filter.trim().toLowerCase()));
    const choose = item => {
      close();
      if (item) spec.onSelect(item);
    };

    const render = () => {
      const items = filtered();
      const rows = Math.max(1, Math.min(spec.maxRows ?? MAX_ROWS, items.length));
      const start = Math.min(Math.max(0, selected - rows + 1), Math.max(0, items.length - rows));
      const visible = items.slice(start, start + rows);

      list.innerHTML =
        visible
          .map((item, index) => {
            const dot = item.color ? `<span class="dot" style="--dot:${item.color}"></span>` : '';
            const hint = item.hint ? `<small class="${item.hintClass ?? ''}">${escapeHtml(item.hint)}</small>` : '';
            return `<li role="option" id="option-${start + index}" data-index="${start + index}" aria-selected="${start + index === selected}"><span>${dot}${escapeHtml(item.label)}</span>${hint}</li>`;
          })
          .join('') ||
        `<li role="option" aria-disabled="true" class="modal-sub">${spec.empty ?? 'No results found'}</li>`;
      list.setAttribute('aria-activedescendant', items.length > 0 ? `option-${selected}` : '');
      if (spec.search) $('.modal-search span', modal).textContent = filter;
      $('[data-range]', modal).textContent =
        `↑↓ move ${items.length ? start + 1 : 0}-${start + visible.length}/${items.length}`;
    };

    list.addEventListener('click', event => {
      const option = event.target.closest('[data-index]');
      if (option) choose(filtered()[Number(option.dataset.index)]);
    });

    modal.addEventListener('keydown', event => {
      const items = filtered();
      const count = Math.max(1, items.length);
      if (event.key === 'Escape') close();
      else if (event.key === 'Enter' && !event.target.closest('button')) choose(items[selected]);
      else if (event.key === 'ArrowDown') selected = (selected + 1) % count;
      else if (event.key === 'ArrowUp') selected = (selected - 1 + count) % count;
      else if (spec.search && event.key === 'Backspace') {
        filter = filter.slice(0, -1);
        selected = 0;
      } else if (spec.search && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        filter += event.key;
        selected = 0;
      } else return;
      event.preventDefault();
      if (!layer.hidden) render();
    });

    render();
  }

  layer.replaceChildren(modal);
  layer.hidden = false;
  layer.onclick = event => {
    if (event.target === layer || event.target.closest('[data-close]')) close();
  };
  modal.addEventListener('focusout', event => {
    if (!layer.hidden && event.relatedTarget && !modal.contains(event.relatedTarget)) close(false);
  });
  ($('.modal-list', modal) ?? $('.modal-ok', modal)).focus({ preventScroll: true });
}

const current = (value, selected) => (value === selected ? { hint: 'current', hintClass: 'current' } : {});

const MODAL_SPECS = {
  subjects: () => ({
    title: 'Select Subject',
    search: true,
    selected: SUBJECTS.findIndex(item => item.name === state.subject),
    items: SUBJECTS.map(item => ({ label: item.name, color: item.color })),
    onSelect: item => set({ subject: item.label }),
  }),
  models: () => ({
    title: 'Select Provider',
    selected: state.provider === 'Codex' ? 0 : 1,
    footRight: 'enter continue',
    items: ['Codex', 'OpenCode'].map(label => ({ label, ...current(label, state.provider) })),
    onSelect: item => set({ provider: item.label }),
  }),
  reasoning: () => ({
    title: `${state.provider}/${state.model}`,
    sub: 'Select a reasoning level.',
    selected: REASONING.findIndex(item => item.value === state.reasoning),
    items: REASONING.map(item => ({ ...item, ...current(item.value, state.reasoning) })),
    onSelect: item => set({ reasoning: item.value }),
  }),
  material: (term, returnFocus) => ({
    title: 'Add Material',
    sub: 'Choose where your document comes from.',
    footRight: 'enter continue',
    items: [
      { label: 'Material from computer', hint: 'Choose a local document', value: 'computer' },
      { label: 'Material from URL', hint: 'Download a document from the web', value: 'url' },
    ],
    onSelect: item => {
      if (item.value === 'url') {
        openModal(
          term,
          {
            title: 'Add Material',
            message: 'The replica downloads nothing. In OpenStudy you paste a document URL here.',
          },
          returnFocus,
        );
        return;
      }
      openModal(
        term,
        {
          title: 'Add Material',
          sub: '~/notes',
          selected: ['notes/sorting.md', 'notes/big-o.pdf', 'notes/graphs.epub'].indexOf(state.material),
          items: ['sorting.md', 'big-o.pdf', 'graphs.epub'].map(label => ({ label })),
          onSelect: file => set({ material: `notes/${file.label}` }),
        },
        returnFocus,
      );
    },
  }),
  language: () => ({
    title: 'Select Language',
    search: true,
    maxRows: 8,
    empty: 'No languages found',
    selected: LANGUAGES.indexOf(state.language),
    items: LANGUAGES.map(label => ({ label, ...current(label, state.language) })),
    onSelect: item => set({ language: item.label }),
  }),
};

function set(patch) {
  Object.assign(state, patch);
  sync();
}

// Home screen

const homeTerm = $('#home-term');
const homeInput = $('#home-input');
const homeMenu = $('#home-menu');
let menuIndex = 0;
let menuDismissed = false;

for (const button of $$('[data-open]', homeTerm)) {
  button.addEventListener('click', () =>
    openModal(homeTerm, MODAL_SPECS[button.dataset.open](homeTerm, button), button),
  );
}

function menuItems() {
  const value = homeInput.value;
  if (menuDismissed || !value.startsWith('/') || /\s/.test(value)) return null;
  return COMMANDS.filter(command => command.name.startsWith(value.slice(1).toLowerCase()));
}

function renderMenu() {
  const items = menuItems();
  homeMenu.hidden = items === null;
  homeInput.setAttribute('aria-expanded', String(items !== null));
  if (items === null) return;
  menuIndex = Math.min(menuIndex, Math.max(0, items.length - 1));
  homeMenu.innerHTML =
    items
      .map(
        (command, index) =>
          `<div role="option" data-command="${command.name}" aria-selected="${index === menuIndex}"><b>/${command.name}</b><span>${command.description}</span></div>`,
      )
      .join('') || '<div class="empty">No matching commands</div>';
}

function runCommand(command) {
  homeInput.value = '';
  refreshInput(homeInput);
  openModal(homeTerm, { title: `/${command.name}`, message: command.note }, homeInput);
}

function refreshInput(input) {
  input.parentElement.classList.toggle('has-value', input.value.length > 0);
  if (input === homeInput) renderMenu();
}

homeInput.setAttribute('role', 'combobox');
homeInput.setAttribute('aria-controls', 'home-menu');
homeInput.setAttribute('aria-expanded', 'false');

homeInput.addEventListener('input', () => {
  menuDismissed = false;
  refreshInput(homeInput);
});

homeInput.addEventListener('keydown', event => {
  const items = menuItems();
  if (!items) return;
  if (event.key === 'Escape') menuDismissed = true;
  else if (event.key === 'ArrowDown' && items.length) menuIndex = (menuIndex + 1) % items.length;
  else if (event.key === 'ArrowUp' && items.length) menuIndex = (menuIndex - 1 + items.length) % items.length;
  else return;
  event.preventDefault();
  renderMenu();
});

homeMenu.addEventListener('mousedown', event => {
  const option = event.target.closest('[data-command]');
  if (!option) return;
  event.preventDefault();
  runCommand(COMMANDS.find(command => command.name === option.dataset.command));
});

$('#home-prompt').addEventListener('submit', event => {
  event.preventDefault();
  const value = homeInput.value.trim();
  const items = menuItems();
  const typed = COMMANDS.find(command => value === `/${command.name}`);

  if (items?.length) runCommand(items[menuIndex]);
  else if (typed) runCommand(typed);
  // The app keeps an enter-on-empty fallback for the models modal; see AGENTS.md on ctrl+m.
  else if (!value) openModal(homeTerm, MODAL_SPECS.models(), homeInput);
  else if (!items) startSession();
});

// Typing anywhere near the top of the page lands in the prompt, the way it would in a terminal.
document.addEventListener('keydown', event => {
  if (event.key.length !== 1 || event.key === ' ' || event.ctrlKey || event.metaKey || event.altKey) return;
  if (document.activeElement !== document.body) return;
  const box = homeTerm.getBoundingClientRect();
  if (box.bottom < 80 || box.top > window.innerHeight) return;
  homeInput.focus({ preventScroll: true });
});

// Session screen

const sessionTerm = $('#session-term');
const sessionInput = $('#session-input');
const modeBody = $('.mode-body', sessionTerm);
const modeHead = $('.mode-head', sessionTerm);
const modeStatus = $('.mode-status', sessionTerm);
const pageModes = $('.modes');
const sideModes = $('.side-modes', sessionTerm);
let summaryTimers = [];

pageModes.innerHTML = MODES.map(
  (mode, index) =>
    `<li><button type="button" data-mode="${index}">${mode.label}<small class="${mode.works ? 'works' : ''}">${mode.works ? 'works today' : 'not wired yet'}</small></button></li>`,
).join('');
sideModes.innerHTML = MODES.map(
  (mode, index) =>
    `<li><button type="button" data-mode="${index}"><span>${mode.label}</span><span></span></button></li>`,
).join('');

function renderMode({ animate = true } = {}) {
  const isSummary = state.mode === 0;
  modeHead.hidden = !isSummary;

  if (!isSummary) {
    modeBody.innerHTML = `<p class="placeholder-mode">${MODES[state.mode].label}</p>`;
  } else if (state.summary === 'loading') {
    modeBody.innerHTML = '<p class="generating">Generating summary<span data-dots>...</span></p>';
    modeStatus.textContent = 'loading';
  } else {
    modeBody.innerHTML = SUMMARY;
    modeStatus.textContent = 'up/down scroll';
  }
  modeBody.scrollTop = 0;

  if (animate) {
    modeBody.classList.remove('swap');
    void modeBody.offsetWidth;
    modeBody.classList.add('swap');
  }

  for (const button of $$('[data-mode]')) {
    const active = Number(button.dataset.mode) === state.mode;
    button.setAttribute('aria-pressed', active);
    if (button.closest('.side-modes')) button.lastElementChild.textContent = active ? 'active' : '';
  }
}

function setMode(index) {
  state.mode = (index + MODES.length) % MODES.length;
  sync();
  renderMode();
}

function generateSummary() {
  for (const timer of summaryTimers) clearTimeout(timer);
  state.summary = 'loading';
  state.mode = 0;
  sync();
  renderMode();

  if (!reducedMotion.matches) {
    let frame = 0;
    const dots = setInterval(() => {
      frame += 1;
      const target = $('[data-dots]', modeBody);
      if (target) target.textContent = '.'.repeat((frame % 3) + 1);
    }, 450);
    summaryTimers.push(dots);
  }

  const done = setTimeout(() => {
    for (const timer of summaryTimers) clearInterval(timer);
    summaryTimers = [];
    state.summary = 'ready';
    renderMode();
  }, 2600);
  summaryTimers.push(done);
}

function startSession() {
  homeInput.value = '';
  refreshInput(homeInput);
  homeInput.blur();
  sessionTerm.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center' });
  generateSummary();
}

for (const list of [pageModes, sideModes]) {
  list.addEventListener('click', event => {
    const button = event.target.closest('[data-mode]');
    if (button) setMode(Number(button.dataset.mode));
  });
}

$('[data-next-mode]').addEventListener('click', () => setMode(state.mode + 1));

sessionInput.addEventListener('input', () => refreshInput(sessionInput));

$('#session-prompt').addEventListener('submit', event => {
  event.preventDefault();
  if (!sessionInput.value.trim()) return;
  sessionInput.value = '';
  refreshInput(sessionInput);
  openModal(
    sessionTerm,
    { title: 'Session Prompt', message: 'Follow-up prompts are not wired to study modes yet.' },
    sessionInput,
  );
});

// The summary generates the first time the session scrolls into view.
new IntersectionObserver(
  (entries, observer) => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    if (state.summary === 'loading' && summaryTimers.length === 0) generateSummary();
  },
  { threshold: 0.45 },
).observe(sessionTerm);

// Context section

const ctxDisplay = $('.ctx-display');
const swatches = $('.swatches');

swatches.innerHTML = SUBJECTS.map(
  subject =>
    `<button type="button" data-subject="${subject.name}" style="--swatch:${subject.color}">${subject.name}</button>`,
).join('');

swatches.addEventListener('click', event => {
  const button = event.target.closest('[data-subject]');
  if (button) set({ subject: button.dataset.subject });
});

function highlightPart(part) {
  ctxDisplay.classList.toggle('has-active', Boolean(part));
  for (const token of $$('[data-part]', ctxDisplay)) token.classList.toggle('is-active', token.dataset.part === part);
}

for (const part of $$('.part')) {
  part.addEventListener('pointerenter', () => highlightPart(part.dataset.part));
  part.addEventListener('pointerleave', () => highlightPart(null));
  part.addEventListener('focusin', () => highlightPart(part.dataset.part));
  part.addEventListener('focusout', () => highlightPart(null));
}

// Install

const tabs = $$('[role="tab"]');

function selectTab(tab) {
  for (const item of tabs) {
    const active = item === tab;
    item.setAttribute('aria-selected', active);
    item.tabIndex = active ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
  }
}

for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const next = tabs[(tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    selectTab(next);
    next.focus();
  });
}

for (const button of $$('[data-copy]')) {
  button.setAttribute('aria-live', 'polite');
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('code', button.parentElement).textContent);
      button.textContent = 'Copied';
      button.classList.add('done');
    } catch {
      button.textContent = 'Select it';
    }
    setTimeout(() => {
      button.textContent = 'Copy';
      button.classList.remove('done');
    }, 1600);
  });
}

sync();
renderMode({ animate: false });
