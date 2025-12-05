// UI 邏輯處理
const btnFetchInfo = document.getElementById('btn-fetch-info');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnClearLog = document.getElementById('btn-clear-log');
const btnManualStart = document.getElementById('btn-manual-start');
const btnCancelManual = document.getElementById('btn-cancel-manual');
const inputBankId = document.getElementById('bank-id');
const inputQueryDays = document.getElementById('query-days');
const bankInfoPanel = document.getElementById('bank-info-panel');
const manualInputPanel = document.getElementById('manual-input-panel');
const logContainer = document.getElementById('log-container');

// 手動輸入欄位
const inputManualBankCode = document.getElementById('manual-bank-code');
const inputManualCompanyId = document.getElementById('manual-company-id');
const inputManualUserId = document.getElementById('manual-user-id');
const inputManualPassword = document.getElementById('manual-password');

// 當前狀態
let currentBankConfig = null;
let currentBankCode = 'bot'; // 預設為台灣銀行

// 1. 獲取銀行登入資訊
btnFetchInfo.addEventListener('click', async () => {
    const bankId = inputBankId.value.trim();
    if (!bankId) {
        addLog('請輸入銀行編號', 'error');
        return;
    }

    addLog(`正在查詢銀行資訊 (ID: ${bankId})...`, 'system');
    setLoading(true);

    try {
        // 呼叫主進程 API
        const result = await window.electronAPI.fetchBankInfo(bankId);
        
        if (result.success) {
            currentBankConfig = result.data;
            currentBankCode = result.data.ConfigKey;
            updateBankInfoDisplay(result.data);
            addLog(`獲取成功: ${result.data.BankName}`, 'success');
            
            // 顯示 API 獲取成功的面板
            bankInfoPanel.classList.remove('hidden');
            manualInputPanel.classList.add('hidden');
        } else {
            addLog(`獲取失敗: ${result.message}`, 'error');
            addLog('您可以選擇手動輸入登入資訊', 'system');
            
            // 顯示手動輸入面板
            bankInfoPanel.classList.add('hidden');
            manualInputPanel.classList.remove('hidden');
        }
    } catch (error) {
        addLog(`發生錯誤: ${error.message}`, 'error');
        addLog('您可以選擇手動輸入登入資訊', 'system');
        
        // API 失敗時也顯示手動輸入面板
        bankInfoPanel.classList.add('hidden');
        manualInputPanel.classList.remove('hidden');
    } finally {
        setLoading(false);
    }
});

// 2. 開始自動化（使用 API 獲取的資料）
btnStart.addEventListener('click', () => {
    if (!currentBankConfig) return;

    const queryDays = parseInt(inputQueryDays.value) || 0;
    
    const config = {
        bankData: currentBankConfig,
        settings: {
            queryDaysBack: queryDays
        }
    };

    window.electronAPI.startAutomation(config);
    
    // UI 狀態切換
    btnStart.classList.add('hidden');
    btnStop.classList.remove('hidden');
    inputBankId.disabled = true;
    btnFetchInfo.disabled = true;
    inputQueryDays.disabled = true;
});

// 2-1. 使用手動輸入開始自動化
btnManualStart.addEventListener('click', () => {
    const bankCode = inputManualBankCode.value.trim();
    const companyId = inputManualCompanyId.value.trim();
    const userId = inputManualUserId.value.trim();
    const password = inputManualPassword.value.trim();
    
    // 驗證輸入
    if (!bankCode) {
        addLog('請選擇銀行代號', 'error');
        return;
    }
    
    if (!companyId || !userId || !password) {
        addLog('請填寫完整的登入資訊（統編、帳號、密碼）', 'error');
        return;
    }
    
    const queryDays = parseInt(inputQueryDays.value) || 0;
    
    // 根據銀行代號獲取銀行名稱
    const bankNames = {
        'bot': '臺灣銀行',
        'cobank': '合作金庫',
        'yuanta': '元大銀行',
        'hncb': '華南商銀',
        'esun': '玉山銀行',
        'sunny': '陽信銀行',
        'ktb': '京城銀行',
        'firstbank': '第一銀行',
        'cathay': '國泰世華',
        'ctbc': '中國信託',
        'bok': '高雄銀行',
        'chb': '彰化銀行',
        'megabank': '兆豐銀行',
        'tbb': '臺灣企銀',
        'tfcc': '淡水一信',
        'ubot': '聯邦銀行',
        'taishin': '台新銀行',
        'landbank': '土地銀行',
        'fubon': '富邦銀行',
        'skbank': '新光商銀',
        'tcb': '台中銀行',
    };
    
    // 建構手動輸入的銀行資料
    const manualBankData = {
        BankID: parseInt(inputBankId.value) || 101,
        BankName: bankNames[bankCode] || '未知銀行',
        CompanyNo: companyId,
        User: userId,
        Pass: password,
        ConfigKey: bankCode,
    };
    
    const config = {
        bankData: manualBankData,
        settings: {
            queryDaysBack: queryDays
        }
    };
    
    addLog(`使用手動輸入資料開始自動化 (${bankNames[bankCode]} - ${bankCode})...`, 'system');
    window.electronAPI.startAutomation(config);
    
    // UI 狀態切換
    manualInputPanel.classList.add('hidden');
    inputBankId.disabled = true;
    btnFetchInfo.disabled = true;
    inputQueryDays.disabled = true;
    
    // 顯示停止按鈕（在控制面板中）
    btnStop.classList.remove('hidden');
});

