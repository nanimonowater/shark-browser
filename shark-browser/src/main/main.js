const { app, BrowserWindow, ipcMain, Menu, shell, dialog, session } = require('electron');
const path  = require('path');
const fs    = require('fs');
const https = require('https');

// ── Paths ─────────────────────────────────────────────────────
const userDataPath   = app.getPath('userData');
const bookmarksPath  = path.join(userDataPath, 'bookmarks.json');
const historyPath    = path.join(userDataPath, 'history.json');
const settingsPath   = path.join(userDataPath, 'settings.json');
const downloadsPath  = path.join(userDataPath, 'downloads.json');
const pluginDataPath = path.join(userDataPath, 'plugin-settings.json');
const adFilterPath   = path.join(userDataPath, 'adblock-filters.txt');
const pluginsDir     = path.join(__dirname, '../../plugins');

const DEFAULT_SETTINGS = {
  theme: 'dark', homepage: 'https://www.google.com', searchEngine: 'google',
  customColors: null, quicklinks: null, session: null,
  privateMode: false, downloadPath: app.getPath('downloads'),
  adblockEnabled: true,
  font: '', // filename of selected font, empty = system default
};

// ── Helpers ───────────────────────────────────────────────────
function loadJSON(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}
function saveJSON(p, d) { fs.writeFileSync(p, JSON.stringify(d, null, 2)); }

function initData() {
  if (!fs.existsSync(bookmarksPath)) saveJSON(bookmarksPath, []);
  if (!fs.existsSync(historyPath))   saveJSON(historyPath, []);
  if (!fs.existsSync(settingsPath))  saveJSON(settingsPath, DEFAULT_SETTINGS);
  if (!fs.existsSync(downloadsPath)) saveJSON(downloadsPath, []);
  if (!fs.existsSync(pluginDataPath))saveJSON(pluginDataPath, {});
}

// ── Ad-block filter loading ───────────────────────────────────
// We bundle a small curated list and optionally download EasyList
const BUILTIN_RULES = [
  // Domain-based block patterns (fast string match)
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'adnxs.com', 'ads.yahoo.com', 'advertising.com', 'outbrain.com',
  'taboola.com', 'revcontent.com', 'smartadserver.com', 'pubmatic.com',
  'rubiconproject.com', 'openx.net', 'casalemedia.com', 'spotxchange.com',
  'moatads.com', 'criteo.com', 'quantserve.com', 'scorecardresearch.com',
  'chartbeat.com', 'hotjar.com', 'crazyegg.com', 'fullstory.com',
  'facebook.com/tr', 'connect.facebook.net', 'ads.twitter.com',
  'static.ads-twitter.com', 'amazon-adsystem.com', 'media.net',
  'yieldmo.com', 'lijit.com', 'sovrn.com', '33across.com',
  'adsafeprotected.com', 'doubleverify.com', 'ias.com',
  'pagead2.googlesyndication.com', 'tpc.googlesyndication.com',
];

let adRules = new Set(BUILTIN_RULES);

function loadAdFilters() {
  if (fs.existsSync(adFilterPath)) {
    try {
      const lines = fs.readFileSync(adFilterPath, 'utf8').split('\n');
      lines.forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('!') || line.startsWith('[')) return;
        // Simple domain rules: ||example.com^
        const m = line.match(/^\|\|([a-z0-9._-]+)\^/);
        if (m) adRules.add(m[1]);
      });
      console.log(`[Adblock] Loaded ${adRules.size} rules`);
    } catch(e) { console.error('[Adblock] Filter load error', e); }
  }
}

function downloadEasyList() {
  const url = 'https://easylist.to/easylist/easylist.txt';
  const file = fs.createWriteStream(adFilterPath);
  https.get(url, res => {
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      loadAdFilters();
      console.log('[Adblock] EasyList downloaded');
    });
  }).on('error', () => {
    console.log('[Adblock] EasyList download failed, using built-in rules');
  });
}

// Domains that must NEVER be blocked (avatars, user content, CDNs)
const WHITELIST = new Set([
  // Google user content (avatars, profile pictures)
  'lh3.googleusercontent.com',
  'lh4.googleusercontent.com',
  'lh5.googleusercontent.com',
  'lh6.googleusercontent.com',
  'googleusercontent.com',
  // YouTube avatars & thumbnails
  'yt3.ggpht.com',
  'yt4.ggpht.com',
  'ggpht.com',
  'ytimg.com',
  'i.ytimg.com',
  // Twitter/X avatars
  'pbs.twimg.com',
  'abs.twimg.com',
  // GitHub avatars
  'avatars.githubusercontent.com',
  'github.githubassets.com',
  // Reddit avatars
  'www.redditstatic.com',
  'styles.redditmedia.com',
  'i.redd.it',
  // General CDNs
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  // Fonts
  'fonts.googleapis.com',
  'fonts.gstatic.com',
]);

