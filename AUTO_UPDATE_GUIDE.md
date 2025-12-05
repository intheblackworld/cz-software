# Electron 自動更新指南

## 📦 已完成的設定

你的應用程式現在已經整合了 `electron-updater` 自動更新機制！

## ✨ 主要特色

1. **自動檢查更新** - 應用程式啟動時自動檢查新版本
2. **後台下載** - 在背景下載更新檔案，不影響使用
3. **友善的通知** - 彈出對話框通知用戶有新版本
4. **增量更新** - 只下載變更的部分，不需要下載整個應用程式
5. **安全安裝** - 下載完成後可選擇立即重啟或稍後安裝

## 🚀 使用方式

### 方式一：使用 GitHub Releases（推薦）

這是最簡單且免費的方式。

#### 步驟 1: 準備 GitHub Repository

1. 在 GitHub 上創建一個新的 repository（例如：`cz-software`）
2. 更新 `package.json` 中的 repository 資訊：

```json
"repository": {
  "type": "git",
  "url": "https://github.com/你的用戶名/cz-software.git"
},
"build": {
  "publish": {
    "provider": "github",
    "owner": "你的用戶名",
    "repo": "cz-software",
    "releaseType": "release"
  }
}
```

#### 步驟 2: 設定 GitHub Token

1. 前往 GitHub Settings → Developer settings → Personal access tokens
2. 生成一個新的 token，勾選 `repo` 權限
3. 在終端機設定環境變數：

```bash
export GH_TOKEN="你的_GitHub_Token"
```

或在 `~/.zshrc` 中永久設定：

```bash
echo 'export GH_TOKEN="你的_GitHub_Token"' >> ~/.zshrc
source ~/.zshrc
```

#### 步驟 3: 打包並發布

```bash
# 更新版本號（例如從 1.0.0 → 1.0.1）
npm version patch  # 或 minor, major

# 打包並發布到 GitHub Releases
npm run publish
```

這會自動：
- 打包應用程式
- 創建 GitHub Release
- 上傳安裝檔和更新檔案
- 生成 `latest.yml` / `latest-mac.yml` 等更新配置檔

#### 步驟 4: 用戶端自動更新

當用戶啟動應用程式時：
1. 自動檢查 GitHub Releases 是否有新版本
2. 發現新版本時彈出通知
3. 用戶選擇下載後，在背景下載更新
4. 下載完成後提示用戶重啟安裝

### 方式二：使用自架伺服器

如果你想自己控制更新檔案的存放位置。

#### 步驟 1: 修改 package.json

```json
"build": {
  "publish": {
    "provider": "generic",
    "url": "https://你的伺服器網址/updates/"
  }
}
```

#### 步驟 2: 準備更新檔案結構

在你的伺服器上建立以下結構：

```
https://你的伺服器網址/updates/
├── latest.yml          (Windows 更新配置)
├── latest-mac.yml      (macOS 更新配置)
├── CZ-Software-Setup-1.0.1.exe
├── CZ-Software-1.0.1-mac.zip
└── ...
```

#### 步驟 3: 上傳檔案

```bash
# 打包應用程式
npm run make

# 手動上傳 out/make/ 下的檔案到伺服器
```

## 📝 版本管理最佳實踐

### 語意化版本號（Semantic Versioning）

- **1.0.0 → 1.0.1** (patch): 修復 bug
- **1.0.0 → 1.1.0** (minor): 新增功能
- **1.0.0 → 2.0.0** (major): 重大變更

```bash
# 使用 npm version 自動更新版本號
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0
```

### 發布流程

```bash
# 1. 確保所有變更已提交
git add .
git commit -m "feat: 新增某某功能"

# 2. 更新版本號
npm version patch -m "chore: bump version to %s"

# 3. 推送到 GitHub
git push origin main --tags

# 4. 打包並發布
npm run publish
```

## 🎨 前端整合（選用）

如果你想在 UI 中顯示更新進度，可以在 `renderer.js` 中添加：

