// Sample data for the replicas of HomeScreen.tsx and SessionScreen.tsx. Labels and colors follow src/.

export const REPO_URL = 'https://github.com/Itri-Cloud-Labs/openstudy';

export const SUBJECTS = [
  { name: 'Biology', color: '#22c55e' },
  { name: 'Chemistry', color: '#f97316' },
  { name: 'Computer Science', color: '#3b82f6' },
  { name: 'History', color: '#a855f7' },
  { name: 'Mathematics', color: '#eab308' },
  { name: 'Physics', color: '#06b6d4' },
  { name: 'Literature', color: '#ec4899' },
  { name: 'General', color: '#13248b' },
];

export const LANGUAGES = [
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

export const REASONING = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Extra High', value: 'xhigh' },
];

export const PROVIDERS = ['Codex', 'OpenCode'];

export const MATERIAL_FILES = ['sorting.md', 'big-o.pdf', 'graphs.epub'];

export interface Command {
  name: string;
  description: string;
  note: string;
}

export const COMMANDS: Command[] = [
  { name: 'setup', description: 'Start the setup process', note: 'In OpenStudy this opens provider setup.' },
  { name: 'sessions', description: 'Open saved sessions', note: 'In OpenStudy this lists your saved sessions.' },
  { name: 'exit', description: 'Exit the cli', note: 'Nothing to exit here. In a terminal this closes OpenStudy.' },
];

export const MODES = [
  { label: 'Summary', works: true },
  { label: 'Quiz', works: false },
  { label: 'FlashCards', works: false },
  { label: 'Exercises', works: false },
  { label: 'AI Teacher', works: false },
];

export const LOGO = [
  ['   ___                   ', '____  _             _       '],
  ['  / _ \\ _ __   ___ _ __ ', '/ ___|| |_ _   _  __| |_   _ '],
  [" | | | | '_ \\ / _ \\ '_ \\\\", '___ \\| __| | | |/ _` | | | |'],
  [' | |_| | |_) |  __/ | | |', '__) | |_| |_| | (_| | |_| |'],
  ['  \\___/| .__/ \\___|_| |_|', '___/ \\__|\\__,_|\\__,_|\\__, |'],
  ['       |_|               ', '                      |___/ '],
];
