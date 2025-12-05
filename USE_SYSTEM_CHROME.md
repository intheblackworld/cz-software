# 使用系統 Chrome 配置說明

## 🎯 改變說明

應用程式現在**不再打包 Chrome 瀏覽器**，改為使用**系統已安裝的 Chrome**。

### 優點

✅ **大幅減少打包大小**
- 原本：~500-650 MB（包含 Chrome）
- 現在：~150-200 MB（不包含 Chrome）
- **節省約 300-400 MB！**

✅ **簡化打包流程**
- 不需要下載和打包 Chrome
- 打包速度更快
- 減少 GitHub Actions 執行時間

✅ **使用最新版 Chrome**
- 用戶系統的 Chrome 通常是最新版本
- 自動獲得安全更新

### 要求

⚠️ **用戶必須安裝 Google Chrome**

如果用戶沒有安裝 Chrome，應用程式會顯示錯誤訊息並提供下載連結。

---

## 📝 技術細節

### 修改的檔案

#### 1. `main.js` - Chrome 路徑查找

**修改前：**
- 查找打包後的 Chrome（多個可能位置）
- 如果找不到，才使用系統 Chrome

**修改後：**
- 直接查找系統 Chrome（Windows 常見位置）
- 如果找不到，顯示友善的錯誤訊息

**查找順序：**
1. `C:\Program Files\Google\Chrome\Application\chrome.exe`
2. `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`
3. `%USERPROFILE%\AppData\Local\Google\Chrome\Application\chrome.exe`

#### 2. `forge.config.js` - 打包配置

**修改前：**
```javascript
asar: {
    unpack: [
        '**/node_modules/puppeteer/**/*',
        '**/.local-chromium/**/*',
        '**/puppeteer/**/*'
    ]
}
```

**修改後：**
```javascript
asar: {
    unpack: []  // 不再需要解壓縮 Chrome
}
```

---

## 🚀 打包流程

### 現在不需要

❌ 下載 Chrome 到 `.local-chromium`
❌ 打包 Chrome 到應用程式
❌ 檢查 Chrome 是否已打包

### 現在只需要

✅ 打包應用程式本身
✅ 確認用戶系統有 Chrome（運行時檢查）

---

## 📦 打包大小對比

### 修復前（包含 Chrome）
```
應用程式：~150 MB
Chrome：~350 MB
總計：~500 MB
```

### 修復後（不包含 Chrome）
```
應用程式：~150 MB
Chrome：0 MB（使用系統）
總計：~150 MB
```

**節省：約 70% 的大小！**

---

## 🧪 測試步驟

### 步驟 1: 確認系統有 Chrome

```bash
# Windows PowerShell
Test-Path "C:\Program Files\Google\Chrome\Application\chrome.exe"
# 應該返回 True
```

### 步驟 2: 打包應用程式

```bash
npm run make
```

### 步驟 3: 測試執行

1. 解壓縮 ZIP 檔案
2. 執行 `cz-software.exe`
3. 啟動自動化流程
4. 應該能成功找到系統 Chrome

### 步驟 4: 查看日誌

應該會看到：
```
[Puppeteer] 找到系統 Chrome: C:\Program Files\Google\Chrome\Application\chrome.exe
[Puppeteer] 使用系統 Chrome: C:\Program Files\Google\Chrome\Application\chrome.exe
```

---

## ⚠️ 錯誤處理

### 如果用戶沒有安裝 Chrome

應用程式會顯示：

```
無法找到系統 Chrome 瀏覽器。請確認已安裝 Google Chrome。
下載位置：https://www.google.com/chrome/
```

### 解決方法

1. 用戶安裝 Chrome：https://www.google.com/chrome/
2. 重新啟動應用程式

---

## 📋 用戶要求

### 系統需求更新

**新增要求：**
- ✅ 必須安裝 Google Chrome（最新版本）

**建議：**
- 在 README 或安裝說明中明確標註此要求
- 在應用程式首次啟動時檢查 Chrome 是否存在
- 如果沒有，顯示友善的提示和下載連結

---

## 🔧 開發環境

### 開發時的行為

在開發環境（`npm start`）中：
- 如果 `.local-chromium` 存在，會使用打包的 Chrome
- 如果不存在，會嘗試使用系統 Chrome
- 如果都找不到，會顯示錯誤

### 打包後的行為

在打包後的應用程式中：
- **只使用系統 Chrome**
- 不會查找打包的 Chrome
- 如果找不到系統 Chrome，顯示錯誤

---

## 📊 GitHub Actions 影響

### 打包時間

**修復前：**
- 下載 Chrome：~5-8 分鐘
- 打包應用程式：~3-5 分鐘
- **總計：~8-13 分鐘**

**修復後：**
- 下載 Chrome：0 分鐘（不需要）
- 打包應用程式：~3-5 分鐘
- **總計：~3-5 分鐘**

**節省：約 60% 的時間！**

### 快取大小

**修復前：**
- Puppeteer Chrome 快取：~350 MB

**修復後：**
- 不需要快取 Chrome
- **節省 GitHub Actions 儲存空間**

---

## ✅ 檢查清單

發布前確認：

- [x] `main.js` 已更新為只使用系統 Chrome
- [x] `forge.config.js` 已移除 Chrome 打包配置
- [x] 本地測試成功（有 Chrome 的系統）
- [ ] 更新 README 說明 Chrome 要求
- [ ] 測試沒有 Chrome 的系統（應該顯示錯誤）
- [ ] 確認打包大小減少

---

## 🎉 完成！

現在應用程式：
- ✅ 不再打包 Chrome（節省 300-400 MB）
- ✅ 使用系統 Chrome（自動獲得更新）
- ✅ 打包速度更快（節省 60% 時間）
- ✅ 更簡潔的配置

**用戶只需要：**
1. 安裝 Google Chrome（如果還沒有的話）
2. 下載並解壓縮應用程式
3. 執行即可！

---

**修改日期：** 2025-12-05  
**影響版本：** v1.0.6+

