// Electron main process for JDex desktop app
import { app, BrowserWindow, Menu, shell, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES modules don't have __dirname, so we need to create it
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Only load on Windows where squirrel installer is used
if (process.platform === 'win32') {
  try {
    const squirrelStartup = await import('electron-squirrel-startup');
    if (squirrelStartup.default) {
      app.quit();
    }
  } catch (_e) {
    // Module not available, skip
  }
}

let mainWindow;
const isMac = process.platform === 'darwin';

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    // macOS: hidden title bar with inset traffic lights
    // Windows/Linux: standard title bar
    ...(isMac ? { titleBarStyle: 'hiddenInset' } : {}),
    backgroundColor: '#0f172a', // Match app background
    icon: path.join(__dirname, '../public/jdex-icon.svg'),
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
};

// Cross-platform menu template
const menuTemplate = [
  // App menu (macOS only - on Windows/Linux this appears under File)
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
      ]
    : []),
  // File menu
  {
    label: 'File',
    submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
  },
  // Edit menu
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac
        ? [
            { role: 'pasteAndMatchStyle' },
            { role: 'delete' },
            { role: 'selectAll' },
            { type: 'separator' },
            {
              label: 'Speech',
              submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }],
            },
          ]
        : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
    ],
  },
  // View menu
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  },
  // Window menu
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...(isMac
        ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
        : [{ role: 'close' }]),
    ],
  },
  // Help menu
  {
    label: 'Help',
    submenu: [
      {
        label: 'Johnny Decimal Website',
        click: () => shell.openExternal('https://johnnydecimal.com/'),
      },
      {
        label: 'JDex on GitHub',
        click: () => shell.openExternal('https://github.com/As-The-Geek-Learns/JDEX'),
      },
      {
        label: 'Report an Issue',
        click: () => shell.openExternal('https://github.com/As-The-Geek-Learns/JDEX/issues'),
      },
      { type: 'separator' },
      {
        label: 'About ASTGL',
        click: () => shell.openExternal('https://astgl.com'),
      },
    ],
  },
];

app.whenReady().then(() => {
  // Security: Set Content Security Policy headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self';" +
          "script-src 'self' 'unsafe-inline';" +
          "style-src 'self' 'unsafe-inline';" +
          "img-src 'self' data: blob:;" +
          "font-src 'self';" +
          "connect-src 'self';" +
          "frame-ancestors 'none';"
        ]
      }
    });
  });

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
