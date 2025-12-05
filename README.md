# CZ 銀行自動化助手 (Electron 版本)

這是一個基於 Electron 的桌面應用程式，用於自動化銀行交易明細的查詢與記錄。

## 專案架構

```
cz-software/
├── main.js                 # Electron 主進程
├── preload.js              # 安全橋接層
├── renderer.js             # UI 邏輯處理
├── index.html              # 主介面
├── styles.css              # 樣式表
├── package.json            # 專案配置
├── src/
│   └── banks/              # 銀行模組系統
│       ├── index.js        # 銀行管理器（總匯出）
│       ├── utils.js        # 通用工具函式
│       └── bot.js          # 台灣銀行模組
└── test-banks-module.js    # 模組測試腳本
```

## 核心功能

### 1. 銀行模組化架構

每家銀行被拆分為獨立的模組檔案（例如 `bot.js`），包含：
- **設定檔 (config)**：登入網址、選擇器、自動化步驟等靜態資料
- **自動化類別 (Automation)**：該銀行特定的 DOM 操作與邏輯

### 2. 主要介面功能

- **輸入銀行編號**：透過 API 獲取銀行登入資訊
- **設定查詢天數**：可設定往前推算 N 天的交易明細
- **自動化執行**：
  - 自動填寫登入表單
  - 監聽驗證碼輸入
  - 自動導航到交易明細頁面
  - 自動設定日期範圍並查詢
  - 提取交易資料並回傳後端
- **即時日誌**：顯示自動化執行的每一步狀態

### 3. 已移植的銀行

目前已完成移植的銀行：
- ✅ **台灣銀行 (bot)**

待移植的銀行（來自原 `content.js`）：
- 元大銀行 (yuanta)
- 華南商銀 (hncb)
- 玉山銀行 (esun)
- 陽信銀行 (sunny)
- 京城銀行 (ktb)
- 第一銀行 (firstbank)
- 國泰世華 (cathay)
- 中國信託 (ctbc)
- 高雄銀行 (bok)
- 彰化銀行 (chb)
- 兆豐銀行 (megabank)
- 臺灣企銀 (tbb)
- 淡水一信 (tfcc)
- 聯邦銀行 (ubot)
- 台新銀行 (taishin)
- 土地銀行 (landbank)
- 富邦銀行 (fubon)
- 新光商銀 (skbank)
- 台中銀行 (tcb)

## 快速開始

### 安裝依賴

```bash
npm install
```

### 執行應用程式

```bash
npm start
```

### 測試銀行模組

```bash
node test-banks-module.js
```

## 使用流程

### 方式 A: API 自動獲取（推薦）

1. **輸入銀行編號**（例如：`101` 代表台灣銀行）
2. 點擊「獲取登入資訊」按鈕
3. 確認顯示的銀行資訊無誤
4. 設定「查詢天數」（0 代表僅查詢當日）
5. 點擊「開始執行自動化」

### 方式 B: 手動輸入（API 失敗時）

1. **輸入銀行編號**並點擊「獲取登入資訊」
2. 如果 API 失敗，系統會顯示「手動輸入區域」
3. **填寫登入資訊**：
   - **銀行代號**（下拉選單，例如：bot, hncb, yuanta）
   - 公司統編
   - 使用者帳號
   - 使用者密碼
4. 設定「查詢天數」
5. 點擊「使用手動輸入開始自動化」

**重要**：銀行代號必須與系統中已實作的銀行模組對應（目前僅支援 `bot` - 台灣銀行）

### 自動化執行（兩種方式相同）

6. **系統自動開啟 Chrome 瀏覽器**並前往銀行登入頁面
7. **系統自動填寫**統編、帳號、密碼
8. **手動輸入驗證碼**（4 位數）
9. **驗證碼輸入完成後，系統自動**：
   - ✅ 點擊登入按鈕
   - ✅ 等待登入成功
   - ✅ 導航到帳務查詢頁面
   - ✅ 設定查詢日期範圍
   - ✅ 執行查詢
   - ✅ 提取交易明細資料
   - ✅ 回傳資料到後端 API

**完全自動化**，無需人工介入（除了驗證碼）！

## 技術架構

### Puppeteer 自動化引擎

本專案使用 **Puppeteer** 來開啟真實的 Chrome 瀏覽器，模擬手動操作行為：

- ✅ **真實瀏覽器環境**：不是內嵌視窗，而是獨立的 Chrome 實例
- ✅ **反偵測機制**：使用 `puppeteer-extra-plugin-stealth` 避免被銀行網站偵測
- ✅ **完整自動化**：從填寫表單、監聽驗證碼、自動登入到查詢資料全自動
- ✅ **模擬真人行為**：包含延遲輸入、滑鼠移動等擬真操作
- ✅ **iframe 操作**：自動處理銀行網頁中的複雜 iframe 結構

### 台灣銀行頁面結構