function shouldBlock(url, s) {
  if (!s.adblockEnabled) return false;
  try {
    const u    = new URL(url);
    const host = u.hostname.toLowerCase();

    // Always allow whitelisted domains
    if (WHITELIST.has(host)) return false;
    for (const safe of WHITELIST) {
      if (host.endsWith('.' + safe)) return false;
    }

    // Match only against hostname (not full URL) to avoid false positives
    for (const rule of adRules) {
      if (host === rule || host.endsWith('.' + rule)) return true;
    }
  } catch {}
  return false;
}

// ── Plugin loader ─────────────────────────────────────────────
function loadPlugins() {
  const plugins = [];
  if (!fs.existsSync(pluginsDir)) return plugins;
  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const mfPath = path.join(pluginsDir, entry.name, 'manifest.json');
    if (!fs.existsSync(mfPath)) continue;
    try {
      const mf = JSON.parse(fs.readFileSync(mfPath, 'utf8'));
      const pluginDir = path.join(pluginsDir, entry.name);
      // Load JS and CSS content
      const scripts = [], styles = [];
      for (const cs of (mf.content_scripts || [])) {
        for (const jsFile of (cs.js || [])) {
          const p = path.join(pluginDir, jsFile);
          if (fs.existsSync(p)) scripts.push({ code: fs.readFileSync(p, 'utf8'), matches: cs.matches || ['*://*/*'], run_at: cs.run_at || 'document_end' });
        }
        for (const cssFile of (cs.css || [])) {
          const p = path.join(pluginDir, cssFile);
          if (fs.existsSync(p)) styles.push({ code: fs.readFileSync(p, 'utf8'), matches: cs.matches || ['*://*/*'], run_at: cs.run_at || 'document_start' });
        }
      }
      plugins.push({ ...mf, scripts, styles, dir: pluginDir });
    } catch(e) { console.error('[Plugin] Failed to load', entry.name, e); }
  }
  return plugins;
}

// Check if URL matches a pattern list
function urlMatchesPattern(url, patterns) {
  for (const pat of patterns) {
    try {
      const re = new RegExp('^' + pat
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\\\?/g, '.')
      + '$');
      if (re.test(url)) return true;
    } catch {}
  }
  return false;
}

// ── Window ────────────────────────────────────────────────────
let win;
let loadedPlugins = [];

