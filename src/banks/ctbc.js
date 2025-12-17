// 中國信託商業銀行 (CTBC) 銀行設定檔與自動化邏輯
// CTBC Bank Configuration and Automation Logic

const transactionAPI = require('../api/transactionAPI');
const { startOnlineStatusTimer, stopOnlineStatusTimer } = transactionAPI;

const config = {
  code: "ctbc",
  name: "中國信託",
  loginUrl: "https://ecash.ctbcbank.com/PCMS/login", // 需要確認實際登入 URL
  
  detection: {
    loginPage: ["ctbcbank.com", "login"],
    mainPage: ["PCMS", "aq102001"], // 主頁面關鍵字
  },
  
  // 預設登入資料（實際運作時會被 API 資料覆蓋）
  loginData: {
    companyId: "",
    userId: "",
    password: "",
    bankId: 822, // 中國信託銀行代碼
    bankName: "中國信託",
  },
  
  selectors: {
    // 登入頁面選擇器
    login: {
      companyId: "#cid",
      userId: "#userid",
      password: "#password",
      captcha: "#captcha",
      loginButton: "#__demoConfirm",
      captchaLength: 4,
    },
    
    // 主頁面選擇器
    navigation: {
      queryFormLink: 'a.sub[data-url="/PCMS/aq102001/index"]',
    },
    
    // 查詢頁面選擇器
    query: {
      accountSelect: "#acct_num_id",
      startDate: "#query_date_start_id",
      endDate: "#query_date_end_id",
      queryButton: "#searchButton",
      dataTable: "table.data",
      nextPageLink: 'a[onclick*="_makePostRequest"]',
      nextPageDisabled: 'span.step.gap:contains("下一頁")',
    },
  },
  
  automation: {
    steps: [
      { name: "navigateToQueryForm", waitTime: 5000 },
      { name: "selectAccount", waitTime: 3000 },
      { name: "setDateRange", waitTime: 3000 },
      { name: "executeQuery", waitTime: 5000 },
      { name: "extractTransactionData", waitTime: 2000 },
      { name: "waitAndRequery", waitTime: 5000 },
    ],
  },
};

/**
 * 中國信託自動化操作類別（使用 Puppeteer）
 * 包含所有特定於中國信託的 DOM 操作與自動化邏輯
 */
