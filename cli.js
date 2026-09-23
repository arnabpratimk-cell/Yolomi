#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function run(command, args) {
  return spawn(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true
  });
}

console.log('Starting Yolomi...');
run('npx', ['vite', 'preview', '--open']);