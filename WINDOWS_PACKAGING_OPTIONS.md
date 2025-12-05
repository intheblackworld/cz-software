# Windows 打包選項說明

## 問題說明

在 Windows Server 上，ZIP 壓縮檔可能存在以下問題：
- 解壓縮失敗或需要第三方解壓工具
- 檔案路徑過長導致解壓錯誤
- 缺少 Windows 原生安裝體驗

## ⚠️ 跨平台打包限制

### 在 macOS 上打包 Windows 安裝檔

**Squirrel.Windows** 需要在 macOS 上安裝 Mono 和 Wine，這比較複雜：

```bash
# 需要安裝（不推薦，配置複雜且不穩定）
brew install mono wine-stable
```

**建議方案**：
1. ✅ 使用 GitHub Actions（在真實 Windows 環境打包）
2. ✅ 在 Windows 電腦上打包
3. ✅ 使用 ZIP 格式（macOS 可以直接打包）

### 在 Windows 上打包 macOS 應用

無法在 Windows 上打包 macOS 的 DMG 或 PKG，需要：
- 在 macOS 上打包
- 使用 GitHub Actions

## 解決方案

我們提供兩種 Windows 打包方式：

### 1. **Squirrel.Windows 安裝檔（推薦）** ✅

產生標準的 Windows 安裝程式，提供完整的安裝/更新/卸載體驗。

#### 優點
- ✅ 標準 `.exe` 安裝檔，Windows 原生支援
- ✅ 自動處理桌面捷徑和開始選單項目
- ✅ 支援自動更新（配合 electron-updater）
- ✅ 提供卸載功能
- ✅ 在 Windows Server 上相容性最佳

#### 打包命令
```bash
npm run make:win:installer
```

#### 輸出檔案
```
out/make/squirrel.windows/x64/
├── CZSoftwareSetup.exe          # 安裝程式（推薦分發這個）
├── cz_software-1.0.3 Full.nupkg # Squirrel 更新包
└── RELEASES                       # 更新資訊檔
```

#### 部署方式
只需將 `CZSoftwareSetup.exe` 複製到 Windows Server 並執行即可。

### 2. **ZIP 免安裝版（備選）**

產生壓縮檔，適合需要免安裝版本的用戶。

#### 優點
- ✅ 免安裝，解壓即用
- ✅ 適合需要自訂部署的情境
- ✅ 檔案更小（沒有安裝程式框架）

#### 缺點
- ❌ 在 Windows Server 上可能無法解壓
- ❌ 需要手動管理更新
- ❌ 路徑過長可能導致解壓失敗

#### 打包命令
```bash
npm run make:win:zip
```

#### 輸出檔案
```
out/make/zip/win32/x64/
└── cz-software-win32-x64-1.0.3.zip
```

## 建議的打包流程

### 在 macOS 上打包（您的情況）

#### 方案 A：使用 ZIP 格式（最簡單） ✅

```bash
# 1. 確保依賴已安裝（包含 Chrome）
npm install

# 2. 打包 Windows ZIP 版本
npm run make:win:zip

# 3. 找到壓縮檔
ls -lh out/make/zip/win32/x64/cz-software-win32-x64-1.0.*.zip
```

**優點**：
- ✅ macOS 上可以直接打包，無需額外工具
- ✅ 檔案較小
- ✅ 打包速度快

**使用方式**：
- 在 Windows 上使用 7-Zip 或 WinRAR 解壓（不要用 Windows 內建）
- 解壓到本機磁碟（避免網路磁碟）
- 執行 `cz-software.exe`

#### 方案 B：使用 GitHub Actions（推薦） ✅

```bash
# 1. 提交並推送代碼
git add .
git commit -m "準備發布"
git push

# 2. 建立並推送 tag（觸發自動打包）
git tag v1.0.4
git push origin v1.0.4

# 3. GitHub Actions 會自動：
# - 在真實的 Windows 環境中打包
# - 產生 Squirrel 安裝檔
# - 產生 ZIP 壓縮檔
# - 上傳到 GitHub Releases
```

