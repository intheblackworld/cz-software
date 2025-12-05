# 台灣銀行模組移植總結

## 移植概覽

本次工作將原本的瀏覽器插件 (`content.js`) 中的**台灣銀行自動化邏輯**成功移植到 Electron 桌面應用程式中，並建立了一套完整的**模組化架構**。

## 完成項目 ✅

### 1. 檔案結構建立
- ✅ 建立 `src/banks/` 資料夾
- ✅ 建立模組化銀行系統架構

### 2. 核心模組開發

#### `src/banks/bot.js` - 台灣銀行模組
包含以下內容：
- **設定檔 (config)**：
  - 銀行基本資訊（代號、名稱、登入網址）
  - 頁面偵測邏輯 (detection)
  - CSS 選擇器 (selectors)：登入、導航、查詢頁面
  - 自動化步驟定義 (automation.steps)

- **自動化類別 (BOTAutomation)**：
  - `getMainFrameDocument()` - 獲取 iframe document
  - `autoFillLoginForm()` - 自動填寫登入表單
  - `startCaptchaWatcher()` - 監聽驗證碼輸入
  - `step1_navigateToAccountQuery()` - 步驟1：導航到帳務查詢
  - `step2_waitAndClickDepositAccount()` - 步驟2：點擊存款帳戶
  - `step3_clickTransactionQuery()` - 步驟3：點擊交易明細查詢
  - `step4_setCurrentMonthDates()` - 步驟4：設定日期範圍
  - `step5_executeQuery()` - 步驟5：執行查詢
  - `step6_extractTransactionData()` - 步驟6：提取交易資料

#### `src/banks/utils.js` - 通用工具函式
提供跨銀行共用功能：
- ✅ `sleep()` - Promise 延遲
- ✅ `calculateDateRange()` - 計算日期範圍（支援民國年）
- ✅ `rocToWesternDate()` - 民國年轉西元年
- ✅ `extractAccountNumber()` - 從文字提取帳號
- ✅ `cleanAmount()` - 清理金額格式
- ✅ `generateUniqueId()` - 生成交易唯一識別碼
- ✅ `isHoliday()` - 節假日判斷
- ✅ `getCurrentTimestamp()` - 取得當前時間戳

#### `src/banks/index.js` - 銀行管理器
核心管理介面：
- ✅ `bankNameMap` - 中文名稱到代號的映射
- ✅ `configs` - 所有銀行設定檔集合
- ✅ `getBankConfig()` - 獲取銀行設定
- ✅ `getBankCode()` - 根據名稱獲取代號
- ✅ `createAutomationInstance()` - 建立自動化實例
- ✅ `isBankSupported()` - 檢查銀行是否支援
- ✅ `getSupportedBanks()` - 獲取支援銀行列表

### 3. 主程式整合

#### `main.js` - Electron 主進程
- ✅ 整合銀行模組系統
- ✅ IPC 處理器：`fetch-bank-info` - 呼叫 API 獲取銀行資訊
- ✅ IPC 處理器：`start-automation` - 啟動自動化流程
  - 建立自動化視窗
  - 載入銀行登入頁面
  - 建立自動化實例
  - 自動填寫登入表單
  - 啟動驗證碼監聽
- ✅ IPC 處理器：`stop-automation` - 停止自動化
- ✅ 輔助函式：`createAutomationWindow()` - 建立並管理自動化視窗

### 4. 測試驗證
- ✅ 所有模組載入測試通過
- ✅ 設定檔結構完整
- ✅ 工具函式運作正常
- ✅ 無 linter 錯誤

### 5. 文件撰寫
- ✅ `README.md` - 完整專案說明文件
- ✅ `MIGRATION_SUMMARY.md` - 本移植總結文件

## 架構優勢

### 相比原本的 `content.js`

