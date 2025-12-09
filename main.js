const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { autoUpdater } = require('electron-updater');

// 只在開發環境（未打包）時載入 electron-reload
if (!app.isPackaged) {
  try {
    require('electron-reload')(__dirname, {
      electron: require('path').join(__dirname, 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
    });
  } catch (e) {
    console.log('electron-reload not available in production');
  }
}

// 引入 Puppeteer
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin()); // 使用隱身插件，避免被偵測為自動化

// 引入銀行模組系統
const { 
  getBankConfig, 
  getBankCode, 
  isBankSupported,
  createAutomationInstance 
} = require('./src/banks');
const utils = require('./src/banks/utils');

// API 設定
const API_URL = "https://api.wapi.asia/payer/calls/water";

let mainWindow;
let browser = null; // Puppeteer 瀏覽器實例
let page = null; // Puppeteer 頁面實例
let currentAutomation = null; // 當前執行的自動化實例
let automationState = {
  isRunning: false,
  isPaused: false,
  currentStep: 0,
  bankCode: null,
  config: null,
  eventSender: null, // 保存 event sender 以便回傳日誌
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // 安全性考量
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');
  
  // 開發時打開 DevTools
  // mainWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
  createWindow();
  
  // 初始化自動更新（僅在打包後的生產環境）
  if (app.isPackaged) {
    initAutoUpdater();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ------------------------------------------------
// IPC 處理邏輯 (對應 Content Script 的功能)
// ------------------------------------------------

// ================================================
// IPC 處理器：獲取銀行資訊
// ================================================
ipcMain.handle('fetch-bank-info', async (event, bankId) => {
    console.log(`[API] 收到查詢請求，BankID: ${bankId}`);
    
    try {
        const response = await fetch(`${API_URL}/user`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                BankID: parseInt(bankId),
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("[API] 回應:", data);

        // 使用新的銀行模組系統查找配置
        const bankCode = getBankCode(data.BankName);
        
        if (bankCode && isBankSupported(bankCode)) {
            const bankConfig = getBankConfig(bankCode);
            return {
                success: true,
                data: {
                    ...data,
                    ConfigKey: bankCode,
                    BankDisplayName: bankConfig.name,
                }
            };
        } else {
            return {
                success: false,
                message: `此銀行尚未支援或無法識別: ${data.BankName}`
            };
        }

    } catch (error) {
        console.error("[API] 呼叫失敗:", error);
        return {
            success: false,
            message: error.message || "連線失敗"
        };
    }
});

// ================================================
// IPC 處理器：開始自動化
// ================================================
ipcMain.on('start-automation', async (event, config) => {
    console.log('[自動化] 收到啟動請求:', config);
    
    const { bankData, settings } = config;
    const bankCode = bankData.ConfigKey;
    
    // 檢查銀行是否支援
    if (!isBankSupported(bankCode)) {
        event.reply('log-update', { 
            message: `錯誤：不支援的銀行 ${bankCode}`, 
            type: 'error' 
        });
        event.reply('automation-status-change', 'stopped');
        return;
    }
    
    // 獲取銀行設定
    const bankConfig = getBankConfig(bankCode);
    
    // 更新狀態
    automationState.isRunning = true;
    automationState.currentStep = 0;
    automationState.bankCode = bankCode;
    automationState.config = config;
    automationState.eventSender = event;
    
    event.reply('automation-status-change', 'running');
    event.reply('log-update', { 
        message: `準備啟動 ${bankConfig.name} 自動化流程...`, 
        type: 'system' 
    });
    event.reply('log-update', { 
        message: `查詢天數設定: ${settings.queryDaysBack} 天`, 
        type: 'info' 
    });
    
    try {
        // 使用 Puppeteer 開啟瀏覽器
        await launchPuppeteerBrowser(event);
        
        // 載入銀行登入頁面
        event.reply('log-update', { 
            message: `正在開啟 ${bankConfig.name} 登入頁面...`, 
            type: 'info' 
        });
        
        await page.goto(bankConfig.loginUrl, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // 建立日誌回調函式
        const logCallback = (logData) => {
            event.reply('log-update', logData);
        };
        
        // 根據銀行代號動態建立自動化實例
        currentAutomation = createAutomationInstance(
            bankCode, 
            page, 
            utils, 
            logCallback, 
            settings.queryDaysBack,
            bankData.BankID
        );
        
        if (!currentAutomation) {
            throw new Error(`無法建立 ${bankCode} 的自動化實例`);
        }
        
        // 設置暫停狀態（初始為 false）
        currentAutomation.isPaused = false;
        
        event.reply('log-update', { 
            message: `已載入 ${bankConfig.name} (${bankCode}) 自動化模組`, 
            type: 'success' 
        });
        
        event.reply('log-update', { 
            message: '登入頁面已載入，準備填寫表單...', 
            type: 'success' 
        });
        
        // 等待頁面完全載入
        await utils.sleep(2000);
        
        // 自動填寫登入表單（傳入 API 回傳的完整資料）
        console.log('[自動化] 準備填寫表單，bankData:', bankData);
        await currentAutomation.autoFillLoginForm(bankData);
        
        event.reply('log-update', { 
            message: '登入資訊已填寫，啟動驗證碼監聽...', 
            type: 'info' 
        });
        
        // 啟動驗證碼監聽（包含登入成功監聽與自動執行流程）
        await currentAutomation.startCaptchaWatcher();
        
        event.reply('log-update', { 
            message: '請手動輸入驗證碼，系統將自動登入並開始查詢', 
            type: 'system' 
        });
        
    } catch (error) {
        console.error('[自動化] 啟動失敗:', error);
        event.reply('log-update', { 
            message: `啟動失敗: ${error.message}`, 
            type: 'error' 
        });
        event.reply('automation-status-change', 'stopped');
        automationState.isRunning = false;
        
        // 停止線上狀態 API 定時器
        if (currentAutomation && typeof currentAutomation.stopOnlineStatusTimer === 'function') {
            currentAutomation.stopOnlineStatusTimer();
        }
        
        // 清理瀏覽器
        await closePuppeteerBrowser();
    }
});

// ================================================
// IPC 處理器：暫停自動化
// ================================================
ipcMain.on('pause-automation', async (event) => {
    console.log('[自動化] 收到暫停請求');
    
    automationState.isPaused = true;
    
    // 如果自動化實例存在，設置暫停標記
    if (currentAutomation) {
        currentAutomation.isPaused = true;
    }
    
    event.reply('log-update', { 
        message: '自動化已暫停', 
        type: 'system' 
    });
    event.reply('automation-status-change', 'paused');
});

// ================================================
// IPC 處理器：恢復自動化
// ================================================
ipcMain.on('resume-automation', async (event) => {
    console.log('[自動化] 收到恢復請求');
    
    automationState.isPaused = false;
    
    // 如果自動化實例存在，清除暫停標記
    if (currentAutomation) {
        currentAutomation.isPaused = false;
    }
    
    event.reply('log-update', { 
        message: '自動化已恢復', 
        type: 'system' 
    });
    event.reply('automation-status-change', 'resumed');
});

// ================================================
// IPC 處理器：停止自動化
// ================================================
ipcMain.on('stop-automation', async (event) => {
    console.log('[自動化] 收到停止請求');
    
    automationState.isRunning = false;
    automationState.isPaused = false;
    
    // 停止線上狀態 API 定時器
    if (currentAutomation && typeof currentAutomation.stopOnlineStatusTimer === 'function') {
        currentAutomation.stopOnlineStatusTimer();
    }
    
    currentAutomation = null;
    
    // 關閉 Puppeteer 瀏覽器
    await closePuppeteerBrowser();
    
    event.reply('log-update', { 
        message: '自動化已停止', 
        type: 'error' 
    });
    event.reply('automation-status-change', 'stopped');
});

// ================================================
// 輔助函式：啟動 Puppeteer 瀏覽器
// ================================================
async function launchPuppeteerBrowser(eventSender) {
    console.log('[Puppeteer] 啟動瀏覽器...');
    
    // 如果瀏覽器已經在運行，先關閉
    if (browser) {
        await closePuppeteerBrowser();
    }
    
    try {
        // 建立自訂的用戶資料目錄（避免 Windows 臨時目錄權限問題）
        const userDataDir = path.join(app.getPath('userData'), 'PuppeteerProfile');
        
        // 確保目錄存在
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
            console.log('[Puppeteer] 已建立用戶資料目錄:', userDataDir);
        }
        
        // Puppeteer 啟動配置
        const launchOptions = {
            headless: false, // 顯示瀏覽器視窗（設為 true 則隱藏）
            userDataDir: userDataDir, // 指定用戶資料目錄
            defaultViewport: {
                width: 1280,
                height: 900
            },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // 避免共享記憶體問題
                '--disable-blink-features=AutomationControlled', // 移除自動化標記
                '--disable-web-security', // 允許跨域（謹慎使用）
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        };
        
        // 在打包環境下，使用系統已安裝的 Chrome
        if (app.isPackaged) {
            // 查找系統 Chrome（Windows 常見位置）
            const systemChromePaths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
            ];
            
            let chromePath = null;
            
            for (const sysPath of systemChromePaths) {
                if (fs.existsSync(sysPath)) {
                    chromePath = sysPath;
                    console.log('[Puppeteer] 找到系統 Chrome:', chromePath);
                    break;
                }
            }
            
            if (chromePath) {
                launchOptions.executablePath = chromePath;
                console.log('[Puppeteer] 使用系統 Chrome:', chromePath);
            } else {
                const errorMsg = '無法找到系統 Chrome 瀏覽器。請確認已安裝 Google Chrome。\n' +
                    '下載位置：https://www.google.com/chrome/';
                console.error('[Puppeteer]', errorMsg);
                throw new Error(errorMsg);
            }
        }
        
        browser = await puppeteer.launch(launchOptions);
        
        // 建立新頁面
        page = await browser.newPage();
        
        // 設定 User-Agent（模擬真實瀏覽器）
        await page.setUserAgent(
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        
        // 設定額外的 Header
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8'
        });
        
        // 移除 webdriver 屬性（避免被偵測）
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        });
        
        console.log('[Puppeteer] 瀏覽器啟動成功');
        
        if (eventSender) {
            eventSender.reply('log-update', { 
                message: '瀏覽器已啟動', 
                type: 'success' 
            });
        }
        
        return { browser, page };
    } catch (error) {
        console.error('[Puppeteer] 瀏覽器啟動失敗:', error);
        throw error;
    }
}

