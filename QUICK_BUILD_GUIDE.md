# 快速打包指南

根據您的開發環境選擇對應的打包方式。

## 🍎 在 macOS 上打包 Windows 應用程式

### ✅ 方案 1：使用 ZIP 格式（最簡單）

```bash
# 打包 Windows ZIP 版本
npm run make:win:zip

# 輸出檔案
# out/make/zip/win32/x64/cz-software-win32-x64-1.0.*.zip
```

**適合**：
- 快速測試
- 內部分發
- 不需要安裝程式的場景

**部署說明**：
- 告訴 Windows 用戶使用 **7-Zip** 或 **WinRAR** 解壓
- ⚠️ 不要使用 Windows 內建的解壓縮功能（可能失敗）
- 解壓到本機磁碟（不要解壓到網路磁碟）

---

### ✅ 方案 2：使用 GitHub Actions（推薦）

```bash
# 1. 提交代碼
git add .
git commit -m "準備發布版本"

# 2. 建立版本 tag
git tag v1.0.4

# 3. 推送到 GitHub
git push origin main
git push origin v1.0.4

# 4. 等待自動打包完成
# GitHub Actions 會在真實的 Windows 環境中打包
# 並自動上傳到 GitHub Releases
```

**優點**：
- ✅ 在真實 Windows 環境打包（無相容性問題）
- ✅ 自動產生 Squirrel 安裝檔（`.exe`）
- ✅ 同時打包 macOS 和 Windows 版本
- ✅ 自動發布到 GitHub Releases

**查看結果**：
```
https://github.com/intheblackworld/cz-software/releases
```

---

### ❌ 方案 3：安裝 Mono + Wine（不推薦）

在 macOS 上打包 Squirrel.Windows 安裝檔需要：

```bash
# 安裝依賴（複雜且耗時）
brew install mono wine-stable

# 然後才能使用
npm run make:win:installer
```

**為什麼不推薦**：
- ❌ 安裝和配置複雜
- ❌ 佔用大量磁碟空間（幾 GB）
- ❌ 打包速度慢
- ❌ 可能出現相容性問題
- ❌ Wine 在 Apple Silicon (M1/M2/M3) 上支援不完整

---

## 🪟 在 Windows 上打包

### ✅ 推薦：產生安裝檔

```powershell
# 打包 Squirrel 安裝程式
npm run make:win:installer

# 輸出檔案
# out\make\squirrel.windows\x64\CZSoftwareSetup.exe
```

### 可選：產生 ZIP

```powershell
# 打包 ZIP 版本
npm run make:win:zip

# 輸出檔案
# out\make\zip\win32\x64\cz-software-win32-x64-1.0.*.zip
```

### 產生所有格式

```powershell
# 同時產生安裝檔和 ZIP
npm run make:win
```

---

## 📋 完整打包流程

### 首次打包或依賴更新後

```bash
# 1. 清理舊依賴（重要！）
rm -rf node_modules .local-chromium package-lock.json

# 2. 安裝依賴（會下載 Chrome，約 5-10 分鐘）
npm install

# 3. 確認 Chrome 已下載
ls -la .local-chromium

# 4. 打包
npm run make:win:zip  # macOS 上推薦
# 或
npm run make:win:installer  # Windows 上推薦
```

### 後續打包（依賴未變更）

```bash
# 直接打包即可
npm run make:win:zip  # macOS
npm run make:win:installer  # Windows
```

---

## 🚀 推薦的工作流程

### 開發階段

```bash
# 本地開發
npm start

# 快速測試打包
npm run make:win:zip  # macOS
npm run make:win:installer  # Windows
```

### 發布階段

```bash
# 使用 GitHub Actions 自動打包並發布
git tag v1.0.4
git push origin v1.0.4

# 等待 CI 完成，然後到 GitHub Releases 下載
```

---

## 📦 各平台打包命令對照表

| 平台 | 命令 | 輸出格式 | macOS 可用 | Windows 可用 |
|------|------|----------|-----------|-------------|
| Windows ZIP | `npm run make:win:zip` | .zip | ✅ | ✅ |
| Windows 安裝檔 | `npm run make:win:installer` | .exe | ⚠️ 需 Mono+Wine | ✅ |
| macOS | `npm run make` | .zip | ✅ | ❌ |
| 所有 Windows 格式 | `npm run make:win` | 全部 | ⚠️ 部分需 Mono+Wine | ✅ |

---

## ⚡ 常見問題

### Q: 為什麼在 macOS 上不能打包 Windows 安裝檔？

**A**: Squirrel.Windows 使用 .NET 技術，需要 Mono 和 Wine 來模擬 Windows 環境。安裝和配置這些工具很複雜，建議使用 GitHub Actions 或在 Windows 上打包。

### Q: ZIP 檔在 Windows Server 上無法解壓縮怎麼辦？

**A**: 
1. 使用 **7-Zip** 或 **WinRAR** 解壓（不要用 Windows 內建）
2. 或使用 GitHub Actions 產生 `.exe` 安裝檔
3. 或在 Windows 電腦上打包安裝檔

### Q: 如何減少打包檔案大小？

**A**: 無法大幅減少。因為包含了完整的 Chrome 瀏覽器（約 300-400 MB），這是 Puppeteer 正常運作的必要條件。

### Q: 打包時提示找不到 Chrome？

**A**: 執行清理並重新安裝：
```bash
rm -rf node_modules .local-chromium package-lock.json
npm install
```

---

## 📚 相關文檔

- **PUPPETEER_PACKAGING_GUIDE.md** - Puppeteer 和 Chrome 打包詳解
- **WINDOWS_PACKAGING_OPTIONS.md** - Windows 打包選項完整說明
- **CROSS_PLATFORM_BUILD.md** - 跨平台打包詳細指南

---

## 💡 我現在應該做什麼？

如果您在 **macOS** 上：

```bash
# 快速解決方案
npm run make:win:zip

# 或使用 CI（推薦）
git tag v1.0.4 && git push origin v1.0.4
```

如果您在 **Windows** 上：

```powershell
# 推薦方案
npm run make:win:installer
```

如果需要**正式發布**：

```bash
# 使用 GitHub Actions（最佳）
git tag v1.0.4
git push origin v1.0.4
```

