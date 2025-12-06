// 臺灣銀行 (BOT) 銀行設定檔與自動化邏輯
// Bank of Taiwan Configuration and Automation Logic

const transactionAPI = require('../api/transactionAPI');

const config = {
  code: "bot",
  name: "臺灣銀行",
  loginUrl: "https://necomb.bot.com.tw/BOT_CIB_B2C_WEB/common/login/Login_1.faces",
  
  detection: {
    loginPage: ["necomb.bot.com.tw", "Login"],
    mainPage: ["necomb.bot.com.tw", "cibmain.faces", "main"],
  },
  
  // 預設登入資料（實際運作時會被 API 資料覆蓋）
  loginData: {
    companyId: "50660688",
    userId: "locker1688",
    password: "Aa16881688",
    bankId: 101,
    bankName: "臺灣銀行",
  },
  
  selectors: {
    // 登入頁面選擇器
    login: {
      companyId: "#form1\\:UUID",
      userId: "#form1\\:UserID",
      password: "#form1\\:Password",
      captcha: "#form1\\:captchaAnswer",
      loginButton: "#form1\\:loginbtn",
      captchaLength: 4,
    },
    
    // 主頁面選擇器
    navigation: {
      mainFrame: "MainFrame",
      accountQuery: "B2C::FAO",
      accountQueryAlt: 'a[href*="cibmain.faces"][href*="lev1=1"][href*="apid=FAO"]',
    },
    
    // 查詢頁面選擇器
    query: {
      depositAccount: 'a:contains("存款帳戶")',
      transactionQuery: 'a:contains("交易明細查詢")',
      startDate: "form1:startDate",
      endDate: "form1:endDate",
      currency: "form1:currency",
      queryTypeOnlyToday: "form1:queryType3",
      queryButton: "form1:linkCommand",
      dataGrid: "form1:grid_DataGridBody",
      dateCell: "td.td_date",
      accountCell: 'td.td_account[data-title*="對方帳號"]',
      amountCell: 'td.td_money[data-title*="存入"]',
      balanceCell: 'td.td_money[data-title*="結餘金額"]',
    },
  },
  
  automation: {
    steps: [
      { name: "navigateToAccountQuery", waitTime: 5000 },
      { name: "waitAndClickDepositAccount", waitTime: 5000 },
      { name: "clickTransactionQuery", waitTime: 5000 },
      { name: "setCurrentMonthDates", waitTime: 5000 },
      { name: "executeQuery", waitTime: 5000 },
      { name: "extractTransactionData", waitTime: 2000 },
      { name: "waitAndRequery", waitTime: 5000 },
    ],
  },
};

/**
 * 臺灣銀行自動化操作類別（使用 Puppeteer）
 * 包含所有特定於台灣銀行的 DOM 操作與自動化邏輯
 */
class BOTAutomation {
  constructor(page, utils, logCallback, queryDaysBack = 0, bankId = null) {
    this.page = page; // Puppeteer Page 實例
    this.utils = utils; // 通用工具函式
    this.config = config;
    this.logCallback = logCallback; // 日誌回調函式
    this.isLoginSuccess = false;
    this.queryDaysBack = queryDaysBack; // 查詢天數
    this.lastQueryDate = null; // 上次查詢日期
    this.originalQueryDaysBack = null; // 原始查詢天數（跨日調整時使用）
    this.bankId = bankId || config.loginData.bankId; // 銀行 ID
  }

  /**
   * 輔助方法：發送日誌
   */
  log(message, type = 'info') {
    if (this.logCallback) {
      this.logCallback({ message, type });
    }
    console.log(`[BOT-${type.toUpperCase()}] ${message}`);
  }

  /**
   * 輔助方法：截圖（用於調試）
   */
  async takeDebugScreenshot(stepName) {
    try {
      const timestamp = new Date().getTime();
      const filename = `debug_${stepName}_${timestamp}.png`;
      await this.page.screenshot({ 
        path: filename,
        fullPage: true 
      });
      this.log(`已保存調試截圖: ${filename}`, 'info');
    } catch (error) {
      console.error('截圖失敗:', error);
    }
  }