// ================================================
// 輔助函式：關閉 Puppeteer 瀏覽器
// ================================================
async function closePuppeteerBrowser() {
    console.log('[Puppeteer] 關閉瀏覽器...');
    
    try {
        if (page) {
            await page.close();
            page = null;
        }
        
        if (browser) {
            await browser.close();
            browser = null;
        }
        
        console.log('[Puppeteer] 瀏覽器已關閉');
    } catch (error) {
        console.error('[Puppeteer] 關閉瀏覽器時發生錯誤:', error);
    }
}

// 應用程式關閉時清理
app.on('before-quit', async () => {
    await closePuppeteerBrowser();
});

// ================================================
// 自動更新功能
// ================================================

// 設定自動更新日誌
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

// 自動下載更新（設為 false 可讓用戶選擇是否下載）
autoUpdater.autoDownload = false;

function initAutoUpdater() {
    console.log('[自動更新] 初始化自動更新功能');
    
    // 檢查更新時觸發
    autoUpdater.on('checking-for-update', () => {
        console.log('[自動更新] 正在檢查更新...');
        sendUpdateStatusToWindow('checking-for-update');
    });
    
    // 發現新版本時觸發
    autoUpdater.on('update-available', (info) => {
        console.log('[自動更新] 發現新版本:', info.version);
        sendUpdateStatusToWindow('update-available', {
            version: info.version,
            releaseDate: info.releaseDate,
            releaseNotes: info.releaseNotes
        });
        
        // 顯示通知並詢問用戶是否下載
        const { dialog } = require('electron');
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: '發現新版本',
            message: `發現新版本 ${info.version}，是否立即下載？`,
            buttons: ['立即下載', '稍後提醒'],
            defaultId: 0,
            cancelId: 1
        }).then(result => {
            if (result.response === 0) {
                // 用戶選擇下載
                autoUpdater.downloadUpdate();
            }
        });
    });
    
    // 目前已是最新版本時觸發
    autoUpdater.on('update-not-available', (info) => {
        console.log('[自動更新] 目前已是最新版本');
        sendUpdateStatusToWindow('update-not-available');
    });
    
    // 下載進度更新
    autoUpdater.on('download-progress', (progressObj) => {
        const logMessage = `下載速度: ${progressObj.bytesPerSecond} - 已下載 ${progressObj.percent.toFixed(2)}% (${progressObj.transferred}/${progressObj.total})`;
        console.log('[自動更新]', logMessage);
        sendUpdateStatusToWindow('download-progress', {
            percent: progressObj.percent,
            bytesPerSecond: progressObj.bytesPerSecond,
            transferred: progressObj.transferred,
            total: progressObj.total
        });
    });
    
    // 更新下載完成
    autoUpdater.on('update-downloaded', (info) => {
        console.log('[自動更新] 更新下載完成');
        sendUpdateStatusToWindow('update-downloaded', {
            version: info.version
        });
        
        // 顯示通知並詢問用戶是否重啟
        const { dialog } = require('electron');
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: '更新已就緒',
            message: `新版本 ${info.version} 已下載完成，是否立即重啟並安裝？`,
            buttons: ['立即重啟', '稍後安裝'],
            defaultId: 0,
            cancelId: 1
        }).then(result => {
            if (result.response === 0) {
                // 用戶選擇重啟安裝
                autoUpdater.quitAndInstall();
            }
        });
    });
    
    // 更新發生錯誤
    autoUpdater.on('error', (error) => {
        console.error('[自動更新] 發生錯誤:', error);
        
        // 如果是開發環境的配置檔案錯誤，不要顯示給用戶
        if (error.message && error.message.includes('app-update.yml')) {
            console.log('[自動更新] 開發環境下無法檢查更新（這是正常的）');
            sendUpdateStatusToWindow('update-not-available');
            return;
        }
        
        sendUpdateStatusToWindow('update-error', {
            message: error.message
        });
    });
    
    // 應用啟動後 3 秒檢查更新
    setTimeout(() => {
        console.log('[自動更新] 開始檢查更新...');
        autoUpdater.checkForUpdates().catch(err => {
            console.log('[自動更新] 檢查更新失敗（可能在開發環境中）:', err.message);
        });
    }, 3000);
}

// 發送更新狀態到渲染進程
function sendUpdateStatusToWindow(status, data = {}) {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('update-status', {
            status,
            data,
            timestamp: new Date().toISOString()
        });
    }
}

// IPC 處理器：手動檢查更新
ipcMain.handle('check-for-updates', async () => {
    console.log('[自動更新] 手動檢查更新');
    try {
        const result = await autoUpdater.checkForUpdates();
        return {
            success: true,
            updateInfo: result.updateInfo
        };
    } catch (error) {
        console.error('[自動更新] 檢查更新失敗:', error);
        return {
            success: false,
            message: error.message
        };
    }
});

// IPC 處理器：下載更新
ipcMain.handle('download-update', async () => {
    console.log('[自動更新] 開始下載更新');
    try {
        await autoUpdater.downloadUpdate();
        return { success: true };
    } catch (error) {
        console.error('[自動更新] 下載更新失敗:', error);
        return {
            success: false,
            message: error.message
        };
    }
});

// IPC 處理器：安裝更新
ipcMain.handle('install-update', () => {
    console.log('[自動更新] 重啟並安裝更新');
    autoUpdater.quitAndInstall();
});
