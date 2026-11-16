const { app, BrowserWindow, shell, nativeImage } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

// Ensure ELECTRON_RUN_AS_NODE is never active
delete process.env.ELECTRON_RUN_AS_NODE;

const logFile = path.resolve(process.env.USERPROFILE || 'C:\\', 'sonora_desktop.log');
function logDesktop(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(logFile, line);
    fs.appendFileSync('C:\\Users\\gurzi\\Desktop\\sonora\\sonora_desktop.log', line);
  } catch {}
}

logDesktop('=== Sonora Electron process starting ===');
logDesktop(`execPath: ${process.execPath}, cwd: ${process.cwd()}, __dirname: ${__dirname}`);

let mainWindow = null;
let backendProcess = null;
let isQuitting = false;

// Windows AppUserModelId for taskbar grouping & icon
if (process.platform === 'win32') {
  app.setAppUserModelId('com.sonora.player');
}
app.setName('Sonora');

// Chromium switches to allow media playback without gesture & allow file streaming
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-features', 'PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies');
app.commandLine.appendSwitch('allow-file-access-from-files');

// Check if Python backend is alive on port 8000
function checkBackendHealth(timeoutMs = 1200) {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8000/api/health', { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Find standalone compiled backend executable (sonora-backend.exe)
function resolveBackendExe() {
  const exeDir = path.dirname(process.execPath);
  const candidates = [
    // Packaged in Electron extraResources (portable & unpacked)
    path.join(process.resourcesPath || '', 'backend', 'sonora-backend.exe'),
    path.join(exeDir, 'resources', 'backend', 'sonora-backend.exe'),
    // Repository compiled dist
    path.resolve(__dirname, '../../../backend/dist/sonora-backend/sonora-backend.exe'),
    path.resolve(exeDir, '../../../backend/dist/sonora-backend/sonora-backend.exe'),
    path.resolve(process.cwd(), 'backend/dist/sonora-backend/sonora-backend.exe'),
    'C:\\Users\\gurzi\\Desktop\\sonora\\backend\\dist\\sonora-backend\\sonora-backend.exe',
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      logDesktop(`resolveBackendExe: found standalone backend at ${c}`);
      return c;
    }
  }
  logDesktop('resolveBackendExe: standalone backend not found, will fall back to python');
  return null;
}

// Find backend directory for script mode fallback
function resolveBackendDir() {
  const exeDir = path.dirname(process.execPath);
  const candidates = [
    // Development mode
    path.resolve(__dirname, '../../backend'),
    path.resolve(__dirname, '../../../backend'),
    // Standalone unpackaged / packaged in dist_electron
    path.resolve(exeDir, '../../../backend'),
    path.resolve(exeDir, '../../backend'),
    path.resolve(exeDir, '../backend'),
    path.resolve(exeDir, 'backend'),
    // Process working directory
    path.resolve(process.cwd(), 'backend'),
    path.resolve(process.cwd(), '../backend'),
    path.resolve(process.cwd(), '../../backend'),
    // Fixed fallback to repository path
    'C:\\Users\\gurzi\\Desktop\\sonora\\backend'
  ];

  for (const c of candidates) {
    if (fs.existsSync(c) && (fs.existsSync(path.join(c, 'run.py')) || fs.existsSync(path.join(c, 'main.py')))) {
      logDesktop(`resolveBackendDir: found valid backend at ${c}`);
      return c;
    }
  }
  logDesktop(`resolveBackendDir: fallback to ${candidates[0]}`);
  return path.resolve(__dirname, '../../backend');
}

// Find Python executable on system or virtualenv for fallback
function resolvePythonPath(backendDir) {
  const commonPaths = [
    path.join(backendDir, '.venv', 'Scripts', 'python.exe'),
    path.join(backendDir, 'venv', 'Scripts', 'python.exe'),
    'C:\\Python314\\python.exe',
    'C:\\Python313\\python.exe',
    'C:\\Python312\\python.exe',
    'C:\\Python311\\python.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python314', 'python.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe'),
  ];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      logDesktop(`resolvePythonPath: found python at ${p}`);
      return p;
    }
  }
  logDesktop('resolvePythonPath: using default "python"');
  return 'python';
}