  /**
   * 自動填寫登入表單
   */
  async autoFillLoginForm(loginData) {
    // 確保所有資料都轉換為字串
    const companyId = String(loginData.CompanyNo || loginData.companyId || '');
    const userId = String(loginData.User || loginData.userId || '');
    const password = String(loginData.Pass || loginData.password || '');
    
    this.log('開始填寫登入表單...', 'info');
    this.log(`登入資料: 統編=${companyId}, 帳號=${userId}`, 'info');
    
    try {
      // 等待表單元素出現
      await this.page.waitForSelector(config.selectors.login.companyId, { timeout: 10000 });
      this.log('登入表單已載入', 'success');
      
      // 清空並填寫統編
      await this.page.click(config.selectors.login.companyId, { clickCount: 3 }); // 三次點擊選取全部
      await this.page.type(config.selectors.login.companyId, companyId, { delay: 100 });
      this.log(`已填寫統編: ${companyId}`, 'success');
      
      // 清空並填寫帳號
      await this.page.click(config.selectors.login.userId, { clickCount: 3 });
      await this.page.type(config.selectors.login.userId, userId, { delay: 100 });
      this.log(`已填寫帳號: ${userId}`, 'success');
      
      // 清空並填寫密碼
      await this.page.click(config.selectors.login.password, { clickCount: 3 });
      await this.page.type(config.selectors.login.password, password, { delay: 100 });
      this.log('已填寫密碼', 'success');
      
      return { success: true, message: '登入資訊已填寫完成' };
    } catch (error) {
      this.log(`填寫登入表單失敗: ${error.message}`, 'error');
      this.log(`錯誤堆疊: ${error.stack}`, 'error');
      return { success: false, message: error.message };
    }
  }

  /**
   * 監聽驗證碼輸入並自動提交
   */
  async startCaptchaWatcher() {
    this.log('啟動驗證碼監聽器...', 'info');
    
    try {
      // 在頁面上下文中注入監聽器
      await this.page.evaluate((captchaSelector, loginButtonSelector, captchaLength) => {
        const captchaInput = document.querySelector(captchaSelector);
        const loginButton = document.querySelector(loginButtonSelector);
        
        if (captchaInput && loginButton) {
          // 設置一個標記，表示已經設置監聽器
          window.__captchaListenerActive = true;
          
          captchaInput.addEventListener('input', function() {
            if (this.value.length === captchaLength) {
              console.log('驗證碼已輸入完成，500ms 後自動登入...');
              setTimeout(() => {
                loginButton.click();
                console.log('已自動點擊登入按鈕');
              }, 500);
            }
          });
          
          return { success: true, message: '驗證碼監聽器已設置' };
        } else {
          return { success: false, message: '找不到驗證碼輸入框或登入按鈕' };
        }
      }, config.selectors.login.captcha, config.selectors.login.loginButton, config.selectors.login.captchaLength);
      
      this.log('驗證碼監聽器已啟動，請輸入驗證碼', 'success');
      
      // 開始監聽頁面導航（登入成功後會跳轉）
      await this.waitForLoginSuccess();
      
      return { success: true };
    } catch (error) {
      this.log(`啟動驗證碼監聽器失敗: ${error.message}`, 'error');
      return { success: false, message: error.message };
    }
  }

  /**
   * 等待登入成功
   */
  async waitForLoginSuccess() {
    this.log('等待登入成功...', 'info');
    
    try {
      // 等待頁面 URL 變更（登入成功後會導向主頁面）
      await this.page.waitForFunction(
        (mainPageKeywords) => {
          const url = window.location.href;
          return mainPageKeywords.some(keyword => url.includes(keyword));
        },
        { timeout: 120000 }, // 等待最多 2 分鐘
        config.detection.mainPage
      );
      
      this.log('登入成功！等待 MainFrame 載入...', 'success');
      this.isLoginSuccess = true;
      
      // 等待 MainFrame iframe 完全載入
      await this.page.waitForFunction(
        (mainFrameId) => {
          const mainFrame = document.getElementById(mainFrameId);
          if (!mainFrame) return false;
          
          try {
            // 檢查 iframe 是否可以訪問且內容已載入
            const frameDoc = mainFrame.contentDocument || mainFrame.contentWindow.document;
            if (!frameDoc) return false;
            
            // 檢查 iframe 內是否有內容（不是空白頁）
            const hasContent = frameDoc.body && frameDoc.body.innerHTML.length > 100;
            return hasContent;
          } catch (e) {
            // 如果無法訪問 iframe（跨域限制），返回 false 繼續等待
            return false;
          }
        },
        { timeout: 30000 }, // 等待最多 30 秒
        config.selectors.navigation.mainFrame
      );
      
      this.log('MainFrame 已載入完成！', 'success');
      
      // 額外等待確保頁面穩定
      await this.utils.sleep(3000);
      
      // 調試：截圖看看當前頁面狀態（可選）
      // await this.takeDebugScreenshot('after_login');
      
      // 獲取查詢天數設定（從建構時傳入）
      const queryDaysBack = this.queryDaysBack || 0;
      
      // 自動開始執行自動化流程
      await this.executeAutomationSteps(queryDaysBack);
      
      return { success: true };
    } catch (error) {
      this.log(`等待登入超時或失敗: ${error.message}`, 'error');
      return { success: false, message: error.message };
    }
  }