**登入頁面**：
- 表單在主頁面上（不在 iframe 中）
- 包含：統編、使用者代號、密碼、驗證碼

**登入成功後的主頁面**：
- 使用 `frameset` 結構
- 主要內容在 `<frame id="MainFrame">` 中
- 帳務查詢、交易明細等功能都在 MainFrame iframe 內操作

### 銀行模組系統

每個銀行模組 (`src/banks/{bankCode}.js`) 遵循以下結構：

```javascript
const config = {
  code: "bot",              // 銀行代號
  name: "臺灣銀行",         // 顯示名稱
  loginUrl: "...",          // 登入網址
  detection: { ... },       // 頁面偵測邏輯
  selectors: { ... },       // CSS 選擇器
  automation: { ... },      // 自動化步驟定義
};

class BankAutomation {
  constructor(page, utils, logCallback) {
    this.page = page;  // Puppeteer Page 實例
    // ...
  }
  
  async autoFillLoginForm(loginData) { /* ... */ }
  async startCaptchaWatcher() { /* ... */ }
  async executeAutomationSteps() { /* ... */ }
  // 包含該銀行所有自動化操作方法
}

module.exports = { config, BankAutomation };
```

### 通用工具函式 (`src/banks/utils.js`)

提供跨銀行共用的工具函式：
- `calculateDateRange(daysBack)` - 計算日期範圍
- `rocToWesternDate(rocDate)` - 民國年轉西元年
- `extractAccountNumber(text)` - 從文字提取帳號
- `cleanAmount(amount)` - 清理金額格式
- `generateUniqueId(transaction)` - 生成交易唯一 ID

## 開發指南

### 新增銀行模組

1. 在 `src/banks/` 建立新檔案（例如 `yuanta.js`）
2. 定義 `config` 與 `Automation` 類別
3. 在 `src/banks/index.js` 中引入並註冊
4. 更新 `bankNameMap` 映射表

範例：

```javascript
// src/banks/yuanta.js
const config = { ... };
class YuantaAutomation { ... }
module.exports = { config, YuantaAutomation };

// src/banks/index.js
const { config: yuantaConfig, YuantaAutomation } = require('./yuanta');

const bankNameMap = {
  ...
  "元大銀行": "yuanta",
};

const configs = {
  ...
  yuanta: yuantaConfig,
};

const automationClasses = {
  ...
  yuanta: YuantaAutomation,
};
```

## API 端點

- **獲取銀行資訊**: `POST https://api.wapi.asia/payer/calls/water/user`
- **回傳交易紀錄**: `POST https://cz-backend.vercel.app/api/transactions`

## 注意事項

1. **驗證碼處理**：目前需要手動輸入驗證碼（4 位數），輸入完成後系統自動登入
2. **自動化完整性**：登入成功後，所有步驟（查詢、提取資料）完全自動執行
3. **瀏覽器可見**：Puppeteer 瀏覽器視窗會顯示出來，您可以觀察整個自動化過程
4. **反偵測機制**：使用 Stealth Plugin 避免被銀行網站識別為機器人
5. **安全性**：密碼等敏感資訊應妥善保管，避免洩漏
6. **iframe 載入時間**：登入成功後，系統會自動等待 MainFrame iframe 完全載入（最多 30 秒）

## 常見問題

### Q: 出現「找不到 MainFrame」錯誤？

**原因**：登入後頁面的 iframe 尚未完全載入。

**解決方法**：
- 系統已內建等待機制（最多 30 秒）
- 如果仍然失敗，可能是網路速度較慢，系統會顯示詳細錯誤信息
- 檢查日誌中的 iframe 列表，確認 `MainFrame` 是否存在

### Q: 如何調試自動化流程？

**啟用截圖調試**：

在 `src/banks/bot.js` 中取消註解以下行：

```javascript
// 在 waitForLoginSuccess() 方法中
await this.takeDebugScreenshot('after_login');
```

系統會自動保存截圖到專案根目錄，檔名格式：`debug_步驟名稱_時間戳.png`

## 技術特色

### 🔥 完整自動化流程

從驗證碼輸入完成後，系統將**完全自動**執行以下步驟：

1. **監聽驗證碼長度** → 達到 4 位數自動點擊登入
2. **等待登入成功** → 偵測 URL 變更，確認進入主頁面
3. **執行查詢流程** → 自動導航、點擊、填寫表單
4. **提取交易資料** → 解析 HTML 表格，提取所需欄位
5. **回傳後端 API** → 將資料發送到指定的 API 端點

### 🛡️ 反偵測機制

- 移除 `navigator.webdriver` 標記
- 自訂 User-Agent
- 使用 Stealth Plugin 繞過常見的機器人偵測
- 模擬真人輸入速度（`delay` 參數）

## 授權

本專案僅供內部使用。

## 版本歷史

- **v1.0.0** (2025-12-03)
  - 初始版本
  - 完成台灣銀行模組移植
  - 建立模組化架構
  - 實作基礎 UI 與自動化流程
