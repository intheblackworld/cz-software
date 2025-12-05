# Chrome 路徑修復說明

## 🐛 問題描述

從 GitHub Release 下載的 Windows ZIP 檔案執行時，出現錯誤：

```
Browser was not found at the configured executablePath 
(C:\Users\Administrator\.cache\puppeteer\chrome\win64-143.0.7499.40\chrome-win64\chrome.exe)
```

**原因：**
- `puppeteer.executablePath()` 在打包後返回系統快取路徑（`~/.cache/puppeteer`）
- 但打包後的應用程式應該使用打包進來的 Chrome
- 需要手動計算打包後的 Chrome 正確路徑

---

## ✅ 修復內容

### 1. 更新 `main.js` - Chrome 路徑查找邏輯

**修復前：**
```javascript
if (app.isPackaged) {
    const chromePath = puppeteer.executablePath(); // ❌ 可能返回錯誤路徑
    launchOptions.executablePath = chromePath;
}
```

**修復後：**
```javascript
if (app.isPackaged) {
    // 方法 1: 嘗試使用 puppeteer.executablePath()
    // 方法 2: 手動查找打包後的 Chrome（多個可能位置）
    // 方法 3: 如果都找不到，嘗試使用系統 Chrome
    // 提供詳細的錯誤訊息
}
```

**查找順序：**
1. `resources/app.asar.unpacked/node_modules/puppeteer/.local-chromium/...`
2. `resources/.local-chromium/...`
3. 應用程式目錄下的 `.local-chromium`
4. 系統 Chrome（最後手段）

### 2. 更新 `forge.config.js` - 確保 Chrome 被正確打包

**修復前：**
```javascript
asar: {
    unpack: '**/{node_modules/puppeteer,.local-chromium}/**/*'
}
```

**修復後：**
```javascript
asar: {
    unpack: [
        '**/node_modules/puppeteer/**/*',
        '**/.local-chromium/**/*',
        '**/puppeteer/**/*'
    ]
}
```

---

## 📦 打包後的檔案結構

正確的打包結構應該是：

```
cz-software-win32-x64/
├── cz-software.exe
├── resources/
│   ├── app.asar                    (主應用程式)
│   └── app.asar.unpacked/         (未壓縮的檔案)
│       └── node_modules/
│           └── puppeteer/
│               └── .local-chromium/
│                   └── chrome-win64-XXXXX/
│                       └── chrome-win64/
│                           └── chrome.exe  ⭐ 這裡
└── ...
```

---

## 🧪 驗證步驟

### 步驟 1: 確認 Chrome 已下載

```bash
# 檢查 .local-chromium 目錄是否存在
ls -la .local-chromium/

# 應該看到類似：
# chrome-win64-143.0.7499.40/
```

### 步驟 2: 本地打包測試

```bash
# 打包 Windows 版本
npm run make

# 檢查打包後的結構
# Windows:
# 解壓縮 out/make/zip/win32/x64/cz-software-win32-x64-1.0.6.zip
# 檢查 resources/app.asar.unpacked/node_modules/puppeteer/.local-chromium/ 是否存在
```

### 步驟 3: 測試執行

```bash
# 在 Windows 上解壓縮 ZIP 檔案
# 執行 cz-software.exe
# 嘗試啟動自動化流程
# 應該能成功找到 Chrome
```

---

## 🔍 除錯資訊

如果還是有問題，查看應用程式日誌：

### Windows 日誌位置

```
%APPDATA%\cz-software\logs\main.log
```

或查看控制台輸出，應該會看到：

```
[Puppeteer] 啟動瀏覽器...
[Puppeteer] 找到 Chrome (方法2): C:\...\resources\app.asar.unpacked\node_modules\puppeteer\.local-chromium\chrome-win64-XXXXX\chrome-win64\chrome.exe
[Puppeteer] 最終使用 Chrome 路徑: C:\...\chrome.exe
```

### 如果找不到 Chrome

日誌會顯示：

```
[Puppeteer] 方法1失敗，嘗試其他路徑...
[Puppeteer] 無法找到 Chrome 瀏覽器。請確認應用程式已正確打包，或系統已安裝 Chrome。
```

**解決方法：**
1. 確認打包時 `.local-chromium` 被包含
2. 檢查 `forge.config.js` 的 `asar.unpack` 配置
3. 重新打包應用程式

---

## 📝 打包前檢查清單

- [ ] `.local-chromium` 目錄存在
- [ ] Chrome 已下載到 `.local-chromium`（約 300-400 MB）
- [ ] `forge.config.js` 有正確的 `asar.unpack` 配置
- [ ] `main.js` 有正確的 Chrome 路徑查找邏輯
- [ ] 本地打包測試成功

---

## 🚀 重新打包流程

```bash
# 1. 確保 Chrome 已下載
npm install

# 2. 驗證 .local-chromium 存在
ls -la .local-chromium/

# 3. 打包
npm run make

# 4. 檢查打包結果
# 解壓縮 ZIP 檔案，確認 Chrome 在正確位置

# 5. 發布
npm version patch
git push origin --tags
```

---

## ⚠️ 重要提醒

### 1. Chrome 必須在打包前下載

如果 `.local-chromium` 不存在，打包時不會包含 Chrome。

```bash
# 確保執行過
npm install
# 這會觸發 Puppeteer 下載 Chrome
```

### 2. 打包大小

包含 Chrome 的應用程式會比較大（約 300-400 MB），這是正常的。

### 3. 首次執行

首次執行時，應用程式會：
1. 查找打包後的 Chrome
2. 如果找不到，嘗試使用系統 Chrome
3. 如果都找不到，顯示錯誤訊息

---

## 🔧 疑難排解

### 問題 1: Chrome 路徑仍然錯誤

**檢查：**
```bash
# 在打包後的應用程式中
# 檢查 resources/app.asar.unpacked/node_modules/puppeteer/.local-chromium/ 是否存在
```

**解決：**
- 確認 `forge.config.js` 的 `asar.unpack` 配置正確
- 重新打包

### 問題 2: Chrome 找不到但系統有安裝

**解決：**
- 修復後的代碼會自動嘗試使用系統 Chrome
- 如果系統 Chrome 在標準位置，應該能自動找到

### 問題 3: 打包後檔案太大

**這是正常的：**
- Chrome 約 300-400 MB
- Electron 約 100-150 MB
- 應用程式本身約 50-100 MB
- **總計：約 500-650 MB**

---

## 📊 修復前後對比

### 修復前 ❌
```
啟動應用程式
  ↓
puppeteer.executablePath()
  ↓
返回: C:\Users\Administrator\.cache\puppeteer\...
  ↓
❌ 檔案不存在
  ↓
錯誤：Browser was not found
```

### 修復後 ✅
```
啟動應用程式
  ↓
嘗試方法 1: puppeteer.executablePath()
  ↓
嘗試方法 2: 查找打包後的 Chrome
  ↓
找到: resources/app.asar.unpacked/.../chrome.exe
  ↓
✅ 成功啟動 Chrome
```

---

## 🎉 完成！

現在打包後的應用程式應該能正確找到 Chrome 了！

**下次發布時記得：**
1. 確認 `.local-chromium` 存在
2. 重新打包
3. 測試解壓縮後的應用程式
4. 確認自動化流程能正常啟動

---

**修復日期：** 2025-12-05  
**影響版本：** v1.0.6+