function createWindow() {
  const s = loadJSON(settingsPath, DEFAULT_SETTINGS);
  const isPrivate = s.privateMode === true;

  loadAdFilters();
  // Always re-download EasyList in background to keep filters fresh
  downloadEasyList();

  loadedPlugins = loadPlugins();
  console.log(`[Plugin] Loaded ${loadedPlugins.length} plugins`);

  win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 800, minHeight: 600,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: false,
      partition: isPrivate ? 'in-memory-only' : undefined,
    },
    backgroundColor: isPrivate ? '#0d0d1f' : '#0f0f1a',
    show: false,
  });

  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
  Menu.setApplicationMenu(null);

  // ── Ad blocking via webRequest ──────────────────────────────
  const sess = win.webContents.session;
  sess.webRequest.onBeforeRequest((details, callback) => {
    const cfg = loadJSON(settingsPath, DEFAULT_SETTINGS);
    if (shouldBlock(details.url, cfg)) {
      callback({ cancel: true });
    } else {
      callback({});
    }
  });

  // ── Download handling ───────────────────────────────────────
  function handleDownload(item) {
    const cfg = loadJSON(settingsPath, DEFAULT_SETTINGS);
    const dlDir = cfg.downloadPath || app.getPath('downloads');
    if (!fs.existsSync(dlDir)) { try { fs.mkdirSync(dlDir, { recursive: true }); } catch {} }
    // Avoid filename collisions
    let savePath = path.join(dlDir, item.getFilename());
    let n = 1;
    const ext  = path.extname(savePath);
    const base = savePath.slice(0, savePath.length - ext.length);
    while (fs.existsSync(savePath)) { savePath = `${base}(${n++})${ext}`; }
    item.setSavePath(savePath);
    const dlEntry = {
      id: Date.now(), filename: path.basename(savePath),
      url: item.getURL(), path: savePath,
      size: 0, received: 0, status: 'progressing',
      startedAt: new Date().toISOString(),
    };
    item.on('updated', (_, state) => {
      dlEntry.received = item.getReceivedBytes();
      dlEntry.size = item.getTotalBytes();
      dlEntry.status = state;
      win?.webContents.send('download-update', { ...dlEntry });
    });
    item.once('done', (_, state) => {
      dlEntry.status = state; dlEntry.size = item.getTotalBytes();
      dlEntry.received = dlEntry.size; dlEntry.finishedAt = new Date().toISOString();
      if (!isPrivate) {
        const list = loadJSON(downloadsPath, []); list.unshift({ ...dlEntry });
        saveJSON(downloadsPath, list.slice(0, 500));
      }
      win?.webContents.send('download-done', { ...dlEntry });
    });
    win?.webContents.send('download-start', { ...dlEntry });
  }

  sess.on('will-download', (_, item) => handleDownload(item));
  app.on('session-created', s2 => s2.on('will-download', (_, item) => handleDownload(item)));

  // ── Plugin injection into webviews ──────────────────────────
  // We listen for IPC from renderer when a webview navigates
  win.on('close', e => {
    if (win._readyToClose) return;
    e.preventDefault();
    win.webContents.send('before-close');
  });
  win.on('closed', () => { win = null; });
  win.on('enter-full-screen', () => win.webContents.send('fullscreen', true));
  win.on('leave-full-screen',  () => win.webContents.send('fullscreen', false));
}

app.whenReady().then(() => { initData(); createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!win) createWindow(); });

// ── IPC: Window ───────────────────────────────────────────────
ipcMain.on('win-minimize',    () => win?.minimize());
ipcMain.on('win-maximize',    () => { if(!win)return; win.isMaximized()?win.unmaximize():win.maximize(); });
ipcMain.on('win-fullscreen',  () => win?.setFullScreen(!win.isFullScreen()));
ipcMain.on('win-close',       () => win?.close());
ipcMain.on('restart-app',     () => { win._readyToClose=true; app.relaunch(); app.quit(); });
ipcMain.on('save-session-sync', (_, sess) => {
  if (!win) return;
  try { const s=loadJSON(settingsPath,DEFAULT_SETTINGS); s.session=sess; saveJSON(settingsPath,s); } catch{}
  win._readyToClose=true; win.close();
});

// ── IPC: Data ─────────────────────────────────────────────────
ipcMain.handle('get-bookmarks',   () => loadJSON(bookmarksPath,[]));
ipcMain.handle('add-bookmark',    (_,b) => {
  const l=loadJSON(bookmarksPath,[]); if(!l.find(x=>x.url===b.url))l.unshift({...b,id:Date.now()});
  saveJSON(bookmarksPath,l); return l;
});
ipcMain.handle('remove-bookmark', (_,url) => {
  const l=loadJSON(bookmarksPath,[]).filter(b=>b.url!==url); saveJSON(bookmarksPath,l); return l;
});
ipcMain.handle('get-history',   () => loadJSON(historyPath,[]).slice(0,300));
ipcMain.handle('add-history',   (_,e) => {
  const s=loadJSON(settingsPath,DEFAULT_SETTINGS); if(s.privateMode) return [];
  const l=loadJSON(historyPath,[]);
  if(!l.slice(0,5).some(h=>h.url===e.url)) l.unshift({...e,id:Date.now(),at:new Date().toISOString()});
  const t=l.slice(0,1000); saveJSON(historyPath,t); return t.slice(0,300);
});
ipcMain.handle('clear-history', () => { saveJSON(historyPath,[]); return []; });
ipcMain.handle('get-settings',  () => ({ ...DEFAULT_SETTINGS, ...loadJSON(settingsPath,DEFAULT_SETTINGS) }));
ipcMain.handle('save-settings', (_,s) => { saveJSON(settingsPath,s); return s; });
ipcMain.handle('get-downloads', () => loadJSON(downloadsPath,[]));
ipcMain.handle('clear-downloads',()=> { saveJSON(downloadsPath,[]); return []; });
ipcMain.handle('open-file',      (_,p) => shell.openPath(p));
ipcMain.handle('show-in-folder', (_,p) => { shell.showItemInFolder(p); return true; });
ipcMain.handle('choose-download-path', async () => {
  const r = await dialog.showOpenDialog(win,{properties:['openDirectory'],title:'ダウンロード保存先を選択'});
  return r.canceled||!r.filePaths.length ? null : r.filePaths[0];
});