**優點**：
- ✅ 在真實 Windows 環境打包（無相容性問題）
- ✅ 同時產生所有格式
- ✅ 自動發布到 GitHub Releases
- ✅ 支援 macOS 和 Windows 同時打包

#### 方案 C：安裝 Mono 和 Wine（不推薦）

```bash
# 安裝依賴（複雜且可能不穩定）
brew install mono wine-stable

# 然後才能使用
npm run make:win:installer
```

**缺點**：
- ❌ 安裝和配置複雜
- ❌ 可能出現相容性問題
- ❌ 打包速度慢
- ❌ 需要額外的磁碟空間

### 在 Windows 上打包

#### 方案 A：產生安裝檔（推薦）

```powershell
# 1. 確保依賴已安裝（包含 Chrome）
npm install

# 2. 打包 Windows 安裝檔
npm run make:win:installer

# 3. 找到安裝檔
dir out\make\squirrel.windows\x64\CZSoftwareSetup.exe
```

#### 方案 B：同時產生兩種格式

```powershell
# 產生所有 Windows 格式
npm run make:win

# 這會同時產生：
# - Squirrel 安裝檔
# - ZIP 壓縮檔
```

## 打包配置說明

### Squirrel.Windows 配置（`forge.config.js`）

```javascript
{
  name: '@electron-forge/maker-squirrel',
  config: {
    name: 'cz_software',                    // 應用程式內部名稱
    setupExe: 'CZSoftwareSetup.exe',        // 安裝檔名稱
    // 可選配置：
    // setupIcon: './assets/icon.ico',      // 安裝檔圖示
    // iconUrl: 'https://...',              // 遠端圖示 URL
    // loadingGif: './assets/loading.gif',  // 安裝時的動畫
  },
  platforms: ['win32']
}
```

### 配置要點

1. **name**: 應用程式內部名稱，建議使用底線而非破折號
2. **setupExe**: 最終安裝檔的名稱
3. **setupIcon**: 安裝檔的圖示（可選）
4. **platforms**: 只在 Windows 平台使用此 maker

## 在 Windows Server 上部署

### 使用安裝檔（推薦）

```powershell
# 1. 複製安裝檔到 Windows Server
# CZSoftwareSetup.exe

# 2. 執行安裝
.\CZSoftwareSetup.exe

# 3. 安裝完成後，應用程式會在：
# C:\Users\{Username}\AppData\Local\cz_software\
```

### 靜默安裝（適用於批次部署）

```powershell
# 靜默安裝（不顯示 UI）
.\CZSoftwareSetup.exe --silent

# 安裝到指定目錄
.\CZSoftwareSetup.exe --silent --install-dir="C:\Program Files\CZSoftware"
```

## 疑難排解

### 問題 1：安裝檔被防毒軟體阻擋

**原因**: 未簽署的 .exe 檔案

**解決方式**:
- 將應用程式加入防毒軟體白名單
- 考慮購買程式碼簽章憑證（Code Signing Certificate）

### 問題 2：打包後檔案太大

**原因**: 包含了 Chrome 瀏覽器（約 300-400 MB）

**這是正常的**:
- Squirrel 安裝檔: 約 400-500 MB
- 這是因為包含了完整的 Chrome 瀏覽器

**優化方式**:
- 使用壓縮（已預設啟用）
- 發佈時使用增量更新（只下載差異部分）

### 問題 3：更新時下載很慢

**解決方式**:
- Squirrel 支援增量更新
- 只會下載變更的部分，不是完整的 400+ MB

### 問題 4：需要卸載應用程式

