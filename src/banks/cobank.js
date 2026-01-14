// 合作金庫銀行 (COBANK) 銀行設定檔與自動化邏輯
// Taiwan Cooperative Bank Configuration and Automation Logic

const transactionAPI = require('../api/transactionAPI');
const { startOnlineStatusTimer, stopOnlineStatusTimer } = transactionAPI;

const config = {
  code: "cobank",
  name: "合作金庫",
  loginUrl: "https://cobank.tcb-bank.com.tw/home/newIBHome.html",
  
  detection: {
    loginPage: ["cobank.tcb-bank.com.tw", "newIBHome"],
    corpLoginPage: ["TCB.TWNB.CORP.WEB"],
    mainPage: ["C3Menu", "c3menu", "menu"], // 合作金庫登入後的主頁面 URL 特徵
  },
  
  // 預設登入資料（實際運作時會被 API 資料覆蓋）
  loginData: {
    companyId: "",
    userId: "",
    password: "",
    bankId: 6,
    bankName: "合作金庫",
  },
  
  selectors: {
    // 入口頁面選擇器
    entry: {
      corpBankLink: 'a[onclick*="TCB.TWNB.CORP.WEB"]',
      corpBankTitle: '.icon_Title:contains("企業銀行")',
    },
    
    // 登入頁面選擇器
    login: {
      mainIframe: "#tcbIframe",
      companyIdLabel: "身分證號/統一編號", // 用於找到對應的 input
      userIdLabel: "使用者代號",
      passwordLabel: "使用者密碼",
      captchaLabel: "圖形驗證碼",
      
      // 直接選擇器（需要在實際測試時調整）
      companyId: 'input[maxlength="12"][type="text"]',
      userId: 'app-pas-code input[type="password"][maxlength="16"]',
      password: 'app-pas-code:last-of-type input[type="password"][maxlength="12"]',
      captcha: 'input[maxlength="4"][type="text"]',
      loginButton: 'button:contains("登入")',
      captchaLength: 4,
    },
    
    // 主頁面選擇器
    navigation: {
      accountQueryLabel: 'label[for="top_menu_1"]', // 帳戶查詢標籤
      depositQueryButton: '.accordion-toggle button', // 存款查詢按鈕（accordion 內）
      transactionQueryDiv: '.sub-item', // 交易明細查詢項目（需用 textContent 過濾）
    },
    
    // 查詢頁面選擇器
    query: {
      accountNameSelect: 'select[name="select1"]', // 戶名選擇
      accountNumberSelect: 'select[name="sel"]', // 帳號選擇（第一個）
      currencySelect: 'select[id="sel1"]', // 幣別選擇
      dateRadio: 'input[name="rad1"][type="radio"]', // From-To 日期選項（第一個 radio）
      startDateInput: '.date_txt:nth-of-type(1)', // 起始日期輸入框
      endDateInput: '.date_txt:nth-of-type(2)', // 結束日期輸入框
      queryButton: '.btn_submit', // 查詢按鈕（需用 textContent 過濾「查詢」）
      dataTable: 'table.tb_multi', // 交易明細表格
      nextPageButton: '.btn_tb', // 下一頁按鈕（需用 textContent 過濾「下一頁」）
      nextPageDisabled: '.btn_tb_disabled', // 下一頁按鈕禁用狀態
    },
  },
  
  automation: {
    steps: [
      { name: "clickCorpBankLink", waitTime: 3000 },
      { name: "waitForLoginPage", waitTime: 5000 },
      { name: "fillLoginForm", waitTime: 2500 },
      { name: "clickAccountQuery", waitTime: 3000 },
      { name: "clickDepositQuery", waitTime: 3000 },
      { name: "clickTransactionQuery", waitTime: 3000 },
      { name: "setDateRange", waitTime: 2500 },
      { name: "executeQuery", waitTime: 3000 },
      { name: "extractTransactionData", waitTime: 5000 },
      { name: "waitAndRequery", waitTime: 30000 }, // 30 秒
    ],
  },
};

/**
 * 合作金庫銀行自動化操作類別（使用 Puppeteer）
 * 包含所有特定於合作金庫的 DOM 操作與自動化邏輯
 */