// ── IPC: Plugins ──────────────────────────────────────────────
ipcMain.handle('get-plugins', () => {
  const pluginData = loadJSON(pluginDataPath, {});
  return loadedPlugins.map(p => ({
    id: p.id, name: p.name, version: p.version,
    description: p.description, author: p.author, homepage: p.homepage,
    settings: p.settings || [],
    enabled: pluginData[p.id]?.enabled !== false, // default ON
    userSettings: pluginData[p.id]?.userSettings || {},
  }));
});

ipcMain.handle('set-plugin-enabled', (_, id, enabled) => {
  const data = loadJSON(pluginDataPath, {});
  if (!data[id]) data[id] = {};
  data[id].enabled = enabled;
  saveJSON(pluginDataPath, data);
  return true;
});

ipcMain.handle('save-plugin-settings', (_, id, userSettings) => {
  const data = loadJSON(pluginDataPath, {});
  if (!data[id]) data[id] = {};
  data[id].userSettings = userSettings;
  saveJSON(pluginDataPath, data);
  return true;
});

// Called by renderer when a webview navigates to a URL
// Returns scripts+styles to inject for that URL
ipcMain.handle('get-plugin-injections', (_, url) => {
  const pluginData = loadJSON(pluginDataPath, {});
  const injections = [];
  for (const plugin of loadedPlugins) {
    const pdata = pluginData[plugin.id] || {};
    if (pdata.enabled === false) continue;
    const userSettings = pdata.userSettings || {};
    // Merge default settings with user overrides
    const resolvedSettings = {};
    for (const sd of (plugin.settings || [])) {
      resolvedSettings[sd.key] = userSettings[sd.key] !== undefined ? userSettings[sd.key] : sd.default;
    }
    // Check if plugin's enabled setting is off
    if (resolvedSettings.enabled === false) continue;

    for (const style of plugin.styles) {
      if (urlMatchesPattern(url, style.matches)) {
        injections.push({ type: 'css', code: style.code, run_at: style.run_at });
      }
    }
    for (const script of plugin.scripts) {
      if (urlMatchesPattern(url, script.matches)) {
        // Wrap with sharkPlugin API
        const wrapped = `
(function() {
  window.sharkPlugin = {
    id: ${JSON.stringify(plugin.id)},
    settings: ${JSON.stringify(resolvedSettings)},
    toast: function(msg) {
      const t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;bottom:20px;right:20px;background:rgba(124,106,247,.9);color:#fff;padding:8px 16px;border-radius:8px;z-index:9999999;font-family:sans-serif;font-size:13px;';
      document.body.appendChild(t);
      setTimeout(()=>t.remove(), 3000);
    }
  };
  ${script.code}
})();`;
        injections.push({ type: 'js', code: wrapped, run_at: script.run_at });
      }
    }
  }
  return injections;
});

// ── IPC: Fonts ────────────────────────────────────────────────
const fontsDir = path.join(__dirname, '../../fonts');
const SUPPORTED_EXTS = ['.ttf', '.otf', '.woff', '.woff2'];

ipcMain.handle('get-fonts', () => {
  if (!fs.existsSync(fontsDir)) return [];
  try {
    return fs.readdirSync(fontsDir)
      .filter(f => SUPPORTED_EXTS.includes(path.extname(f).toLowerCase()))
      .map(f => ({
        filename: f,
        name: path.basename(f, path.extname(f))
          .replace(/[-_]/g, ' ')
          .replace(/([a-z])([A-Z])/g, '$1 $2'), // CamelCase → spaced
        path: path.join(fontsDir, f),
      }));
  } catch { return []; }
});

ipcMain.handle('get-font-data', (_, filename) => {
  try {
    const fp = path.join(fontsDir, path.basename(filename)); // prevent traversal
    if (!fs.existsSync(fp)) return null;
    const ext = path.extname(filename).toLowerCase().slice(1);
    const mimeMap = { ttf:'truetype', otf:'opentype', woff:'woff', woff2:'woff2' };
    const data = fs.readFileSync(fp);
    return {
      base64: data.toString('base64'),
      mime: mimeMap[ext] || 'truetype',
    };
  } catch { return null; }
});