// 2-2. 取消手動輸入
btnCancelManual.addEventListener('click', () => {
    manualInputPanel.classList.add('hidden');
    inputManualBankCode.value = 'bot'; // 重置為預設值
    inputManualCompanyId.value = '';
    inputManualUserId.value = '';
    inputManualPassword.value = '';
    addLog('已取消手動輸入', 'system');
});

// 3. 停止自動化
btnStop.addEventListener('click', () => {
    window.electronAPI.stopAutomation();
});

// 監聽來自後端的日誌更新
window.electronAPI.onLogUpdate((logData) => {
    addLog(logData.message, logData.type);
});

// 監聽自動化狀態變更 (例如後端主動停止或完成)
window.electronAPI.onAutomationStatusChange((status) => {
    if (status === 'stopped') {
        btnStart.classList.remove('hidden');
        btnStop.classList.add('hidden');
        inputBankId.disabled = false;
        btnFetchInfo.disabled = false;
        inputQueryDays.disabled = false;
        
        // 如果是從手動輸入啟動的，清空欄位
        if (!bankInfoPanel.classList.contains('hidden')) {
            // API 模式，不清空
        } else {
            inputManualCompanyId.value = '';
            inputManualUserId.value = '';
            inputManualPassword.value = '';
        }
        
        addLog('自動化已停止', 'system');
    } else if (status === 'running') {
        addLog('自動化執行中...', 'success');
    }
});

// 輔助函式：更新銀行資訊顯示
function updateBankInfoDisplay(data) {
    document.getElementById('info-bank-name').textContent = data.BankName || '-';
    document.getElementById('info-company-id').textContent = data.CompanyNo || '-';
    document.getElementById('info-user-id').textContent = data.User || '-';
    document.getElementById('info-config-key').textContent = data.ConfigKey || '未知';
}

// 輔助函式：新增日誌
function addLog(message, type = 'info') {
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    const now = new Date();
    timeSpan.textContent = `[${now.toLocaleTimeString()}]`;
    
    div.appendChild(timeSpan);
    div.appendChild(document.createTextNode(message));
    
    logContainer.appendChild(div);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// 輔助函式：設定載入狀態
function setLoading(isLoading) {
    btnFetchInfo.disabled = isLoading;
    btnFetchInfo.textContent = isLoading ? '查詢中...' : '獲取登入資訊';
}

// 清除日誌
btnClearLog.addEventListener('click', () => {
    logContainer.innerHTML = '';
});

// ================================================
// 自動更新功能監聽
// ================================================

// 監聽更新狀態
window.electronAPI.onUpdateStatus((updateData) => {
    const { status, data } = updateData;
    
    switch (status) {
        case 'checking-for-update':
            addLog('🔍 正在檢查是否有新版本...', 'system');
            break;
            
        case 'update-available':
            addLog(`🎉 發現新版本 v${data.version}！正在準備下載...`, 'success');
            break;
            
        case 'download-progress':
            const percent = data.percent.toFixed(1);
            const speed = (data.bytesPerSecond / 1024 / 1024).toFixed(2);
            addLog(`📥 下載更新中... ${percent}% (速度: ${speed} MB/s)`, 'info');
            break;
            
        case 'update-downloaded':
            addLog(`✅ 新版本 v${data.version} 下載完成！應用程式將在重啟後自動安裝`, 'success');
            break;
            
        case 'update-not-available':
            addLog('✨ 目前已是最新版本', 'system');
            break;
            
        case 'update-error':
            addLog(`❌ 更新發生錯誤: ${data.message}`, 'error');
            break;
    }
});

// 初始化時顯示歡迎訊息
addLog('🚀 CZ Software 已啟動', 'system');
addLog('💡 提示：應用程式會自動檢查更新', 'info');

