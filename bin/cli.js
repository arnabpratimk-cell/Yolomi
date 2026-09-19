#!/usr/bin/env node
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distPath = path.join(projectRoot, 'dist');

function run(command, args) {
  return spawn(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true
  });
}

if (!existsSync(distPath)) {
  console.log('Building Yolomi for the first run, this may take a moment...');
  const build = run('npx', ['vite', 'build']);
  build.on('close', (code) => {
    if (code !== 0) {
      console.error('Build failed. See errors above.');
      process.exit(code);
    }
    startPreview();
  });
} else {
  startPreview();
}

function startPreview() {
  console.log('Starting Yolomi...');
  run('npx', ['vite', 'preview', '--open']);
}