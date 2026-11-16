const { app, BrowserWindow, shell, nativeImage } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let pythonProcess = null;
let isQuitting = false;

// Windows AppUserModelId for taskbar grouping & icon
if (process.platform === 'win32') {
  app.setAppUserModelId('com.sonora.player');
}
app.setName('Sonora');

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

// Find backend directory across different run modes (dev, portable, win-unpacked)
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
      return c;
    }
  }
  return path.resolve(__dirname, '../../backend');
}

// Find Python executable on system or virtualenv
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
      return p;
    }
  }
  return 'python';
}

// Automatically start FastAPI backend if not already running
async function ensureBackendRunning() {
  const alreadyRunning = await checkBackendHealth();
  if (alreadyRunning) {
    console.log('[Sonora Desktop] Backend is already running on port 8000.');
    return;
  }

  const backendDir = resolveBackendDir();
  const pythonCmd = resolvePythonPath(backendDir);
  console.log(`[Sonora Desktop] Launching backend: ${pythonCmd} run.py in ${backendDir}`);

  try {
    pythonProcess = spawn(pythonCmd, ['run.py'], {
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

    pythonProcess.stdout.on('data', (d) => {
      console.log(`[Backend stdout] ${d.toString().trim()}`);
    });
    pythonProcess.stderr.on('data', (d) => {
      console.error(`[Backend stderr] ${d.toString().trim()}`);
    });
    pythonProcess.on('exit', (code) => {
      console.log(`[Backend exit] Code: ${code}`);
      pythonProcess = null;
    });

    // Wait for backend to be healthy (up to 12 seconds)
    const startTime = Date.now();
    while (Date.now() - startTime < 12000) {
      await new Promise((r) => setTimeout(r, 400));
      const healthy = await checkBackendHealth();
      if (healthy) {
        console.log('[Sonora Desktop] Backend successfully initialized!');
        return;
      }
    }
    console.warn('[Sonora Desktop] Backend healthcheck timeout, proceeding anyway.');
  } catch (err) {
    console.error('[Sonora Desktop] Failed to spawn backend process:', err);
  }
}

function killPythonProcess() {
  if (pythonProcess && !pythonProcess.killed) {
    console.log('[Sonora Desktop] Stopping backend process...');
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', pythonProcess.pid.toString(), '/f', '/t']);
      } else {
        pythonProcess.kill('SIGTERM');
      }
    } catch {
      // ignore
    }
    pythonProcess = null;
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
      return p;
    }
  }
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
    },
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
    mainWindow.loadURL(devUrl);
  } else if (distHtml) {
    mainWindow.loadFile(distHtml);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
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
  killPythonProcess();
});

app.on('will-quit', () => {
  killPythonProcess();
});

app.on('window-all-closed', () => {
  killPythonProcess();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