class CTBCAutomation {
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
    this.onlineIntervalId = null; // 線上狀態 API 定時器 ID
  }

  /**
   * 輔助方法：發送日誌
   */
  log(message, type = 'info') {
    if (this.logCallback) {
      this.logCallback({ message, type });
    }
    console.log(`[CTBC-${type.toUpperCase()}] ${message}`);
  }

  /**
   * 輔助方法：截圖（用於調試）
   */
  async takeDebugScreenshot(stepName) {
    try {
      const timestamp = new Date().getTime();
      const filename = `debug_ctbc_${stepName}_${timestamp}.png`;
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
      await this.page.click(config.selectors.login.companyId, { clickCount: 3 });
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
      // 等待頁面 URL 變更或主頁面元素出現
      await this.page.waitForFunction(
        (mainPageKeywords) => {
          const url = window.location.href;
          return mainPageKeywords.some(keyword => url.includes(keyword));
        },
        { timeout: 120000 }, // 等待最多 2 分鐘
        config.detection.mainPage
      );
      
      this.log('登入成功！', 'success');
      this.isLoginSuccess = true;
      
      // 額外等待確保頁面穩定
      await this.utils.sleep(3000);
      
      // 自動開始執行自動化流程
      await this.executeAutomationSteps(this.queryDaysBack);
      
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
    
    // 啟動線上狀態 API 定時器（每2分鐘呼叫一次）
    if (this.bankId) {
      this.onlineIntervalId = startOnlineStatusTimer(this.bankId);
      this.log('線上狀態 API 定時器已啟動（每2分鐘呼叫一次）', 'info');
    }
    
    try {
      // 步驟 1: 導航到查詢表單
      await this.step1_navigateToQueryForm();
      await this.utils.sleep(config.automation.steps[0].waitTime);
      
      // 步驟 2: 選擇帳號
      await this.step2_selectAccount();
      await this.utils.sleep(config.automation.steps[1].waitTime);
      
      // 步驟 3: 設定日期範圍
      await this.step3_setDateRange(queryDaysBack);
      await this.utils.sleep(config.automation.steps[2].waitTime);
      
      // 步驟 4: 執行查詢
      await this.step4_executeQuery();
      await this.utils.sleep(config.automation.steps[3].waitTime);
      
      // 步驟 5: 提取交易資料（包含下一頁處理）
      const result = await this.step5_extractTransactionData();
      
      this.log(`自動化流程完成！提取了 ${result.data?.length || 0} 筆交易紀錄`, 'success');
      
      // 步驟 6: 重新查詢（循環）
      await this.step6_waitAndRequery(queryDaysBack);
      
      return result;
    } catch (error) {
      this.log(`自動化流程執行失敗: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 步驟 1: 導航到查詢表單
   */
  async step1_navigateToQueryForm() {
    this.log('步驟 1: 前往存款明細查詢...', 'info');
    
    const result = await this.page.evaluate((queryFormLinkSelector) => {
      try {
        const queryFormLink = document.querySelector(queryFormLinkSelector);
        
        if (queryFormLink) {
          queryFormLink.click();
          return { success: true, message: '已點擊存款明細查詢連結' };
        }
        
        return { success: false, message: '找不到存款明細查詢連結' };
      } catch (error) {
        return { success: false, message: `執行過程發生錯誤: ${error.message}` };
      }
    }, config.selectors.navigation.queryFormLink);
    
    if (result.success) {
      this.log(result.message, 'success');
    } else {
      this.log(result.message, 'error');
      throw new Error(result.message);
    }
  }

  /**
   * 步驟 2: 選擇帳號
   */
  async step2_selectAccount() {
    this.log('步驟 2: 選擇帳號...', 'info');
    
    const result = await this.page.evaluate((accountSelectId) => {
      try {
        const accountSelect = document.getElementById(accountSelectId);
        
        if (!accountSelect) {
          return { success: false, message: `找不到帳號選擇下拉選單 (${accountSelectId})` };
        }
        
        // 選擇第一個非空選項（value 不為空字串）
        const options = accountSelect.querySelectorAll('option');
        for (let i = 0; i < options.length; i++) {
          const option = options[i];
          if (option.value && option.value !== '') {
            accountSelect.value = option.value;
            accountSelect.dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true, message: `已選擇帳號: ${option.textContent.trim()}` };
          }
        }
        
        return { success: false, message: '找不到可用的帳號選項' };
      } catch (error) {
        return { success: false, message: `執行過程發生錯誤: ${error.message}` };
      }
    }, config.selectors.query.accountSelect);
    
    if (result.success) {
      this.log(result.message, 'success');
    } else {
      this.log(result.message, 'error');
      throw new Error(result.message);
    }
  }

  /**
   * 步驟 3: 設定日期範圍
   */
  async step3_setDateRange(queryDaysBack = 0) {
    this.log(`步驟 3: 設定查詢日期範圍（往前 ${queryDaysBack} 天）...`, 'info');
    
    const dates = this.utils.calculateDateRange(queryDaysBack);
    
    this.log(`查詢日期: ${dates.startDate} ~ ${dates.endDate}`, 'info');
    
    const result = await this.page.evaluate((startDateId, endDateId, startDate, endDate) => {
      try {
        const startDateInput = document.getElementById(startDateId);
        const endDateInput = document.getElementById(endDateId);
        
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
    config.selectors.query.startDate, 
    config.selectors.query.endDate, 
    dates.startDate, 
    dates.endDate
    );
    
    if (result.success) {
      this.log(result.message, 'success');
    } else {
      this.log(result.message, 'error');
      throw new Error(result.message);
    }
  }

  /**
   * 步驟 4: 執行查詢
   */
  async step4_executeQuery() {
    this.log('步驟 4: 執行查詢...', 'info');
    
    const result = await this.page.evaluate((queryButtonId) => {
      try {
        const queryButton = document.getElementById(queryButtonId);
        
        if (queryButton) {
          queryButton.click();
          return { success: true, message: '已點擊查詢按鈕' };
        }
        
        return { success: false, message: `找不到查詢按鈕 (${queryButtonId})` };
      } catch (error) {
        return { success: false, message: `執行過程發生錯誤: ${error.message}` };
      }
    }, config.selectors.query.queryButton);
    
    if (result.success) {
      this.log(result.message, 'success');
      
      // 等待查詢結果載入
      await this.waitForQueryResult();
    } else {
      this.log(result.message, 'error');
      throw new Error(result.message);
    }
  }

  /**
   * 等待查詢結果載入
   */
  async waitForQueryResult() {
    this.log('等待查詢結果載入...', 'info');
    
    try {
      // 等待表格出現
      await this.page.waitForSelector(config.selectors.query.dataTable, { timeout: 60000 });
      this.log('查詢結果已載入完成', 'success');
    } catch (error) {
      this.log('等待查詢結果超時，繼續執行...', 'info');
    }
  }

  /**
   * 步驟 5: 提取交易明細資料
   */
  async step5_extractTransactionData() {
    this.log('步驟 5: 提取交易明細資料...', 'info');
    
    const result = await this.page.evaluate((tableSelector) => {
      try {
        const table = document.querySelector(tableSelector);
        
        if (!table) {
          return { success: false, message: `找不到交易明細表格 (${tableSelector})`, data: [] };
        }
        
        const rows = table.querySelectorAll('tbody tr');
        const transactions = [];
        
        // 獲取當前時間並減去5分鐘
        const now = new Date();
        now.setMinutes(now.getMinutes() - 5);
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
        
        rows.forEach((row, index) => {
          const cells = row.querySelectorAll('td');
          
          if (cells.length < 9) return; // 確保有足夠的欄位
          
          // 第1欄：日期
          const dateCell = cells[0];
          const dateText = dateCell.querySelector('div')?.textContent.trim() || '';
          
          // 第5欄：存入金額
          const depositCell = cells[4];
          const depositText = depositCell.querySelector('div')?.textContent.trim().replace(/,/g, '') || '0';
          const deposit = parseFloat(depositText) || 0;
          
          // 第6欄：餘額
          const balanceCell = cells[5];
          const balanceText = balanceCell.querySelector('div')?.textContent.trim().replace(/,/g, '') || '';
          
          // 第9欄：註記（帳號）
          const noteCell = cells[8];
          const noteText = noteCell.querySelector('div')?.textContent.trim() || '';
          
          // 只處理存入金額大於0的交易
          if (deposit > 0 && dateText) {
            // 處理日期格式：從 YYYY/MM/DD 轉換為 YYYY/MM/DD HH:mm:ss
            const fullDateTime = `${dateText} ${timeStr}`;
            
            // 處理帳號：從註記欄位提取
            // 格式如：000071318**4658* 或 000051468**6428*
            // 提取所有數字
            const allNumbers = noteText.replace(/\D/g, '');
            let account = '';
            
            if (allNumbers.length >= 19) {
              // 如果長度足夠，取前3位作為銀行代碼，後16位作為帳號
              const bankCode = allNumbers.substring(0, 3);
              const accountNumber = allNumbers.substring(allNumbers.length - 16);
              account = bankCode + accountNumber;
            } else if (allNumbers.length >= 16) {
              // 如果只有16位以上，取後16位作為帳號，使用預設銀行代碼 822（中國信託）
              const accountNumber = allNumbers.substring(allNumbers.length - 16);
              account = '822' + accountNumber;
            } else if (allNumbers.length > 0) {
              // 如果不足16位，補零到16位
              const accountNumber = allNumbers.padStart(16, '0');
              account = '822' + accountNumber;
            }
            
            transactions.push({
              date: fullDateTime,
              account: account,
              amount: depositText,
              balance: balanceText,
              rowIndex: index,
            });
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
    }, config.selectors.query.dataTable);
    
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
   * 檢查並點擊下一頁
   */
  async checkAndClickNextPage() {
    const result = await this.page.evaluate((nextPageSelector) => {
      try {
        // 檢查是否有下一頁按鈕（不是 span.step.gap）
        const nextPageLinks = document.querySelectorAll(nextPageSelector);
        const nextPageButton = Array.from(nextPageLinks).find(link => {
          const text = link.textContent.trim();
          return text.includes('下一頁') && link.tagName === 'A';
        });
        
        if (nextPageButton) {
          // 從 onclick 屬性中提取頁碼
          const onclick = nextPageButton.getAttribute('onclick');
          if (onclick && onclick.includes('_makePostRequest')) {
            nextPageButton.click();
            return { hasNextPage: true, message: '已點擊下一頁' };
          }
        }
        
        // 檢查是否為禁用狀態（span.step.gap）
        const disabledSpans = document.querySelectorAll('span.step.gap');
        const disabledNextPage = Array.from(disabledSpans).find(span => 
          span.textContent.includes('下一頁')
        );
        
        if (disabledNextPage) {
          return { hasNextPage: false, message: '沒有下一頁' };
        }
        
        return { hasNextPage: false, message: '找不到下一頁按鈕' };
      } catch (error) {
        return { hasNextPage: false, message: `檢查下一頁失敗: ${error.message}` };
      }
    }, config.selectors.query.nextPageLink);
    
    if (result.hasNextPage) {
      this.log(result.message, 'info');
      
      // 等待下一頁載入
      await this.waitForQueryResult();
      await this.utils.sleep(2000);
      
      // 遞迴提取下一頁資料
      await this.step5_extractTransactionData();
    }
    
    return result.hasNextPage;
  }

  /**
   * 步驟 6: 等待並重新查詢
   */
  async step6_waitAndRequery(queryDaysBack = 0) {
    const waitTime = config.automation.steps[5].waitTime || 5000;
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
    
    // 重新開始查詢循環（從導航到查詢表單開始）
    await this.step1_navigateToQueryForm();
    await this.utils.sleep(config.automation.steps[0].waitTime);
    await this.step2_selectAccount();
    await this.utils.sleep(config.automation.steps[1].waitTime);
    await this.step3_setDateRange(adjustedDaysBack);
    await this.utils.sleep(config.automation.steps[2].waitTime);
    await this.step4_executeQuery();
    await this.utils.sleep(config.automation.steps[3].waitTime);
    await this.step5_extractTransactionData();
    
    // 遞迴：繼續下一輪重新查詢
    await this.step6_waitAndRequery(queryDaysBack);
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
        config.code, // 'ctbc'
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
   * 停止線上狀態 API 定時器
   */
  stopOnlineStatusTimer() {
    if (this.onlineIntervalId) {
      stopOnlineStatusTimer(this.onlineIntervalId);
      this.onlineIntervalId = null;
      this.log('線上狀態 API 定時器已停止', 'info');
    }
  }
}

module.exports = {
  config,
  CTBCAutomation,
};
