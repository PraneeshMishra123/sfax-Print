const { contextBridge, ipcRenderer } = require('electron');
const call = (n) => (...a) => ipcRenderer.invoke(n, ...a);
contextBridge.exposeInMainWorld('sfax', { login: call('login'), setup: call('setup'), recover: call('recover'), inbox: call('inbox'), printers: call('printers'), print: call('print'), logout: call('logout') });