```javascript
// 監聽更新狀態
window.electronAPI.onUpdateStatus((updateData) => {
    const { status, data } = updateData;
    
    switch (status) {
        case 'checking-for-update':
            console.log('正在檢查更新...');
            break;
            
        case 'update-available':
            console.log('發現新版本:', data.version);
            // 顯示更新通知在 UI 上
            break;
            
        case 'download-progress':
            console.log(`下載進度: ${data.percent.toFixed(2)}%`);
            // 更新進度條
            break;
            
        case 'update-downloaded':
            console.log('更新已下載完成');
            // 顯示安裝提示
            break;
            
        case 'update-not-available':
            console.log('目前已是最新版本');
            break;
            
        case 'update-error':
            console.error('更新發生錯誤:', data.message);
            break;
    }
});

// 手動檢查更新按鈕
document.getElementById('check-update-btn').addEventListener('click', async () => {
    const result = await window.electronAPI.checkForUpdates();
    if (result.success) {
        alert('檢查更新成功');
    } else {
        alert('檢查更新失敗: ' + result.message);
    }
});
```

## 🔧 進階設定

### 自定義更新行為

在 `main.js` 中可以修改：

```javascript
// 設定自動下載（預設為 false，需要用戶確認）
autoUpdater.autoDownload = true;

// 設定檢查更新的頻率（每小時檢查一次）
setInterval(() => {
    autoUpdater.checkForUpdates();
}, 60 * 60 * 1000);

// 允許降級版本（預設不允許）
autoUpdater.allowDowngrade = true;

// 允許預發布版本（測試版）
autoUpdater.allowPrerelease = true;
```

### 不同平台的安裝包類型

**Windows:**
- `nsis` - 推薦，支援自動更新
- `squirrel` - 也支援自動更新，但較舊

**macOS:**
- `dmg` - 磁碟映像檔
- `zip` - 壓縮檔，適合自動更新
- `pkg` - 安裝包

**Linux:**
- `AppImage` - 單一執行檔，推薦
- `deb` - Debian/Ubuntu
- `rpm` - Red Hat/Fedora

## ⚠️ 注意事項

1. **macOS 代碼簽章**
   - macOS 應用程式需要代碼簽章才能正常使用自動更新
   - 需要 Apple Developer 帳號（每年 $99 USD）

2. **Windows 代碼簽章**
   - 沒有簽章會被 Windows Defender 警告
   - 可以購買代碼簽章憑證（約 $100-300 USD/年）

3. **網路環境**
   - 確保用戶可以存取你的更新伺服器
   - GitHub Releases 在中國大陸可能較慢

4. **版本號規則**
   - 必須遵循語意化版本號格式（x.y.z）
   - 新版本號必須大於舊版本

## 🐛 疑難排解

### 無法檢查更新

```bash
# 查看日誌
tail -f ~/Library/Logs/cz-software/main.log  # macOS
# 或
Get-Content $env:USERPROFILE\AppData\Roaming\cz-software\logs\main.log -Wait  # Windows
```

### 更新下載失敗

- 檢查網路連線
- 確認 GitHub Release 存在且公開
- 檢查 `latest.yml` 檔案格式是否正確

### macOS Gatekeeper 阻擋

```bash
# 暫時解除阻擋（僅供測試）
xattr -cr /Applications/CZ\ Software.app
```

## 📚 相關資源

- [electron-updater 官方文檔](https://www.electron.build/auto-update)
- [Electron Forge 文檔](https://www.electronforge.io/)
- [語意化版本號規範](https://semver.org/lang/zh-TW/)

## 🎉 完成！

現在你的應用程式已經支援自動更新了！用戶只需要下載一次，之後就能自動收到更新通知。

---

**建議的發布流程：**

```bash
# 開發完新功能後
git add .
git commit -m "feat: 新增某功能"
npm version patch
git push origin main --tags
npm run publish  # 自動打包並上傳到 GitHub Releases
```

用戶端會在下次啟動時自動檢查並下載更新！🚀