  /**
   * 執行完整的自動化流程
   */
  async executeAutomationSteps(queryDaysBack = 0) {
    this.log('開始執行自動化查詢流程...', 'system');
    
    try {
      // 步驟 1: 導航到帳務查詢
      await this.step1_navigateToAccountQuery();
      await this.utils.sleep(config.automation.steps[0].waitTime);
      
      // 步驟 2: 點擊存款帳戶
      await this.step2_waitAndClickDepositAccount();
      await this.utils.sleep(config.automation.steps[1].waitTime);
      
      // 步驟 3: 點擊交易明細查詢
      await this.step3_clickTransactionQuery();
      await this.utils.sleep(config.automation.steps[2].waitTime);
      
      // 步驟 4: 設定日期範圍
      await this.step4_setCurrentMonthDates(queryDaysBack);
      await this.utils.sleep(config.automation.steps[3].waitTime);
      
      // 步驟 5: 執行查詢（包含等待 loading）
      await this.step5_executeQuery();
      await this.utils.sleep(config.automation.steps[4].waitTime);
      
      // 步驟 6: 提取交易資料（包含下一頁處理）
      const result = await this.step6_extractTransactionData();
      
      this.log(`自動化流程完成！提取了 ${result.data?.length || 0} 筆交易紀錄`, 'success');
      
      // 步驟 7: 重新查詢（循環）
      await this.step7_waitAndRequery(queryDaysBack);
      
      return result;
    } catch (error) {
      this.log(`自動化流程執行失敗: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 步驟 7: 等待並重新查詢
   */
  async step7_waitAndRequery(queryDaysBack = 0) {
    const waitTime = config.automation.steps[6].waitTime || 5000;
    this.log(`等待 ${waitTime/1000} 秒後重新查詢...`, 'info');
    
    // 分段等待，每 1 秒檢查一次暫停狀態
    const checkInterval = 1000;
    const totalChecks = Math.ceil(waitTime / checkInterval);
    
    for (let i = 0; i < totalChecks; i++) {
      // 檢查是否被暫停
      if (this.isPaused) {
        this.log('自動化已暫停，等待恢復...', 'system');
        // 等待恢復
        while (this.isPaused) {
          await this.utils.sleep(checkInterval);
        }
        this.log('自動化已恢復，繼續執行...', 'system');
      }
      await this.utils.sleep(checkInterval);
    }
    
    // 再次檢查暫停狀態
    if (this.isPaused) {
      this.log('自動化已暫停，等待恢復...', 'system');
      while (this.isPaused) {
        await this.utils.sleep(checkInterval);
      }
      this.log('自動化已恢復，繼續執行...', 'system');
    }
    
    // 檢查是否跨日，並調整查詢天數
    const adjustedDaysBack = this.checkAndAdjustForNewDay(queryDaysBack);
    
    this.log('開始重新查詢...', 'system');
    
    // 點擊重新查詢按鈕回到設定頁面
    const result = await this.page.evaluate((mainFrameId, queryButtonId) => {
      try {
        const mainFrame = document.getElementById(mainFrameId);
        const frameDoc = mainFrame?.contentDocument;
        const iframe1 = frameDoc?.getElementById("iframe1");
        const queryDoc = iframe1?.contentDocument;
        
        if (!queryDoc) {
          return { success: false, message: '無法訪問查詢頁面' };
        }
        
        // 找到重新查詢按鈕（通常與查詢按鈕是同一個）
        const reqeuryButton = queryDoc.getElementById(queryButtonId);
        
        if (reqeuryButton) {
          reqeuryButton.click();
          return { success: true, message: '已點擊重新查詢按鈕' };
        }
        
        return { success: false, message: '找不到重新查詢按鈕' };
      } catch (error) {
        return { success: false, message: `重新查詢失敗: ${error.message}` };
      }
    }, config.selectors.navigation.mainFrame, config.selectors.query.queryButton);
    
    if (result.success) {
      this.log(result.message, 'success');
      
      // 等待頁面載入
      await this.utils.sleep(10000);
      
      // 重新開始查詢循環（從步驟 4 開始，使用調整後的查詢天數）
      this.log('重新開始查詢循環...', 'system');
      await this.step4_setCurrentMonthDates(adjustedDaysBack);
      await this.utils.sleep(config.automation.steps[3].waitTime);
      await this.step5_executeQuery();
      await this.utils.sleep(config.automation.steps[4].waitTime);
      await this.step6_extractTransactionData();
      
      // 遞迴：繼續下一輪重新查詢
      await this.step7_waitAndRequery(queryDaysBack);
    } else {
      this.log(result.message, 'error');
    }
  }

  /**
   * 檢查是否跨日，並調整查詢天數
   * 在新的一天的前 10 分鐘內（00:00 - 00:10），將查詢天數暫時調整為 1
   * 避免漏掉昨天深夜的交易紀錄
   */
  checkAndAdjustForNewDay(originalDaysBack) {
    const now = new Date();
    const today = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    this.log(`=== 跨日檢測 ===`, 'info');
    this.log(`當前日期: ${today}, 時間: ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`, 'info');
    this.log(`上次查詢日期: ${this.lastQueryDate || '(首次查詢)'}`, 'info');
    this.log(`當前查詢天數設定: ${originalDaysBack}`, 'info');
    
    // 判斷是否在新的一天的前 10 分鐘內（00:00 - 00:10）
    const isInFirstTenMinutes = currentHour === 0 && currentMinute < 10;
    
    let adjustedDaysBack = originalDaysBack;
    
    // 如果是新的一天且在前 10 分鐘內，暫時調整查詢天數為 1
    if (this.lastQueryDate && this.lastQueryDate !== today && isInFirstTenMinutes) {
      this.log(`⚠️ 檢測到跨日且在前 10 分鐘內，暫時調整查詢天數為 1（避免漏單）`, 'system');
      this.originalQueryDaysBack = originalDaysBack; // 記錄原始設定
      adjustedDaysBack = 1;
      this.log(`查詢天數已暫時調整：${originalDaysBack} → 1`, 'info');
    } else {
      if (isInFirstTenMinutes) {
        this.log(`ℹ️ 在前 10 分鐘內但是首次查詢（沒有跨日），使用原始設定 ${originalDaysBack}`, 'info');
      } else {
        this.log(`ℹ️ 不在前 10 分鐘內，使用原始設定 ${originalDaysBack}`, 'info');
      }
      this.originalQueryDaysBack = null; // 不需要恢復
    }
    
    // 更新上次查詢日期為今天
    this.lastQueryDate = today;
    
    return adjustedDaysBack;
  }

  /**
   * 步驟 1: 導航到帳務查詢
   */
  async step1_navigateToAccountQuery() {
    this.log('步驟 1: 前往帳務查詢總覽...', 'info');
    
    const result = await this.page.evaluate((accountQuery, accountQueryAlt, mainFrameId) => {
      try {
        const mainFrame = document.getElementById(mainFrameId);
        if (!mainFrame) {
          return { success: false, message: `找不到 ID 為 ${mainFrameId} 的 iframe 元素` };
        }
        
        // 嘗試多種方式訪問 iframe 內容
        let frameDoc = null;
        try {
          frameDoc = mainFrame.contentDocument || mainFrame.contentWindow.document;
        } catch (e) {
          return { success: false, message: `無法訪問 iframe 內容: ${e.message}` };
        }
        
        if (!frameDoc) {
          return { success: false, message: 'iframe contentDocument 為空' };
        }
        
        // 嘗試找到帳務查詢連結
        const spanElement = frameDoc.getElementById(accountQuery);
        let accountQueryLink = null;
        
        if (spanElement) {
          accountQueryLink = spanElement.closest("a") || spanElement.parentElement;
          if (accountQueryLink && accountQueryLink.tagName === "A") {
            accountQueryLink.click();
            return { success: true, message: `已點擊帳務查詢連結（通過 ID: ${accountQuery}）` };
          }
        }
        
        // 如果找不到，使用備用選擇器
        accountQueryLink = frameDoc.querySelector(accountQueryAlt);
        if (accountQueryLink) {
          accountQueryLink.click();
          return { success: true, message: '已點擊帳務查詢連結（使用備用選擇器）' };
        }
        
        // 提供更詳細的錯誤信息以便調試
        return { 
          success: false, 
          message: `找不到帳務查詢連結。iframe body 長度: ${frameDoc.body ? frameDoc.body.innerHTML.length : 0}` 
        };
      } catch (error) {
        return { success: false, message: `執行過程發生錯誤: ${error.message}` };
      }
    }, config.selectors.navigation.accountQuery, config.selectors.navigation.accountQueryAlt, config.selectors.navigation.mainFrame);
    
    if (result.success) {
      this.log(result.message, 'success');
    } else {
      this.log(result.message, 'error');
      
      // 嘗試調試：列出頁面上所有的 iframe
      const iframes = await this.page.evaluate(() => {
        const allIframes = document.querySelectorAll('iframe, frame');
        return Array.from(allIframes).map(f => ({
          id: f.id || '(無ID)',
          name: f.name || '(無name)',
          src: f.src || '(無src)'
        }));
      });
      
      this.log(`頁面上找到 ${iframes.length} 個 iframe/frame: ${JSON.stringify(iframes)}`, 'info');
      
      throw new Error(result.message);
    }
  }

  /**
   * 步驟 2: 等待並點擊存款帳戶
   */
  async step2_waitAndClickDepositAccount() {
    this.log('步驟 2: 前往存款帳戶...', 'info');
    
    const result = await this.page.evaluate((mainFrameId) => {
      try {
        const mainFrame = document.getElementById(mainFrameId);
        if (!mainFrame || !mainFrame.contentDocument) {
          return { success: false, message: '找不到 MainFrame' };
        }
        
        const frameDoc = mainFrame.contentDocument;
        const sideLeft = frameDoc.getElementById("sideLeft");
        
        if (!sideLeft) {
          return { success: false, message: '找不到 sideLeft 選單' };
        }
        
        // 找到「存款帳戶」的 <dt> 元素並點擊以展開子選單
        const depositDt = Array.from(sideLeft.querySelectorAll("dt")).find(
          dt => dt.textContent.includes("存款帳戶")
        );
        
        if (depositDt) {
          // 點擊展開存款帳戶選單
          const depositHeader = depositDt.querySelector("span > a");
          if (depositHeader) {
            depositHeader.click();
            return { success: true, message: '已展開存款帳戶選單' };
          }
        }
        
        return { success: false, message: '找不到存款帳戶選單項目' };
      } catch (error) {
        return { success: false, message: `執行過程發生錯誤: ${error.message}` };
      }
    }, config.selectors.navigation.mainFrame);
    
    if (result.success) {
      this.log(result.message, 'success');
    } else {
      this.log(result.message, 'error');
      throw new Error(result.message);
    }
  }

  /**
   * 步驟 3: 點擊交易明細查詢
   */
  async step3_clickTransactionQuery() {
    this.log('步驟 3: 前往交易明細查詢...', 'info');
    
    const result = await this.page.evaluate((mainFrameId) => {
      try {
        const mainFrame = document.getElementById(mainFrameId);
        if (!mainFrame || !mainFrame.contentDocument) {
          return { success: false, message: '找不到 MainFrame' };
        }
        
        const frameDoc = mainFrame.contentDocument;
        
        // 找到交易明細查詢的 span 元素
        const spanElement = frameDoc.getElementById("B2C::FAO01003");
        if (!spanElement) {
          return { success: false, message: '找不到交易明細查詢元素 (B2C::FAO01003)' };
        }
        
        // 找到父元素 <a> 標籤
        const transactionLink = spanElement.closest("a") || spanElement.parentElement;
        if (!transactionLink || transactionLink.tagName !== "A") {
          return { success: false, message: '找不到交易明細查詢連結' };
        }
        
        // 獲取 href 屬性
        const href = transactionLink.getAttribute('href');
        if (!href || !href.startsWith('javascript:changeTask')) {
          return { success: false, message: `連結格式不正確: ${href}` };
        }
        
        // 解析 taskUrl: javascript:changeTask('/BOT_CIB_B2C_WEB/B2CDispatcher?taskid=FAO01003&sysid=B2C&apid=FAO');
        const match = href.match(/changeTask\('([^']+)'\)/);
        if (!match || !match[1]) {
          return { success: false, message: `無法解析 taskUrl: ${href}` };
        }
        
        const taskUrl = match[1];
        
        // 找到內部的 iframe1 並直接設定其 location
        const iframe1 = frameDoc.getElementById("iframe1");
        if (!iframe1) {
          return { success: false, message: '找不到 iframe1' };
        }
        
        // 直接設定 iframe1 的 location（等同於 changeTask 函數的功能）
        iframe1.contentWindow.location.href = taskUrl;
        
        return { success: true, message: `已導航到交易明細查詢頁面: ${taskUrl}` };
      } catch (error) {
        return { success: false, message: `執行過程發生錯誤: ${error.message}` };
      }
    }, config.selectors.navigation.mainFrame);
    
    if (result.success) {
      this.log(result.message, 'success');
    } else {
      this.log(result.message, 'error');
      throw new Error(result.message);
    }
  }

  /**
   * 步驟 4: 設定查詢日期範圍
   */
  async step4_setCurrentMonthDates(queryDaysBack = 0) {
    this.log(`步驟 4: 設定查詢日期範圍（往前 ${queryDaysBack} 天）...`, 'info');
    
    const dates = this.utils.calculateDateRange(queryDaysBack);
    const isHoliday = this.utils.isHoliday();
    
    this.log(`查詢日期: ${dates.startDate} ~ ${dates.endDate}${isHoliday ? ' (假日模式)' : ''}`, 'info');
    
    const result = await this.page.evaluate((mainFrameId, startDateId, endDateId, queryTypeOnlyTodayId, startDate, endDate, isHoliday) => {
      try {
        const mainFrame = document.getElementById(mainFrameId);
        if (!mainFrame || !mainFrame.contentDocument) {
          return { success: false, message: '找不到 MainFrame' };
        }
        
        const frameDoc = mainFrame.contentDocument;
        
        // 台灣銀行的查詢表單在 iframe1 內
        const iframe1 = frameDoc.getElementById("iframe1");
        if (!iframe1 || !iframe1.contentDocument) {
          return { success: false, message: '找不到 iframe1' };
        }
        
        const queryDoc = iframe1.contentDocument;
        
        // 如果是假日，點擊「僅查詢當日」選項
        if (isHoliday && queryTypeOnlyTodayId) {
          const queryTypeOnlyToday = queryDoc.getElementById(queryTypeOnlyTodayId);
          if (queryTypeOnlyToday) {
            queryTypeOnlyToday.click();
            
            // 觸發 onclick 事件
            const onclick = queryTypeOnlyToday.getAttribute("onclick");
            if (onclick) {
              try {
                if (queryDoc.defaultView && queryDoc.defaultView.eval) {
                  queryDoc.defaultView.eval(onclick);
                }
              } catch (e) {
                console.warn("執行 onclick 失敗:", e);
              }
            }
            
            return { 
              success: true, 
              message: `假日模式：已選擇「僅查詢當日」`
            };
          }
        }
        
        // 正常模式：設定日期範圍
        const startDateInput = queryDoc.getElementById(startDateId);
        const endDateInput = queryDoc.getElementById(endDateId);
        
        if (startDateInput && endDateInput) {
          startDateInput.value = startDate;
          endDateInput.value = endDate;
          
          startDateInput.dispatchEvent(new Event('input', { bubbles: true }));
          startDateInput.dispatchEvent(new Event('change', { bubbles: true }));
          endDateInput.dispatchEvent(new Event('input', { bubbles: true }));
          endDateInput.dispatchEvent(new Event('change', { bubbles: true }));
          
          return { 
            success: true, 
            message: `日期範圍已設定: ${startDate} ~ ${endDate}`
          };
        }
        
        return { success: false, message: `找不到日期輸入框 (${startDateId}, ${endDateId})` };
      } catch (error) {
        return { success: false, message: `執行過程發生錯誤: ${error.message}` };
      }
    }, 
    config.selectors.navigation.mainFrame, 
    config.selectors.query.startDate, 
    config.selectors.query.endDate, 
    config.selectors.query.queryTypeOnlyToday,
    dates.startDate, 
    dates.endDate,
    isHoliday
    );
    
    if (result.success) {
      this.log(result.message, 'success');
    } else {
      this.log(result.message, 'error');
      throw new Error(result.message);
    }
  }

  /**
   * 步驟 5: 執行查詢
   */
  async step5_executeQuery() {
    this.log('步驟 5: 執行查詢...', 'info');
    
    const result = await this.page.evaluate((mainFrameId, queryButtonId) => {
      try {
        const mainFrame = document.getElementById(mainFrameId);
        if (!mainFrame || !mainFrame.contentDocument) {
          return { success: false, message: '找不到 MainFrame' };
        }
        
        const frameDoc = mainFrame.contentDocument;
        
        // 台灣銀行的查詢按鈕在 iframe1 內
        const iframe1 = frameDoc.getElementById("iframe1");
        if (!iframe1 || !iframe1.contentDocument) {
          return { success: false, message: '找不到 iframe1' };
        }
        
        const queryDoc = iframe1.contentDocument;
        const queryButton = queryDoc.getElementById(queryButtonId);
        
        if (queryButton) {
          queryButton.click();
          return { success: true, message: '已點擊查詢按鈕' };
        }
        
        return { success: false, message: `找不到查詢按鈕 (${queryButtonId})` };
      } catch (error) {
        return { success: false, message: `執行過程發生錯誤: ${error.message}` };
      }
    }, config.selectors.navigation.mainFrame, config.selectors.query.queryButton);
    
    if (result.success) {
      this.log(result.message, 'success');
      
      // 等待 loading 消失
      await this.waitForLoadingDisappear();
    } else {
      this.log(result.message, 'error');
      throw new Error(result.message);
    }
  }

  /**
   * 等待 loading overlay 消失
   */
  async waitForLoadingDisappear() {
    this.log('等待查詢結果載入...', 'info');
    
    try {
      await this.page.waitForFunction(
        () => {
          const loadingOverlay = document.getElementById("js_overLayer");
          if (!loadingOverlay) return true;
          
          const isHidden = 
            loadingOverlay.style.display === "none" ||
            getComputedStyle(loadingOverlay).display === "none";
          
          return isHidden;
        },
        { timeout: 60000, polling: 1000 } // 最多等待 60 秒，每秒檢查一次
      );
      
      this.log('查詢結果已載入完成', 'success');
    } catch (error) {
      this.log('等待 loading 超時，繼續執行...', 'info');
    }
  }

  /**
   * 步驟 6: 提取交易明細資料
   */
  async step6_extractTransactionData() {
    this.log('步驟 6: 提取交易明細資料...', 'info');
    
    const isHoliday = this.utils.isHoliday();
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const result = await this.page.evaluate((mainFrameId, dataGridId, dateSelector, accountSelector, amountSelector, balanceSelector, isHoliday, todayStr) => {
      try {
        const mainFrame = document.getElementById(mainFrameId);
        if (!mainFrame || !mainFrame.contentDocument) {
          return { success: false, message: '找不到 MainFrame', data: [] };
        }
        
        const frameDoc = mainFrame.contentDocument;
        
        // 台灣銀行的交易明細表格在 iframe1 內
        const iframe1 = frameDoc.getElementById("iframe1");
        if (!iframe1 || !iframe1.contentDocument) {
          return { success: false, message: '找不到 iframe1', data: [] };
        }
        
        const queryDoc = iframe1.contentDocument;
        const dataGrid = queryDoc.getElementById(dataGridId);
        
        if (!dataGrid) {
          return { success: false, message: `找不到交易明細表格 (${dataGridId})`, data: [] };
        }
        
        const rows = dataGrid.querySelectorAll("tr");
        const transactions = [];
        
        rows.forEach((row, index) => {
          const dateCell = row.querySelector(dateSelector);
          const accountCell = row.querySelector(accountSelector);
          const amountCell = row.querySelector(amountSelector);
          const balanceCell = row.querySelector(balanceSelector);
          
          if (dateCell && amountCell && balanceCell) {
            const amountText = amountCell.textContent.trim().replace(/,/g, '');
            const amount = parseFloat(amountText) || 0;
            
            if (amount > 0) {
              // 處理日期時間
              const dateText = dateCell.textContent.trim();
              const dateTimeMatch = dateText.match(/^(\d{4}\/\d{2}\/\d{2})\s+(\d{2}:\d{2}:\d{2})$/);
              
              let fullDateTime;
              if (dateTimeMatch) {
                fullDateTime = dateText;
              } else {
                const dateOnly = dateText.match(/^\d{4}\/\d{2}\/\d{2}/)?.[0] || dateText;
                let timeStr;
                
                if (dateOnly === todayStr.replace(/-/g, '/')) {
                  const now = new Date();
                  timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
                } else {
                  timeStr = "23:59:00";
                }
                
                fullDateTime = `${dateOnly} ${timeStr}`;
              }
              
              // 提取帳號資訊（格式：822 中國信託商業銀行<br>0000428540937901）
              let account = '';
              if (accountCell) {
                const accountHTML = accountCell.innerHTML;
                const bankCodeMatch = accountHTML.match(/^(\d{3})\s/);
                const bankCode = bankCodeMatch ? bankCodeMatch[1] : "";
                
                const accountMatch = accountHTML.match(/<br[^>]*>(\d+)/);
                const accountNumber = accountMatch ? accountMatch[1] : "";
                
                if (bankCode && accountNumber) {
                  const account16 = accountNumber.padStart(16, "0").substring(0, 16);
                  account = bankCode + account16;
                } else if (accountNumber) {
                  account = accountNumber.padStart(16, "0").substring(0, 16);
                } else {
                  const allNumbers = accountHTML.replace(/\D/g, "");
                  account = allNumbers;
                }
              }
              
              // 提取餘額
              const balanceText = balanceCell.textContent.trim().replace(/,/g, '');
              const balance = balanceText;
              
              transactions.push({
                date: fullDateTime,
                account: account,
                amount: amountText,
                balance: balance,
                rowIndex: index,
                isHoliday: isHoliday
              });
            }
          }
        });
        
        return { 
          success: true, 
          message: `成功提取 ${transactions.length} 筆交易紀錄`, 
          data: transactions 
        };
      } catch (error) {
        return { success: false, message: `執行過程發生錯誤: ${error.message}`, data: [] };
      }
    }, 
    config.selectors.navigation.mainFrame, 
    config.selectors.query.dataGrid,
    config.selectors.query.dateCell,
    config.selectors.query.accountCell,
    config.selectors.query.amountCell,
    config.selectors.query.balanceCell,
    isHoliday,
    todayStr
    );
    
    if (result.success && result.data.length > 0) {
      this.log(result.message, 'success');
      
      // 發送交易紀錄到 API
      await this.sendTransactionsToAPI(result.data);
      
      // 檢查是否有下一頁
      const hasNextPage = await this.checkAndClickNextPage();
      if (!hasNextPage) {
        // 沒有下一頁，完成提取
        this.log('已提取所有頁面的資料', 'success');
      }
    } else if (result.success && result.data.length === 0) {
      this.log('本頁沒有新的交易紀錄', 'info');
      
      // 仍需檢查是否有下一頁
      const hasNextPage = await this.checkAndClickNextPage();
      if (!hasNextPage) {
        this.log('已檢查所有頁面', 'success');
      }
    } else {
      this.log(result.message, 'error');
    }
    
    return result;
  }

  /**
   * 發送交易紀錄到後端 API
   */
  async sendTransactionsToAPI(transactions) {
    if (!transactions || transactions.length === 0) {
      this.log('沒有交易紀錄需要發送', 'info');
      return;
    }
    
    this.log(`準備發送 ${transactions.length} 筆交易紀錄到 API...`, 'info');
    
    const isHoliday = this.utils.isHoliday();
    
    // 進度回調函式
    const progressCallback = (current, total, success, error) => {
      this.log(`發送進度: ${current}/${total} (成功: ${success}, 失敗: ${error})`, 'info');
    };
    
    try {
      const result = await transactionAPI.sendTransactionsToAPI(
        transactions,
        this.bankId,
        isHoliday,
        config.code, // 'bot'
        progressCallback
      );
      
      this.log(
        `API 發送完成: 成功 ${result.successCount} 筆, 失敗 ${result.errorCount} 筆, 跳過 ${result.skippedCount} 筆`,
        result.errorCount > 0 ? 'error' : 'success'
      );
      
      return result;
    } catch (error) {
      this.log(`API 發送失敗: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 檢查並點擊下一頁
   */
  async checkAndClickNextPage() {
    const result = await this.page.evaluate((mainFrameId) => {
      try {
        const mainFrame = document.getElementById(mainFrameId);
        const frameDoc = mainFrame?.contentDocument;
        const iframe1 = frameDoc?.getElementById("iframe1");
        const queryDoc = iframe1?.contentDocument;
        
        if (!queryDoc) {
          return { hasNextPage: false, message: '無法訪問查詢頁面' };
        }
        
        // 台灣銀行的分頁按鈕（需要根據實際情況調整選擇器）
        // 通常是 <a> 標籤，包含「下一頁」或「次頁」文字
        const nextPageLinks = queryDoc.querySelectorAll("a");
        const nextPageButton = Array.from(nextPageLinks).find(link => 
          link.textContent.includes("下一頁") || 
          link.textContent.includes("次頁") ||
          link.textContent.includes("Next")
        );
        
        if (nextPageButton && !nextPageButton.classList.contains('disabled')) {
          nextPageButton.click();
          return { hasNextPage: true, message: '已點擊下一頁' };
        }
        
        return { hasNextPage: false, message: '沒有下一頁' };
      } catch (error) {
        return { hasNextPage: false, message: `檢查下一頁失敗: ${error.message}` };
      }
    }, config.selectors.navigation.mainFrame);
    
    if (result.hasNextPage) {
      this.log(result.message, 'info');
      
      // 等待下一頁載入
      await this.waitForLoadingDisappear();
      await this.utils.sleep(2000);
      
      // 遞迴提取下一頁資料
      await this.step6_extractTransactionData();
    }
    
    return result.hasNextPage;
  }
}

module.exports = {
  config,
  BOTAutomation,
};