| 項目 | 原本 (content.js) | 現在 (Electron 模組化) |
|------|------------------|----------------------|
| **檔案結構** | 單一檔案 19,531 行 | 拆分為多個模組檔案 |
| **維護性** | 困難（所有銀行混在一起） | 容易（每個銀行獨立） |
| **擴展性** | 低（新增銀行需修改主檔案） | 高（新增模組即可） |
| **測試性** | 低（難以單獨測試） | 高（可獨立測試每個模組） |
| **程式碼重用** | 低（邏輯混雜） | 高（通用工具函式） |
| **權限控制** | 受限於瀏覽器插件 | 完整 Node.js 權限 |
| **CORS/CSP** | 受銀行網站限制 | 可移除限制 |
| **Iframe 操作** | 複雜（需繞過安全限制） | 簡單（直接存取） |

## 技術亮點

### 1. 物件導向設計
每個銀行都是一個獨立的類別，包含自己的邏輯與狀態。

### 2. 依賴注入
`BOTAutomation` 接受 `view` 和 `utils` 作為參數，方便測試與替換。

### 3. 統一介面
所有銀行遵循相同的步驟命名規範（`step1_xxx`, `step2_xxx`），便於理解與維護。

### 4. 錯誤處理
完整的 try-catch 與錯誤回報機制。

### 5. 日誌系統
透過 IPC 即時回傳執行狀態給 UI。

## 從原始碼移植的關鍵邏輯

### 台灣銀行特殊處理

#### 1. Iframe 操作
```javascript
// 原始碼 (content.js)
const mainFrame = document.getElementById("MainFrame");
const frameDoc = mainFrame.contentDocument;

// Electron 版本 (bot.js)
await this.view.webContents.executeJavaScript(`
  const mainFrame = document.getElementById("MainFrame");
  return mainFrame.contentDocument;
`);
```

#### 2. 選擇器特殊處理
台灣銀行的許多元素 ID 在 `<span>` 上，需要找到父元素 `<a>` 才能點擊：

```javascript
// 原始碼邏輯保留
const spanElement = frameDoc.getElementById("B2C::FAO");
const accountQueryLink = spanElement.closest("a") || spanElement.parentElement;
```

#### 3. 日期格式轉換
台灣銀行使用民國年格式（例如：`1131203`），工具函式提供自動轉換。

#### 4. 驗證碼監聽
當驗證碼輸入達到 4 位數時，自動點擊登入按鈕：

```javascript
captchaInput.addEventListener('input', function() {
  if (this.value.length === 4) {
    setTimeout(() => loginButton.click(), 500);
  }
});
```

## 下一步建議

### 短期目標
1. **完成登入後的自動化流程**：
   - 監聽登入成功事件
   - 自動執行步驟 1-6
   - 提取交易資料並回傳後端 API

2. **增強錯誤處理**：
   - Session 過期偵測
   - 網路錯誤重試機制
   - 銀行網站 500 錯誤處理

### 中期目標
3. **移植其他銀行**：
   - 元大銀行 (yuanta)
   - 華南商銀 (hncb)
   - 玉山銀行 (esun)
   - ...（依優先順序）

4. **整合 OCR 驗證碼識別**：
   - 使用 Tesseract.js 或其他 OCR 引擎
   - 自動識別簡單的圖形驗證碼

### 長期目標
5. **建立排程系統**：
   - 定時自動執行查詢
   - 多銀行並行處理

6. **資料視覺化**：
   - 在 UI 上顯示交易明細
   - 圖表分析

7. **打包與部署**：
   - 使用 Electron Forge 打包成可執行檔
   - 支援 Windows、macOS、Linux

## 總結

本次移植成功將台灣銀行的自動化邏輯從瀏覽器插件遷移到 Electron 桌面應用程式，並建立了一套**高度模組化、易於維護、可擴展**的架構。

這套架構為未來移植其他銀行提供了清晰的範本，大幅降低了開發與維護成本。

---

**移植完成日期**: 2025-12-03  
**移植銀行**: 台灣銀行 (bot)  
**程式碼品質**: 無 Linter 錯誤  
**測試狀態**: 全部通過 ✅

