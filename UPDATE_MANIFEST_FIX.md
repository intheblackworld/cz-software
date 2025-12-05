# 自動更新配置檔修復說明

## 🐛 問題描述

使用 GitHub Actions 打包的應用程式，在 Windows 上執行時：
- 明明有新版本
- 但顯示「目前已是最新版本」
- 無法自動更新

## 🔍 根本原因

**Electron Forge 不會自動生成 `latest.yml` 配置檔！**

```
Electron Forge 打包
    ↓
生成應用程式檔案（.exe, .zip 等）
    ↓
上傳到 GitHub Releases
    ↓
❌ 沒有 latest.yml
    ↓
electron-updater 找不到更新配置
    ↓
顯示「目前已是最新版本」
```

## ✅ 解決方案

我們創建了一個自動生成更新配置檔的系統：

### 1. 新增檔案

**`scripts/generate-update-manifest.js`** - 自動生成腳本
- 在打包完成後執行
- 掃描 `out/make` 目錄
- 自動生成 `latest.yml` (Windows) 和 `latest-mac.yml` (macOS)
- 計算 SHA512 校驗碼
- 包含版本、檔案大小等資訊

### 2. 修改的檔案

**`forge.config.js`** - 添加 postMake hook
```javascript
hooks: {
  postMake: async (forgeConfig, makeResults) => {
    // 在打包完成後自動生成更新配置檔
    execSync('node scripts/generate-update-manifest.js');
    return makeResults;
  }
}
```

**`package.json`** - 添加 script
```json
{
  "scripts": {
    "generate-manifest": "node scripts/generate-update-manifest.js"
  },
  "devDependencies": {
    "electron-builder": "^24.x.x"  // 新增
  }
}
```

## 📦 現在的發布流程

```bash
# 本地測試
npm run make
# ↓ 自動執行
# ↓ electron-forge make
# ↓ postMake hook
# ↓ 生成 latest.yml 和 latest-mac.yml
# ✅ 完成！

# GitHub Actions 發布
git push origin --tags
# ↓ 觸發 GitHub Actions
# ↓ 在 macOS 和 Windows 上分別打包
# ↓ 每個平台都會生成對應的 yml 檔案
# ↓ 上傳到 GitHub Releases
# ✅ 完成！用戶可以自動更新
```

## 🎯 latest.yml 的作用

`latest.yml` 告訴 `electron-updater`：

```yaml
version: 1.0.3              # 最新版本號
files:
  - url: CZSoftwareSetup.exe  # 安裝檔名稱
    sha512: ABC123...          # 檔案校驗碼（確保完整性）
    size: 156789012            # 檔案大小（bytes）
path: CZSoftwareSetup.exe
sha512: ABC123...
releaseDate: 2025-12-05T10:30:00.000Z
```

當用戶啟動應用程式時：
1. `electron-updater` 訪問 GitHub Releases
2. 下載 `latest.yml`
3. 比較版本號
4. 如果有新版本 → 顯示更新通知
5. 用戶點擊下載 → 下載新版本
6. 驗證 SHA512 → 確保檔案完整
7. 安裝更新 ✅

## 🧪 測試步驟

### 測試 1：本地生成配置檔

```bash
# 1. 打包應用程式
npm run make

# 2. 檢查是否生成了 yml 檔案
ls -la out/make/squirrel.windows/x64/latest.yml      # Windows
ls -la out/make/zip/darwin/x64/latest-mac.yml        # macOS

# 3. 查看內容
cat out/make/squirrel.windows/x64/latest.yml
```

### 測試 2：完整發布流程

```bash
# 1. 更新版本號
npm version patch  # 1.0.3 → 1.0.4

# 2. 提交並推送
git push origin main --tags

# 3. 等待 GitHub Actions 完成
# 前往：https://github.com/intheblackworld/cz-software/actions

# 4. 檢查 Releases
# 前往：https://github.com/intheblackworld/cz-software/releases/latest

# 5. 應該看到：
# ✅ CZSoftwareSetup.exe
# ✅ latest.yml
# ✅ cz-software-darwin-x64-1.0.4.zip
# ✅ latest-mac.yml
```

### 測試 3：用戶端更新

```bash
# 1. 在 Windows 上安裝 1.0.3 版本

# 2. 發布 1.0.4 版本（包含 latest.yml）

# 3. 啟動 1.0.3 版本的應用程式

# 4. 應該看到：
# ✅ "🎉 發現新版本 v1.0.4！"
# ✅ 下載進度條
# ✅ "✅ 新版本已下載完成"
# ✅ 提示重啟

# 5. 重啟後：
# ✅ 應用程式更新到 1.0.4
```

## 📊 檔案結構

```
GitHub Release v1.0.3
├── 📦 CZSoftwareSetup.exe          (Windows 安裝檔)
├── 📄 latest.yml                   (Windows 更新配置) ⭐ 新增
├── 📦 cz-software-darwin-x64.zip   (macOS 應用程式)
└── 📄 latest-mac.yml               (macOS 更新配置) ⭐ 新增
```

## ⚠️ 重要提醒

### 1. 版本號必須遞增

```bash
# ✅ 正確
1.0.0 → 1.0.1 → 1.0.2

# ❌ 錯誤
1.0.1 → 1.0.0  # 不能降版本
```

### 2. 必須包含 yml 檔案

如果 GitHub Release 中沒有 `latest.yml`，用戶端會顯示「目前已是最新版本」。

### 3. 檔案名稱要一致

`latest.yml` 中的檔案名稱必須與實際上傳的檔案名稱一致。

### 4. SHA512 校驗

如果 SHA512 不匹配，更新會失敗（安全機制）。

## 🔧 疑難排解

### 問題 1：生成腳本失敗

```bash
# 手動執行看錯誤訊息
npm run generate-manifest

# 常見原因：
# - out/make 目錄不存在 → 先執行 npm run make
# - 找不到安裝檔 → 檢查打包是否成功
```

### 問題 2：yml 檔案沒有上傳

```bash
# 檢查 forge.config.js 的 postMake hook
# 確認 console 有顯示「✅ 更新配置檔生成完成」
```

### 問題 3：用戶端還是無法更新

```bash
# 1. 檢查 GitHub Release 是否包含 yml 檔案
# 2. 檢查 yml 檔案內容是否正確
# 3. 檢查版本號是否遞增
# 4. 查看應用程式日誌（開發者工具）
```

## 📚 相關文檔

- `自動更新說明.md` - 自動更新功能介紹
- `CROSS_PLATFORM_BUILD.md` - 跨平台打包指南
- `問題修復摘要.md` - 所有問題的修復記錄

## 🎉 完成！

現在你的應用程式：
- ✅ 打包時自動生成 `latest.yml`
- ✅ 上傳到 GitHub Releases
- ✅ 用戶可以自動檢測到更新
- ✅ 完整的自動更新流程

## 📝 下次發布記得

```bash
# 完整的發布流程
git add .
git commit -m "feat: 新功能"
npm version patch
git push origin main --tags

# 然後等待 GitHub Actions 完成
# 確認 Releases 中包含：
# ✅ 安裝檔
# ✅ latest.yml / latest-mac.yml
```

就這樣！🚀

