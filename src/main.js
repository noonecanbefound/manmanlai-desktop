const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

const SIZES = {
  idle: { width: 190, height: 190 },
  idleNote: { width: 220, height: 290 },
  hover: { width: 440, height: 230 },
  hoverNote: { width: 440, height: 320 }
};

let mainWindow;
let anchor = { right: 0, bottom: 0 };
let changingBounds = false;
let savePositionTimer;

function positionFile() {
  return path.join(app.getPath('userData'), 'window-position.json');
}

function loadSavedAnchor() {
  try {
    const value = JSON.parse(fs.readFileSync(positionFile(), 'utf8'));
    if (Number.isFinite(value.right) && Number.isFinite(value.bottom)) return value;
  } catch {}
  return null;
}

function saveAnchor() {
  try {
    fs.mkdirSync(path.dirname(positionFile()), { recursive: true });
    fs.writeFileSync(positionFile(), JSON.stringify(anchor), 'utf8');
  } catch {}
}

if (!app.requestSingleInstanceLock()) app.quit();

function createWindow() {
  const displays = screen.getAllDisplays();
  const rightmostDisplay = displays.reduce((best, item) => {
    const bestEdge = best.workArea.x + best.workArea.width;
    const itemEdge = item.workArea.x + item.workArea.width;
    return itemEdge > bestEdge ? item : best;
  }, displays[0]);
  const workArea = rightmostDisplay.workArea;
  const size = SIZES.idle;
  const saved = loadSavedAnchor();
  const defaultAnchor = {
    right: workArea.x + workArea.width - 30,
    bottom: workArea.y + workArea.height - 48
  };
  const validSaved = saved && displays.some((display) => {
    const area = display.workArea;
    return saved.right > area.x && saved.right <= area.x + area.width && saved.bottom > area.y && saved.bottom <= area.y + area.height;
  });
  anchor = validSaved ? saved : defaultAnchor;
  const x = anchor.right - size.width;
  const y = anchor.bottom - size.height;

  mainWindow = new BrowserWindow({
    width: size.width,
    height: size.height,
    x,
    y,
    minWidth: SIZES.idle.width,
    minHeight: SIZES.idle.height,
    maxWidth: SIZES.hover.width,
    maxHeight: SIZES.hoverNote.height,
    frame: false,
    transparent: true,
    resizable: false,
    show: false,
    skipTaskbar: false,
    alwaysOnTop: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('move', () => {
    if (changingBounds || !mainWindow) return;
    const bounds = mainWindow.getBounds();
    anchor = { right: bounds.x + bounds.width, bottom: bounds.y + bounds.height };
    clearTimeout(savePositionTimer);
    savePositionTimer = setTimeout(saveAnchor, 300);
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function setWindowMode({ hovered, noteVisible }) {
  if (!mainWindow) return;
  const key = hovered ? (noteVisible ? 'hoverNote' : 'hover') : (noteVisible ? 'idleNote' : 'idle');
  const size = SIZES[key];
  const display = screen.getDisplayNearestPoint({ x: anchor.right, y: anchor.bottom });
  const area = display.workArea;
  let x = anchor.right - size.width;
  let y = anchor.bottom - size.height;
  x = Math.max(area.x, Math.min(x, area.x + area.width - size.width));
  y = Math.max(area.y, Math.min(y, area.y + area.height - size.height));

  changingBounds = true;
  mainWindow.setBounds({ x: Math.round(x), y: Math.round(y), width: size.width, height: size.height }, true);
  setTimeout(() => { changingBounds = false; }, 220);
}

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.on('window:set-mode', (_event, mode) => setWindowMode(mode || {}));

ipcMain.handle('settings:get-launch-at-login', () => app.getLoginItemSettings().openAtLogin);
ipcMain.handle('settings:set-launch-at-login', (_event, enabled) => {
  const settings = { openAtLogin: Boolean(enabled) };
  if (!app.isPackaged) {
    settings.path = process.execPath;
    settings.args = [app.getAppPath()];
  }
  app.setLoginItemSettings(settings);
  return app.getLoginItemSettings().openAtLogin;
});
ipcMain.handle('system:get-session', () => ({ approximateBootTime: Date.now() - os.uptime() * 1000 }));

app.whenReady().then(createWindow);
app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on('window-all-closed', () => { saveAnchor(); app.quit(); });
