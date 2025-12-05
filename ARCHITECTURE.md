# 台灣銀行自動化架構說明

## 頁面結構分析

### 登入頁面 (Login_1.faces)

```html
<body>
  <form id="form1" method="post" action="/BOT_CIB_B2C_WEB/common/login/Login_1.faces">
    <!-- 統編 -->
    <input id="form1:UUID" type="text" name="form1:UUID" />
    
    <!-- 使用者代號（密碼類型，防偷窺） -->
    <input id="form1:UserID" type="password" name="form1:UserID" />
    
    <!-- 使用者密碼 -->
    <input id="form1:Password" type="password" name="form1:Password" />
    
    <!-- 驗證碼 -->
    <input id="form1:captchaAnswer" type="text" name="form1:captchaAnswer" />
    
    <!-- 登入按鈕 -->
    <a href="javascript:void(0);" id="form1:loginbtn" onclick="...">登入</a>
  </form>
</body>
```

**特點**：
- ✅ 表單在主頁面上，**不在 iframe 中**
- ✅ 使用者代號使用 `type="password"` 防止肩窺
- ✅ 登入按鈕是 `<a>` 標籤，需要 click 事件觸發
- ✅ 驗證碼長度為 4 位數

### 登入成功後的主頁面 (cibmain.faces)

```html
<frameset>
  <!-- 頂部導航 -->
  <frame name="topFrame" src="...">
  
  <!-- 左側選單 -->
  <frame name="leftFrame" src="...">
  
  <!-- 主要內容區域 -->
  <frame id="MainFrame" name="MainFrame" src="...">
    <!-- 這裡才是帳務查詢、交易明細等功能的頁面 -->
    <div id="sideLeft">
      <a>存款帳戶</a>
      <a>交易明細查詢</a>
    </div>
    
    <!-- 查詢表單 -->
    <form id="form1">
      <input id="form1:startDate" />  <!-- 起始日期 -->
      <input id="form1:endDate" />    <!-- 結束日期 -->
      <a id="form1:linkCommand">查詢</a>
      
      <!-- 交易明細表格 -->
      <tbody id="form1:grid_DataGridBody">
        <tr>
          <td class="td_date">日期</td>
          <td class="td_account">對方帳號</td>
          <td class="td_money">存入金額</td>
          <td class="td_money">結餘金額</td>
        </tr>
      </tbody>
    </form>
  </frame>
</frameset>
```

**特點**：
- ⚠️ 使用舊式 `<frameset>` 結構（不是現代的 `<iframe>`）
- ⚠️ 所有帳務功能都在 `MainFrame` 內
- ⚠️ 需要等待 frame 完全載入才能操作

## 自動化流程

### 階段 1: 登入階段（主頁面操作）

```javascript
// 1. 填寫表單（在主頁面上，不在 iframe）
await page.type('#form1:UUID', companyId);
await page.type('#form1:UserID', userId);
await page.type('#form1:Password', password);

// 2. 監聽驗證碼輸入
await page.evaluate(() => {
  const captchaInput = document.querySelector('#form1:captchaAnswer');
  captchaInput.addEventListener('input', function() {
    if (this.value.length === 4) {
      document.querySelector('#form1:loginbtn').click();
    }
  });
});

// 3. 等待登入成功（URL 變更）
await page.waitForFunction(() => {
  return window.location.href.includes('cibmain');
});
```

### 階段 2: 等待 MainFrame 載入

```javascript
// 關鍵：登入成功後，必須等待 MainFrame 完全載入
await page.waitForFunction((mainFrameId) => {
  const mainFrame = document.getElementById(mainFrameId);
  if (!mainFrame) return false;
  
  try {
    const frameDoc = mainFrame.contentDocument;
    if (!frameDoc) return false;
    
    // 確保 frame 內有實際內容
    return frameDoc.body && frameDoc.body.innerHTML.length > 100;
  } catch (e) {
    return false;
  }
}, { timeout: 30000 }, 'MainFrame');
```

**為什麼需要這個步驟？**
- 登入成功後，頁面會跳轉到 `cibmain.faces`
- 但是 `MainFrame` 的內容是**異步載入**的
- 如果不等待，會出現「找不到 MainFrame」或「MainFrame 內容為空」的錯誤

### 階段 3: 帳務查詢（在 MainFrame 內操作）

```javascript
// 所有後續操作都在 MainFrame.contentDocument 中進行
const result = await page.evaluate((mainFrameId) => {
  const mainFrame = document.getElementById(mainFrameId);
  const frameDoc = mainFrame.contentDocument;
  
  // 步驟 1: 點擊帳務查詢
  const accountQueryLink = frameDoc.getElementById('B2C::FAO');
  accountQueryLink.parentElement.click();
  
  // 步驟 2: 點擊存款帳戶
  const sideLeft = frameDoc.getElementById('sideLeft');
  const depositLink = sideLeft.querySelector('a:contains("存款帳戶")');
  depositLink.click();
  
  // ... 後續步驟
}, 'MainFrame');
```