class COBANKAutomation {
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
    this.corpWindowPage = null; // 企業銀行彈窗頁面
    this.onlineIntervalId = null; // 線上狀態 API 定時器 ID
  }

  /**
   * 輔助方法：發送日誌
   */
  log(message, type = 'info') {
    if (this.logCallback) {
      this.logCallback({ message, type });
    }
    console.log(`[COBANK-${type.toUpperCase()}] ${message}`);
  }

  /**
   * 輔助方法：截圖（用於調試）
   */
  async takeDebugScreenshot(stepName) {
    try {
      const timestamp = new Date().getTime();
      const filename = `debug_cobank_${stepName}_${timestamp}.png`;
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
   * 步驟 1: 點擊企業銀行連結（會開啟新彈窗）
   */
  async step1_clickCorpBankLink() {
    this.log('步驟 1: 點擊企業銀行連結...', 'info');
    
    try {
      // 等待頁面載入完成
      await this.page.waitForSelector(config.selectors.entry.corpBankLink, { timeout: 10000 });
      this.log('已找到企業銀行連結', 'success');
      
      // 監聽新開啟的彈窗
      const newPagePromise = new Promise(resolve => {
        this.page.browser().once('targetcreated', async target => {
          const newPage = await target.page();
          resolve(newPage);
        });
      });
      
      // 點擊連結（會開啟新彈窗）
      await this.page.evaluate((selector) => {
        const link = document.querySelector(selector);
        if (link) {
          link.click();
          return true;
        }
        return false;
      }, config.selectors.entry.corpBankLink);
      
      this.log('已點擊企業銀行連結，等待彈窗開啟...', 'info');
      
      // 等待新彈窗開啟
      this.corpWindowPage = await newPagePromise;
      this.log('企業銀行彈窗已開啟', 'success');
      
      return { success: true };
    } catch (error) {
      this.log(`點擊企業銀行連結失敗: ${error.message}`, 'error');
      return { success: false, message: error.message };
    }
  }

  /**
   * 步驟 2: 等待登入頁面載入
   */
  async step2_waitForLoginPage() {
    this.log('步驟 2: 等待登入頁面載入...', 'info');
    
    try {
      if (!this.corpWindowPage) {
        throw new Error('企業銀行彈窗未開啟');
      }
      
      // 等待 iframe 載入
      await this.corpWindowPage.waitForSelector(config.selectors.login.mainIframe, { timeout: 15000 });
      this.log('主 iframe 已載入', 'success');
      
      // 等待 iframe 內容載入完成
      await this.corpWindowPage.waitForFunction(
        (iframeSelector) => {
          const iframe = document.querySelector(iframeSelector);
          if (!iframe) return false;
          
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (!iframeDoc) return false;
          
          // 檢查登入表單是否已載入
          const hasContent = iframeDoc.body && iframeDoc.body.innerHTML.length > 1000;
          return hasContent;
        },
        { timeout: 60000, polling: 1000 }, // 增加到 60 秒，每秒檢查一次
        config.selectors.login.mainIframe
      );
      
      this.log('iframe 內容已載入', 'success');
      
      // 額外等待 15 秒，確保所有 JavaScript 執行完成，輸入框完全就緒
      this.log('等待 15 秒以確保頁面完全就緒...', 'info');
      await this.utils.sleep(15000);
      
      // 再次確認輸入框已經存在
      await this.corpWindowPage.waitForFunction(
        (iframeSelector) => {
          const iframe = document.querySelector(iframeSelector);
          if (!iframe) return false;
          
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (!iframeDoc) return false;
          
          // 檢查是否有足夠的輸入框
          const textInputs = iframeDoc.querySelectorAll('input[type="text"]');
          const passwordInputs = iframeDoc.querySelectorAll('input[type="password"]');
          
          return textInputs.length >= 2 && passwordInputs.length >= 2;
        },
        { timeout: 30000, polling: 1000 }, // 再等最多 30 秒
        config.selectors.login.mainIframe
      );
      
      this.log('登入頁面已完全載入（輸入框已就緒）', 'success');
      
      return { success: true };
    } catch (error) {
      this.log(`等待登入頁面超時: ${error.message}`, 'error');
      return { success: false, message: error.message };
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
      // 先點擊企業銀行連結開啟彈窗
      await this.step1_clickCorpBankLink();
      await this.utils.sleep(config.automation.steps[0].waitTime);
      
      // 等待登入頁面載入
      await this.step2_waitForLoginPage();
      await this.utils.sleep(config.automation.steps[1].waitTime);
      
      // 在彈窗頁面的 iframe 中填寫表單
      const result = await this.corpWindowPage.evaluate((companyId, userId, password, selectors) => {
        try {
          const iframe = document.querySelector(selectors.mainIframe);
          if (!iframe) {
            return { success: false, message: '找不到主 iframe' };
          }
          
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (!iframeDoc) {
            return { success: false, message: '無法訪問 iframe 內容' };
          }
          
          // 找到登入表單的輸入框（依序找到三個輸入框）
          const textInputs = iframeDoc.querySelectorAll('input[type="text"]');
          const passwordInputs = iframeDoc.querySelectorAll('input[type="password"]');
          
          if (textInputs.length < 2) {
            return { success: false, message: `找不到足夠的文字輸入框，只找到 ${textInputs.length} 個` };
          }
          
          if (passwordInputs.length < 2) {
            return { success: false, message: `找不到足夠的密碼輸入框，只找到 ${passwordInputs.length} 個` };
          }
          
          // 第一個文字輸入框：身分證號/統一編號（maxlength=12）
          const companyIdInput = Array.from(textInputs).find(input => input.maxLength === 12);
          if (companyIdInput) {
            companyIdInput.value = companyId;
            companyIdInput.dispatchEvent(new Event('input', { bubbles: true }));
            companyIdInput.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            return { success: false, message: '找不到統編輸入框（maxlength=12）' };
          }
          
          // 第一個密碼輸入框：使用者代號（maxlength=16）
          const userIdInput = Array.from(passwordInputs).find(input => input.maxLength === 16);
          if (userIdInput) {
            userIdInput.value = userId;
            userIdInput.dispatchEvent(new Event('input', { bubbles: true }));
            userIdInput.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            return { success: false, message: '找不到使用者代號輸入框（maxlength=16）' };
          }
          
          // 第二個密碼輸入框：使用者密碼（maxlength=12）
          const passwordInput = Array.from(passwordInputs).find(input => input.maxLength === 12);
          if (passwordInput) {
            passwordInput.value = password;
            passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
            passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            return { success: false, message: '找不到使用者密碼輸入框（maxlength=12）' };
          }
          
          // 選擇語言為繁體中文
          const languageSelect = iframeDoc.querySelector('select');
          if (languageSelect) {
            languageSelect.value = 'zh_TW';
            languageSelect.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('[COBANK] 已選擇語言：繁體中文');
          } else {
            console.log('[COBANK] 找不到語言選擇框，跳過');
          }
          
          return { 
            success: true, 
            message: `已填寫統編、使用者代號、密碼，並選擇繁體中文`,
            inputCount: {
              text: textInputs.length,
              password: passwordInputs.length
            }
          };
        } catch (error) {
          return { success: false, message: `執行過程發生錯誤: ${error.message}` };
        }
      }, companyId, userId, password, config.selectors.login);
      
      if (result.success) {
        this.log(result.message, 'success');
        this.log('登入資訊已填寫完成，請手動輸入驗證碼並點擊登入', 'info');
        return { success: true, message: '登入資訊已填寫完成' };
      } else {
        this.log(result.message, 'error');
        return { success: false, message: result.message };
      }
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
      if (!this.corpWindowPage) {
        throw new Error('企業銀行彈窗未開啟');
      }
      
      // 額外等待，確保驗證碼輸入框已完全載入
      this.log('等待驗證碼輸入框完全載入...', 'info');
      await this.utils.sleep(3000);
      
      // 在彈窗頁面的 iframe 上下文中注入監聽器
      const result = await this.corpWindowPage.evaluate((iframeSelector, captchaLength) => {
        const iframe = document.querySelector(iframeSelector);
        if (!iframe) {
          return { success: false, message: '找不到主 iframe' };
        }
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) {
          return { success: false, message: '無法訪問 iframe 內容' };
        }
        
        // 找到驗證碼輸入框（maxlength=4 的文字輸入框）
        const textInputs = iframeDoc.querySelectorAll('input[type="text"]');
        const captchaInput = Array.from(textInputs).find(input => input.maxLength === captchaLength);
        
        // 找到登入按鈕（多種可能性）
        let loginButton = null;
        
        // 1. 找 button 標籤
        const buttons = iframeDoc.querySelectorAll('button');
        loginButton = Array.from(buttons).find(btn => 
          btn.textContent.includes('登入') || 
          btn.textContent.includes('Login') ||
          btn.textContent.includes('確認')
        );
        
        // 2. 找 input[type="submit"]
        if (!loginButton) {
          loginButton = iframeDoc.querySelector('input[type="submit"]');
        }
        
        // 3. 找 input[type="button"]
        if (!loginButton) {
          const inputButtons = iframeDoc.querySelectorAll('input[type="button"]');
          loginButton = Array.from(inputButtons).find(btn => 
            btn.value.includes('登入') || 
            btn.value.includes('Login') ||
            btn.value.includes('確認')
          );
        }
        
        // 4. 找 a 標籤
        if (!loginButton) {
          const links = iframeDoc.querySelectorAll('a');
          loginButton = Array.from(links).find(link => 
            link.textContent.includes('登入') || 
            link.textContent.includes('Login') ||
            link.textContent.includes('確認')
          );
        }
        
        console.log('[COBANK Debug] 驗證碼輸入框:', captchaInput);
        console.log('[COBANK Debug] 登入按鈕:', loginButton);
        console.log('[COBANK Debug] 登入按鈕標籤:', loginButton ? loginButton.tagName : 'null');
        console.log('[COBANK Debug] 驗證碼長度:', captchaLength);
        console.log('[COBANK Debug] 所有 buttons:', buttons.length);
        console.log('[COBANK Debug] 所有 text inputs:', textInputs.length);
        
        if (captchaInput && loginButton) {
          // 設置一個標記，表示已經設置監聽器
          window.__captchaListenerActive = true;
          
          captchaInput.addEventListener('input', function() {
            console.log('[COBANK] 驗證碼輸入中，當前長度:', this.value.length);
            if (this.value.length === captchaLength) {
              console.log('[COBANK] 驗證碼已輸入完成，500ms 後自動登入...');
              setTimeout(() => {
                console.log('[COBANK] 準備點擊登入按鈕');
                loginButton.click();
                console.log('[COBANK] 已自動點擊登入按鈕');
              }, 500);
            }
          });
          
          return { 
            success: true, 
            message: `驗證碼監聽器已設置 (找到 ${textInputs.length} 個文字輸入框)`,
            captchaInputFound: !!captchaInput,
            loginButtonFound: !!loginButton
          };
        } else {
          return { 
            success: false, 
            message: `找不到驗證碼輸入框或登入按鈕。文字輸入框數量: ${textInputs.length}`,
            captchaInputFound: !!captchaInput,
            loginButtonFound: !!loginButton
          };
        }
      }, config.selectors.login.mainIframe, config.selectors.login.captchaLength);
      
      if (result.success) {
        this.log(result.message, 'success');
        this.log(`驗證碼輸入框已找到: ${result.captchaInputFound}, 登入按鈕已找到: ${result.loginButtonFound}`, 'info');
      } else {
        this.log(result.message, 'error');
        this.log(`驗證碼輸入框: ${result.captchaInputFound}, 登入按鈕: ${result.loginButtonFound}`, 'error');
        // 不拋出錯誤，讓使用者可以手動點擊登入
      }
      
      this.log('請手動輸入驗證碼（4 位數），系統將自動登入', 'system');
      
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
      if (!this.corpWindowPage) {
        throw new Error('企業銀行彈窗未開啟');
      }
      
      // 記錄當前 URL
      const currentUrl = this.corpWindowPage.url();
      this.log(`當前 URL: ${currentUrl}`, 'info');
      
      // 合作金庫登入前後 URL 相同，需要檢查 DOM 元素來判斷登入成功
      // 登入後的頁面也在 iframe 中，需要從 iframe 內部查找
      this.log('等待登入後頁面元素出現（iframe 內）...', 'info');
      
      await this.corpWindowPage.waitForFunction(
        (iframeSelector) => {
          const iframe = document.querySelector(iframeSelector);
          if (!iframe) {
            console.log('[COBANK] 找不到 iframe');
            return false;
          }
          
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (!iframeDoc) {
            console.log('[COBANK] 無法訪問 iframe 內容');
            return false;
          }
          
          // 在 iframe 內檢查是否有帳戶查詢標籤（登入後才有）
          const accountQueryLabel = iframeDoc.querySelector('label[for="top_menu_1"]');
          
          // 檢查是否有登出按鈕（登入後才有）
          const logoutButton = iframeDoc.querySelector('.btn-logout');
          
          // 檢查是否有登入時間（登入後才有）
          const loginTime = iframeDoc.querySelector('.login-time');
          
          // 檢查是否有 app-main-page（登入後才有）
          const mainPage = iframeDoc.querySelector('app-main-page');
          
          console.log('[COBANK] 檢查登入狀態（iframe 內）...');
          console.log('[COBANK] 帳戶查詢標籤:', !!accountQueryLabel);
          console.log('[COBANK] 登出按鈕:', !!logoutButton);
          console.log('[COBANK] 登入時間:', !!loginTime);
          console.log('[COBANK] 主頁面元素:', !!mainPage);
          
          // 至少要有其中兩個元素才確認登入成功
          const foundCount = [accountQueryLabel, logoutButton, loginTime, mainPage]
            .filter(el => !!el).length;
          
          console.log('[COBANK] 找到元素數量:', foundCount);
          
          return foundCount >= 2;
        },
        { timeout: 180000 }, // 等待最多 3 分鐘
        config.selectors.login.mainIframe
      );
      
      this.log('登入成功！已檢測到登入後頁面元素（iframe 內）', 'success');
      this.isLoginSuccess = true;
      
      // 額外等待確保頁面穩定
      await this.utils.sleep(5000);
      
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
      // 步驟 3: 點擊帳戶查詢
      await this.step3_clickAccountQuery();
      await this.utils.sleep(config.automation.steps[2].waitTime);
      
      // 步驟 4: 點擊存款查詢
      await this.step4_clickDepositQuery();
      await this.utils.sleep(config.automation.steps[3].waitTime);
      
      // 步驟 5: 點擊交易明細查詢
      await this.step5_clickTransactionQuery();
      await this.utils.sleep(config.automation.steps[4].waitTime);
      
      // 步驟 6: 設定日期範圍
      await this.step6_setDateRange(queryDaysBack);
      await this.utils.sleep(config.automation.steps[5].waitTime);
      
      // 步驟 7: 執行查詢
      await this.step7_executeQuery();
      await this.utils.sleep(config.automation.steps[6].waitTime);
      
      // 步驟 8: 提取交易資料
      await this.step8_extractTransactionData();
      
      this.log('自動化流程完成！', 'success');
      
      // 步驟 9: 重新查詢
      await this.step9_waitAndRequery(queryDaysBack);
      
    } catch (error) {
      this.log(`自動化流程執行失敗: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 步驟 3: 點擊帳戶查詢
   */
  async step3_clickAccountQuery() {
    this.log('步驟 3: 點擊帳戶查詢...', 'info');
    
    const result = await this.corpWindowPage.evaluate((iframeSelector, selector) => {
      try {
        const iframe = document.querySelector(iframeSelector);
        if (!iframe) {
          return { success: false, message: '找不到 iframe' };
        }
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) {
          return { success: false, message: '無法訪問 iframe 內容' };
        }
        
        const label = iframeDoc.querySelector(selector);
        if (label) {
          label.click();
          return { success: true, message: '已點擊帳戶查詢' };
        }
        return { success: false, message: '找不到帳戶查詢標籤' };
      } catch (error) {
        return { success: false, message: `執行過程發生錯誤: ${error.message}` };
      }
    }, config.selectors.login.mainIframe, config.selectors.navigation.accountQueryLabel);
    
    if (result.success) {
      this.log(result.message, 'success');
    } else {
      this.log(result.message, 'error');
      throw new Error(result.message);
    }
  }

  /**
   * 步驟 4: 點擊存款查詢
   */
  async step4_clickDepositQuery() {
    this.log('步驟 4: 點擊存款查詢...', 'info');
    
    const result = await this.corpWindowPage.evaluate((iframeSelector, selector) => {
      try {
        const iframe = document.querySelector(iframeSelector);
        if (!iframe) {
          return { success: false, message: '找不到 iframe' };
        }
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) {
          return { success: false, message: '無法訪問 iframe 內容' };
        }
        
        const buttons = iframeDoc.querySelectorAll(selector);
        const depositButton = Array.from(buttons).find(btn => 
          btn.textContent.includes('存款查詢')
        );
        
        if (depositButton) {
          depositButton.click();
          return { success: true, message: '已點擊存款查詢' };
        }
        return { success: false, message: '找不到存款查詢按鈕' };
      } catch (error) {
        return { success: false, message: `執行過程發生錯誤: ${error.message}` };
      }
    }, config.selectors.login.mainIframe, config.selectors.navigation.depositQueryButton);
    
    if (result.success) {
      this.log(result.message, 'success');
    } else {
      this.log(result.message, 'error');
      throw new Error(result.message);
    }
  }

  /**
   * 步驟 5: 點擊交易明細查詢
   */
  async step5_clickTransactionQuery() {
    this.log('步驟 5: 點擊交易明細查詢...', 'info');
    
    const result = await this.corpWindowPage.evaluate((iframeSelector, selector) => {
      try {
        const iframe = document.querySelector(iframeSelector);
        if (!iframe) {
          return { success: false, message: '找不到 iframe' };
        }
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) {
          return { success: false, message: '無法訪問 iframe 內容' };
        }
        
        const divs = iframeDoc.querySelectorAll(selector);
        const transactionDiv = Array.from(divs).find(div => 
          div.textContent.includes('交易明細查詢')
        );
        
        if (transactionDiv) {
          transactionDiv.click();
          return { success: true, message: '已點擊交易明細查詢' };
        }
        return { success: false, message: '找不到交易明細查詢項目' };
      } catch (error) {
        return { success: false, message: `執行過程發生錯誤: ${error.message}` };
      }
    }, config.selectors.login.mainIframe, config.selectors.navigation.transactionQueryDiv);
    
    if (result.success) {
      this.log(result.message, 'success');
    } else {
      this.log(result.message, 'error');
      throw new Error(result.message);
    }
  }

  /**
   * 步驟 6: 設定日期範圍
   */
  async step6_setDateRange(queryDaysBack = 0) {
    this.log(`步驟 6: 設定查詢日期範圍（往前 ${queryDaysBack} 天）...`, 'info');
    
    const dates = this.utils.calculateDateRange(queryDaysBack);
    
    const result = await this.corpWindowPage.evaluate((iframeSelector, selectors, startDate, endDate) => {
      try {
        const iframe = document.querySelector(iframeSelector);
        if (!iframe) {
          return { success: false, message: '找不到 iframe' };
        }
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) {
          return { success: false, message: '無法訪問 iframe 內容' };
        }
        
        // 1. 選擇第一個帳戶
        const accountNameSelect = iframeDoc.querySelector(selectors.accountNameSelect);
        if (accountNameSelect && accountNameSelect.options.length > 1) {
          accountNameSelect.selectedIndex = 1;
          accountNameSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // 2. 選擇第一個帳號
        const accountNumberSelect = iframeDoc.querySelector(selectors.accountNumberSelect);
        if (accountNumberSelect && accountNumberSelect.options.length > 1) {
          accountNumberSelect.selectedIndex = 1;
          accountNumberSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // 3. 選擇幣別 TWD
        const currencySelect = iframeDoc.querySelector(selectors.currencySelect);
        if (currencySelect) {
          const twdOption = Array.from(currencySelect.options).find(opt => 
            opt.value === 'TWD' || opt.textContent.includes('新臺幣')
          );
          if (twdOption) {
            currencySelect.value = twdOption.value;
            currencySelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        
        // 4. 點擊 From-To 日期選項
        const dateRadios = iframeDoc.querySelectorAll(selectors.dateRadio);
        if (dateRadios.length > 0) {
          dateRadios[0].click();
        }
        
        // 5. 設定起始日期
        const startDateInput = iframeDoc.querySelector(selectors.startDateInput);
        if (startDateInput) {
          startDateInput.value = startDate;
          startDateInput.dispatchEvent(new Event('input', { bubbles: true }));
          startDateInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // 6. 設定結束日期
        const endDateInput = iframeDoc.querySelector(selectors.endDateInput);
        if (endDateInput) {
          endDateInput.value = endDate;
          endDateInput.dispatchEvent(new Event('input', { bubbles: true }));
          endDateInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        return { 
          success: true, 
          message: `日期範圍已設定: ${startDate} ~ ${endDate}` 
        };
      } catch (error) {
        return { success: false, message: `執行過程發生錯誤: ${error.message}` };
      }
    }, config.selectors.login.mainIframe, config.selectors.query, dates.startDate, dates.endDate);
    
    if (result.success) {
      this.log(result.message, 'success');
    } else {
      this.log(result.message, 'error');
      throw new Error(result.message);
    }
  }

  /**
   * 步驟 7: 執行查詢
   */
  async step7_executeQuery() {
    this.log('步驟 7: 執行查詢...', 'info');
    
    const result = await this.corpWindowPage.evaluate((iframeSelector, selector) => {
      try {
        const iframe = document.querySelector(iframeSelector);
        if (!iframe) {
          return { success: false, message: '找不到 iframe' };
        }
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) {
          return { success: false, message: '無法訪問 iframe 內容' };
        }
        
        const queryButtons = iframeDoc.querySelectorAll(selector);
        const queryButton = Array.from(queryButtons).find(btn => 
          btn.textContent.includes('查詢') && !btn.textContent.includes('清除')
        );
        
        if (queryButton) {
          queryButton.click();
          return { success: true, message: '已點擊查詢按鈕' };
        }
        return { success: false, message: '找不到查詢按鈕' };
      } catch (error) {
        return { success: false, message: `執行過程發生錯誤: ${error.message}` };
      }
    }, config.selectors.login.mainIframe, config.selectors.query.queryButton);
    
    if (result.success) {
      this.log(result.message, 'success');
      await this.utils.sleep(5000);
    } else {
      this.log(result.message, 'error');
      throw new Error(result.message);
    }
  }

  /**
   * 步驟 8: 提取交易明細資料
   */
  async step8_extractTransactionData() {
    this.log('步驟 8: 提取交易明細資料...', 'info');
    
    const result = await this.corpWindowPage.evaluate((iframeSelector, tableSelector) => {
      try {
        const iframe = document.querySelector(iframeSelector);
        if (!iframe) {
          return { success: false, message: '找不到 iframe', data: [] };
        }
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) {
          return { success: false, message: '無法訪問 iframe 內容', data: [] };
        }
        
        const table = iframeDoc.querySelector(tableSelector);
        if (!table) {
          return { success: false, message: '找不到交易明細表格', data: [] };
        }
        
        const rows = table.querySelectorAll('tr');
        const transactions = [];
        
        // 銀行名稱到代號的映射
        const bankNameToCodes = {
          '華銀': '008', '華南': '008', '華南銀行': '008',
          '國世銀': '013', '國泰': '013', '國泰世華': '013',
          '台新': '812', '台新銀行': '812',
          '中信': '822', '中信銀行': '822', '中國信託': '822',
          '一銀': '007', '第一銀行': '007',
          '中華郵政': '700', '郵局': '700',
          '將來銀行': '823', '將來': '823',
          '京城': '054', '京城銀行': '054',
          '連線銀行': '824', '聯邦': '803', '聯邦銀行': '803',
          '玉山銀行': '808', '永豐銀行': '807', '永豐': '807',
          '遠東銀行': '805',
        };
        
        rows.forEach((row, index) => {
          if (index === 0) return; // 跳過表頭
          
          const cells = row.querySelectorAll('td');
          if (cells.length < 7) return;
          
          // 交易日期（第2欄，index=1）
          const dateCell = cells[1];
          const dateHTML = dateCell.innerHTML;
          const dateMatch = dateHTML.match(/(\d{4}\/\d{2}\/\d{2})<br[^>]*>(\d{2}:\d{2}:\d{2})/);
          let dateTime = '';
          if (dateMatch) {
            dateTime = `${dateMatch[1]} ${dateMatch[2]}`;
          } else {
            dateTime = dateCell.textContent.trim().replace(/\s+/g, ' ');
          }
          
          // 摘要/交易行庫（第3欄，index=2）
          const bankCell = cells[2];
          const bankHTML = bankCell.innerHTML;
          const bankMatch = bankHTML.match(/<br[^>]*>(.+)/);
          const bankName = bankMatch ? bankMatch[1].trim() : '';
          
          // 檢查是否為合庫（同行轉帳）
          const isCobank = bankName.includes('合庫') || bankHTML.includes('合庫');
          let bankCode = '';
          
          if (isCobank) {
            // 同行轉帳，使用合作金庫銀行代碼 006
            bankCode = '006';
          } else {
            // 跨行轉帳，使用銀行名稱映射
            bankCode = bankNameToCodes[bankName] || '';
          }
          
          // 提款金額（第4欄，index=3）- 轉出金額
          const withdrawalText = cells[3].textContent.trim().replace(/,/g, '');
          const withdrawal = parseFloat(withdrawalText) || 0;
          
          // 存款金額（第5欄，index=4）- 這是 pay（存入金額）
          const depositText = cells[4].textContent.trim().replace(/,/g, '');
          const deposit = parseFloat(depositText) || 0;
          
          // 餘額（第6欄，index=5）- 這是 balance
          const balanceText = cells[5].textContent.trim().replace(/,/g, '');
          
          // 備註/支票號碼（第7欄，index=6）
          const remarkCell = cells[6];
          const remarkHTML = remarkCell.innerHTML;
          // 提取完整備註文字
          const remark = remarkCell.textContent.trim();
          // 提取帳號
          const accountMatch = remarkHTML.match(/(\d{16}|\d{13})/);
          const accountNumber = accountMatch ? accountMatch[1] : '';
          
          // 組合完整帳號：銀行代號(3碼) + 帳號(16碼)
          // 如果是合庫同行轉帳，確保補上 006
          const fullAccount = isCobank ? '006' + '000' + accountNumber : (bankCode ? bankCode + accountNumber : accountNumber);
          
          // 處理存入交易（income）
          if (deposit > 0) {
            transactions.push({
              date: dateTime,
              account: fullAccount,
              amount: depositText,
              balance: balanceText,
              bankCode: bankCode,
              bankName: bankName,
              remark: remark || '',
              type: 'income',
              rowIndex: index
            });
          }
          
          // 處理轉出交易（expenditure）
          if (withdrawal > 0) {
            transactions.push({
              date: dateTime,
              account: fullAccount,
              amount: withdrawalText,
              balance: balanceText,
              bankCode: bankCode,
              bankName: bankName,
              remark: remark || '',
              type: 'expenditure',
              rowIndex: index
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
    }, config.selectors.login.mainIframe, config.selectors.query.dataTable);
    
    if (result.success && result.data.length > 0) {
      this.log(result.message, 'success');
      await this.sendTransactionsToAPI(result.data);
      
      const hasNextPage = await this.checkAndClickNextPage();
      if (!hasNextPage) {
        this.log('已提取所有頁面的資料', 'success');
      }
    } else if (result.success && result.data.length === 0) {
      this.log('本頁沒有新的交易紀錄', 'info');
      
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
    const result = await this.corpWindowPage.evaluate((iframeSelector, nextPageSelector, disabledSelector) => {
      try {
        const iframe = document.querySelector(iframeSelector);
        if (!iframe) {
          return { hasNextPage: false, message: '找不到 iframe' };
        }
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) {
          return { hasNextPage: false, message: '無法訪問 iframe 內容' };
        }
        
        const disabledButton = iframeDoc.querySelector(disabledSelector);
        if (disabledButton) {
          return { hasNextPage: false, message: '下一頁按鈕已禁用' };
        }
        
        const nextPageButtons = iframeDoc.querySelectorAll(nextPageSelector);
        const nextPageButton = Array.from(nextPageButtons).find(btn => 
          btn.textContent.includes('下一頁') && !btn.classList.contains('btn_tb_disabled')
        );
        
        if (nextPageButton) {
          nextPageButton.click();
          return { hasNextPage: true, message: '已點擊下一頁' };
        }
        
        return { hasNextPage: false, message: '沒有下一頁' };
      } catch (error) {
        return { hasNextPage: false, message: `檢查下一頁失敗: ${error.message}` };
      }
    }, config.selectors.login.mainIframe, config.selectors.query.nextPageButton, config.selectors.query.nextPageDisabled);
    
    if (result.hasNextPage) {
      this.log(result.message, 'info');
      await this.utils.sleep(5000);
      await this.step8_extractTransactionData();
    }
    
    return result.hasNextPage;
  }

  /**
   * 步驟 9: 等待並重新查詢
   */
  async step9_waitAndRequery(queryDaysBack = 0) {
    const waitTime = config.automation.steps[9].waitTime || 30000;
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
    
    const adjustedDaysBack = this.checkAndAdjustForNewDay(queryDaysBack);
    
    this.log('開始重新查詢...', 'system');
    
    await this.step6_setDateRange(adjustedDaysBack);
    await this.utils.sleep(config.automation.steps[5].waitTime);
    await this.step7_executeQuery();
    await this.utils.sleep(config.automation.steps[6].waitTime);
    await this.step8_extractTransactionData();
    
    await this.step9_waitAndRequery(queryDaysBack);
  }

  /**
   * 檢查是否跨日，並調整查詢天數
   */
  checkAndAdjustForNewDay(originalDaysBack) {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const isInFirstTenMinutes = currentHour === 0 && currentMinute < 10;
    let adjustedDaysBack = originalDaysBack;
    
    if (this.lastQueryDate && this.lastQueryDate !== today && isInFirstTenMinutes) {
      this.log(`⚠️ 檢測到跨日且在前 10 分鐘內，暫時調整查詢天數為 1`, 'system');
      adjustedDaysBack = 1;
    }
    
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
    
    const transactionAPI = require('../api/transactionAPI');
    const isHoliday = this.utils.isHoliday();
    
    const progressCallback = (current, total, success, error) => {
      this.log(`發送進度: ${current}/${total} (成功: ${success}, 失敗: ${error})`, 'info');
    };
    
    try {
      const result = await transactionAPI.sendTransactionsToAPI(
        transactions,
        this.bankId,
        isHoliday,
        config.code,
        progressCallback
      );
      
      this.log(
        `API 發送完成: 成功 ${result.successCount} 筆, 失敗 ${result.errorCount} 筆, 跳過 ${result.skippedCount} 筆`,
        result.errorCount > 0 ? 'error' : 'success'
      );
    } catch (error) {
      this.log(`API 發送失敗: ${error.message}`, 'error');
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
  COBANKAutomation,
};

