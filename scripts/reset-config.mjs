#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const configDirectory = path.join(os.homedir(), '.openstudy');
const resetAll = process.argv.includes('--all');
const confirmed = process.argv.includes('--yes');

if (resetAll) {
  if (!confirmed) {
    console.error('This removes all OpenStudy settings, saved sessions, and downloaded material.');
    console.error('Confirm with: npm run reset:all -- --yes');
    process.exitCode = 1;
  } else {
    fs.rmSync(configDirectory, { recursive: true, force: true });
    console.log('Removed all local OpenStudy data.');
  }
} else {
  const files = ['config.json', 'session.json'];
  const removed = files.filter(file => {
    const target = path.join(configDirectory, file);
    const existed = fs.existsSync(target);
    fs.rmSync(target, { force: true });
    return existed;
  });

  console.log(
    removed.length > 0
      ? `Reset OpenStudy settings (${removed.join(', ')}). Saved sessions and downloaded material were preserved.`
      : 'No OpenStudy settings found; nothing changed.',
  );
}
