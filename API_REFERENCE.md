# API 參考文件

## 銀行資訊查詢 API

### 端點

```
POST https://api.wapi.asia/payer/calls/water/user
```

### 請求格式

```json
{
  "BankID": 101
}
```

**參數說明**：
- `BankID` (number): 銀行編號（例如：101 = 台灣銀行）

### 回應格式

```json
{
  "BankID": 101,
  "BankName": "臺灣銀行",
  "CompanyNo": "50660688",
  "User": "locker1688",
  "Pass": "Aa16881688",
  "BankSite": "https://necomb.bot.com.tw/...",
  "Carder": "1234567890123"
}
```

**欄位說明**：
- `BankID` (number): 銀行編號
- `BankName` (string): 銀行名稱（中文）
- `CompanyNo` (string): 統一編號
- `User` (string): 使用者代號/帳號
- `Pass` (string): 使用者密碼
- `BankSite` (string): 銀行網站網址（選填）
- `Carder` (string): 目標帳號（部分銀行使用，例如台灣企銀）

### 在程式中的使用

#### `src/banks/bot.js` - 欄位映射

```javascript
async autoFillLoginForm(loginData) {
  // API 欄位映射
  const companyId = String(loginData.CompanyNo || loginData.companyId || '');
  const userId = String(loginData.User || loginData.userId || '');
  const password = String(loginData.Pass || loginData.password || '');
  
  // 填寫表單...
}
```

**為什麼需要雙重映射？**
- `CompanyNo`, `User`, `Pass` - API 回傳的欄位名稱
- `companyId`, `userId`, `password` - 內部使用的欄位名稱（向後相容）

#### `main.js` - API 呼叫

```javascript
const response = await fetch(`${API_URL}/user`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    BankID: parseInt(bankId),
  }),
});

const data = await response.json();
// data.CompanyNo = "50660688"
// data.User = "locker1688"
// data.Pass = "Aa16881688"
```

## 交易紀錄回傳 API

### 端點

```
POST https://cz-backend.vercel.app/api/transactions
```

### 請求格式

```json
{
  "bankId": 101,
  "bankName": "臺灣銀行",
  "companyNo": "50660688",
  "transactions": [
    {
      "date": "2024-12-03",
      "time": "09:30:15",
      "account": "1234567890",
      "amount": 10000,
      "balance": 50000,
      "uniqueId": "base64_encoded_string"
    }
  ]
}
```

**欄位說明**：
- `bankId` (number): 銀行編號
- `bankName` (string): 銀行名稱
- `companyNo` (string): 統一編號
- `transactions` (array): 交易紀錄陣列
  - `date` (string): 交易日期（西元年格式 YYYY-MM-DD）
  - `time` (string): 交易時間（HH:MM:SS）
  - `account` (string): 對方帳號
  - `amount` (number): 存入金額
  - `balance` (number): 帳戶餘額
  - `uniqueId` (string): 唯一識別碼（用於去重）

### 回應格式

```json
{
  "success": true,
  "inserted": 5,
  "duplicated": 2,
  "message": "成功新增 5 筆交易紀錄"
}
```

## 支援的銀行編號

| 銀行編號 | 銀行名稱 | 代號 | 狀態 |
|---------|---------|-----|------|
| 101 | 臺灣銀行 | bot | ✅ 已移植 |
| 102 | 元大銀行 | yuanta | ⏳ 待移植 |
| 104 | 玉山銀行 | esun | ⏳ 待移植 |
| 105 | 京城銀行 | ktb | ⏳ 待移植 |
| 106 | 陽信銀行 | sunny | ⏳ 待移植 |
| 107 | 第一銀行 | firstbank | ⏳ 待移植 |
| 1001 | 華南商銀 | hncb | ⏳ 待移植 |
| 1003 | 國泰世華 | cathay | ⏳ 待移植 |
| 1004 | 中國信託 | ctbc | ⏳ 待移植 |
| 1005 | 高雄銀行 | bok | ⏳ 待移植 |
| 1006 | 彰化銀行 | chb | ⏳ 待移植 |
| 1007 | 聯邦銀行 | ubot | ⏳ 待移植 |
| 1008 | 台新銀行 | taishin | ⏳ 待移植 |
| 1009 | 土地銀行 | landbank | ⏳ 待移植 |
| 1010 | 富邦銀行 | fubon | ⏳ 待移植 |
| 1011 | 兆豐銀行 | megabank | ⏳ 待移植 |
| 1012 | 台中銀行 | tcb | ⏳ 待移植 |
| 1013 | 臺灣企銀 | tbb | ⏳ 待移植 |
| 1014 | 淡水一信 | tfcc | ⏳ 待移植 |
| 1015 | 新光商銀 | skbank | ⏳ 待移植 |

## 錯誤處理

### API 錯誤碼

| HTTP 狀態碼 | 說明 | 處理方式 |
|-----------|-----|---------|
| 200 | 成功 | 正常處理資料 |
| 400 | 請求格式錯誤 | 檢查 BankID 格式 |
| 404 | 找不到銀行資訊 | 確認 BankID 是否正確 |
| 500 | 伺服器錯誤 | 稍後重試 |

### 常見錯誤

#### 1. 銀行不支援

```json
{
  "success": false,
  "message": "此銀行尚未支援或無法識別: XXX銀行"
}
```

**原因**：該銀行尚未加入 `bankNameMap` 映射表。

**解決方法**：檢查 `src/banks/index.js` 中的 `bankNameMap`。

#### 2. 欄位缺失

```
填寫登入表單失敗: text is not iterable
```

**原因**：API 回傳的欄位名稱與預期不符，或資料類型錯誤。

**解決方法**：使用 `String()` 強制轉換所有輸入：
```javascript
const companyId = String(loginData.CompanyNo || '');
const userId = String(loginData.User || '');
const password = String(loginData.Pass || '');
```

## 測試資料

### 台灣銀行測試帳號（範例）

```json
{
  "BankID": 101,
  "BankName": "臺灣銀行",
  "CompanyNo": "50660688",
  "User": "locker1688",
  "Pass": "Aa16881688"
}
```

**注意**：這些是範例資料，實際使用時請替換為真實的帳號資訊。

## 安全性考量

### 敏感資料處理

1. **密碼傳輸**：
   - ✅ 使用 HTTPS 加密傳輸
   - ⚠️ 不要在日誌中顯示完整密碼

2. **資料存儲**：
   - ❌ 不要將密碼存儲在本地檔案
   - ✅ 每次都從 API 獲取最新資料

3. **日誌記錄**：
   ```javascript
   // ❌ 錯誤做法
   this.log(`密碼: ${password}`, 'info');
   
   // ✅ 正確做法
   this.log(`已填寫密碼`, 'success');
   ```

## 未來 API 擴展

### 1. 批次查詢

支援一次查詢多個銀行：

```json
POST /user/batch
{
  "BankIDs": [101, 102, 104]
}
```

### 2. WebSocket 即時通知

使用 WebSocket 接收即時的帳號變更通知：

```javascript
const ws = new WebSocket('wss://api.wapi.asia/notifications');
ws.on('message', (data) => {
  // 處理帳號變更通知
});
```

### 3. OAuth 認證

未來可能改用 OAuth 2.0 進行更安全的認證。

---

**最後更新**: 2025-12-03  
**API 版本**: v1.0  
**維護者**: CZ Team

