const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // 向主進程發送獲取銀行資訊的請求
    fetchBankInfo: (bankId) => ipcRenderer.invoke('fetch-bank-info', bankId),
    
    // 開始/停止/暫停/恢復自動化
    startAutomation: (config) => ipcRenderer.send('start-automation', config),
    stopAutomation: () => ipcRenderer.send('stop-automation'),
    pauseAutomation: () => ipcRenderer.send('pause-automation'),
    resumeAutomation: () => ipcRenderer.send('resume-automation'),
    
    // 接收主進程傳來的日誌
    onLogUpdate: (callback) => ipcRenderer.on('log-update', (_event, logData) => callback(logData)),
    
    // 接收自動化狀態變更
    onAutomationStatusChange: (callback) => ipcRenderer.on('automation-status-change', (_event, status) => callback(status)),
    
    // 自動更新相關 API
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_event, data) => callback(data))
});