```powershell
# 方法 1: 使用 Windows 設定
# 設定 → 應用程式 → 應用程式與功能 → CZ Software → 解除安裝

# 方法 2: 使用命令列
# 找到 Update.exe
C:\Users\{Username}\AppData\Local\cz_software\Update.exe --uninstall
```

## 檔案大小參考

### Squirrel 安裝檔
- 安裝檔 (.exe): 約 400-500 MB
- 安裝後佔用: 約 450-550 MB

### ZIP 壓縮檔
- 壓縮檔: 約 300-400 MB
- 解壓後: 約 450-550 MB

## 與自動更新的整合

使用 Squirrel.Windows 打包的應用程式可以無縫整合 `electron-updater`：

```javascript
// main.js 中已配置
const { autoUpdater } = require('electron-updater');

// Squirrel 格式支援自動更新
autoUpdater.checkForUpdates();
```

## 相關命令摘要

```bash
# 產生 Windows 安裝檔（推薦）
npm run make:win:installer

# 產生 ZIP 壓縮檔
npm run make:win:zip

# 產生所有 Windows 格式
npm run make:win

# 產生所有平台
npm run make
```

## 相關檔案

- `forge.config.js` - Electron Forge 打包配置
- `package.json` - 打包腳本定義
- `PUPPETEER_PACKAGING_GUIDE.md` - Puppeteer 和 Chrome 打包指南
- `CROSS_PLATFORM_BUILD.md` - 跨平台打包指南

## 最佳實踐

1. **開發測試**: 使用 `npm start`
2. **本地打包測試**: 使用 `npm run make:win:installer`
3. **生產發布**: 使用 GitHub Actions 自動打包並發布

## 快速參考：根據您的環境選擇打包方式

### 🍎 在 macOS 上（您的情況）

**立即可用的方案**：

```bash
# 方案 1: 使用 ZIP 格式（推薦給 macOS 開發者）
npm run make:win:zip

# 方案 2: 使用 GitHub Actions（推薦給生產發布）
git tag v1.0.4 && git push origin v1.0.4
```

**不推薦**：
```bash
# ❌ 需要先安裝 Mono 和 Wine（複雜）
npm run make:win:installer
```

### 🪟 在 Windows 上

**推薦方案**：

```powershell
# 方案 1: 產生安裝檔（推薦）
npm run make:win:installer

# 方案 2: 產生 ZIP（備選）
npm run make:win:zip

# 方案 3: 產生所有格式
npm run make:win
```

### ☁️ 使用 CI/CD（最佳實踐）

```bash
# 適用於所有平台
git tag v1.0.4
git push origin v1.0.4

# GitHub Actions 會自動在 Windows 和 macOS 環境中打包
# 並上傳到 GitHub Releases
```

## 您現在應該怎麼做？

### 選項 1：使用 ZIP 格式（快速解決）

```bash
# 在您的 macOS 上執行
npm run make:win:zip

# 輸出檔案在：
# out/make/zip/win32/x64/cz-software-win32-x64-1.0.*.zip

# 將這個檔案給 Windows 用戶
# 告訴他們使用 7-Zip 或 WinRAR 解壓（不要用 Windows 內建）
```

### 選項 2：使用 GitHub Actions（推薦）

```bash
# 1. 確保代碼已提交
git add .
git commit -m "修正 Puppeteer 打包配置"

# 2. 建立新版本 tag
git tag v1.0.4
git push origin v1.0.4

# 3. 等待 GitHub Actions 完成（約 10-15 分鐘）
# 4. 到 GitHub Releases 頁面下載打包好的檔案
```

### 選項 3：在 Windows 電腦上打包（如果有）

如果您有 Windows 電腦或虛擬機：

```powershell
# 1. Clone 專案
git clone https://github.com/intheblackworld/cz-software.git
cd cz-software

# 2. 安裝依賴
npm install

# 3. 打包
npm run make:win:installer

# 4. 找到安裝檔
dir out\make\squirrel.windows\x64\CZSoftwareSetup.exe
```

完成！