## 關鍵技術點

### 1. Frame vs Iframe 的差異

| 特性 | `<frame>` (台灣銀行使用) | `<iframe>` |
|-----|----------------------|-----------|
| **訪問方式** | `document.getElementById('MainFrame')` | 相同 |
| **獲取內容** | `.contentDocument` | `.contentDocument` |
| **頁面結構** | 必須在 `<frameset>` 中 | 可獨立使用 |
| **是否過時** | ✅ 是（HTML5 已廢棄） | ❌ 否 |

### 2. Puppeteer 中操作 Frame

**方法 A：使用 page.evaluate() 在頁面上下文中操作**（我們使用的方法）
```javascript
await page.evaluate((frameId) => {
  const frame = document.getElementById(frameId);
  const doc = frame.contentDocument;
  doc.querySelector('#someButton').click();
}, 'MainFrame');
```

**優點**：
- ✅ 可以直接操作 DOM
- ✅ 支援 `contentDocument` 訪問
- ✅ 適用於同源的 frame

**方法 B：使用 Puppeteer Frame API**
```javascript
const frames = await page.frames();
const mainFrame = frames.find(f => f.name() === 'MainFrame');
await mainFrame.click('#someButton');
```

**優點**：
- ✅ 更符合 Puppeteer 設計理念
- ✅ 支援跨域 frame
- ❌ 需要等待 frame attach

### 3. 時序問題處理

台灣銀行的頁面載入順序：

```
1. 使用者輸入驗證碼 (4位數)
   ↓
2. 自動點擊登入按鈕
   ↓
3. 頁面跳轉到 cibmain.faces (約 1-2 秒)
   ↓
4. 載入 frameset 結構 (約 0.5 秒)
   ↓
5. MainFrame 開始載入內容 (約 2-5 秒) ← 關鍵等待點
   ↓
6. MainFrame 內容完全載入完成
   ↓
7. 可以開始自動化操作
```

**我們的解決方案**：
```javascript
// 1. 等待 URL 變更
await page.waitForFunction(() => 
  window.location.href.includes('cibmain')
);

// 2. 等待 MainFrame 元素存在且內容已載入
await page.waitForFunction(() => {
  const frame = document.getElementById('MainFrame');
  return frame?.contentDocument?.body?.innerHTML.length > 100;
}, { timeout: 30000 });

// 3. 額外等待 3 秒確保穩定
await sleep(3000);

// 4. 開始自動化操作
```

## 常見錯誤與解決方案

### 錯誤 1: 找不到 MainFrame

```
[BOT-ERROR] 找不到 MainFrame
```

**原因**：登入成功後立即執行，但 MainFrame 尚未載入。

**解決方案**：已在 `waitForLoginSuccess()` 中加入等待邏輯。

### 錯誤 2: MainFrame contentDocument 為 null

```
[BOT-ERROR] 無法訪問 iframe 內容
```

**原因**：
1. Frame 還在載入中
2. 跨域限制（台灣銀行不應該有此問題）

**解決方案**：使用 try-catch 包裹訪問邏輯，並重試。

### 錯誤 3: 元素找不到（在 frame 內）

```
[BOT-ERROR] 找不到帳務查詢連結
```

**原因**：在主頁面上找元素，而不是在 MainFrame 內找。

**解決方案**：確保所有查詢操作都在 `frameDoc` 中進行：
```javascript
const frameDoc = mainFrame.contentDocument;
const element = frameDoc.querySelector('#someId'); // ✅ 正確
// const element = document.querySelector('#someId'); // ❌ 錯誤
```

## 調試技巧

### 1. 啟用截圖

在 `src/banks/bot.js` 中：
```javascript
await this.takeDebugScreenshot('after_login');
await this.takeDebugScreenshot('before_step1');
```

### 2. 查看所有 Frame

```javascript
const frames = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('frame, iframe')).map(f => ({
    id: f.id,
    name: f.name,
    src: f.src
  }));
});
console.log('所有 frame:', frames);
```

### 3. 檢查 Frame 內容

```javascript
const content = await page.evaluate(() => {
  const frame = document.getElementById('MainFrame');
  if (!frame?.contentDocument) return 'Frame 不存在或無法訪問';
  return frame.contentDocument.body.innerHTML.substring(0, 500);
});
console.log('Frame 內容前 500 字元:', content);
```

## 總結

台灣銀行的自動化難點在於：
1. ✅ 登入表單在主頁面（已正確處理）
2. ⚠️ 登入後使用舊式 frameset（已正確處理）
3. ⚠️ MainFrame 異步載入（已加入等待機制）
4. ✅ 所有帳務操作在 MainFrame 內（已正確使用 contentDocument）

目前的實作已經完整處理了這些情況。

