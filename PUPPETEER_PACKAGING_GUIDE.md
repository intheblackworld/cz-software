# Puppeteer 打包指南

## 問題說明

在 Windows 上打包 Electron 應用程式時，Puppeteer 下載的 Chrome 瀏覽器預設存放在用戶快取目錄（`C:\Users\[用戶名]\.cache\puppeteer`），這些檔案不會被自動打包進應用程式，導致執行時出現錯誤：

```
Could not find Chrome (ver. X.X.X). 
```

## 解決方案

我們採用以下方式解決此問題：

### 1. 配置 Puppeteer 快取目錄

創建 `.puppeteerrc.cjs` 文件，將 Chrome 下載到專案的 `.local-chromium` 目錄：

```javascript
const { join } = require('path');

module.exports = {
  cacheDirectory: join(__dirname, '.local-chromium'),
};
```

### 2. 修改打包配置

在 `forge.config.js` 中設定 ASAR unpack 規則，確保 Puppeteer 和 Chrome 不被壓縮：

```javascript
packagerConfig: {
  asar: {
    unpack: '**/{node_modules/puppeteer,.local-chromium}/**/*'
  },
}
```

### 3. 修改 Puppeteer 啟動邏輯

在 `main.js` 中，根據應用程式是否打包來設定 Chrome 路徑：

```javascript
const launchOptions = {
  // ... 其他配置
};

if (app.isPackaged) {
  const chromePath = puppeteer.executablePath();
  launchOptions.executablePath = chromePath;
}

browser = await puppeteer.launch(launchOptions);
```

### 4. 更新 .gitignore

`.local-chromium` 目錄很大（約 300-400 MB），不應提交到版本控制：

```
# Puppeteer Chrome 快取（檔案很大，不要提交）
.local-chromium/
```

## 打包步驟

### 首次打包或重新打包時

1. **重新安裝依賴**（確保 Puppeteer 下載 Chrome 到正確位置）：

```bash
# 刪除舊的 node_modules 和快取
rm -rf node_modules package-lock.json .local-chromium

# 重新安裝
npm install
```

2. **確認 Chrome 已下載**：

檢查是否有 `.local-chromium` 目錄，裡面應該有 Chrome 瀏覽器檔案。

3. **打包應用程式**：

```bash
# macOS 開發環境打包 Windows 版本
npm run make:win

# 或直接在目標平台打包
npm run make
```

### Windows 環境打包

在 Windows 上打包時：

```powershell
# 重新安裝依賴
Remove-Item -Recurse -Force node_modules, .local-chromium
npm install

# 確認 Chrome 已下載
dir .local-chromium

# 打包
npm run make:win
```

## 驗證打包結果

打包完成後，檢查輸出目錄（`out/`）：

1. **檢查檔案大小**：由於包含了 Chrome，打包後的應用程式會比較大（約增加 300-400 MB）

2. **檢查 unpack 目錄**：應該會有 `*.asar.unpacked` 目錄，裡面包含 Puppeteer 和 Chrome

3. **測試執行**：在目標 Windows 電腦上執行，啟動自動化流程，確認瀏覽器能正常啟動

## 疑難排解

### 問題 1：仍然找不到 Chrome

**解決方式**：
- 確認 `.local-chromium` 目錄存在且有內容
- 刪除 `node_modules` 和 `.local-chromium`，重新執行 `npm install`
- 檢查 `.puppeteerrc.cjs` 檔案是否在專案根目錄

### 問題 2：打包檔案過大

**原因**：Chrome 瀏覽器本身約 300-400 MB

**解決方式**：
- 這是正常的，因為需要包含完整的 Chrome
- 可以考慮使用安裝程式格式（NSIS）而非壓縮包，能稍微減少檔案大小

### 問題 3：在某些 Windows 電腦上無法啟動

**可能原因**：
- 缺少 Visual C++ Runtime
- 防毒軟體阻擋

**解決方式**：
- 安裝 Microsoft Visual C++ Redistributable
- 將應用程式加入防毒軟體白名單

## 檔案大小參考

- 不含 Chrome：約 80-100 MB
- 包含 Chrome：約 380-500 MB

## GitHub Actions CI/CD

### 自動打包和發布

在 GitHub Actions 中打包時，我們已經設定：

1. **快取 Chrome**：避免每次都下載 300+ MB 的 Chrome
2. **驗證 Chrome**：確認 Chrome 已正確下載到 `.local-chromium`
3. **跨平台打包**：自動在 macOS 和 Windows 上打包

### 觸發發布

```bash
# 建立並推送 tag
git tag v1.0.3
git push origin v1.0.3

# GitHub Actions 會自動：
# 1. 在 macOS 和 Windows 上打包
# 2. 建立 GitHub Release
# 3. 上傳打包檔案
```

### CI 環境優化

`.github/workflows/release.yml` 包含以下優化：

- **Chrome 快取**：使用 `actions/cache@v3` 快取 `.local-chromium` 目錄
- **快取鍵**：基於 `package-lock.json` 的 hash，確保依賴更新時重新下載
- **驗證步驟**：確認 Chrome 執行檔存在

### 首次執行注意事項

- 第一次執行 GitHub Actions 時，會下載 Chrome（約 5-10 分鐘）
- 之後的執行會使用快取，大幅縮短時間（約 1-2 分鐘）
- 如果 `package-lock.json` 變更，會重新下載 Chrome

## 相關檔案

- `.puppeteerrc.cjs` - Puppeteer 配置
- `forge.config.js` - Electron Forge 打包配置
- `main.js` - Puppeteer 啟動邏輯
- `.gitignore` - 忽略 Chrome 快取目錄
- `.github/workflows/release.yml` - GitHub Actions 自動發布配置

