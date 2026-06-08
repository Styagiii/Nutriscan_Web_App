import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

let shuttingDown = false;
let backendProcess;
let frontendProcess;

function stopAll(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of [backendProcess, frontendProcess]) {
    if (child && !child.killed) {
      child.kill();
    }
  }

  setTimeout(() => process.exit(exitCode), 500).unref();
}

function startProcess(command, args, cwd, name) {
  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
  });

  child.on('error', (error) => {
    console.error(`[dev] Failed to start ${name}:`, error);
    stopAll(1);
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;

    const detail = signal ? `signal ${signal}` : `code ${code}`;
    console.error(`[dev] ${name} exited with ${detail}. Stopping the other process.`);
    stopAll(code ?? 1);
  });

  return child;
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

console.log('[dev] Starting NutriScan backend and frontend...');

backendProcess = startProcess(process.execPath, ['index.js'], backendDir, 'backend');
frontendProcess = process.platform === 'win32'
  ? startProcess(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm run dev'], frontendDir, 'frontend')
  : startProcess('npm', ['run', 'dev'], frontendDir, 'frontend');