const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('shark', {
  minimize:     () => ipcRenderer.send('win-minimize'),
  maximize:     () => ipcRenderer.send('win-maximize'),
  close:        () => ipcRenderer.send('win-close'),
  fullscreen:   () => ipcRenderer.send('win-fullscreen'),
  restartApp:   () => ipcRenderer.send('restart-app'),
  onFullscreen:  (cb) => ipcRenderer.on('fullscreen',  (_, v) => cb(v)),
  onBeforeClose: (cb) => ipcRenderer.on('before-close', ()   => cb()),
  onShortcut:    (cb) => ipcRenderer.on('shortcut',    (_, s) => cb(s)),

  getBookmarks:   () => ipcRenderer.invoke('get-bookmarks'),
  addBookmark:    (b) => ipcRenderer.invoke('add-bookmark', b),
  removeBookmark: (u) => ipcRenderer.invoke('remove-bookmark', u),

  getHistory:   () => ipcRenderer.invoke('get-history'),
  addHistory:   (e) => ipcRenderer.invoke('add-history', e),
  clearHistory: () => ipcRenderer.invoke('clear-history'),

  getSettings:     ()  => ipcRenderer.invoke('get-settings'),
  saveSettings:    (s) => ipcRenderer.invoke('save-settings', s),
  saveSessionSync: (s) => ipcRenderer.send('save-session-sync', s),

  getDownloads:       ()  => ipcRenderer.invoke('get-downloads'),
  clearDownloads:     ()  => ipcRenderer.invoke('clear-downloads'),
  openFile:           (p) => ipcRenderer.invoke('open-file', p),
  showInFolder:       (p) => ipcRenderer.invoke('show-in-folder', p),
  chooseDownloadPath: ()  => ipcRenderer.invoke('choose-download-path'),
  onDownloadStart:  (cb) => ipcRenderer.on('download-start',  (_, d) => cb(d)),
  onDownloadUpdate: (cb) => ipcRenderer.on('download-update', (_, d) => cb(d)),
  onDownloadDone:   (cb) => ipcRenderer.on('download-done',   (_, d) => cb(d)),

  // Plugins - basic
  getPlugins:          ()        => ipcRenderer.invoke('get-plugins'),
  setPluginEnabled:    (id, en)  => ipcRenderer.invoke('set-plugin-enabled', id, en),
  savePluginSettings:  (id, s)   => ipcRenderer.invoke('save-plugin-settings', id, s),
  getPluginInjections: (url)     => ipcRenderer.invoke('get-plugin-injections', url),
  // Plugins - advanced
  pluginReadFile:      (id, f)   => ipcRenderer.invoke('plugin-read-file', id, f),
  pluginWriteFile:     (id, f, c)=> ipcRenderer.invoke('plugin-write-file', id, f, c),
  pluginInstallOverride:   (id)  => ipcRenderer.invoke('plugin-install-override', id),
  pluginUninstallOverride: (id)  => ipcRenderer.invoke('plugin-uninstall-override', id),
  pluginRunBackground: (id)      => ipcRenderer.invoke('plugin-run-background', id),
  pluginBgMessage:     (id, msg) => ipcRenderer.invoke('plugin-bg-message', id, msg),
  reloadPlugins:       ()        => ipcRenderer.invoke('reload-plugins'),
  openPluginsDir:      ()        => ipcRenderer.invoke('open-plugins-dir'),
  installPluginZip:    ()        => ipcRenderer.invoke('install-plugin-zip'),
  onPluginEvent: (pluginId, event, cb) =>
    ipcRenderer.on(`plugin-${pluginId}-${event}`, (_, data) => cb(data)),
  // Fonts
  getFonts:    () => ipcRenderer.invoke('get-fonts'),
  getFontData: (f) => ipcRenderer.invoke('get-font-data', f),
});
