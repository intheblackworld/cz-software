# 跨平台打包指南

## 問題說明

在 macOS 上執行 `npm run publish` 只會打包 macOS 版本，無法同時打包 Windows 版本。

## 解決方案

### ✅ 選項 A：使用 GitHub Actions（最推薦）

我已經為你創建了 `.github/workflows/release.yml`，這個配置會自動在多個平台上打包。

#### 使用方式

```bash
# 1. 確保所有變更已提交
git add .
git commit -m "feat: 新增某功能"

# 2. 更新版本號（會自動創建 git tag）
npm version patch  # 1.0.1 → 1.0.2

# 3. 推送代碼和 tag
git push origin main
git push origin --tags

# 4. GitHub Actions 會自動開始打包
# 前往 https://github.com/intheblackworld/cz-software/actions 查看進度
```

#### 自動化流程

當你推送 tag 後（例如 `v1.0.2`），GitHub Actions 會：

1. ✅ 在 **macOS** 和 **Windows** 虛擬機上同時運行
2. ✅ 自動安裝依賴
3. ✅ 打包應用程式
4. ✅ 上傳到 GitHub Releases
5. ✅ 生成 `latest.yml` 和 `latest-mac.yml`

#### 優點
- ✅ 完全自動化
- ✅ 免費（GitHub Actions 提供免費額度）
- ✅ 同時打包多個平台
- ✅ 不需要多台電腦
- ✅ 可以重複執行

---

### 選項 B：在不同機器上分別打包

如果你有 Windows 電腦，可以：

#### 在 macOS 上：
```bash
npm run make  # 打包 macOS 版本
```

#### 在 Windows 上：
```bash
npm run make  # 打包 Windows 版本
```

然後手動上傳到 GitHub Releases。

#### 缺點
- ❌ 需要兩台電腦
- ❌ 手動操作較繁瑣
- ❌ 容易出錯

---

### 選項 C：使用虛擬機或 Wine（不推薦）

技術上可以在 macOS 上使用虛擬機或 Wine 來打包 Windows 版本，但：

- ❌ 配置複雜
- ❌ 可能有兼容性問題
- ❌ 打包速度慢
- ❌ 不值得投入時間

---

## 推薦的完整發布流程

使用 **GitHub Actions**（選項 A）：

```bash
# 步驟 1: 開發完成後提交
git add .
git commit -m "feat: 新增自動登入功能"

# 步驟 2: 更新版本號
npm version patch  # 自動更新 package.json 並創建 git tag

# 步驟 3: 推送到 GitHub
git push origin main --tags

# 步驟 4: 查看 GitHub Actions 進度
# 前往：https://github.com/intheblackworld/cz-software/actions
# 等待 5-10 分鐘，兩個平台都會自動打包完成

# 步驟 5: 檢查 Releases
# 前往：https://github.com/intheblackworld/cz-software/releases
# 確認 macOS 和 Windows 版本都已上傳
```

## GitHub Actions 配置說明

`.github/workflows/release.yml` 的關鍵設定：

```yaml
on:
  push:
    tags:
      - 'v*'  # 當推送 v 開頭的 tag 時觸發

jobs:
  release:
    strategy:
      matrix:
        os: [macos-latest, windows-latest]  # 同時在兩個平台運行
    
    runs-on: ${{ matrix.os }}
    
    steps:
      - name: Publish to GitHub Releases
        run: npm run publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}  # 自動提供
```

## 預期結果

發布完成後，在 GitHub Releases 中會看到：

```
Release v1.0.2
├── cz-software-darwin-arm64-1.0.2.zip    (macOS Apple Silicon)
├── cz-software-darwin-x64-1.0.2.zip      (macOS Intel)
├── cz-software-win32-x64-1.0.2.zip       (Windows 64-bit)
├── latest.yml                             (Windows 更新配置)
└── latest-mac.yml                         (macOS 更新配置)
```

## 查看打包進度

### 方式 1：GitHub 網頁
1. 前往 https://github.com/intheblackworld/cz-software/actions
2. 點擊最新的 workflow run
3. 查看即時日誌

### 方式 2：GitHub CLI（選用）
```bash
# 安裝 GitHub CLI
brew install gh

# 登入
gh auth login

# 查看 workflow 狀態
gh run list
gh run view --log
```

## 疑難排解

### 問題：GitHub Actions 失敗

**檢查清單：**
- ✅ 確認 `package.json` 中的 repository URL 正確
- ✅ 確認 GitHub repository 存在且可訪問
- ✅ 確認沒有語法錯誤
- ✅ 查看 Actions 日誌找出具體錯誤

### 問題：只有一個平台打包成功

這是正常的！兩個平台是獨立打包的：
- macOS 打包可能需要 5 分鐘
- Windows 打包可能需要 8 分鐘
- 等待兩者都完成即可

### 問題：Release 中沒有檔案

確認：
1. GitHub Actions 是否都執行成功（綠色勾勾）
2. 檢查 Actions 日誌是否有錯誤訊息
3. 確認 `GITHUB_TOKEN` 有足夠權限

## 開發環境測試

如果只想在本地測試打包（不上傳）：

```bash
# 只打包當前平台
npm run make

# 查看輸出
ls -lh out/make/
```

## 時間估算

- **本地打包**（單一平台）：2-3 分鐘
- **GitHub Actions**（兩個平台）：8-12 分鐘
- 首次設定：5 分鐘

## 成本

- ✅ **完全免費**
- GitHub Actions 提供每月 2000 分鐘的免費額度
- 每次發布約使用 10-15 分鐘
- 可以發布 100+ 次/月

## 總結

**最推薦的方式**：使用 GitHub Actions（選項 A）

✅ 自動化
✅ 多平台同時打包
✅ 免費
✅ 可靠
✅ 可重複執行

**發布指令**：
```bash
npm version patch && git push origin main --tags
```

然後等待 10 分鐘，GitHub Actions 會自動完成一切！🚀

---

**需要幫助？**
- 查看 Actions 日誌：https://github.com/intheblackworld/cz-software/actions
- 查看 Releases：https://github.com/intheblackworld/cz-software/releases

