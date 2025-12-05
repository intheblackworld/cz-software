# 🚀 快速設置自動更新

## 5 分鐘完成設置

### 步驟 1: 建立 GitHub Repository

```bash
# 在 GitHub 上創建新 repository
# 例如：https://github.com/你的用戶名/cz-software

# 初始化 Git 並推送
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用戶名/cz-software.git
git push -u origin main
```

### 步驟 2: 取得 GitHub Token

1. 前往：https://github.com/settings/tokens
2. 點擊 "Generate new token (classic)"
3. 勾選 `repo` 權限
4. 複製生成的 token

### 步驟 3: 設定環境變數

```bash
# macOS / Linux
export GH_TOKEN="你的_GitHub_Token"

# 或永久設定
echo 'export GH_TOKEN="你的_GitHub_Token"' >> ~/.zshrc
source ~/.zshrc
```

### 步驟 4: 更新 package.json

修改以下內容為你的資訊：

```json
"repository": {
  "url": "https://github.com/你的用戶名/cz-software.git"
},
"build": {
  "publish": {
    "owner": "你的用戶名",
    "repo": "cz-software"
  }
}
```

### 步驟 5: 發布第一個版本

```bash
# 確保版本號正確（首次發布建議使用 1.0.0）
npm version 1.0.0

# 打包並發布到 GitHub
npm run publish
```

## ✅ 完成！

現在：
- GitHub Releases 會自動創建
- 安裝檔會自動上傳
- 用戶端會自動檢查更新

## 📦 後續更新流程

每次發布新版本：

```bash
# 1. 修改程式碼後提交
git add .
git commit -m "feat: 新功能描述"

# 2. 更新版本號
npm version patch  # 1.0.0 → 1.0.1（修復 bug）
# 或
npm version minor  # 1.0.0 → 1.1.0（新增功能）
# 或
npm version major  # 1.0.0 → 2.0.0（重大變更）

# 3. 推送到 GitHub
git push origin main --tags

# 4. 發布
npm run publish
```

## 🎯 用戶體驗

用戶下載並安裝你的應用程式後：

1. **啟動應用** → 自動檢查更新
2. **發現新版本** → 彈出對話框詢問是否下載
3. **背景下載** → 不影響使用
4. **下載完成** → 提示重啟安裝
5. **重啟應用** → 自動更新到新版本

## 🔧 疑難排解

### 問題：無法上傳到 GitHub

```bash
# 確認 token 是否設定
echo $GH_TOKEN

# 重新設定 token
export GH_TOKEN="新的_token"
```

### 問題：打包失敗

```bash
# 清除快取重新安裝
rm -rf node_modules package-lock.json
npm install

# 重新打包
npm run make
```

### 問題：用戶端無法檢查更新

- 確認 GitHub Release 是 public
- 確認 `latest.yml` 檔案存在
- 檢查應用程式日誌（見 AUTO_UPDATE_GUIDE.md）

## 📞 需要幫助？

查看完整文檔：`AUTO_UPDATE_GUIDE.md`

---

**現在你的應用程式已經支援自動更新！** 🎉

用戶只需要下載一次，之後就能自動收到更新通知，不需要再手動重新下載整個軟體。