// Automatically start FastAPI backend if not already running
async function ensureBackendRunning() {
  logDesktop('ensureBackendRunning: checking health...');
  const alreadyRunning = await checkBackendHealth();
  if (alreadyRunning) {
    logDesktop('ensureBackendRunning: backend is ALREADY running on port 8000.');
    return;
  }

  const backendExe = resolveBackendExe();

  if (backendExe) {
    logDesktop(`ensureBackendRunning: Launching standalone backend: ${backendExe}`);
    try {
      backendProcess = spawn(backendExe, [], {
        cwd: path.dirname(backendExe),
        shell: false,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
        },
        stdio: 'pipe',
        detached: false,
      });

      backendProcess.stdout.on('data', (d) => {
        logDesktop(`[Backend stdout] ${d.toString().trim()}`);
      });
      backendProcess.stderr.on('data', (d) => {
        logDesktop(`[Backend stderr] ${d.toString().trim()}`);
      });
      backendProcess.on('error', (err) => {
        logDesktop(`[Backend spawn error] ${err.message}`);
      });
      backendProcess.on('exit', (code) => {
        logDesktop(`[Backend exit] Code: ${code}`);
        backendProcess = null;
      });
    } catch (err) {
      logDesktop(`ensureBackendRunning: Failed to spawn backend binary: ${err.message}`);
    }
  } else {
    // Fallback: spawn python script
    const backendDir = resolveBackendDir();
    const pythonCmd = resolvePythonPath(backendDir);
    logDesktop(`ensureBackendRunning: Launching python backend: ${pythonCmd} run.py in ${backendDir}`);

    try {
      backendProcess = spawn(pythonCmd, ['run.py'], {
        cwd: backendDir,
        shell: process.platform === 'win32',
        env: {
          ...process.env,
          PYTHONPATH: backendDir,
          PYTHONUNBUFFERED: '1',
        },
        stdio: 'pipe',
        detached: false,
      });

      backendProcess.stdout.on('data', (d) => {
        logDesktop(`[Backend stdout] ${d.toString().trim()}`);
      });
      backendProcess.stderr.on('data', (d) => {
        logDesktop(`[Backend stderr] ${d.toString().trim()}`);
      });
      backendProcess.on('error', (err) => {
        logDesktop(`[Backend spawn error] ${err.message}`);
      });
      backendProcess.on('exit', (code) => {
        logDesktop(`[Backend exit] Code: ${code}`);
        backendProcess = null;
      });
    } catch (err) {
      logDesktop(`ensureBackendRunning: Failed to spawn python process: ${err.message}`);
    }
  }

  // Wait for backend to be healthy (up to 15 seconds)
  const startTime = Date.now();
  while (Date.now() - startTime < 15000) {
    await new Promise((r) => setTimeout(r, 400));
    const healthy = await checkBackendHealth();
    if (healthy) {
      logDesktop('ensureBackendRunning: Backend successfully initialized and healthy!');
      return;
    }
  }
  logDesktop('ensureBackendRunning: Backend healthcheck TIMED OUT after 15s!');
}

function killBackendProcess() {
  if (backendProcess && !backendProcess.killed) {
    logDesktop('Stopping backend process...');
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', backendProcess.pid.toString(), '/f', '/t']);
      } else {
        backendProcess.kill('SIGTERM');
      }
    } catch (e) {
      logDesktop(`Failed to kill backend process: ${e.message}`);
    }
    backendProcess = null;
  }
}

function resolveIconPath() {
  const exeDir = path.dirname(process.execPath);
  const iconCandidates = [
    path.resolve(__dirname, '../public/favicon.ico'),
    path.resolve(__dirname, '../../public/favicon.ico'),
    path.resolve(process.resourcesPath || '', 'app.asar/public/favicon.ico'),
    path.resolve(process.resourcesPath || '', 'public/favicon.ico'),
    path.resolve(exeDir, '../../../frontend/public/favicon.ico'),
    path.resolve(process.cwd(), 'public/favicon.ico'),
    path.resolve(process.cwd(), 'frontend/public/favicon.ico'),
    'C:\\Users\\gurzi\\Desktop\\sonora\\frontend\\public\\favicon.ico'
  ];

  for (const p of iconCandidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

function resolveDistHtml() {
  const exeDir = path.dirname(process.execPath);
  const candidates = [
    path.resolve(__dirname, '../dist/index.html'),
    path.resolve(process.resourcesPath || '', 'app.asar/dist/index.html'),
    path.resolve(exeDir, 'resources/app.asar/dist/index.html'),
    path.resolve(exeDir, '../../../frontend/dist/index.html'),
    path.resolve(process.cwd(), 'dist/index.html'),
    path.resolve(process.cwd(), 'frontend/dist/index.html'),
    'C:\\Users\\gurzi\\Desktop\\sonora\\frontend\\dist\\index.html'
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      logDesktop(`resolveDistHtml: found html at ${p}`);
      return p;
    }
  }
  logDesktop(`resolveDistHtml: no candidate found, fallback to ${candidates[0]}`);
  return null;
}

function createWindow() {
  const iconFile = resolveIconPath();
  let appIcon = undefined;
  if (iconFile) {
    try {
      appIcon = nativeImage.createFromPath(iconFile);
    } catch {
      appIcon = iconFile;
    }
  }

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1040,
    minHeight: 700,
    title: 'Sonora',
    icon: appIcon || iconFile || undefined,
    autoHideMenuBar: true,
    backgroundColor: '#0a0b0e',
    show: false, // show after ready-to-show for zero flicker
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // allow local audio streaming
      allowRunningInsecureContent: true,
    },
  });

  // Log renderer console messages to file
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    logDesktop(`[Renderer Console] [lvl ${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    logDesktop(`[Renderer did-fail-load] Code: ${errorCode}, ${errorDescription}, URL: ${validatedURL}`);
  });

  // Smooth show without white flashes
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load URL
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  const distHtml = resolveDistHtml();

  if (devUrl) {
    logDesktop(`Loading devUrl: ${devUrl}`);
    mainWindow.loadURL(devUrl);
  } else if (distHtml) {
    logDesktop(`Loading file: ${distHtml}`);
    mainWindow.loadFile(distHtml);
  } else {
    logDesktop('Loading fallback URL http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  logDesktop('app.whenReady triggered');
  await ensureBackendRunning();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  killBackendProcess();
});

app.on('will-quit', () => {
  killBackendProcess();
});

app.on('window-all-closed', () => {
  killBackendProcess();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
