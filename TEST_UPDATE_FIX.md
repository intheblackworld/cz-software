# 🧪 測試自動更新修復

## 快速測試流程

### 步驟 1：本地測試配置檔生成

```bash
# 1. 打包應用程式（會自動生成 yml）
npm run make

# 2. 查看生成結果
# 應該會看到：
# 🔧 執行 postMake hook: 生成更新配置檔...
# 📝 開始生成更新配置檔...
# ✓ 找到檔案: xxx
# ✅ 已生成: xxx/latest.yml
```

### 步驟 2：檢查檔案

```bash
# Windows
ls -la out/make/squirrel.windows/x64/latest.yml
cat out/make/squirrel.windows/x64/latest.yml

# macOS
ls -la out/make/zip/darwin/*/latest-mac.yml
cat out/make/zip/darwin/*/latest-mac.yml
```

應該看到類似這樣的內容：

```yaml
version: 1.0.3
files:
  - url: CZSoftwareSetup.exe
    sha512: ABC123...
    size: 156789012
path: CZSoftwareSetup.exe
sha512: ABC123...
releaseDate: 2025-12-05T10:30:00.000Z
```

### 步驟 3：發布到 GitHub

```bash
# 1. 提交所有變更
git add .
git commit -m "fix: 添加自動更新配置檔生成"
git push origin main

# 2. 更新版本號並推送
npm version patch
git push origin --tags

# 3. 查看 GitHub Actions
# 前往：https://github.com/intheblackworld/cz-software/actions
# 等待 8-12 分鐘
```

### 步驟 4：檢查 GitHub Releases

前往：https://github.com/intheblackworld/cz-software/releases/latest

應該看到：

```
Release v1.0.4

Assets:
✅ CZSoftwareSetup.exe (Windows 安裝檔)
✅ latest.yml (⭐ 重要！更新配置)
✅ cz-software-darwin-x64-1.0.4.zip (macOS)
✅ latest-mac.yml (⭐ 重要！更新配置)
```

### 步驟 5：測試用戶端更新

#### 方式 A：使用舊版本測試

1. 下載並安裝 v1.0.3（或更早版本）
2. 啟動應用程式
3. 觀察日誌，應該看到：
   ```
   🔍 正在檢查是否有新版本...
   🎉 發現新版本 v1.0.4！
   ```

#### 方式 B：模擬測試

在開發環境中測試（修改 main.js）：

```javascript
// 臨時修改版本號來測試
app.getVersion = () => '1.0.0'; // 假裝是舊版本
```

## ✅ 成功的標誌

### 打包時
```
✔ Running make command
🔧 執行 postMake hook: 生成更新配置檔...
📝 開始生成更新配置檔...
✓ 找到檔案: CZSoftwareSetup.exe
✅ 已生成: out/make/squirrel.windows/x64/latest.yml
✅ 更新配置檔生成完成
```

### GitHub Release
- ✅ 包含 `latest.yml` 檔案
- ✅ 檔案大小 > 0（不是空檔案）
- ✅ 版本號正確

### 用戶端
```
[15:30:00] 🔍 正在檢查是否有新版本...
[15:30:02] 🎉 發現新版本 v1.0.4！正在準備下載...
[15:30:05] 📥 下載更新中... 25.5% (速度: 2.5 MB/s)
[15:30:10] ✅ 新版本 v1.0.4 下載完成！
```

## ❌ 失敗的症狀

### 症狀 1：沒有生成 yml
```
✔ Running make command
✔ Running postMake hook
# 沒有看到生成訊息
```

**解決方式：**
```bash
# 手動執行腳本看錯誤訊息
npm run generate-manifest
```

### 症狀 2：GitHub Release 沒有 yml
```
Release v1.0.4
Assets:
✅ CZSoftwareSetup.exe
❌ latest.yml (找不到！)
```

**原因：**
- postMake hook 沒有執行
- 腳本執行失敗
- 檔案沒有被 publisher 上傳

**解決方式：**
檢查 GitHub Actions 日誌，搜尋 "生成更新配置檔"

### 症狀 3：用戶端還是顯示「最新版本」
```
[15:30:00] 🔍 正在檢查是否有新版本...
[15:30:02] ✨ 目前已是最新版本
```

**原因：**
- GitHub Release 沒有 `latest.yml`
- yml 檔案內容錯誤
- 版本號沒有遞增

**檢查清單：**
```bash
# 1. 檢查 Release 中的 yml 檔案
curl -L https://github.com/intheblackworld/cz-software/releases/latest/download/latest.yml

# 2. 檢查版本號
cat package.json | grep version

# 3. 檢查應用程式日誌
# Windows: %APPDATA%/cz-software/logs/main.log
# macOS: ~/Library/Logs/cz-software/main.log
```

## 🐛 常見錯誤

### 錯誤 1：找不到安裝檔

```
⚠️  警告：找不到 Windows 安裝檔，跳過 latest.yml 生成
```

**原因：** `out/make` 目錄沒有安裝檔

**解決：** 確認 `npm run make` 成功完成

### 錯誤 2：SHA512 計算失敗

```
Error: ENOENT: no such file or directory
```

**原因：** 檔案路徑錯誤

**解決：** 檢查 `scripts/generate-update-manifest.js` 中的路徑設定

### 錯誤 3：yml 格式錯誤

```
SyntaxError: Invalid YAML
```

**原因：** 生成的 yml 格式不正確

**解決：** 檢查生成的 yml 檔案，確認格式正確

## 📊 對比

### 修復前
```
1. npm run publish
2. 生成 .exe
3. 上傳到 GitHub
4. ❌ 沒有 latest.yml
5. 用戶端：「目前已是最新版本」
```

### 修復後
```
1. npm run publish
2. electron-forge make
3. postMake hook → 生成 latest.yml ⭐
4. 上傳 .exe + latest.yml
5. 用戶端：「🎉 發現新版本！」
```

## 🎯 檢查清單

發布前確認：

- [ ] `scripts/generate-update-manifest.js` 存在
- [ ] `forge.config.js` 有 postMake hook
- [ ] `package.json` 有 electron-builder
- [ ] 本地測試生成成功
- [ ] Git 已提交所有變更
- [ ] 版本號已更新

發布後確認：

- [ ] GitHub Actions 執行成功
- [ ] Release 包含 `latest.yml`
- [ ] Release 包含 `latest-mac.yml`
- [ ] yml 檔案內容正確
- [ ] 版本號匹配

## 🚀 現在開始測試！

```bash
# 1. 本地測試
npm run make

# 2. 檢查檔案
ls -la out/make/*/latest*.yml

# 3. 查看內容
cat out/make/*/latest*.yml

# 4. 如果看起來正確，就發布！
npm version patch
git push origin --tags
```

祝測試順利！🎉

