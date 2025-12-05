# 安裝與執行指南

## 系統需求

- **Node.js**: 18.x 或更新版本
- **npm**: 8.x 或更新版本
- **作業系統**: Windows 10+, macOS 10.15+, Linux (Ubuntu 20.04+)
- **記憶體**: 建議 4GB 以上（Puppeteer 會使用約 300-500MB）
- **磁碟空間**: 至少 1GB（包含 Chromium 約 300MB）

## 安裝步驟

### 1. 克隆專案（如果尚未克隆）

```bash
git clone <repository-url>
cd cz-software
```

### 2. 安裝依賴

```bash
npm install
```

**⚠️ 注意**：首次安裝時，Puppeteer 會自動下載 Chromium（約 300MB），請確保網路連線穩定。

如果下載失敗，可以嘗試：

```bash
# 設定 Puppeteer 使用系統已安裝的 Chrome
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# 或指定下載鏡像（中國大陸用戶）
export PUPPETEER_DOWNLOAD_HOST=https://npm.taobao.org/mirrors

# 然後重新安裝
npm install
```

### 3. 驗證安裝

執行以下指令確認 Puppeteer 是否正確安裝：

```bash
node -e "const puppeteer = require('puppeteer'); console.log('Puppeteer 版本:', puppeteer.executablePath());"
```

如果顯示 Chromium 的路徑，表示安裝成功。

## 執行應用程式

### 開發模式

```bash
npm start
```

這會啟動 Electron 應用程式，並開啟主介面。

### 打包應用程式

建立可執行檔：

```bash
# 打包當前平台
npm run package

# 打包 Windows 版本（在任何平台上）
npm run make:win

# 打包所有平台
npm run make
```

打包後的檔案會在 `out/` 資料夾中。

## 常見問題

### Q1: Puppeteer 下載失敗

**解決方法**：

1. 檢查網路連線
2. 使用鏡像站點：
   ```bash
   npm config set puppeteer_download_host=https://npm.taobao.org/mirrors
   npm install puppeteer
   ```
3. 或使用系統已安裝的 Chrome：
   ```bash
   npm install puppeteer-core
   ```

### Q2: macOS 上出現「無法開啟應用程式」錯誤

**解決方法**：

```bash
# 允許執行未經認證的應用程式
xattr -cr out/cz-software-darwin-arm64/cz-software.app
```

### Q3: Linux 上 Puppeteer 缺少依賴

**解決方法**：

在 Ubuntu/Debian 上安裝必要的依賴：

```bash
sudo apt-get update
sudo apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils
```

### Q4: Windows 上無法啟動 Puppeteer

**解決方法**：

1. 確認已安裝 Visual C++ Redistributable
2. 以管理員身份執行：
   ```cmd
   npm install --global windows-build-tools
   ```

### Q5: 記憶體不足

**解決方法**：

關閉其他應用程式，或調整 Puppeteer 設定：

```javascript
// 在 main.js 中調整
browser = await puppeteer.launch({
  headless: true, // 使用無頭模式減少記憶體
  args: [
    '--disable-dev-shm-usage', // 使用 /tmp 而非 /dev/shm
    '--disable-gpu', // 停用 GPU 加速
  ]
});
```

## 開發環境設定

### VS Code 擴充套件（推薦）

- **ESLint**: 程式碼檢查
- **Prettier**: 程式碼格式化
- **Electron Debug**: Electron 除錯工具

### 啟用開發者工具

在 `main.js` 中取消註解以下行：

```javascript
mainWindow.webContents.openDevTools();
```

## 更新套件

定期更新依賴以獲取最新功能與安全修復：

```bash
# 檢查過時的套件
npm outdated

# 更新所有套件到最新版本
npm update

# 更新 Puppeteer
npm install puppeteer@latest
```

## 環境變數

您可以設定以下環境變數：

```bash
# API URL（預設：https://api.wapi.asia/payer/calls/water）
export CZ_API_URL=https://your-api-url.com

# Puppeteer 可執行檔路徑（如果要使用系統 Chrome）
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

# 啟用除錯模式
export DEBUG=puppeteer:*
```

## 下一步

安裝完成後，請參閱：

- [QUICK_START.md](QUICK_START.md) - 快速開始指南
- [README.md](README.md) - 完整功能說明
- [PUPPETEER_UPGRADE.md](PUPPETEER_UPGRADE.md) - Puppeteer 架構說明

---

**需要幫助？** 請查看 [常見問題](README.md#常見問題) 或提交 Issue。

