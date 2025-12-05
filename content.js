// Chrome Extension Content Script
// 這個腳本會注入到每個網頁中

console.log("=== CZ Assist Extension content script loaded ===");
console.log("Current URL:", window.location.href);
console.log("Document ready state:", document.readyState);

var API_URL = "https://api.wapi.asia/payer/calls/water";

var TRANSACTION_API_URL = "https://cz-backend.vercel.app";

const useConfig = false;
const currentBank = "firstbank";

// 台灣企銀目標帳號
const TBB_TARGET_ACCOUNT = "08112051407";

// 銀行名稱到配置 key 的映射
const bankNameMap = {
  玉山銀行: "esun",
  華南商銀: "hncb",
  華南銀行: "hncb",
  陽信銀行: "sunny",
  京城銀行: "ktb",
  第一銀行: "firstbank",
  國泰世華: "cathay",
  中國信託: "ctbc",
  高雄銀行: "bok",
  臺灣銀行: "bot",
  彰化銀行: "chb",
  兆豐銀行: "megabank",
  元大銀行: "yuanta",
  臺灣企銀: "tbb",
  淡水一信: "tfcc",
  聯邦銀行: "ubot",
  台新銀行: "taishin",
  土地銀行: "landbank",
  富邦銀行: "fubon",
  新光商銀: "skbank",
  台中銀行: "tcb",
};

// 銀行設定檔配置
const BANK_CONFIGS = {
  bot: {
    name: "臺灣銀行",
    loginUrl:
      "https://necomb.bot.com.tw/BOT_CIB_B2C_WEB/common/login/Login_1.faces",
    detection: {
      loginPage: ["necomb.bot.com.tw", "Login"],
      mainPage: ["necomb.bot.com.tw", "cibmain.faces", "main"],
    },
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
        captchaLength: 4, // 臺灣銀行驗證碼長度
      },
      // 主頁面選擇器
      navigation: {
        mainFrame: "MainFrame",
        accountQuery: "B2C::FAO",
        accountQueryAlt:
          'a[href*="cibmain.faces"][href*="lev1=1"][href*="apid=FAO"]',
      },
      // 查詢頁面選擇器
      query: {
        depositAccount: 'a:contains("存款帳戶")',
        transactionQuery: 'a:contains("交易明細查詢")',
        startDate: "form1:startDate",
        endDate: "form1:endDate",
        currency: "form1:currency",
        queryTypeOnlyToday: "form1:queryType3", // 僅查詢當日（假日時使用）
        queryButton: "form1:linkCommand",
        dataGrid: "form1:grid_DataGridBody",
        dateCell: "td.td_date",
        accountCell: 'td.td_account[data-title*="對方帳號"]',
        amountCell: 'td.td_money[data-title*="存入"]',
        balanceCell: 'td.td_money[data-title*="結餘金額"]', // 結餘金額欄位（第7欄）
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
  },
  yuanta: {
    name: "元大銀行",
    loginUrl: "https://b2bank.yuantabank.com.tw/B2C/",
    detection: {
      loginPage: ["b2bank.yuantabank.com.tw", "B2C"],
      mainPage: ["b2bank.yuantabank.com.tw", "B2C", "main"],
    },
    loginData: {
      companyId: "83121965",
      userId: "f820857",
      password: "tina0857",
      bankId: 102,
      bankName: "元大銀行",
    },
    selectors: {
      // 登入頁面選擇器
      login: {
        companyId: "#login\\:viewCompanyUid",
        userId: "#login\\:userUuid",
        password: "#login\\:password",
        captcha: "#login\\:pictCode",
        loginButton: "#login\\:btnLogin",
        useIframe: true, // 標示需要在 iframe 中查找登入元素
        iframeName: "frame1",
        captchaLength: 6, // 元大銀行驗證碼長度
      },
      // 主頁面選擇器
      navigation: {
        mainFrame: "frame1",
        accountQuery: 'a:contains("帳戶查詢")',
        accountQueryAlt: 'a[href="javascript:void(0);"][class="single"]',
      },
      // 查詢頁面選擇器
      query: {
        depositAccount: 'a:contains("存款查詢")',
        transactionQuery: 'a:contains("交易明細查詢")',
        queryWaysRadio: "cacdp003:queryWaysRange2", // 查詢依據：交易日 (value="2")
        dateRangeRadio: "cacdp003:rdoRange5", // 需要先點擊的日期範圍 代表其他區間
        startDate: "cacdp003:startDate",
        endDate: "cacdp003:endDate",
        accountCombo: "cacdp003:accountCombo",
        queryButton: "cacdp003:linkCommand",
        dataGrid: "cacdp003:datagrid_DataGridBody",
        nextPageButton: "a.next_btn", // 下一頁按鈕（可點擊時是 <a>，不可點擊時是 <span>）
        dateCell: "td:nth-child(2)", // 交易日欄位
        accountCell: "td:nth-child(9)", // 備註票據號碼欄位（包含帳號）
        amountCell: "td:nth-child(7)", // 存入金額欄位
        balanceCell: "td:nth-child(8)", // 帳面餘額欄位（第8欄）
        useContextFrame: true, // 標示查詢頁面需要使用 contextFrame
        contextFrameName: "contextFrame",
      },
    },
    automation: {
      steps: [
        { name: "navigateToAccountQuery", waitTime: 5000 },
        { name: "waitAndClickDepositAccount", waitTime: 5000 },
        { name: "clickTransactionQuery", waitTime: 5000 },
        { name: "selectSecondAccount", waitTime: 5000 },
        { name: "setCurrentMonthDates", waitTime: 5000 },
        { name: "executeQuery", waitTime: 5000 },
        { name: "extractTransactionData", waitTime: 2000 },
        { name: "waitAndRequery", waitTime: 20000 },
      ],
    },
  },
  hncb: {
    name: "華南商銀",
    loginUrl:
      "https://ibank.hncb.com.tw/netbank/servlet/TrxDispatcher?trx=com.lb.wibc.trx.Login&state=prompt&Recognition=company",
    detection: {
      loginPage: ["ibank.hncb.com.tw", "TrxDispatcher", "Login"],
      mainPage: ["ibank.hncb.com.tw", "netbank", "main"],
    },
    loginData: {
      companyId: "95492357",
      userId: "Ha9549",
      password: "Ha235788",
      bankId: 1001,
      bankName: "華南商銀",
    },
    selectors: {
      // 登入頁面選擇器
      login: {
        companyId: "#USERID",
        userId: "#NICKNAME",
        password: "#password",
        captcha: "#TrxCaptchaKey",
        loginButton: "#WannaLogin a", // 點擊 li 內的 a 元素
        captchaLength: 4,
      },
      // 主頁面選擇器
      navigation: {
        leftFrame: 'frame[name="left"]',
        mainFrame: 'frame[name="left"]',
        accountQuery: 'a[href*="inq_index_su.jsp"]',
        accountDetail: 'a[href*="TrxDispatcher"][href*="InqMain"]',
      },
      // 查詢頁面選擇器
      query: {
        accountSelect: "#acct1", // 帳號選擇下拉選單
        inqTypeRadio: 'input[name="inqtype"][value="3"]',
        startMonth: 'select[name="S_Month"]',
        startDate: 'select[name="S_Date"]', 
        endMonth: 'select[name="E_Month"]',
        endDate: 'select[name="E_Date"]',
        queryButton: 'a[href="javascript:doSubmit()"]',
        dataGrid: "#BaseInclude1 > form > table:nth-child(20)",
        // 3012 server 表格
        dateCell: "td:nth-child(1)", // 日期
        timeCell: "td:nth-child(3)", // 時間
        accountCell: "td:nth-child(8)", // 對方帳號
        // 1006 server 表格
        // dateCell: "td:nth-child(1)", // 交易日期（民國年格式：0114/11/28）
        // timeCell: "td:nth-child(2)", // 交易時間（10:39:59），注意：第3欄是帳務日不是時間
        // accountCell: "td:nth-child(9)", // 存款人代號（對方帳號）
        amountCell: "td:nth-child(6)", // 存入金額
        balanceCell: "td:nth-child(7)", // 餘額欄位（第7欄）
        useMainFrame: true,
        mainFrameName: 'frame[name="main"]',
      },
    },
    automation: {
      steps: [
        { name: "navigateToAccountQuery", waitTime: 8000 },
        { name: "waitAndClickAccountDetail", waitTime: 8000 },
        { name: "selectHncbAccount", waitTime: 3000 },
        { name: "setHncbDateRange", waitTime: 5000 },
        { name: "executeQuery", waitTime: 8000 }, // 華南銀行需要更長時間載入交易明細
        { name: "extractTransactionData", waitTime: 4000 },
        { name: "waitAndRequery", waitTime: 10000 },
      ],
    },
  },
  esun: {
    name: "玉山銀行",
    loginUrl: "https://gib.esunbank.com/",
    detection: {
      loginPage: ["gib.esunbank.com"],
      mainPage: ["gib.esunbank.com", "main"],
      // 特殊檢測方式：使用 iframe 內的 URL hash 來判斷
      useIframeDetection: true,
      iframeName: "mainFrame",
      loginPageHash: ["#/", "#/cot/ccmotlgin/ccmotlginhome"], // 支援多種登入頁面 hash
      mainPageHash: "#/main/",
    },
    loginData: {
      companyId: "00068118",
      userId: "admin01",
      password: "yuyu2024",
      bankId: 104,
      bankName: "玉山銀行",
    },
    selectors: {
      // 登入頁面選擇器
      login: {
        companyId: "loginIxdText",
        userId: "inputLoginIxd",
        password: "pinText",
        captcha: 'input[type="text"][placeholder="驗證碼"]', // 驗證碼輸入框
        loginButton: ".submit_btn",
        useIframe: true, // 標示需要在 iframe 中查找登入元素
        iframeName: "mainFrame",
        captchaLength: 4, // 假設驗證碼長度為4位，可根據實際情況調整
        conditionalCaptcha: true, // 標示驗證碼可能存在也可能不存在
      },
      // 主頁面選擇器
      navigation: {
        mainFrame: "mainFrame",
        accountQuery: 'span[name="CTWDATXQU"]',
      },
      // 查詢頁面選擇器
      query: {
        dateRangeRadio: 'input[type="radio"][name="dateRange"][value="0"]', // 起迄範圍 radio button
        startDate: 'calendar[name="startDate"] input.form-control', // 開始日期輸入框
        endDate: 'calendar[id="endDate"] input.form-control', // 結束日期輸入框
        orderTypeRadio: 'input[type="radio"][name="orderType"][value="1"]', // 由新到舊 radio button
        queryButton: "commandbutton button.submit_btn", // 查詢按鈕
        dataGrid: "table.tb_mul", // 數據表格
        dateCell: "td:nth-child(3)", // 實際交易日期欄位（第3欄）
        timeCell: "td:nth-child(4)", // 實際交易時間欄位（第4欄）
        accountCell: "td:nth-child(10)", // 轉出入銀行代號/帳號欄位（第10欄）
        amountCell: "td:nth-child(7)", // 存款金額欄位（第7欄）
        useIframe: true, // 標示查詢頁面也需要使用 iframe
        iframeName: "mainFrame",
      },
    },
    automation: {
      steps: [
        { name: "navigateToAccountQuery", waitTime: 5000 },
        { name: "setEsunDateRange", waitTime: 5000 },
        { name: "setEsunOrderType", waitTime: 1000 },
        { name: "executeQuery", waitTime: 5000 },
        { name: "extractTransactionData", waitTime: 2000 },
        { name: "waitAndRequery", waitTime: 20000 },
      ],
    },
  },
  sunny: {
    name: "陽信銀行",
    loginUrl: "https://b2bank.sunnybank.com.tw/eb/",
    detection: {
      loginPage: ["b2bank.sunnybank.com.tw"],
      mainPage: ["b2bank.sunnybank.com.tw"],
      // 特殊檢測方式：使用 localStorage 檢查登入狀態
      useLocalStorageDetection: true,
      localStorageKey: "isLogin",
      localStorageLoginValue: "true",
    },
    loginData: {
      companyId: "82940972",
      userId: "LOVE1314",
      password: "tina168168",
      bankId: 106,
      bankName: "陽信銀行",
    },
    selectors: {
      // 登入頁面選擇器（沒有 iframe）
      login: {
        companyId: "#companyUniform", // 需要根據實際頁面調整
        userId: "#companyAccount", // 需要根據實際頁面調整
        password: "#pscode", // 需要根據實際頁面調整
        captcha: "#captchaCode", // 需要根據實際頁面調整
        loginButton: ".login-form-action > button", // 需要根據實際頁面調整
        captchaLength: 6, // 陽信銀行驗證碼長度為6位
        useIframe: false, // 不使用 iframe
      },
      // 主頁面選擇器
      navigation: {
        accountInquiry: "#accountInquiry > button", // 帳務查詢按鈕
        depositBalanceDropdown:
          "#ntdDepositBalance02Dropdown > ul > li:first-child > button", // 查詢下拉選單第一個選項
      },
      // 查詢頁面選擇器
      query: {
        companyAccountSelect: "#companyAccount", // 公司帳戶選擇下拉選單
        startDate: "#startDate", // 開始日期輸入框
        endDate: "#endDate", // 結束日期輸入框
        queryButton: ".form-actions > button", // 查詢按鈕
        dataGrid: ".active table", // 數據表格
        dateCell: "td:nth-child(1)", // 日期時間欄位（第1欄）
        accountCell: "td:nth-child(6)", // 對方帳號欄位（第6欄）
        amountCell: "td:nth-child(3)", // 存款金額欄位（第3欄）
        balanceCell: "td:nth-child(4)", // 餘額欄位（第4欄）
        useIframe: false, // 不使用 iframe
      },
    },
    automation: {
      steps: [
        { name: "clickAccountInquiry", waitTime: 5000 },
        { name: "clickDepositBalanceDropdown", waitTime: 5000 },
        { name: "selectCompanyAccount", waitTime: 5000 },
        { name: "setSunnyDateRange", waitTime: 7000 },
        { name: "executeQuery", waitTime: 5000 },
        { name: "extractTransactionData", waitTime: 2000 },
        { name: "waitAndRequery", waitTime: 20000 },
      ],
    },
  },
  ktb: {
    name: "京城銀行",
    loginUrl: "https://netbank.ktb.com.tw/KTBPIB/WebApi/www/#/home",
    detection: {
      loginPage: ["netbank.ktb.com.tw", "#/home"],
      mainPage: ["netbank.ktb.com.tw", "#/asset-summary"],
    },
    loginData: {
      companyId: "82885611",
      userId: "yao2cheng",
      password: "tina1688",
      bankId: 105,
      bankName: "京城銀行",
    },
    selectors: {
      // 登入頁面選擇器（沒有 iframe）
      login: {
        companyId: ".loginFormDiv > div:nth-child(1) input", // 統編輸入框
        userId: ".loginFormDiv > div:nth-child(2) input", // 代號輸入框
        password: ".loginFormDiv > div:nth-child(3) input", // 密碼輸入框
        captcha: ".loginFormDiv > div:nth-child(4) input", // 驗證碼輸入框
        loginButton: "button.btn-primary", // 登入按鈕
        captchaLength: 4, // 京城銀行驗證碼長度為4位
        useIframe: false, // 不使用 iframe
      },
      // 主頁面選擇器
      navigation: {
        twdQuery:
          "#app-root > main > megamenu > nav > ul > li:nth-child(1) > ul > div > li:nth-child(2) > ul > li:nth-child(2) > a", // 台幣查詢連結
      },
      // 查詢頁面選擇器
      query: {
        currentDepositAccts: "#currentDepositAccts", // 帳戶選擇下拉選單
        startDate: "input.ng-tns-c9-2", // 開始日期輸入框
        endDate: "input.ng-tns-c9-3", // 結束日期輸入框
        queryButton: "#btnQuery", // 查詢按鈕
        dataGrid: "#printArea table", // 數據表格
        dateCell: "td:nth-child(1)", // 交易日欄位（第1欄）
        accountCell: "td:nth-child(4)", // 支出帳號欄位（第4欄）
        amountCell: "td:nth-child(5)", // 存入金額欄位（第5欄）
        useIframe: false, // 不使用 iframe
      },
    },
    automation: {
      steps: [
        { name: "clickTwdQuery", waitTime: 5000 },
        { name: "selectCurrentDepositAccts", waitTime: 5000 },
        { name: "setKtbDateRange", waitTime: 5000 },
        { name: "executeQuery", waitTime: 5000 },
        { name: "extractTransactionData", waitTime: 2000 },
        { name: "waitAndRequery", waitTime: 20000 },
      ],
    },
  },
  firstbank: {
    name: "第一銀行",
    loginUrl: "https://ibank.firstbank.com.tw/NetBank/index103.html",
    detection: {
      loginPage: ["ibank.firstbank.com.tw", "index103.html"],
      mainPage: ["ibank.firstbank.com.tw", "frame.html"],
    },
    loginData: {
      companyId: "82885611",
      userId: "love1314", 
      password: "tina168168",
      bankId: 107,
      bankName: "第一銀行",
    },
    selectors: {
      // 登入頁面選擇器（沒有 iframe）
      login: {
        companyId: "#loginCustId", // 統編輸入框
        userId: "#usrIdInput", // 代號輸入框
        password: "#pwd", // 密碼輸入框
        captcha: "#vrfyCode", // 驗證碼輸入框
        loginButton: "#captchaLoginArea", // 特殊的登入按鈕（圖片地圖）
        loginButtonAlt: "area[href*='clickArea']", // 備用選擇器（area 元素）
        captchaLength: 4, // 第一銀行驗證碼長度為4位
        useIframe: false, // 不使用 iframe
        specialLoginButton: true, // 標記使用特殊的登入按鈕
      },
      // 主頁面選擇器
      navigation: {
        queryLink: "#c_1", // 查詢連結
      },
      // 查詢頁面選擇器
      query: {
        formMenuSelect: ".form-menu", // 表單選單選擇器（在 iframe 中）
        startDate: "#txnStart", // 開始日期輸入框（在 iframe 中）
        endDate: "#txnEnd", // 結束日期輸入框（在 iframe 中）
        queryButton: "#searchBtn", // 查詢按鈕（在 iframe 中）
        dataGrid: "form[name=form1] > table > tbody > tr:nth-child(4) #Table_1", // 數據表格（在 iframe 中）
        dateCell: "td:nth-child(1)", // 日期時間欄位（第1欄）
        accountCell: "td:nth-child(7)", // 帳號欄位（第7欄）
        amountCell: "td:nth-child(4)", // 存入金額欄位（第4欄）
        balanceCell: "td:nth-child(5)", // 餘額欄位（第5欄）
        requeryButton: "input.MainButton", // 重新查詢按鈕
        useIframe: true, // 查詢頁面使用 iframe
        iframeName: "frame1", // iframe 名稱
      },
    },
    automation: {
      steps: [
        { name: "clickQueryLink", waitTime: 3000 },
        { name: "selectFormMenu", waitTime: 5000 },
        { name: "setFirstBankDateRange", waitTime: 5000 },
        { name: "executeQuery", waitTime: 5000 },
        { name: "extractTransactionData", waitTime: 2000 },
        { name: "waitAndRequery", waitTime: 20000 },
      ],
    },
  },
  cathay: {
    name: "國泰世華",
    loginUrl: "https://www.globalmyb2b.com/GEBANK/Login.aspx",
    detection: {
      loginPage: ["globalmyb2b.com", "Login.aspx"],
      mainPage: ["globalmyb2b.com", "Index.aspx"],
    },
    loginData: {
      companyId: "00068118",
      userId: "admin01", 
      password: "yuyu2024",
      bankId: 108,
      bankName: "國泰世華",
    },
    selectors: {
      // 登入頁面選擇器（沒有 iframe）
      login: {
        companyId: "#CustID", // 統編輸入框
        userId: "#UserNo", // 代號輸入框
        password: "#CertPwd", // 密碼輸入框
        captcha: "#AuthNum", // 驗證碼輸入框
        loginButton: "#btnLogin01", // 登入按鈕
        captchaLength: 4, // 國泰世華驗證碼長度為4位
        useIframe: false, // 不使用 iframe
      },
      // 主頁面選擇器
      navigation: {
        queryLink: "#QGA00003", // 查詢連結
      },
      // 查詢頁面選擇器
      query: {
        accountSelect: "#ddlAcno", // 帳號下拉選單
        startDate: "#BDate", // 開始日期輸入框
        endDate: "#EDate", // 結束日期輸入框
        queryButton: "#btnQuery", // 查詢按鈕
        dataGrid: "#divGridView .table", // 數據表格
        dateCell: "td:nth-child(12)", // 日期欄位（第12欄）
        timeCell: "td:nth-child(13)", // 時分秒欄位（第13欄）
        accountCell: "td:nth-child(7)", // 帳號欄位（第7欄）
        amountCell: "td:nth-child(4)", // 存入金額欄位（第4欄）
        balanceCell: "td:nth-child(5)", // 餘額欄位（第5欄）
        returnButton: "#btnRTN", // 返回按鈕（重新查詢用）
        useIframe: false, // 不使用 iframe
      },
    },
    automation: {
      steps: [
        { name: "clickQueryLink", waitTime: 3000 },
        { name: "selectCathayAccount", waitTime: 3000 },
        { name: "setCathayDateRange", waitTime: 5000 },
        { name: "executeQuery", waitTime: 5000 },
        { name: "extractTransactionData", waitTime: 2000 },
        { name: "waitAndRequery", waitTime: 20000 },
      ],
    },
  },
  ctbc: {
    name: "中國信託",
    loginUrl: "https://ecash.ctbcbank.com/PCMS/index",
    detection: {
      loginPage: ["ecash.ctbcbank.com", "PCMS/index"],
      mainPage: ["ecash.ctbcbank.com", "showDashBoard", "aq102001"],
      // 特殊檢測方式：使用自定義檢測邏輯
      useCustomDetection: true,
    },
    loginData: {
      companyId: "82940972",
      userId: "love1314", 
      password: "tina168168",
      bankId: 109,
      bankName: "中國信託",
    },
    selectors: {
      // 登入頁面選擇器（沒有 iframe）
      login: {
        companyId: "#cid", // 統編輸入框
        userId: "#userid", // 代號輸入框
        password: "#password", // 密碼輸入框
        captcha: "#captcha", // 驗證碼輸入框
        loginButton: "#__demoConfirm", // 登入按鈕
        captchaLength: 4, // 中國信託驗證碼長度為4位
        conditionalCaptcha: true, // 驗證碼可能存在也可能不存在
        captchaContainer: "#captchaDiv", // 驗證碼容器（用於檢查是否顯示）
        useIframe: false, // 不使用 iframe
      },
      // 主頁面選擇器
      navigation: {
        queryLink: "#tree-AQ > ul > li:nth-child(2) > a", // 查詢連結（第2個li）
      },
      // 查詢頁面選擇器
      query: {
        acctNumSelect: "#acct_num_id", // 帳戶選擇下拉選單
        startDate: "#query_date_start_id", // 開始日期輸入框
        endDate: "#query_date_end_id", // 結束日期輸入框
        queryButton: "#searchButton", // 查詢按鈕
        dateCell: "td:nth-child(1)", // 日期欄位（第1欄）
        amountCell: "td:nth-child(5)", // 存入金額欄位（第5欄）
        balanceCell: "td:nth-child(6)", // 餘額欄位（第6欄）
        accountCell: "td:nth-child(8)", // 轉出入帳號欄位（第8欄）
        useIframe: false, // 不使用 iframe
      },
    },
    automation: {
      steps: [
        { name: "clickQueryLink", waitTime: 3000 },
        { name: "selectAcctNum", waitTime: 5000 },
        { name: "setCtbcDateRange", waitTime: 5000 },
        { name: "executeQuery", waitTime: 5000 },
        { name: "extractTransactionData", waitTime: 2000 },
        { name: "waitAndRequery", waitTime: 20000 },
      ],
    },
  },
  bok: {
    name: "高雄銀行",
    loginUrl:
      "https://ibank.bok.com.tw/PIB/common/Login.xhtml?https://ibank.bok.com.tw/PIB/",
    detection: {
      loginPage: ["ibank.bok.com.tw"],
      mainPage: ["ibank.bok.com.tw"],
      // 特殊檢測方式：使用頁面元素來判斷登入狀態
      useElementDetection: true,
      loginPageElement: "#formlogin\\:companyUid", // 登入頁面才有的元素
      mainPageElement: ".main-content, .dashboard, .menu", // 登入後才有的元素（需要根據實際情況調整）
    },
    loginData: {
      companyId: "90041811",
      userId: "Do9168", 
      password: "AA0808",
      bankId: 110,
      bankName: "高雄銀行",
    },
    selectors: {
      // 登入頁面選擇器（沒有 iframe）
      login: {
        companyId: "#formlogin\\:companyUid", // 統編輸入框（需要轉義冒號）
        userId: "#formlogin\\:userUuidMask", // 代號輸入框
        password: "#formlogin\\:password", // 密碼輸入框
        captcha: "#formlogin\\:dynImgCode", // 驗證碼輸入框
        loginButton: "#loginLink", // 登入按鈕
        captchaLength: 4, // 高雄銀行驗證碼長度為4位
        useIframe: false, // 不使用 iframe
      },
      // 主頁面選擇器
      navigation: {
        queryLink:
          "a[onclick*=\"directTask('/PIB/cc/cc02102/CC02102_HOME.xhtml')\"]", // 查詢連結
      },
      // 查詢頁面選擇器
      query: {
        accountComboLabel: "#formbd\\:accountCombo_label", // 帳戶下拉選單標籤
        accountOption: "li[data-label='612102801100']", // 特定帳戶選項
        periodType: "#formbd\\:periodType4", // 期間類型選項
        startDate: "#formbd\\:inputStartDate_input", // 開始日期輸入框
        endDate: "#formbd\\:inputEndDate_input", // 結束日期輸入框
        queryButton: "#formbd .btnBox a", // 查詢按鈕
        useIframe: true, // 查詢頁面使用 iframe
        iframeName: "mainframe", // iframe 名稱
        // 交易表格選擇器
        dataGrid: ".ui-datatable-tablewrapper table", // 交易表格
        dateCell: "td:nth-child(1)", // 交易日期欄位（第1格）
        amountCell: "td:nth-child(4)", // 存入金額欄位（第4格）
        accountCell: "td:nth-child(6)", // 帳號欄位（第6格）
      },
    },
    automation: {
      steps: [
        { name: "clickQueryLink", waitTime: 3000 },
        { name: "selectBokAccount", waitTime: 5000 },
        { name: "selectBokPeriodType", waitTime: 5000 },
        { name: "setBokDateRange", waitTime: 2000 },
        { name: "executeQuery", waitTime: 5000 },
        { name: "extractTransactionData", waitTime: 2000 },
        { name: "waitAndRequery", waitTime: 20000 },
      ],
    },
  },
  chb: {
    name: "彰化銀行",
    loginUrl: "https://www.chb.com.tw/chbnib/faces/login/EBLogin",
    detection: {
      loginPage: ["chb.com.tw", "EBLogin"],
      mainPage: ["chb.com.tw", "ContextFrame.jsp"],
    },
    loginData: {
      companyId: "95492357",
      userId: "ZXC1357", 
      password: "CHI2357",
      bankId: 1002,
      bankName: "彰化銀行",
    },
    selectors: {
      // 登入頁面選擇器（沒有 iframe）
      login: {
        companyId: "#_SSO_UID_SHOW_EB_", // 統編輸入框
        userId: "#_SSO_UUID_EB_", // 帳號輸入框
        password: "#_SSO_PWD_EB_", // 密碼輸入框
        captcha: "#form1\\:txtValidateCodeEB", // 驗證碼輸入框（需要轉義冒號）
        loginButton: "#submitBtn_EBa", // 登入按鈕
        captchaLength: 6, // 彰化銀行驗證碼長度為6位
        conditionalCaptcha: true, // 驗證碼可能存在也可能不存在
        useIframe: false, // 不使用 iframe
      },
      // 主頁面選擇器
      navigation: {
        accountOverview:
          "a[href*='ParamValue=~5c22f99c5e0a076c3b92c6b32bc07568~']", // 帳務總覽
        transactionQuery:
          "a[href*='ParamValue=~74df574cbff4d01de7f2880e247006973b92c6b32bc07568~']", // 活期性存款明細查詢
      },
      // 查詢頁面選擇器
      query: {
        accountCombo: "#form1\\:accountCombo", // 帳號選擇下拉選單（需要轉義冒號）
        startDate: "#form1\\:startdate", // 起日輸入框（需要轉義冒號）
        pageSizeSelect: "cboCurrentPageSize2", // 每頁顯示筆數選擇框
        queryButton: "#form1\\:lnkQuery", // 確認按鈕（需要轉義冒號）
        dataGrid: "#form1\\:grid_DataGridBody", // 數據表格（需要轉義冒號）
        dateCell: "td:nth-child(1)", // 交易日欄位（第1欄）
        timeCell: "td:nth-child(2)", // 時間欄位（第2欄）
        amountCell: "td:nth-child(7)", // 存入金額欄位（第7欄）
        accountCell: "td:nth-child(12)", // 存匯代號欄位（第12欄，轉入帳號）
        balanceCell: "td:nth-child(11)", // 存款餘額欄位（第11欄）
        nextPageButton: "a[href='#'][onclick*='setDataGridCurrentPage']", // 下一頁按鈕（會匹配所有頁碼）
        useIframe: true, // 使用 iframe
        iframeName: "iframe1", // iframe ID（實際是 iframe1，不是 frame1）
      },
    },
    automation: {
      steps: [
        { name: "clickChbAccountOverview", waitTime: 3000 },
        { name: "clickChbTransactionQuery", waitTime: 5000 },
        { name: "selectChbAccount", waitTime: 3000 },
        { name: "setChbDateRange", waitTime: 3000 }, // 根據查詢天數決定是否設定
        { name: "executeQuery", waitTime: 5000 }, // 先執行第一次查詢
        { name: "selectChbPageSize", waitTime: 3000 }, // 查詢後選擇每頁200筆
        { name: "extractTransactionData", waitTime: 2000 },
        { name: "waitAndRequery", waitTime: 20000 },
      ],
    },
  },
  megabank: {
    name: "兆豐銀行",
    loginUrl: "https://www.global-ebanking.com/ebcontent.jsp",
    detection: {
      loginPage: ["global-ebanking.com/ebcontent.jsp"],
      mainPage: ["global-ebanking.com/ebcontent.jsp"],
    },
    loginData: {
      companyId: "60753577",
      userId: "VRFY000001",
      password: "wayne010",
      bankId: 1003,
      bankName: "兆豐銀行",
    },
    selectors: {
      // 登入頁面選擇器（在 iframe 中）
      login: {
        companyId: "#main\\:userId", // 統編輸入框（需要轉義冒號）
        userId: "#main\\:userCode", // 帳號輸入框（需要轉義冒號）
        password: "#main\\:password", // 密碼輸入框（需要轉義冒號）
        loginButton: "#main\\:login1", // 登入按鈕（需要轉義冒號）
        captcha: "#main\\:captchaText", // 驗證碼輸入框（需要轉義冒號）
        captchaLength: 5, // 驗證碼長度為4位
        useIframe: true, // 使用 iframe
        iframeName: "ifrm", // iframe ID
      },
      // 主頁面選擇器（在 iframe 中）
      navigation: {
        accountQuery: 'a[href="/TxPageHandler?appID=GAC"]', // 帳戶查詢
        depositQuery: "a[onclick*=\"menuGoto('GAC020')\"]", // 存款明細查詢
        mainIframe: "ifrm", // 主要操作的 iframe ID
      },
      // 查詢頁面選擇器（在 iframe 中）
      query: {
        startDate: "#main\\:startDate", // 起始日期輸入框（需要轉義冒號）
        queryButton: 'a[onclick*="main:j_id145"]', // 查詢按鈕（通過 onclick 屬性中的特徵查找）
        dataGrid: "#main\\:datatable tbody", // 數據表格（需要轉義冒號）
        dateCell: "td:nth-child(7)", // 交易日期欄位（第7欄）
        accountCell: "td:nth-child(6)", // 備註帳號欄位（第6欄）
        amountCell: "td:nth-child(4)", // 存入金額欄位（第4欄）
        nextPageButton: 'a[name="__pagerNext"]', // 下一頁按鈕
        useIframe: true, // 使用 iframe
        iframeName: "ifrm", // iframe ID
      },
    },
    automation: {
      steps: [
        { name: "clickMegabankAccountQuery", waitTime: 3000 },
        { name: "clickMegabankDepositQuery", waitTime: 3000 },
        { name: "setMegabankDateRange", waitTime: 2000 },
        { name: "executeQuery", waitTime: 5000 },
        { name: "extractTransactionData", waitTime: 2000 },
        { name: "waitAndRequery", waitTime: 20000 },
      ],
    },
  },
  tbb: {
    name: "臺灣企銀",
    loginUrl: "https://ebank.tbb.com.tw/nb3/login",
    detection: {
      loginPage: ["ebank.tbb.com.tw", "login"],
      mainPage: ["ebank.tbb.com.tw", "nb3", "INDEX", "index"], // 更新主頁面特徵
    },
    loginData: {
      companyId: "68567306",
      userId: "V30403040d",
      password: "T30403040R",
      bankId: 1005,
      bankName: "臺灣企銀",
    },
    selectors: {
      // 登入頁面選擇器
      login: {
        companyId: "#show_cusidn", // 統編輸入框
        userId: "#userName", // 帳號輸入框
        password: "#webpw", // 密碼輸入框
        captcha: "#capCode", // 驗證碼輸入框
        loginButton: "#login", // 登入按鈕
        captchaLength: 4, // 驗證碼長度為4位
        useIframe: false, // 不使用 iframe
      },
      // 主頁面選擇器
      navigation: {
        accountOverview: 'a[onclick*="/OVERVIEW/initview"]', // 帳戶總覽
        accountTable: "table tbody tr", // 帳戶表格行（需要進一步篩選）
        // 帳戶操作下拉選單選擇器將在邏輯中動態生成
      },
      // 查詢頁面選擇器
      query: {
        periodRadio: "#CMPERIOD", // 指定區間 Radio
        startDate: "#CMSDATE", // 起始日期
        endDate: "#CMEDATE", // 結束日期
        queryButton: "#CMSUBMITNOW", // 網頁顯示按鈕
        dateCell: "td:nth-child(1)", // 異動日欄位（第1欄）
        amountCell: "td:nth-child(4)", // 收入金額欄位（第4欄）
        balanceCell: "td:nth-child(5)", // 餘額欄位（第5欄）
        accountCell: "td:nth-child(7)", // 交易備註欄位（第7欄，含帳號）
        bankCodeCell: "td:nth-child(8)", // 收付行欄位（第8欄，銀行代碼）
        timeCell: "td:nth-child(9)", // 交易時間欄位（第9欄）
      },
    },
    automation: {
      steps: [
        { name: "clickTbbAccountOverview", waitTime: 3000 },
        { name: "selectTbbMaxBalanceAccount", waitTime: 3000 },
        { name: "setTbbDateRange", waitTime: 2000 },
        { name: "executeQuery", waitTime: 5000 },
        { name: "extractTransactionData", waitTime: 2000 },
        { name: "waitAndRequery", waitTime: 20000 },
      ],
    },
  },
  
  tfcc: {
    name: "淡水一信",
    loginUrl: "https://ebank.tfccbank.com.tw/eb119/",
    detection: {
      loginPage: ["ebank.tfccbank.com.tw", "eb119"],
      mainPage: ["ebank.tfccbank.com.tw", "welcome"], // 登入後主頁面
    },
    loginData: {
      companyId: "60418589",
      userId: "Aa650428",
      password: "Aa621202",
      bankId: 1006,
      bankName: "淡水一信",
    },
    selectors: {
      // 登入頁面選擇器
      login: {
        companyId: "#uidNo", // 統編輸入框
        userId: "#userId", // 帳號輸入框
        password: "#userPw", // 密碼輸入框
        captcha: null, // 無驗證碼
        loginButton: "#submit", // 登入按鈕
        captchaLength: 0, // 無驗證碼
        useIframe: false, // 不使用 iframe
      },
      // 主頁面選擇器（待補充）
      navigation: {
        // 需要實際登入後查看頁面結構來補充
      },
      // 查詢頁面選擇器（待補充）
      query: {
        // 需要實際操作後查看頁面結構來補充
      },
    },
    automation: {
      steps: [
        { name: "clickTfccAccountOverview", waitTime: 3000 },
        { name: "clickTfccAccountRow", waitTime: 3000 },
        { name: "setTfccDateRange", waitTime: 3000 },
        { name: "executeQuery", waitTime: 5000 }, // 實際上會自動執行
        { name: "extractTransactionData", waitTime: 2000 },
        { name: "waitAndRequery", waitTime: 20000 },
      ],
    },
  },
  ubot: {
    name: "聯邦銀行",
    loginUrl: "https://myebank.ubot.com.tw/ebankC/",
    detection: {
      loginPage: ["myebank.ubot.com.tw", "ebankC"],
      mainPage: ["myebank.ubot.com.tw", "ebankC"],
    },
    loginData: {
      companyId: "68567306",
      userId: "admin0",
      password: "V30403040D",
      bankId: 1007,
      bankName: "聯邦銀行",
    },
    selectors: {
      // 登入頁面選擇器
      login: {
        companyId: "#userid", // 統編輸入框
        userId: "#loginid", // 帳號輸入框
        password: "#loginPwd", // 密碼輸入框
        captcha: "#Captcha", // 驗證碼輸入框
        loginButton: "#loginBtn", // 登入按鈕
        captchaLength: 6, // 聯邦銀行驗證碼長度為6位
        useIframe: false, // 不使用 iframe
      },
      // 主頁面選擇器
      navigation: {
        accountQueryToggle: "#toggleMenu2", // 帳戶查詢 toggle
        accountQueryLabel: "label[for='toggleMenu2']", // 帳戶查詢 label
        transactionQueryLink: "a[name='SC02-01-020']", // 交易明細查詢連結
      },
      // 查詢頁面選擇器
      query: {
        customDateRadio: "#SC0201020_DateType_E", // 自選日期 radio
        customDateLabel: "label[for='SC0201020_DateType_E']", // 自選日期 label
        startDate: "#SC0201020_DateStart", // 起日輸入框
        endDate: "#SC0201020_DateEnd", // 迄日輸入框
        queryButton: "button[action='Search']", // 查詢按鈕
        dataGrid: "#SC0201020_MainTableA", // 交易表格
        tbody: "#SC0201020_tbodyA", // 表格 tbody
        dateCell: "td:nth-child(3)", // 交易日期欄位（第3欄）
        amountCell: "td:nth-child(9)", // 存入金額欄位（第9欄）
        accountCell: "td:nth-child(6)", // 摘要/帳號欄位（第6欄）
        bankCodeCell: "td:nth-child(7)", // 對方銀行代號欄位（第7欄）
        balanceCell: "td:nth-child(10)", // 帳戶餘額欄位（第10欄）
        pageSizeDropdown: "ul.dropdown-menu li > a", // 每頁筆數下拉選單
        nextPageButton: "li.page-next > a", // 下一頁按鈕
        useIframe: false, // 不使用 iframe
      },
    },
    automation: {
      steps: [
        { name: "clickUbotAccountQuery", waitTime: 3000 },
        { name: "clickUbotTransactionQuery", waitTime: 3000 },
        { name: "setUbotDateRange", waitTime: 5000 },
        { name: "clickUbotQueryButton", waitTime: 5000 },
        { name: "extractTransactionData", waitTime: 2000 },
        { name: "waitAndRequery", waitTime: 20000 },
      ],
    },
  },
  taishin: {
    name: "台新銀行",
    loginUrl: "https://gb2b.taishin.com/B2C/#/cot/ccmotlgin/ccmotlginhome",
    detection: {
      loginPage: ["gb2b.taishin.com", "B2C"],
      mainPage: ["gb2b.taishin.com", "B2C"],
      // 特殊檢測方式：使用 URL hash 來判斷
      useHashDetection: true,
      loginPageHash: [
        "#/cot/ccmotlgin/ccmotlginhome",
        "#/cot/ccmotlgin/ccmotlginchangelanguage",
      ],
      mainPageHash: "#/main/",
    },
    loginData: {
      companyId: "85113758",
      userId: "team001",
      password: "1a2b3c",
      bankId: 1008,
      bankName: "台新銀行",
    },
    selectors: {
      // 登入頁面選擇器
      login: {
        companyId: 'input[placeholder="請輸入企業用戶代號"]', // 統編輸入框
        userId: 'input-pxssword[column="uuid"] input', // 帳號輸入框（在 input-pxssword[column="uuid"] 內）
        password: 'input-pxssword[column="loginPin"] input', // 密碼輸入框（在 input-pxssword[column="loginPin"] 內）
        captcha: 'input[placeholder="請輸入圖形驗證碼"]', // 驗證碼輸入框
        loginButton: 'button[name="登入"]', // 登入按鈕
        loginButtonAlt: "button.submit_btn", // 備用登入按鈕選擇器
        captchaLength: 6, // 台新銀行驗證碼長度為6位
        useIframe: false, // 不使用 iframe
      },
      // 主頁面選擇器
      navigation: {
        depositServiceLink: 'a:contains("存匯授信服務")', // 存匯授信服務連結
        transactionQueryLink: 'a:contains("交易明細查詢")', // 交易明細查詢連結
      },
      // 查詢頁面選擇器
      query: {
        accountDropdown: ".ui-dropdown-items-wrapper ul.ui-dropdown-items", // 帳號下拉選單
        accountOption: 'li.ui-dropdown-item:contains("臺幣活期存款")', // 臺幣活期存款選項
        periodDropdown: ".ui-dropdown-items-wrapper ul.ui-dropdown-items", // 期間下拉選單
        periodOption: 'li.ui-dropdown-item:contains("自訂")', // 自訂期間選項
        startDate: "input.ui-datepicker.hasDatepicker", // 起日輸入框
        endDate: "input.ui-datepicker.hasDatepicker", // 迄日輸入框（需要找到第二個）
        orderTypeRadio: 'radiobutton[name="orderType"][value="2"]', // 由近至遠 radio button
        orderTypeInput: 'input[type="radio"][name="orderType"][value="2"]', // 由近至遠 radio input
        queryButton: "button.submit_btn", // 查詢按鈕
        dataGrid: "table.tb_mul", // 交易表格
        tbody: "tbody.ui-datatable-data", // 表格 tbody
        dateCell: "td:nth-child(3)", // 交易日期欄位（第3欄，在 calendarcell > span 中）
        timeCell: "td:nth-child(4)", // 交易時間欄位（第4欄）
        amountCell: "td:nth-child(9)", // 存入金額欄位（第9欄）
        balanceCell: "td:nth-child(10)", // 帳戶餘額欄位（第10欄）
        accountCell: "td:nth-child(11)", // 備註欄位（第11欄）
        pageSizeDropdown: "dropdown select.selectpicker", // 每頁筆數下拉選單
        pageSizeOption: 'option[value="50"]', // 50筆選項
        nextPageButton: "a.btn_i", // 下一頁按鈕
        useIframe: false, // 不使用 iframe
      },
    },
    automation: {
      steps: [
        { name: "clickTaishinDepositService", waitTime: 3000 },
        { name: "clickTaishinTransactionQuery", waitTime: 3000 },
        { name: "selectTaishinAccount", waitTime: 3000 },
        { name: "selectTaishinPeriod", waitTime: 3000 },
        { name: "setTaishinDateRange", waitTime: 3000 },
        { name: "setTaishinOrderType", waitTime: 2000 },
        { name: "executeQuery", waitTime: 5000 },
        { name: "extractTransactionData", waitTime: 2000 },
        { name: "waitAndRequery", waitTime: 20000 }, // 20000ms
      ],
    },
  },
  landbank: {
    name: "土地銀行",
    loginUrl: "https://lbotpt.landbank.com.tw/",
    detection: {
      loginPage: ["lbotpt.landbank.com.tw"],
      mainPage: ["lbotpt.landbank.com.tw", "main.htm"],
    },
    loginData: {
      companyId: "83262697",
      userId: "zheng5588",
      password: "5588zheng",
      bankId: 1009,
      bankName: "土地銀行",
    },
    selectors: {
      // 登入頁面選擇器
      login: {
        companyId: 'input[name="portalNo"]', // 統編輸入框（hidden input）
        userId: 'input[name="userID"]', // 帳號輸入框
        password: 'input[name="userPD"]', // 密碼輸入框
        captcha: 'input[name="captcha"]', // 驗證碼輸入框
        loginButton: "div#LoginP_rocess", // 登入按鈕
        loginButtonAlt: 'div.login-btn[data-url="/Login"]', // 備用登入按鈕選擇器
        captchaLength: 5, // 土地銀行驗證碼長度為5位
        useIframe: false, // 不使用 iframe
      },
      // 主頁面選擇器
      navigation: {
        mainFrame: 'frame[name="main"]', // 主 iframe
        queryServiceLink: "li#MENU1 > a", // 查詢服務連結
        accountOverviewLink: "li#taskId_MENU1 > a", // 帳務總覽查詢連結
        depositTransactionButton: 'input[value="存款交易明細查詢"]', // 存款交易明細查詢按鈕
        homeButton: "input#Button1", // 回功能首頁按鈕
        homeButtonAlt: 'input[value="回功能首頁"]', // 備用回功能首頁按鈕選擇器
      },
      // 查詢頁面選擇器
      query: {
        customRadio: "input#ContentPlaceHolder1_rbtnCustomized", // 自訂 radio
        startDate: "input#ContentPlaceHolder1_txtStartDate", // 起日輸入框
        endDate: "input#ContentPlaceHolder1_txtEndDate", // 迄日輸入框
        queryButton: "input#ContentPlaceHolder1_btn_1", // 查詢按鈕
        dataGrid: "table#grvAccount1", // 交易表格
        tbody: "table#grvAccount1 tbody", // 表格 tbody
        dateCell: "td:nth-child(1)", // 交易日期+時間欄位（第1欄）
        amountCell: "td:nth-child(6)", // 存入金額欄位（第6欄）
        balanceCell: "td:nth-child(7)", // 餘額欄位（第7欄）
        accountCell: "td:nth-child(8)", // 備註欄位（第8欄）
        useIframe: true, // 使用 iframe
        mainFrameName: 'frame[name="main"]', // 主 iframe name
      },
    },
    automation: {
      steps: [
        { name: "clickLandbankQueryService", waitTime: 3000 },
        { name: "clickLandbankAccountOverview", waitTime: 3000 },
        { name: "clickLandbankDepositTransaction", waitTime: 3000 },
        { name: "setLandbankDateRange", waitTime: 3000 },
        { name: "executeLandbankQuery", waitTime: 5000 },
        { name: "extractTransactionData", waitTime: 2000 },
        { name: "waitAndRequery", waitTime: 20000 },
      ],
    },
  },
  fubon: {
    name: "富邦銀行",
    loginUrl: "https://ebank.taipeifubon.com.tw/B2C/common/Index.faces",
    detection: {
      loginPage: ["ebank.taipeifubon.com.tw", "Index.faces"],
      mainPage: ["ebank.taipeifubon.com.tw", "Index.faces"],
    },
    loginData: {
      companyId: "90628762",
      userId: "mandy0805",
      password: "mandy292511",
      bankId: 1010,
      bankName: "富邦銀行",
    },
    selectors: {
      // 登入頁面選擇器
      login: {
        // 需要先點擊的登入按鈕（讓表單顯示）
        initialLoginButton: "a#header_form\\:header_login",
        initialLoginButtonAlt: 'a.login_btn[onclick*="doLogin"]',
        // 統編輸入框（身分證字號）- 根據表格結構定位：第一個 tr 中的 password input
        companyId: 'table.login_tb tbody tr:first-child input[type="password"]',
        companyIdAlt: 'table.login_tb input[type="password"]:first-of-type',
        // 帳號輸入框（使用者代碼）- 第二個 tr 中的 password input
        userId: 'table.login_tb tbody tr:nth-child(2) input[type="password"]',
        userIdAlt: 'table.login_tb input[type="password"]:nth-of-type(2)',
        // 密碼輸入框（使用者密碼）- 使用固定 class="m1_password"
        password: "table.login_tb input.m1_password",
        passwordAlt: 'table.login_tb input[type="password"].m1_password',
        // 驗證碼輸入框（ID是固定的）
        captcha: "input#m1_userCaptcha",
        captchaAlt: 'input[name="m1_userCaptcha"]',
        // 登入按鈕
        loginButton: "a#btnLogin2",
        loginButtonAlt: 'a.confirm[onclick*="doLogin"]',
        captchaLength: 6, // 富邦銀行驗證碼長度為6位
        useIframe: true, // 登入表單在 txnFrame 中（txnFrame 在 frame1 內部）
        iframeName: "txnFrame", // 登入表單所在的 iframe
        parentIframe: "frame1", // txnFrame 的父 frame
        initialLoginButtonIframe: "frame1", // 初始登入按鈕所在的 frame
        // 標記需要先點擊登入按鈕
        needClickLoginFirst: true,
      },
      // 主頁面選擇器
      navigation: {
        mainFrame: 'frame#frame1, frame[name="frame1"]', // 主 iframe
        transactionQueryLink: "#CDS04_Btn_Icon a", // 存款交易查詢連結
        transactionQueryLinkAlt:
          'a.task_CDSQU001.menu_CDS04, a[href*="dispatcher"][class*="menu_CDS04"]', // 備用選擇器
      },
      // 查詢頁面選擇器
      query: {
        startDate: "input#form1\\:startDate", // 起日輸入框
        startDateAlt: 'input[name="form1:startDate"]', // 備用選擇器
        queryButton: "a#form1\\:doValidateAndSubmit", // 查詢按鈕
        queryButtonAlt: 'a.btn1[onclick*="doValidateAndSubmit"]', // 備用選擇器
        dataGrid: "#form1\\:resultGrid_DataGridBody", // 交易記錄表格
        dataGridAlt: "table.tb1#form1\\:resultGrid_DataGridBody", // 備用選擇器
        nextPageButton: 'a[onclick*="setDataGridCurrentPage"][href="#"]', // 下一頁按鈕
        useIframe: true, // 使用 iframe
        mainFrameName: 'frame#frame1, frame[name="frame1"]', // 主 iframe
      },
    },
    automation: {
      steps: [
        { name: "clickFubonTransactionQuery", waitTime: 3000 },
        { name: "setFubonDateRange", waitTime: 3000 },
        { name: "executeFubonQuery", waitTime: 5000 },
        { name: "extractTransactionData", waitTime: 2000 },
        { name: "waitAndRequery", waitTime: 20000 },
      ],
    },
  },
  skbank: {
    name: "新光商銀",
    loginUrl: "https://nbank.skbank.com.tw/",
    detection: {
      loginPage: ["nbank.skbank.com.tw"],
      mainPage: ["nbank.skbank.com.tw", "DashBoard"], // 登入後主頁面
    },
    loginData: {
      companyId: "50976005",
      userId: "509760051",
      password: "V30403040D",
      bankId: 1011,
      bankName: "新光商銀",
    },
    selectors: {
      // 登入頁面選擇器
      login: {
        companyId: "#nb_GeneralId", // 統編輸入框
        userId: 'input[type="password"][placeholder*="用戶代號"]', // 帳號輸入框
        password: 'input[type="password"][placeholder*="理財密碼"]', // 密碼輸入框
        captcha: 'input[type="text"][placeholder*="輸入右圖文字"]', // 驗證碼輸入框
        loginButton: "a.btn__login", // 登入按鈕
        captchaLength: 4, // 驗證碼長度為4位
        useIframe: false, // 不使用 iframe
      },
      // 主頁面選擇器
      navigation: {
        transactionQueryLink: 'a.menuDesktopSub__name[href*="QueryAcctDetail"]', // 臺/外幣交易明細查詢
        transactionQueryLinkAlt: 'a[href*="QueryAcctDetail"]', // 備用選擇器
      },
      // 查詢頁面選擇器
      query: {
        accountSelect: "#accountSelectForSearch", // 帳號選擇下拉選單
        startDate: 'input.js-pop-date[name="startDate"]', // 起日輸入框
        startDateAlt: 'input[name="startDate"]', // 備用選擇器
        queryButton: "a.btn.btn-primary.js-showInfo", // 查詢按鈕
        queryButtonAlt: 'a.js-showInfo[role="button"]', // 備用選擇器
        dataTable: "table.sectionTable.forPrint", // 交易記錄表格
        pageSize100: 'div.showPages a:has(span:contains("100"))', // 每頁100筆按鈕
        pageSize100Alt: "div.showPages a:not(.on) span", // 備用選擇器（找到包含100的）
        pagination: "ul.pagination", // 分頁按鈕容器
        pageNumberLinks:
          "ul.pagination li:not(.hidden) a:not(.prev):not(.next):not(.prevFirst):not(.nextLast)", // 頁碼按鈕
        dateCell: 'td[data-th="交易日"]', // 交易日欄位（第2欄）
        amountCell: 'td[data-th="存入"]', // 存入金額欄位（第6欄）
        balanceCell: 'td[data-th="帳戶餘額"]', // 帳戶餘額欄位（第7欄）
        accountCell: 'td[data-th*="對方帳號"]', // 對方帳號欄位（第9欄）
      },
    },
    automation: {
      steps: [
        { name: "clickSkbankTransactionQuery", waitTime: 3000 },
        { name: "selectSkbankAccount", waitTime: 2000 },
        { name: "setSkbankDateRange", waitTime: 2000 },
        { name: "executeSkbankQuery", waitTime: 5000 },
        { name: "extractTransactionData", waitTime: 2000 },
        { name: "waitAndRequery", waitTime: 20000 },
      ],
    },
  },
  tcb: {
    name: "台中銀行",
    loginUrl: "https://ibank.tcbbank.com.tw/CIB/common/Login.faces",
    detection: {
      loginPage: ["ibank.tcbbank.com.tw", "Login.faces"],
      mainPage: ["ibank.tcbbank.com.tw"], // 登入後主頁面（待確認實際網址）
    },
    loginData: {
      companyId: "60597458",
      userId: "BUP776655",
      password: "DLX887",
      bankId: 1012,
      bankName: "台中銀行",
    },
    selectors: {
      // 登入頁面選擇器
      login: {
        companyId: "#formbd\\:uid2", // 統編輸入框
        companyIdAlt: 'input[name="formbd:uid2"]', // 備用選擇器
        userId: "#formbd\\:uuid", // 帳號輸入框
        userIdAlt: 'input[name="formbd:uuid"]', // 備用選擇器
        password: "#formbd\\:pazzword", // 密碼輸入框
        passwordAlt: 'input[name="formbd:pazzword"]', // 備用選擇器
        captcha: "#formbd\\:captcha", // 驗證碼輸入框
        captchaAlt: 'input[name="formbd:captcha"]', // 備用選擇器
        loginButton: "#formbd\\:btnLogin", // 登入按鈕
        loginButtonAlt: "a#formbd\\:btnLogin, a.login_btn[onclick]", // 備用選擇器
        captchaLength: 4, // 驗證碼長度為4位
        useIframe: false, // 不使用 iframe
      },
      // 主頁面選擇器
      navigation: {
        accountQueryLink:
          'a[target="iframe1"] span:contains("帳戶查詢"), a[target="iframe1"]:has(span:contains("帳戶查詢"))', // 帳戶查詢連結
        accountQueryLinkAlt: 'a[target="iframe1"]', // 備用選擇器（第一個）
        transactionQueryLink:
          'a[target="iframe1"]:has(b:contains("交易明細查詢")), a[target="iframe1"][href*="dispatcher"]:has(b)', // 交易明細查詢連結
        transactionQueryLinkAlt: 'a[target="iframe1"][href*="dispatcher"]', // 備用選擇器
        mainIframe: 'iframe#iframe1, iframe[name="iframe1"]', // 主 iframe
      },
      // 查詢頁面選擇器
      query: {
        accountSelect: "#formbd\\:comboAccount", // 帳號選擇下拉選單
        accountSelectAlt: 'select[name="formbd:comboAccount"]', // 備用選擇器
        startDate: "#formbd\\:startDate", // 起日輸入框
        startDateAlt: 'input[name="formbd:startDate"]', // 備用選擇器
        queryButton: "#formbd\\:btnQuery", // 查詢按鈕
        queryButtonAlt: 'a.btn1#formbd\\:btnQuery, a[onclick][class*="btn1"]', // 備用選擇器
        dataGrid: "#formbd\\:datagrid_DataGridBody", // 交易表格
        dataGridAlt: "table.tb2#formbd\\:datagrid_DataGridBody", // 備用選擇器
        dateCell: "td:nth-child(1)", // 交易日期欄位（第1欄）
        amountCell: "td:nth-child(4)", // 存入金額欄位（第4欄）
        balanceCell: "td:nth-child(5)", // 餘額欄位（第5欄）
        bankCodeCell: "td:nth-child(6)", // 交易行欄位（第6欄）
        accountCell: "td:nth-child(7)", // 說明欄位（第7欄，帳號）
        nextPageButton: 'a.next_btn[onclick*="setDataGridCurrentPage"]', // 下一頁按鈕
        pageSize100: 'div.showPages a:has(span:contains("100"))', // 每頁100筆按鈕
        useIframe: true, // 使用 iframe
        iframeName: "iframe1", // iframe 名稱
      },
    },
    automation: {
      steps: [
        { name: "clickTcbAccountQuery", waitTime: 3000 },
        { name: "clickTcbTransactionQuery", waitTime: 3000 },
        { name: "selectTcbAccount", waitTime: 2000 },
        { name: "setTcbDateRange", waitTime: 2000 },
        { name: "executeTcbQuery", waitTime: 5000 },
        { name: "extractTransactionData", waitTime: 2000 },
        { name: "waitAndRequery", waitTime: 20000 },
      ],
    },
  },
};

// 創建一個全域變數來儲存擴展狀態
window.czAssistExtension = {
  initialized: false,
  settings: {
    queryDaysBack: 0, // 可調整的查詢天數，預設為0天前
  },
  savedLoginData: {},
  selectedBank: "yuanta", // 預設選擇元大銀行
  tbbTargetAccount: null, // 台灣企銀目標帳號（從 API 的 Carder 獲取）
  cathayTargetAccount: null, // 國泰世華目標帳號（從 API 的 Carder 獲取，去掉前綴 0000）
  hncbTargetAccount: null, // 華南商銀目標帳號（從 API 的 Carder 獲取，去掉前綴 0000）
  automation: {
    isRunning: false,
    currentStep: 0,
    intervalId: null,
    timeoutId: null,
    queryResults: [],
    lastQueryDate: null, // 記錄上次查詢的日期（格式：YYYY-MM-DD）
    originalQueryDaysBack: null, // 記錄原始的查詢天數設定（用於跨日後恢復）
    pendingTimers: [], // 追蹤所有待執行的計時器
    isRequerying: false, // 標記是否正在重新查詢
    onlineIntervalId: null, // 追蹤線上狀態 API 定時器
  },
};

// 初始化內容腳本
function initializeContentScript() {
  if (window.czAssistExtension.initialized) {
    return;
  }
  
  console.log("Initializing CZ Assist Extension on:", window.location.href);

  // 設置 State Persistence Proxy
  const originalAutomation = window.czAssistExtension.automation;
  const handler = {
    set: function (obj, prop, value) {
      obj[prop] = value;
      // 保存關鍵狀態
      if (
        ["currentStep", "isRunning", "lastQueryDate", "queryResults"].includes(
          prop
        )
      ) {
         const stateToSave = {
             currentStep: obj.currentStep,
             isRunning: obj.isRunning,
             lastQueryDate: obj.lastQueryDate,
             queryResults: obj.queryResults,
             bank: window.czAssistExtension.selectedBank,
          timestamp: Date.now(),
         };
         
         chrome.storage.local.set({ automationState: stateToSave });
         
         // 通知 Popup
        chrome.runtime
          .sendMessage({
            type: "STATUS_UPDATE",
             data: {
                 isRunning: obj.isRunning,
                 currentStep: obj.currentStep,
              queryResults: obj.queryResults,
            },
          })
          .catch(() => {});
      }
      return true;
    },
  };
  window.czAssistExtension.automation = new Proxy(originalAutomation, handler);
  
  // 從 storage 獲取設定
  chrome.storage.local.get(
    [
      "extensionEnabled",
      "settings",
      "selectedBank",
      "savedBankId",
      "automationState",
    ],
    (result) => {
      if (result.extensionEnabled) {
        window.czAssistExtension.settings = {
          queryDaysBack: 0, // 預設值
          ...result.settings, // 覆蓋儲存的設定
        };
        window.czAssistExtension.selectedBank = result.selectedBank || "yuanta";
        window.czAssistExtension.savedBankId = result.savedBankId || "101";
        
        // 讀取上次查詢日期（用於跨日檢測）
        const lastQueryDate = localStorage.getItem("cz_last_query_date");
        if (lastQueryDate) {
          window.czAssistExtension.automation.lastQueryDate = lastQueryDate;
          console.log("已載入上次查詢日期:", lastQueryDate);
        }
        
        // 讀取台灣企銀目標帳號（從 API 的 Carder 獲取）
        if (result.apiLoginData && result.apiLoginData.carder) {
          window.czAssistExtension.tbbTargetAccount =
            result.apiLoginData.carder;
          console.log("已載入台灣企銀目標帳號:", result.apiLoginData.carder);
        } else {
          // 如果沒有從 API 獲取，使用預設值
          window.czAssistExtension.tbbTargetAccount = TBB_TARGET_ACCOUNT;
          console.log("使用預設台灣企銀目標帳號:", TBB_TARGET_ACCOUNT);
        }
        
        // 讀取國泰世華目標帳號（從 API 的 Carder 獲取，去掉前綴 0000）
        if (
          result.apiLoginData &&
          result.apiLoginData.carder &&
          result.apiLoginData.bankName === "國泰世華"
        ) {
          const carder = result.apiLoginData.carder;
          // 去掉前綴 "0000"
          const targetAccount = carder.startsWith("0000")
            ? carder.substring(4)
            : carder;
          window.czAssistExtension.cathayTargetAccount = targetAccount;
          console.log("已載入國泰世華目標帳號:", carder, "->", targetAccount);
        }
        
        // 讀取華南商銀目標帳號（從 API 的 Carder 獲取，去掉前綴 0000）
        if (
          result.apiLoginData &&
          result.apiLoginData.carder &&
          result.apiLoginData.bankName === "華南商銀"
        ) {
          const carder = result.apiLoginData.carder;
          // 去掉前綴 "0000"
          const targetAccount = carder.startsWith("0000")
            ? carder.substring(4)
            : carder;
          window.czAssistExtension.hncbTargetAccount = targetAccount;
          console.log("已載入華南商銀目標帳號:", carder, "->", targetAccount);
        }
        
        // 恢復自動化狀態 (針對 TBB 等銀行重載頁面問題)
        if (
          result.automationState &&
          result.automationState.bank === window.czAssistExtension.selectedBank
        ) {
           const state = result.automationState;
          const isRecent = Date.now() - state.timestamp < 1000 * 60 * 10; // 10分鐘內有效
           
           console.log("檢查自動化狀態恢復:", {
               hasState: !!result.automationState,
               isRunning: state.isRunning,
               isRecent: isRecent,
               currentStep: state.currentStep,
               timestamp: new Date(state.timestamp).toISOString(),
            currentUrl: window.location.href,
           });
           
           // 修改恢復條件：只要狀態是最近的就恢復，不管 isRunning 是否為 true
           // 這樣可以讓用戶在頁面刷新後繼續之前的自動化流程
           // 但如果當前自動化已經在運行中，則不需要再次恢復（防止重複執行）
           if (isRecent && !window.czAssistExtension.automation.isRunning) {
            console.log(
              "✅ 恢復自動化狀態 (isRecent=true, 當前未運行):",
              state
            );
               
               // 智能步驟檢測：根據當前 URL 判斷應該執行哪個步驟
               let adjustedStep = state.currentStep;
               
               if (window.czAssistExtension.selectedBank === "tbb") {
                   const url = window.location.href;
                   
                   // 檢查是否有查詢結果表格
              const hasResultTable = !!document.querySelector(
                "#DataTables_Table_0"
              );
              const hasQueryForm = !!document.querySelector("#CMSUBMITNOW");
                   
                   console.log("🔍 台灣企銀頁面檢測:", {
                       url: url,
                       hasResultTable: hasResultTable,
                hasQueryForm: hasQueryForm,
                   });
                   
                   // 檢查是否有帳號下拉選單（查詢表單頁面）
              const hasAccountSelect = !!document.querySelector("#ACN");
                   
                   // 如果有查詢結果表格，說明已經在查詢結果頁面，應該執行步驟 6（提取數據）
                   if (hasResultTable) {
                       adjustedStep = 6;
                console.log(
                  "🔍 檢測到台灣企銀查詢結果頁面（有表格），調整為步驟 6"
                );
                   }
                   // 如果有查詢表單，說明在查詢設定頁面
              else if (
                hasQueryForm ||
                url.includes("/DEMAND_DEPOSIT_DETAIL/")
              ) {
                       // 如果有帳號下拉選單，需要先選擇帳號
                       if (hasAccountSelect) {
                  console.log(
                    "🔍 檢測到台灣企銀查詢設定頁面（有帳號下拉選單），先選擇帳號再設定日期"
                  );
                           // 立即選擇帳號，然後跳到步驟 2
                  const accountSelect = document.querySelector("#ACN");
                  if (
                    accountSelect &&
                    accountSelect.options &&
                    accountSelect.options.length > 0
                  ) {
                    const targetAccountNumber =
                      window.czAssistUtils.getTbbTargetAccount();
                               const option = Array.from(accountSelect.options).find(
                      (opt) => opt.value === targetAccountNumber
                               );
                               if (option) {
                                   console.log(`恢復狀態時選擇帳號: ${targetAccountNumber}`);
                                   accountSelect.value = targetAccountNumber;
                      accountSelect.dispatchEvent(
                        new Event("change", { bubbles: true })
                      );
                               }
                           }
                       }
                       adjustedStep = 2;
                       console.log("🔍 檢測到台灣企銀查詢設定頁面，調整為步驟 2");
                   }
                   // 如果在帳戶總覽頁面 (/OVERVIEW/initview)，應該執行步驟 1（選擇帳戶）
              else if (url.includes("/OVERVIEW/initview")) {
                       adjustedStep = 1;
                       console.log("🔍 檢測到帳戶總覽頁面，調整為步驟 1");
                   }
                   // 如果在主頁面 (/INDEX/index)，應該執行步驟 0（點擊帳戶總覽）
              else if (url.includes("/INDEX/index")) {
                       adjustedStep = 0;
                       console.log("🔍 檢測到主頁面，調整為步驟 0");
                   }
            } else if (window.czAssistExtension.selectedBank === "ctbc") {
                   const url = window.location.href;
                   
                   // 中國信託的 URL 檢測邏輯
                   // 檢查頁面元素來判斷當前在哪個階段
              const hasAccountSelect = !!document.querySelector("#acct_num_id");
              const hasStartDate = !!document.querySelector(
                "#query_date_start_id"
              );
              const hasEndDate = !!document.querySelector("#query_date_end_id");
              const hasQueryButton = !!document.querySelector("#searchButton");
              const hasQueryLink = !!document.querySelector(
                "#tree-AQ > ul > li:nth-child(2) > a"
              );
                   
                   // 檢查是否有查詢結果表格（更精確的判斷）
                   // 查詢結果表格應該在 #survivalTable 內，且有實際的數據行
              const survivalTable = document.querySelector("#survivalTable");
              const resultTable = survivalTable?.querySelector("table.data");
              const hasDataRows =
                resultTable?.querySelectorAll("tbody tr.data-row")?.length > 0;
                   const hasResultTable = !!(resultTable && hasDataRows);
                   
                   console.log("🔍 中國信託頁面檢測:", {
                       url: url,
                       hasAccountSelect: hasAccountSelect,
                       hasStartDate: hasStartDate,
                       hasEndDate: hasEndDate,
                       hasQueryButton: hasQueryButton,
                       hasQueryLink: hasQueryLink,
                       hasResultTable: hasResultTable,
                       hasSurvivalTable: !!survivalTable,
                hasDataRows: hasDataRows,
                   });
                   
                   // 檢查 URL 是否包含查詢相關的路徑
              const isQueryPage =
                url.includes("aq102001") ||
                url.includes("querySelectSurvBranchDetail") ||
                url.includes("query");
                   
                   // 如果有查詢結果表格且有實際數據行，說明已經查詢完成，應該執行步驟 6（提取數據）
                   if (hasResultTable) {
                       adjustedStep = 6;
                console.log(
                  "🔍 檢測到中國信託查詢結果頁面（有表格且有數據），調整為步驟 6"
                );
                   }
                   // 如果有帳號下拉選單、日期輸入框和查詢按鈕，說明在查詢設定頁面
              else if (
                hasAccountSelect &&
                hasStartDate &&
                hasEndDate &&
                hasQueryButton
              ) {
                       // 檢查是否已經選擇了帳號
                const accountSelect = document.querySelector("#acct_num_id");
                const startDateField = document.querySelector(
                  "#query_date_start_id"
                );
                const endDateField =
                  document.querySelector("#query_date_end_id");
                       
                       // 如果已經選擇帳號且設定了日期，應該執行步驟 3（執行查詢）
                if (
                  accountSelect &&
                  accountSelect.value &&
                  startDateField &&
                  startDateField.value &&
                  endDateField &&
                  endDateField.value
                ) {
                           adjustedStep = 3;
                  console.log(
                    "🔍 檢測到中國信託查詢設定頁面（已設定完整），調整為步驟 3"
                  );
                       }
                       // 如果已經選擇帳號但未設定日期，應該執行步驟 2（設定日期）
                       else if (accountSelect && accountSelect.value) {
                           adjustedStep = 2;
                  console.log(
                    "🔍 檢測到中國信託查詢設定頁面（已選擇帳號），調整為步驟 2"
                  );
                       }
                       // 如果未選擇帳號，應該執行步驟 1（選擇帳號）
                       else {
                           adjustedStep = 1;
                  console.log(
                    "🔍 檢測到中國信託查詢設定頁面（未選擇帳號），調整為步驟 1"
                  );
                       }
                   }
                   // 如果有查詢連結，說明在主頁面，應該執行步驟 0（點擊查詢連結）
              else if (
                hasQueryLink ||
                (url.includes("showDashBoard") && isQueryPage === false)
              ) {
                       adjustedStep = 0;
                       console.log("🔍 檢測到中國信託主頁面，調整為步驟 0");
                   }
            } else if (window.czAssistExtension.selectedBank === "skbank") {
                   const url = window.location.href;
                   
                   // 新光商銀的 URL 檢測邏輯
                   // 檢查頁面元素來判斷當前在哪個階段
              const hasAccountSelect = !!document.querySelector(
                "#accountSelectForSearch"
              );
              const hasQueryButton = !!document.querySelector(
                "a.btn.btn-primary.js-showInfo"
              );
              const hasStartDate = !!document.querySelector(
                'input.js-pop-date[name="startDate"]'
              );
              const hasDataTable = !!document.querySelector(
                "table.sectionTable.forPrint"
              );
                   
                   console.log("🔍 新光商銀頁面檢測:", {
                       url: url,
                       hasAccountSelect: hasAccountSelect,
                       hasQueryButton: hasQueryButton,
                       hasStartDate: hasStartDate,
                hasDataTable: hasDataTable,
                   });
                   
                   // 如果 URL 包含 QueryAcctDetail，說明已經在查詢頁面
              const isQueryPage =
                url.includes("/QueryAcctDetail") ||
                url.includes("QueryAcctDetail");
                   
                   // 如果有查詢結果表格，說明已經查詢完成，應該執行步驟 6（提取數據）
                   if (hasDataTable) {
                       adjustedStep = 6;
                console.log(
                  "🔍 檢測到新光商銀查詢結果頁面（有表格），調整為步驟 6"
                );
                   }
                   // 如果有帳號下拉選單和查詢按鈕，說明在查詢頁面
              else if (
                (hasAccountSelect && hasQueryButton && hasStartDate) ||
                isQueryPage
              ) {
                       // 檢查是否已經選擇了帳號
                const accountSelect = document.querySelector(
                  "#accountSelectForSearch"
                );
                       if (accountSelect && accountSelect.value) {
                           // 已選擇帳號，應該執行步驟 2（設定日期）
                           adjustedStep = 2;
                  console.log(
                    "🔍 檢測到新光商銀查詢頁面（已選擇帳號），調整為步驟 2"
                  );
                       } else {
                           // 未選擇帳號，應該執行步驟 1（選擇帳號）
                           adjustedStep = 1;
                  console.log(
                    "🔍 檢測到新光商銀查詢頁面（未選擇帳號），調整為步驟 1"
                  );
                       }
                   }
                   // 如果在主頁面 (DashBoard)，應該執行步驟 0（點擊交易明細查詢）
              else if (
                url.includes("/DashBoard") ||
                url.includes("/AccountQuery/DashBoard")
              ) {
                       adjustedStep = 0;
                       console.log("🔍 檢測到新光商銀主頁面，調整為步驟 0");
                   }
            } else if (window.czAssistExtension.selectedBank === "tfcc") {
                   const url = window.location.href;
                   
                   // 淡水一信的 URL 檢測邏輯
                   // 檢查頁面元素來判斷當前在哪個階段
              const hasDateSelector = !!document.querySelector("#check-btn");
              const hasAccountRow = !!document.querySelector("tr.tr-effect");
                   
                   console.log("🔍 淡水一信頁面檢測:", {
                       url: url,
                       hasDateSelector: hasDateSelector,
                hasAccountRow: hasAccountRow,
                   });
                   
                   // 如果有日期選擇器，說明已經在查詢頁面，應該執行步驟 2（設定日期）
                   if (hasDateSelector) {
                       adjustedStep = 2;
                console.log(
                  "🔍 檢測到淡水一信查詢頁面（有日期選擇器），調整為步驟 2"
                );
                   }
                   // 如果有帳戶列表行，說明在帳戶總覽頁面，應該執行步驟 1（點擊帳戶）
              else if (hasAccountRow || url.includes("/acctDataQry")) {
                       adjustedStep = 1;
                       console.log("🔍 檢測到淡水一信帳戶總覽頁面，調整為步驟 1");
                   }
                   // 如果在主頁面 (welcome)，應該執行步驟 0（點擊帳戶總覽）
              else if (url.includes("/welcome")) {
                       adjustedStep = 0;
                       console.log("🔍 檢測到淡水一信主頁面，調整為步驟 0");
                   }
            } else if (window.czAssistExtension.selectedBank === "landbank") {
              const url = window.location.href;

              // 土地銀行的 URL 檢測邏輯
              // 注意：土地銀行使用 frame，需要從 main frame 中檢測元素
              let hasMenu = false;
              let hasQueryButton = false;
              let hasTable = false;
              let hasTransactionButton = false;

              try {
                const mainFrame = document.querySelector('frame[name="main"]');
                const frameDoc =
                  mainFrame?.contentDocument ||
                  mainFrame?.contentWindow?.document;

                if (frameDoc) {
                  hasMenu = !!frameDoc.querySelector("#MENU1");
                  hasQueryButton = !!frameDoc.querySelector(
                    "#ContentPlaceHolder1_btn_1"
                  );
                  hasTable = !!frameDoc.querySelector("#grvAccount1");
                  hasTransactionButton = !!frameDoc.querySelector(
                    'input[value="存款交易明細查詢"]'
                  );
                }
              } catch (e) {
                console.warn("土地銀行頁面檢測時無法訪問 main frame:", e);
              }

              console.log("🔍 土地銀行頁面檢測:", {
                url: url,
                hasMenu: hasMenu,
                hasQueryButton: hasQueryButton,
                hasTable: hasTable,
                hasTransactionButton: hasTransactionButton,
                reason: state.reason,
              });

              // 如果是 500 錯誤恢復，從步驟 0 開始
              if (state.reason === "landbank_500_error_refresh") {
                adjustedStep = 0;
                console.log("🔍 土地銀行：500 錯誤恢復，從步驟 0 開始");
              }
              // 如果有交易表格，說明已經在查詢結果頁面，應該執行步驟 6（提取數據）
              else if (hasTable) {
                adjustedStep = 6;
                console.log(
                  "🔍 檢測到土地銀行查詢結果頁面（有表格），調整為步驟 6"
                );
              }
              // 如果有查詢按鈕，說明在查詢設定頁面，應該執行步驟 4（設定日期範圍）
              else if (hasQueryButton) {
                adjustedStep = 4;
                console.log("🔍 檢測到土地銀行查詢設定頁面，調整為步驟 4");
              }
              // 如果有存款交易明細查詢按鈕，說明在帳務總覽頁面，應該執行步驟 2（點擊存款交易明細查詢）
              else if (hasTransactionButton) {
                adjustedStep = 2;
                console.log(
                  "🔍 檢測到土地銀行帳務總覽頁面（有交易明細按鈕），調整為步驟 2"
                );
              }
              // 如果有菜單，說明在主頁面，應該執行步驟 0（點擊查詢服務）
              else if (hasMenu) {
                adjustedStep = 0;
                console.log("🔍 檢測到土地銀行主頁面（有菜單），調整為步驟 0");
              }
              // 默認從步驟 0 開始
              else {
                adjustedStep = 0;
                console.log("🔍 土地銀行：無法確定頁面狀態，從步驟 0 開始");
              }
               }
               
               // 注意：此時賦值會再次觸發 storage set，但無妨。
               window.czAssistExtension.automation.currentStep = adjustedStep;
               window.czAssistExtension.automation.isRunning = true;
               if (state.queryResults) {
              window.czAssistExtension.automation.queryResults =
                state.queryResults;
               }
               
               // 延遲執行以等待頁面加載
               console.log(`將在 3 秒後執行步驟 ${adjustedStep}`);
            setTimeout(() => {
              if (
                window.czAssistUtils &&
                window.czAssistUtils.executeAutomationStep
              ) {
                console.log(
                  `執行恢復的步驟 ${window.czAssistExtension.automation.currentStep}`
                );
                       
                       // 頁面刷新後重新啟動線上狀態 API 計時器
                       if (window.czAssistUtils.startOnlineStatusTimer) {
                         console.log("頁面刷新後重新啟動線上狀態 API 計時器");
                         window.czAssistUtils.startOnlineStatusTimer();
                       }
                       
              window.czAssistUtils.executeAutomationStep();
                   }
               }, 3000);
           } else {
               if (window.czAssistExtension.automation.isRunning) {
                   console.log("❌ 不恢復自動化狀態 (自動化已經在運行中)");
               } else {
              console.log(
                "❌ 不恢復自動化狀態 (isRecent:",
                isRecent,
                ", 狀態已過期超過5分鐘)"
              );
               }
           }
        } else {
            console.log("❌ 無自動化狀態或銀行不匹配");
        }
        
      window.czAssistExtension.initialized = true;
      
      // 執行主要功能
      setupExtensionFeatures();
      }
    }
  );
}

// 設置擴展功能
function setupExtensionFeatures() {
  // 創建側邊欄
  createSidebar();
  
  // 如果有恢復的自動化狀態，更新側邊欄 UI
  if (window.czAssistExtension.automation.isRunning) {
    const startBtn = document.getElementById("cz-start-btn");
    const stopBtn = document.getElementById("cz-stop-btn");
    if (startBtn) startBtn.style.display = "none";
    if (stopBtn) stopBtn.style.display = "inline-block";
  }
  
  // 添加快捷鍵監聽器
  document.addEventListener("keydown", handleKeyboardShortcuts);
  
  // 添加右鍵選單功能
  document.addEventListener("contextmenu", handleContextMenu);
  
  // 監聽頁面變化 (適用於 SPA)
  observePageChanges();
  
  // 檢查是否為登入頁面且有登入資料
  checkAutoLoginPage();
  
  // 檢查是否需要清理昨天的記錄（每天自動執行一次）
  setTimeout(() => {
    if (window.czAssistUtils && window.czAssistUtils.checkAndCleanIfNewDay) {
      window.czAssistUtils.checkAndCleanIfNewDay();
    }
  }, 2000); // 延遲2秒確保 czAssistUtils 已經初始化
  
  console.log("CZ Assist Extension features activated");
}

// 檢查是否需要自動填入登入表單或開始自動化
function checkAutoLoginPage() {
  const currentUrl = window.location.href;
  const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
  
  if (!bankConfig) {
    console.warn(
      "找不到選擇的銀行設定檔:",
      window.czAssistExtension.selectedBank
    );
    return;
  }
  
  // 檢查是否為登入頁面
  let isLoginPage = false;
  let isMainPage = false;

  if (bankConfig.detection.useHashDetection) {
    // 使用 URL hash 檢測（針對 SPA 應用，如台新銀行）
    const result = checkHashPageStatus(bankConfig);
    isLoginPage = result.isLoginPage;
    isMainPage = result.isMainPage;
  } else if (bankConfig.detection.useIframeDetection) {
    // 使用 iframe 內 URL hash 檢測
    const result = checkIframePageStatus(bankConfig);
    isLoginPage = result.isLoginPage;
    isMainPage = result.isMainPage;
  } else if (bankConfig.detection.useLocalStorageDetection) {
    // 使用 localStorage 檢測登入狀態
    const result = checkLocalStorageLoginStatus(bankConfig);
    isLoginPage = result.isLoginPage;
    isMainPage = result.isMainPage;
  } else if (
    bankConfig.detection.useCustomDetection &&
    window.czAssistExtension.selectedBank === "ctbc"
  ) {
    // 使用中國信託自定義檢測
    const result = checkCtbcPageStatus();
    isLoginPage = result.isLoginPage;
    isMainPage = result.isMainPage;
  } else if (
    bankConfig.detection.useElementDetection &&
    window.czAssistExtension.selectedBank === "bok"
  ) {
    // 使用高雄銀行元素檢測
    const result = checkBokPageStatus(bankConfig);
    isLoginPage = result.isLoginPage;
    isMainPage = result.isMainPage;
  } else {
    // 使用傳統 URL 檢測
    isLoginPage = bankConfig.detection.loginPage.every((keyword) =>
      currentUrl.includes(keyword)
    );
    isMainPage = bankConfig.detection.mainPage.every((keyword) =>
      currentUrl.includes(keyword)
    );
  }
  
  if (isLoginPage) {
    console.log("偵測到登入頁面，檢查是否有登入資料");
    window.czAssistUtils.autoFillForm();
  } else if (isMainPage) {
    console.log("偵測到銀行主頁，檢查是否需要開始自動化");
    // 等待2秒讓頁面完全載入，然後檢查是否有自動化需求
    setTimeout(() => {
      // 這裡可以根據需要添加自動開始自動化的邏輯
      // 目前讓用戶手動點擊開始按鈕
    }, 2000);
  }
}

// 檢查 URL hash 頁面狀態（針對台新銀行等使用 SPA 的銀行）
function checkHashPageStatus(bankConfig) {
  try {
    const currentUrl = window.location.href;
    const currentHash = window.location.hash;

    console.log("Current URL:", currentUrl);
    console.log("Current Hash:", currentHash);

    // 檢查基本 URL 是否符合
    const urlMatches = bankConfig.detection.loginPage.every((keyword) =>
      currentUrl.includes(keyword)
    );
    if (!urlMatches) {
      return { isLoginPage: false, isMainPage: false };
    }

    // 根據 hash 判斷是登入頁面還是主頁面
    let isLoginPage = false;

    // 處理 loginPageHash 可能是字串或陣列的情況
    if (Array.isArray(bankConfig.detection.loginPageHash)) {
      isLoginPage = bankConfig.detection.loginPageHash.some((hash) => {
        return currentHash === hash || currentHash.startsWith(hash);
      });
    } else {
      isLoginPage =
        currentHash === bankConfig.detection.loginPageHash ||
        (bankConfig.detection.loginPageHash &&
          currentHash.startsWith(bankConfig.detection.loginPageHash));
    }

    const isMainPage =
      currentHash.includes(bankConfig.detection.mainPageHash) ||
      (bankConfig.detection.mainPageHash &&
        currentHash.startsWith(bankConfig.detection.mainPageHash));

    console.log("頁面狀態檢測結果:", {
      isLoginPage,
      isMainPage,
      hash: currentHash,
      expectedLoginHashes: bankConfig.detection.loginPageHash,
      expectedMainHash: bankConfig.detection.mainPageHash,
      fullUrl: currentUrl,
    });

    return { isLoginPage, isMainPage };
  } catch (error) {
    console.error("檢查 URL hash 頁面狀態時發生錯誤:", error);
    return { isLoginPage: false, isMainPage: false };
  }
}

// 檢查 iframe 內的頁面狀態（針對玉山銀行等使用 iframe 的銀行）
function checkIframePageStatus(bankConfig) {
  try {
    const iframe = document.getElementById(bankConfig.detection.iframeName);
    if (!iframe || !iframe.contentDocument) {
      console.log("找不到 iframe 或無法訪問 iframe 內容");
      return { isLoginPage: false, isMainPage: false };
    }

    const iframeUrl = iframe.contentDocument.location.href;
    const iframeHash = iframe.contentDocument.location.hash;

    console.log("iframe URL:", iframeUrl);
    console.log("iframe Hash:", iframeHash);

    // 檢查基本 URL 是否符合
    const urlMatches = bankConfig.detection.loginPage.every((keyword) =>
      iframeUrl.includes(keyword)
    );
    if (!urlMatches) {
      return { isLoginPage: false, isMainPage: false };
    }

    // 根據 hash 判斷是登入頁面還是主頁面
    let isLoginPage = false;

    // 處理 loginPageHash 可能是字串或陣列的情況
    if (Array.isArray(bankConfig.detection.loginPageHash)) {
      isLoginPage = bankConfig.detection.loginPageHash.some((hash) => {
        // 特殊處理：如果期待的 hash 是 "#/" 且實際 hash 為空，也視為匹配
        if (hash === "#/" && (iframeHash === "" || iframeHash === "#/")) {
          return true;
        }
        return iframeHash === hash || iframeHash.startsWith(hash);
      });
    } else {
      // 特殊處理：如果期待的 hash 是 "#/" 且實際 hash 為空，也視為匹配
      if (
        bankConfig.detection.loginPageHash === "#/" &&
        (iframeHash === "" || iframeHash === "#/")
      ) {
        isLoginPage = true;
      } else {
        isLoginPage =
          iframeHash === bankConfig.detection.loginPageHash ||
          (bankConfig.detection.loginPageHash &&
            iframeHash.startsWith(bankConfig.detection.loginPageHash));
      }
    }

    // 額外檢查：如果基本 URL 匹配且 hash 為空或為 "#/"，且不是主頁面，則可能是登入頁面
    if (
      !isLoginPage &&
      !isMainPage &&
      (iframeHash === "" || iframeHash === "#/")
    ) {
      // 檢查 URL 是否包含登入相關關鍵字，且不包含主頁面關鍵字
      const hasLoginKeywords = bankConfig.detection.loginPage.every((keyword) =>
        iframeUrl.includes(keyword)
      );
      const hasMainKeywords = bankConfig.detection.mainPage.some(
        (keyword) =>
          iframeUrl.includes(keyword) && keyword !== "gib.esunbank.com"
      );

      if (hasLoginKeywords && !hasMainKeywords) {
        console.log("根據 URL 特徵判斷為登入頁面（hash 為空或 #/）");
        isLoginPage = true;
      }
    }

    const isMainPage =
      iframeHash.includes(bankConfig.detection.mainPageHash) ||
      (bankConfig.detection.mainPageHash &&
        iframeHash.startsWith(bankConfig.detection.mainPageHash));

    console.log("頁面狀態檢測結果:", {
      isLoginPage,
      isMainPage,
      hash: iframeHash,
      expectedLoginHashes: bankConfig.detection.loginPageHash,
      expectedMainHash: bankConfig.detection.mainPageHash,
      fullIframeUrl: iframeUrl,
    });

    return { isLoginPage, isMainPage };
  } catch (error) {
    console.error("檢查 iframe 頁面狀態時發生錯誤:", error);
    return { isLoginPage: false, isMainPage: false };
  }
}

// 檢查 localStorage 登入狀態（針對陽信銀行等使用 localStorage 的銀行）
function checkLocalStorageLoginStatus(bankConfig) {
  try {
    const storageValue = localStorage.getItem(
      bankConfig.detection.localStorageKey
    );
    const isLoggedIn =
      storageValue === bankConfig.detection.localStorageLoginValue;

    console.log("localStorage 登入狀態檢測:", {
      key: bankConfig.detection.localStorageKey,
      value: storageValue,
      expectedValue: bankConfig.detection.localStorageLoginValue,
      isLoggedIn: isLoggedIn,
    });

    // 根據 localStorage 值判斷頁面狀態
    const currentUrl = window.location.href;
    const isOnBankSite = bankConfig.detection.loginPage.every((keyword) =>
      currentUrl.includes(keyword)
    );

    if (!isOnBankSite) {
      return { isLoginPage: false, isMainPage: false };
    }

    // 如果在銀行網站上
    if (isLoggedIn) {
      return { isLoginPage: false, isMainPage: true }; // 已登入 -> 主頁面
    } else {
      return { isLoginPage: true, isMainPage: false }; // 未登入 -> 登入頁面
    }
  } catch (error) {
    console.error("檢查 localStorage 登入狀態時發生錯誤:", error);
    return { isLoginPage: false, isMainPage: false };
  }
}

// 檢查中國信託的頁面狀態（特殊檢測邏輯）
function checkCtbcPageStatus() {
  try {
    const currentUrl = window.location.href;
    console.log("中國信託頁面檢測，當前URL:", currentUrl);
    
    // 精確檢測登入頁面
    const isLoginPage =
      currentUrl.includes("ecash.ctbcbank.com/PCMS/index") &&
                       !currentUrl.includes("showDashBoard") && 
                       !currentUrl.includes("aq102001");
    
    // 檢測主頁面（登入後的各種頁面）
    const isMainPage =
      currentUrl.includes("ecash.ctbcbank.com") &&
                      (currentUrl.includes("showDashBoard") || 
                       currentUrl.includes("aq102001") || 
                       currentUrl.includes("querySelectSurvBranchDetail"));
    
    console.log("中國信託頁面狀態檢測結果:", {
      isLoginPage,
      isMainPage,
      currentUrl: currentUrl,
    });
    
    return { isLoginPage, isMainPage };
  } catch (error) {
    console.error("檢查中國信託頁面狀態時發生錯誤:", error);
    return { isLoginPage: false, isMainPage: false };
  }
}

// 檢查高雄銀行的頁面狀態（元素檢測邏輯）
function checkBokPageStatus(bankConfig) {
  try {
    const currentUrl = window.location.href;
    console.log("高雄銀行頁面檢測，當前URL:", currentUrl);
    
    // 檢查基本 URL 是否符合
    const isOnBankSite = bankConfig.detection.loginPage.every((keyword) =>
      currentUrl.includes(keyword)
    );
    
    if (!isOnBankSite) {
      return { isLoginPage: false, isMainPage: false };
    }
    
    // 通過頁面元素檢測登入狀態
    const loginElement = document.querySelector(
      bankConfig.detection.loginPageElement
    );
    const mainElements = bankConfig.detection.mainPageElement
      .split(", ")
      .some((selector) => document.querySelector(selector));
    
    // 如果有登入表單元素，且沒有主頁面元素，則是登入頁面
    const isLoginPage = !!loginElement && !mainElements;
    
    // 如果沒有登入表單元素，或有主頁面元素，則是主頁面
    const isMainPage = !loginElement || mainElements;
    
    console.log("高雄銀行頁面狀態檢測結果:", {
      isLoginPage,
      isMainPage,
      hasLoginElement: !!loginElement,
      hasMainElements: mainElements,
      currentUrl: currentUrl,
    });
    
    return { isLoginPage, isMainPage };
  } catch (error) {
    console.error("檢查高雄銀行頁面狀態時發生錯誤:", error);
    return { isLoginPage: false, isMainPage: false };
  }
}

// 處理鍵盤快捷鍵
function handleKeyboardShortcuts(event) {
  // Ctrl+Shift+Z 觸發擴展功能
  if (event.ctrlKey && event.shiftKey && event.key === "Z") {
    event.preventDefault();
    triggerExtensionAction();
  }
}

// 處理右鍵選單
function handleContextMenu() {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    // 可以在這裡添加對選中文字的處理邏輯
    console.log("Selected text:", selectedText);
  }
}

// 監聽頁面變化
function observePageChanges() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        // 頁面內容發生變化時的處理邏輯
        handlePageUpdate();
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// 處理頁面更新
function handlePageUpdate() {
  // 在這裡添加頁面更新時需要執行的邏輯
  console.log("Page content updated");
  
  // 如果自動化已停止且步驟提示正在顯示，標記步驟 1 為完成
  const notice = document.getElementById("cz-automation-notice");
  if (
    notice &&
    notice.style.display !== "none" &&
    window.czAssistExtension &&
    !window.czAssistExtension.automation.isRunning
  ) {
    window.czAssistUtils.markStepCompleted(1);
  }
}

// 觸發擴展主要功能
function triggerExtensionAction() {
  // 向背景腳本發送消息
  chrome.runtime.sendMessage(
    {
      type: "CONTENT_ACTION",
    data: {
      url: window.location.href,
      title: document.title,
        selectedText: window.getSelection().toString(),
      },
    },
    (response) => {
      console.log("Background script response:", response);
    }
  );
}

// 側邊欄相關變數
let sidebarContainer = null;
let sidebarVisible = false;
let extensionVersion = "0.1.0"; // 預設版本號

// 讀取版本號並更新側邊欄顯示
(async () => {
  try {
    const versionUrl = chrome.runtime.getURL("version.json");
    const response = await fetch(versionUrl);
    if (response.ok) {
      const versionData = await response.json();
      extensionVersion = versionData.version || extensionVersion;
      // 如果側邊欄已創建，更新版本號顯示
      if (sidebarContainer) {
        const versionBadge =
          sidebarContainer.querySelector(".cz-version-badge");
        if (versionBadge) {
          versionBadge.textContent = `v${extensionVersion}`;
        }
      }
    }
  } catch (error) {
    console.log("無法讀取版本號，使用預設值:", error);
  }
})();

// 確保 CSS 樣式被注入到指定文檔中
function ensureCSSInjected(targetDocument) {
  // 檢查是否已經注入過 CSS
  if (targetDocument.getElementById("cz-assist-styles")) {
    return;
  }
  
  // 創建 style 元素
  const styleElement = targetDocument.createElement("style");
  styleElement.id = "cz-assist-styles";
  styleElement.textContent = `
    /* 側邊欄樣式 */
    .cz-sidebar-container {
      position: fixed !important;
      top: 0 !important;
      right: -400px !important;
      width: 400px !important;
      height: 100vh !important;
      background: white !important;
      border-left: 1px solid #e1e5e9 !important;
      box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1) !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 14px !important;
      line-height: 1.5 !important;
      color: #333 !important;
      transition: right 0.3s ease-in-out !important;
      overflow-y: auto !important;
      box-sizing: border-box !important;
    }
    
    .cz-sidebar-container.cz-sidebar-visible {
      right: 0 !important;
    }
    
    .cz-sidebar-header {
      padding: 0px 10px !important;
      background: #f8f9fa !important;
      border-bottom: 1px solid #e1e5e9 !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      position: sticky !important;
      top: 0 !important;
      z-index: 10 !important;
    }
    
    .cz-sidebar-header > div {
      display: flex !important;
      flex-direction: column !important;
      gap: 4px !important;
    }
    
    .cz-sidebar-header h3 {
      margin: 0 !important;
      font-size: 16px !important;
      font-weight: 600 !important;
      color: #2c3e50 !important;
    }
    
    .cz-version-badge {
      font-size: 14px !important;
      color: #6c757d !important;
      font-weight: 500 !important;
      letter-spacing: 0.3px !important;
    }
    
    .cz-sidebar-close {
      background: none !important;
      border: none !important;
      font-size: 20px !important;
      cursor: pointer !important;
      color: #666 !important;
      padding: 4px 8px !important;
      border-radius: 4px !important;
      transition: background-color 0.2s !important;
    }
    
    .cz-sidebar-close:hover {
      background: #e9ecef !important;
      color: #333 !important;
    }
    
    .cz-sidebar-body {
      padding: 20px !important;
    }
    
    .cz-sidebar-body > div {
      margin-bottom: 24px !important;
    }
    
    .cz-sidebar-body h4 {
      margin: 0 0 12px 0 !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      color: #495057 !important;
    }
    
    .cz-form-group {
      margin-bottom: 16px !important;
    }
    
    .cz-form-group label {
      display: block !important;
      margin-bottom: 4px !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      color: #495057 !important;
    }
    
    .cz-form-group input,
    .cz-form-group select {
      width: 100% !important;
      padding: 8px 12px !important;
      border: 1px solid #ced4da !important;
      border-radius: 4px !important;
      font-size: 14px !important;
      box-sizing: border-box !important;
      transition: border-color 0.15s ease-in-out !important;
      color: #333 !important;
      background-color: #fff !important;
    }
    
    .cz-form-group input:focus,
    .cz-form-group select:focus {
      outline: none !important;
      border-color: #007bff !important;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25) !important;
    }
    
    .cz-btn {
      display: inline-block !important;
      padding: 8px 16px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      text-align: center !important;
      text-decoration: none !important;
      border: 1px solid transparent !important;
      border-radius: 4px !important;
      cursor: pointer !important;
      transition: all 0.15s ease-in-out !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    
    .cz-btn-primary {
      color: white !important;
      background-color: #007bff !important;
      border-color: #007bff !important;
    }
    
    .cz-btn-primary:hover {
      background-color: #0056b3 !important;
      border-color: #0056b3 !important;
    }
    
    .cz-btn-secondary {
      color: #495057 !important;
      background-color: #6c757d !important;
      border-color: #6c757d !important;
    }
    
    .cz-btn-secondary:hover {
      background-color: #545b62 !important;
      border-color: #545b62 !important;
    }
    
    .cz-btn-info {
      color: white !important;
      background-color: #17a2b8 !important;
      border-color: #17a2b8 !important;
    }
    
    .cz-btn-info:hover {
      background-color: #138496 !important;
      border-color: #138496 !important;
    }
    
    .cz-btn-danger {
      color: white !important;
      background-color: #dc3545 !important;
      border-color: #dc3545 !important;
    }
    
    .cz-btn-danger:hover {
      background-color: #c82333 !important;
      border-color: #c82333 !important;
    }
    
    /* 自動化步驟提示樣式 */
    .cz-step-item {
      transition: all 0.3s ease !important;
    }
    
    .cz-step-item.cz-step-completed {
      color: #155724 !important;
      background: #d4edda !important;
      border-radius: 4px !important;
      padding: 4px 8px !important;
      margin: 2px 0 !important;
    }
    
    .cz-step-item.cz-step-completed .cz-step-icon {
      color: #28a745 !important;
    }
    
    .cz-step-item.cz-step-completed .cz-step-text {
      text-decoration: line-through !important;
    }
    
    /* 銀行資訊顯示樣式 */
    .cz-bank-info {
      margin-top: 16px !important;
      padding: 12px !important;
      background: #f8f9fa !important;
      border: 1px solid #e1e5e9 !important;
      border-radius: 4px !important;
    }
    
    .cz-bank-info h5 {
      margin: 0 0 8px 0 !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      color: #495057 !important;
    }
    
    .cz-info-item {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-bottom: 4px !important;
      font-size: 12px !important;
    }
    
    .cz-info-item label {
      font-weight: 500 !important;
      color: #6c757d !important;
      margin: 0 !important;
    }
    
    .cz-info-item span {
      font-weight: 600 !important;
      color: #2c3e50 !important;
    }
    
    /* 狀態訊息樣式 */
    .cz-error {
      color: #dc3545 !important;
      background: #f8d7da !important;
      border: 1px solid #f5c6cb !important;
      padding: 8px 12px !important;
      border-radius: 4px !important;
      font-size: 12px !important;
      margin-top: 8px !important;
    }
    
    .cz-success {
      color: #155724 !important;
      background: #d4edda !important;
      border: 1px solid #c3e6cb !important;
      padding: 8px 12px !important;
      border-radius: 4px !important;
      font-size: 12px !important;
      margin-top: 8px !important;
    }
    
    .cz-info {
      color: #0c5460 !important;
      background: #d1ecf1 !important;
      border: 1px solid #bee5eb !important;
      padding: 8px 12px !important;
      border-radius: 4px !important;
      font-size: 12px !important;
      margin-top: 8px !important;
    }
    
    /* 查詢設定區塊樣式 */
    .cz-query-settings {
      background: #f8f9fa !important;
      border: 1px solid #e1e5e9 !important;
      border-radius: 4px !important;
      padding: 16px !important;
      margin-bottom: 16px !important;
    }
    
    .cz-query-settings h4 {
      margin: 0 0 12px 0 !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      color: #495057 !important;
    }
    
    .cz-query-settings small {
      display: block !important;
      margin-top: 4px !important;
      font-size: 11px !important;
      color: #6c757d !important;
      line-height: 1.3 !important;
    }
  `;
  
  // 將樣式添加到文檔頭部
  const head =
    targetDocument.head || targetDocument.getElementsByTagName("head")[0];
  if (head) {
    head.appendChild(styleElement);
    console.log("CSS 樣式已注入到頂層文檔");
  }
}

// 創建側邊欄
function createSidebar() {
  if (sidebarContainer) return sidebarContainer;
  
  // 先在當前文檔中創建側邊欄，然後嘗試重新定位
  console.log("在當前文檔中創建側邊欄");
  const currentDocument = document;
  const currentBody = currentDocument.documentElement;
  
  if (!currentBody) {
    console.warn("無法找到當前文檔的 body 元素");
    return null;
  }
  
  // 確保 CSS 樣式被注入到當前文檔
  ensureCSSInjected(currentDocument);
  
  // 創建側邊欄容器
  sidebarContainer = currentDocument.createElement("div");
  sidebarContainer.id = "cz-assist-sidebar";
  sidebarContainer.className = "cz-sidebar-container";
  
  // 創建側邊欄內容
  const sidebarContent = `
    <div class="cz-sidebar-header">
      <div>
        <span class="cz-version-badge">v${extensionVersion}</span>
      </div>
      <button class="cz-sidebar-close">×</button>
    </div>
    <div class="cz-sidebar-body">
      
      <div class="cz-auto-login">
        <h4>自動登入設定</h4>
        <div class="cz-form-group">
          <label for="cz-bank-id">銀行代號：</label>
          <input type="text" id="cz-bank-id" placeholder="請輸入銀行代號" value="${
            BANK_CONFIGS[currentBank].loginData.bankId || ""
          }">
        </div>
        <button class="cz-btn cz-btn-primary" data-action="fetchBankInfo">
          查詢
        </button>
        <button class="cz-btn cz-btn-primary" data-action="autoLogin" id="cz-auto-login-btn" disabled style="background-color: #6c757d !important; border-color: #6c757d !important; cursor: not-allowed !important; margin-top: 12px;">
          在新分頁中登入
        </button>
        <div class="cz-bank-info" id="cz-bank-info" style="display: none;">
          <h5>銀行資訊</h5>
          <div class="cz-info-item">
            <label>銀行名稱：</label>
            <span id="cz-bank-name"></span>
        </div>
          <div class="cz-info-item">
            <label>統編：</label>
            <span id="cz-company-no"></span>
        </div>
        </div>
      </div>
      
      <div class="cz-automation">
        <h4>自動化交易查詢</h4>
        <div class="cz-form-group">
          <label for="cz-query-days">查詢天數（往前推算）：</label>
          <input type="number" id="cz-query-days" min="0" max="90" value="${
            window.czAssistExtension.settings.queryDaysBack || 0
          }">
        </div>
        
        <div class="cz-automation-notice" id="cz-automation-notice" style="display: block; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 12px; margin-bottom: 12px; font-size: 12px; color: #856404;">
          <strong>⚠️ 自動化如已停止，請依序操作：</strong>
          <div style="margin-top: 8px;">
            <div id="cz-step-1" class="cz-step-item" style="padding: 4px 0; display: flex; align-items: center;">
              <span class="cz-step-icon" style="margin-right: 8px;">①</span>
              <span class="cz-step-text">請按查詢鍵</span>
            </div>
            <div id="cz-step-2" class="cz-step-item" style="padding: 4px 0; display: flex; align-items: center;">
              <span class="cz-step-icon" style="margin-right: 8px;">②</span>
              <span class="cz-step-text">請點擊「停止自動查詢」</span>
            </div>
            <div id="cz-step-3" class="cz-step-item" style="padding: 4px 0; display: flex; align-items: center;">
              <span class="cz-step-icon" style="margin-right: 8px;">③</span>
              <span class="cz-step-text">請點擊「開始自動查詢」</span>
            </div>
          </div>
        </div>
        <button class="cz-btn cz-btn-primary" data-action="fetchBankInfo">
          1. 查詢
        </button>
        <div class="cz-automation-controls" style="margin-top: 12px;">
          <button class="cz-btn cz-btn-danger" data-action="stopAutomation" id="cz-stop-btn" style="display: none;">
            2. 停止自動查詢
          </button>
          <button class="cz-btn cz-btn-info" data-action="startAutomation" id="cz-start-btn" disabled style="background-color: #6c757d !important; border-color: #6c757d !important; cursor: not-allowed !important;">
            3. 開始自動查詢
          </button>
        </div>
        <div class="cz-automation-status" id="cz-automation-status">
          <div class="cz-status-text">等待開始自動化查詢...</div>
          <div class="cz-progress-bar" style="display: none;">
            <div class="cz-progress" id="cz-progress"></div>
          </div>
        </div>
        
        <div class="cz-query-results" id="cz-query-results">
          <h5>查詢結果</h5>
          <div class="cz-results-list" id="cz-results-list">
            暫無查詢結果
          </div>
        </div>
      </div>
    </div>
  `;
  
  sidebarContainer.innerHTML = sidebarContent;
  
  // 添加事件監聽器
  const autoHighlightCheckbox =
    sidebarContainer.querySelector("#cz-auto-highlight");
  const notificationsCheckbox =
    sidebarContainer.querySelector("#cz-notifications");
  const closeButton = sidebarContainer.querySelector(".cz-sidebar-close");
  const actionButtons = sidebarContainer.querySelectorAll("[data-action]");

  // 銀行代號輸入框
  const bankIdField = sidebarContainer.querySelector("#cz-bank-id");

  // 查詢天數設定輸入框
  const queryDaysField = sidebarContainer.querySelector("#cz-query-days");
  
  // 關閉按鈕事件
  closeButton?.addEventListener("click", () => {
    hideSidebar();
  });
  
  // 功能按鈕事件
  actionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.getAttribute("data-action");
      
      if (action && window.czAssistUtils[action]) {
        window.czAssistUtils[action]();
      }
    });
  });
  
  // 設定複選框事件
  autoHighlightCheckbox?.addEventListener("change", (e) => {
    window.czAssistExtension.settings.autoExecute = e.target.checked;
    chrome.runtime.sendMessage({
      type: "STORE_DATA",
      key: "settings",
      value: window.czAssistExtension.settings,
    });
  });
  
  notificationsCheckbox?.addEventListener("change", (e) => {
    window.czAssistExtension.settings.notifications = e.target.checked;
    chrome.runtime.sendMessage({
      type: "STORE_DATA",
      key: "settings",
      value: window.czAssistExtension.settings,
    });
  });
  
  // 銀行代號輸入框事件監聽器
  bankIdField?.addEventListener("input", (e) => {
    // 輸入驗證邏輯
    const value = e.target.value.trim();
    if (value && !/^\d+$/.test(value)) {
      e.target.setCustomValidity("請輸入數字");
    } else {
      e.target.setCustomValidity("");
    }

    // 儲存銀行代號值
    saveBankIdValue();
  });

  // 查詢天數設定輸入框事件監聽器
  queryDaysField?.addEventListener("input", (e) => {
    const value = parseInt(e.target.value);
    console.log(`=== 查詢天數輸入事件 ===`);
    console.log(`輸入值: ${e.target.value}, 解析後: ${value}`);
    
    if (value >= 0 && value <= 90) {
      window.czAssistExtension.settings.queryDaysBack = value;
      console.log(`更新記憶體中的設定:`, window.czAssistExtension.settings);
      
      chrome.storage.local.set(
        {
        settings: window.czAssistExtension.settings,
        },
        () => {
        console.log(`已保存到 Chrome Storage`);
        // 驗證是否保存成功
          chrome.storage.local.get(["settings"], (result) => {
          console.log(`從 Chrome Storage 讀取驗證:`, result.settings);
        });
        }
      );
      
      console.log(`查詢天數已更新為: ${value}天`);
      
      // 根據天數顯示不同的訊息
      if (value === 0) {
        window.czAssistUtils.showNotification(
          `查詢範圍已設定為僅查詢今天`,
          "success"
        );
      } else {
        window.czAssistUtils.showNotification(
          `查詢範圍已設定為${value}天前至今天`,
          "success"
        );
      }
    } else {
      e.target.setCustomValidity("請輸入0-90之間的數字");
    }
  });

  queryDaysField?.addEventListener("change", (e) => {
    const value = parseInt(e.target.value);
    if (value >= 0 && value <= 90) {
      e.target.setCustomValidity("");
    }
  });
  
  currentBody.appendChild(sidebarContainer);
  
  // 嘗試將側邊欄重新定位到頂層文檔
  // setTimeout(() => {
  //   relocateSidebarToTop();
  // }, 100); // 短暫延遲確保側邊欄已完全創建
  
  return sidebarContainer;
}

// 顯示側邊欄
function showSidebar() {
  if (!sidebarContainer) {
    createSidebar();
  }
  sidebarContainer.classList.add("cz-sidebar-visible");
  sidebarVisible = true;
  
  // 更新版本號顯示
  const versionBadge = sidebarContainer.querySelector(".cz-version-badge");
  if (versionBadge) {
    versionBadge.textContent = `v${extensionVersion}`;
  }
  
  // 更新頁面信息
  const titleElement = sidebarContainer.querySelector(".cz-page-title");
  const urlElement = sidebarContainer.querySelector(".cz-page-url");
  if (titleElement) titleElement.textContent = document.title;
  if (urlElement) urlElement.textContent = window.location.href;
  
  // 恢復銀行代號的值
  const bankIdField = sidebarContainer.querySelector("#cz-bank-id");
  if (bankIdField && window.czAssistExtension.savedBankId) {
    bankIdField.value = window.czAssistExtension.savedBankId;
  }

  // 恢復查詢天數的值
  const queryDaysField = sidebarContainer.querySelector("#cz-query-days");
  if (queryDaysField) {
    queryDaysField.value = window.czAssistExtension.settings.queryDaysBack || 0;
  }
  
  // 更新國泰世華的提示訊息
  // const automationControls = sidebarContainer.querySelector(".cz-automation-controls");
  // if (automationControls) {
  //   // 檢查是否已有提示訊息
  //   let noticeElement = sidebarContainer.querySelector(".cz-automation-notice");
    
  //   if (window.czAssistExtension.selectedBank === "cathay" || window.czAssistExtension.selectedBank === "hncb") {
  //     // 如果是國泰世華或華南商銀且沒有提示訊息，則添加
  //     if (!noticeElement) {
  //       noticeElement = document.createElement("div");
  //       noticeElement.className = "cz-automation-notice";
  //       noticeElement.style.cssText = "background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 12px; margin-bottom: 12px; font-size: 12px; color: #856404;";
  //       noticeElement.innerHTML = "<strong>⚠️ 提示：</strong>自動化前須點擊提交上方查詢按鈕";
  //       automationControls.parentNode.insertBefore(noticeElement, automationControls);
  //     }
  //   } else {
  //     // 如果不是國泰世華或華南商銀且有提示訊息，則移除
  //     if (noticeElement) {
  //       noticeElement.remove();
  //     }
  //   }
  // }
}

// 儲存銀行代號的值
function saveBankIdValue() {
  const bankIdField = document.getElementById("cz-bank-id");
  if (bankIdField) {
    window.czAssistExtension.savedBankId = bankIdField.value;
    chrome.storage.local.set({ savedBankId: bankIdField.value });
  }
}

// 隱藏側邊欄
function hideSidebar() {
  if (sidebarContainer) {
    sidebarContainer.classList.remove("cz-sidebar-visible");
  }
  sidebarVisible = false;
}

// 切換側邊欄顯示狀態
function toggleSidebar() {
  // 如果在 frame 中且無法直接訪問頂層，使用 postMessage
  if (window !== window.top && !sidebarContainer) {
    try {
      window.top.postMessage(
        {
          type: "CZ_TOGGLE_SIDEBAR",
          source: "cz-assist-extension",
        },
        "*"
      );
      
      // 監聽回應
      window.addEventListener("message", function (event) {
        if (event.data && event.data.type === "CZ_SIDEBAR_TOGGLED") {
          sidebarVisible = event.data.visible;
          console.log("側邊欄狀態已更新:", sidebarVisible);
        }
      });
      
      return;
    } catch (e) {
      console.error("無法發送切換消息:", e);
    }
  }
  
  // 原有邏輯
  if (sidebarVisible) {
    hideSidebar();
  } else {
    showSidebar();
  }
}

// 監聽來自背景腳本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request);
  
  switch (request.type) {
    case "PING":
    case "GET_STATUS":
      {
        const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
        sendResponse({ 
            success: true,
            isRunning: window.czAssistExtension.automation.isRunning,
            currentStep: window.czAssistExtension.automation.currentStep,
            queryResults: window.czAssistExtension.automation.queryResults,
          bankInfo: bankConfig
            ? {
                name: bankConfig.name,
                configKey: window.czAssistExtension.selectedBank,
                bankId: bankConfig.loginData?.bankId,
                companyId: bankConfig.loginData?.companyId,
                userId: bankConfig.loginData?.userId,
              }
            : null,
        });
        
        // Also send STATUS_UPDATE to be sure
        chrome.runtime
          .sendMessage({
            type: "STATUS_UPDATE",
             data: {
                 isRunning: window.czAssistExtension.automation.isRunning,
              currentStep: window.czAssistExtension.automation.currentStep,
            },
          })
          .catch(() => {});
      }
      break;

    case "START_AUTOMATION":
      if (!window.czAssistExtension.automation.isRunning) {
          if (window.czAssistUtils && window.czAssistUtils.startAutomation) {
              window.czAssistUtils.startAutomation();
              sendResponse({ success: true });
          }
      }
      break;

    case "STOP_AUTOMATION":
      if (window.czAssistExtension.automation.isRunning) {
          window.czAssistExtension.automation.isRunning = false;
          window.czAssistUtils.updateAutomationStatus("使用者停止自動化");
          sendResponse({ success: true });
      }
      break;

    case "AUTO_LOGIN":
      if (window.czAssistUtils && window.czAssistUtils.autoLogin) {
        window.czAssistUtils
          .autoLogin()
          .then((result) => sendResponse(result))
          .catch((err) => sendResponse(err));
          return true;
      }
      break;

    case "FETCH_BANK_INFO":
      if (window.czAssistUtils && window.czAssistUtils.fetchBankInfo) {
          const bankId = request.data && request.data.bankId;
          
          // execute async and return result
        window.czAssistUtils.fetchBankInfo(bankId).then((result) => {
              sendResponse(result);
              
              // Also trigger status update if successful
              if (result && result.success) {
            const bankConfig =
              BANK_CONFIGS[window.czAssistExtension.selectedBank];
            chrome.runtime
              .sendMessage({
                type: "STATUS_UPDATE",
                        data: {
                  bankInfo: bankConfig
                    ? {
                                name: bankConfig.name,
                                configKey: window.czAssistExtension.selectedBank,
                                bankId: bankConfig.loginData?.bankId || bankId,
                                companyId: bankConfig.loginData?.companyId,
                        userId: bankConfig.loginData?.userId,
                        }
                    : null,
                },
              })
              .catch(() => {});
              }
          });
          
          return true; // Keep channel open
      }
      break;

    case "TOGGLE_SIDEBAR":
      if (window.czAssistUtils && window.czAssistUtils.toggleSidebar) {
        window.czAssistUtils.toggleSidebar();
        sendResponse({ success: true });
      } else {
        sendResponse({
          success: false,
          message: "toggleSidebar not available",
        });
      }
      break;
      
    case "GET_PAGE_INFO":
      sendResponse({
        url: window.location.href,
        title: document.title,
        selectedText: window.getSelection().toString(),
      });
      break;
      
    case "EXECUTE_FUNCTION":
      // 執行特定功能
      if (typeof window[request.functionName] === "function") {
        const result = window[request.functionName](request.args);
        sendResponse({ result });
      }
      break;
      
    case "UPDATE_SETTINGS":
      window.czAssistExtension.settings = {
        ...window.czAssistExtension.settings,
        ...request.settings,
        ...request.data, // Accept from data too
      };
      // Persist settings
      chrome.storage.local.set({
        settings: window.czAssistExtension.settings,
      });
      sendResponse({ success: true });
      break;
      
    default:
      console.log("Unknown message type:", request.type);
  }
  
  return true; // Keep channel open for async response
});

// 頁面載入完成後初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeContentScript);
} else {
  initializeContentScript();
}

// 導出一些實用函數供其他腳本使用
window.czAssistUtils = {
  // 獲取台灣企銀目標帳號（從 API 的 Carder 獲取，如果沒有則使用預設值）
  getTbbTargetAccount: () => {
    if (window.czAssistExtension.tbbTargetAccount) {
      return window.czAssistExtension.tbbTargetAccount;
    }
    // 如果沒有從 API 獲取，使用預設值
    return TBB_TARGET_ACCOUNT;
  },
  
  // 獲取國泰世華目標帳號（從 API 的 Carder 獲取，去掉前綴 0000）
  getCathayTargetAccount: () => {
    if (window.czAssistExtension.cathayTargetAccount) {
      return window.czAssistExtension.cathayTargetAccount;
    }
    // 如果沒有從 API 獲取，返回 null（需要從 API 獲取）
    return null;
  },
  
  // 獲取華南商銀目標帳號（從 API 的 Carder 獲取，去掉前綴 0000）
  getHncbTargetAccount: () => {
    if (window.czAssistExtension.hncbTargetAccount) {
      return window.czAssistExtension.hncbTargetAccount;
    }
    // 如果沒有從 API 獲取，返回 null（需要從 API 獲取）
    return null;
  },
  
  // 計算查詢日期範圍（通用函數）
  calculateQueryDateRange: () => {
    // 使用 ?? 運算符而不是 || ，避免 0 被視為 falsy
    const daysBack = window.czAssistExtension.settings.queryDaysBack ?? 0;
    console.log(
      `calculateQueryDateRange 被調用，queryDaysBack = ${window.czAssistExtension.settings.queryDaysBack}, 使用值 = ${daysBack}`
    );
    
    const today = new Date();
    const startDate = new Date(today);

    // 計算N天前的日期（如果 daysBack 為 0，則開始日期也是今天）
    if (daysBack > 0) {
      startDate.setDate(today.getDate() - daysBack);
    }

    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}/${month}/${day}`;
    };

    const result = {
      startDate: formatDate(startDate),
      endDate: formatDate(today),
      daysBack: daysBack,
    };

    // 根據查詢天數顯示不同的日誌訊息
    if (daysBack === 0) {
      console.log(`查詢日期範圍: ${result.startDate} (僅查詢今天)`);
    } else {
      console.log(
        `查詢日期範圍: ${result.startDate} - ${result.endDate} (${daysBack}天前至今天)`
      );
    }
    
    return result;
  },

  // 獲取頁面中的所有連結
  getAllLinks: () => {
    return Array.from(document.querySelectorAll("a")).map((link) => ({
      text: link.textContent.trim(),
      href: link.href,
    }));
  },
  
  // 獲取頁面中的所有圖片
  getAllImages: () => {
    return Array.from(document.querySelectorAll("img")).map((img) => ({
      src: img.src,
      alt: img.alt,
    }));
  },
  
  // 高亮顯示文字
  highlightText: (text, className = "cz-highlight") => {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.includes(text)) {
        textNodes.push(node);
      }
    }
    
    textNodes.forEach((textNode) => {
      const parent = textNode.parentNode;
      const wrapper = document.createElement("span");
      wrapper.className = className;
      wrapper.innerHTML = textNode.nodeValue.replace(
        new RegExp(text, "gi"),
        `<mark>${text}</mark>`
      );
      parent.replaceChild(wrapper, textNode);
    });
  },
  
  // 側邊欄相關函數
  closeSidebar: () => {
    hideSidebar();
  },
  
  showNotification: (message, type = "info") => {
    const notification = document.createElement("div");
    notification.className = `cz-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  },
  
  updateResults: (content) => {
    const resultsContent = sidebarContainer?.querySelector(
      ".cz-results-content"
    );
    if (resultsContent) {
      resultsContent.innerHTML = content;
    }
  },
  
  // 分析頁面內容
  analyzePageContent: () => {
    const links = window.czAssistUtils.getAllLinks();
    const images = window.czAssistUtils.getAllImages();
    const headings = Array.from(
      document.querySelectorAll("h1, h2, h3, h4, h5, h6")
    ).map((h) => ({
      level: h.tagName,
      text: h.textContent.trim(),
    }));
    
    const analysis = `
      <div class="cz-analysis-result">
        <p><strong>連結數量：</strong> ${links.length}</p>
        <p><strong>圖片數量：</strong> ${images.length}</p>
        <p><strong>標題數量：</strong> ${headings.length}</p>
        <p><strong>文字長度：</strong> ${document.body.textContent.length} 字符</p>
      </div>
    `;
    
    window.czAssistUtils.updateResults(analysis);
    window.czAssistUtils.showNotification("頁面分析完成", "success");
  },
  
  // 高亮所有連結
  highlightLinks: () => {
    const links = document.querySelectorAll("a");
    links.forEach((link) => {
      link.style.outline = "2px solid #007bff";
      link.style.backgroundColor = "rgba(0, 123, 255, 0.1)";
    });
    
    window.czAssistUtils.updateResults(`已高亮 ${links.length} 個連結`);
    window.czAssistUtils.showNotification(
      `已高亮 ${links.length} 個連結`,
      "success"
    );
  },
  
  // 提取圖片
  extractImages: () => {
    const images = window.czAssistUtils.getAllImages();
    let imageList = '<div class="cz-image-list">';
    
    images.slice(0, 10).forEach((img) => {
      imageList += `
        <div class="cz-image-item">
          <img src="${img.src}" alt="${
        img.alt
      }" style="max-width: 100px; max-height: 60px;">
          <p>${img.alt || "無描述"}</p>
        </div>
      `;
    });
    
    if (images.length > 10) {
      imageList += `<p>... 還有 ${images.length - 10} 張圖片</p>`;
    }
    
    imageList += "</div>";
    
    window.czAssistUtils.updateResults(imageList);
    window.czAssistUtils.showNotification(
      `找到 ${images.length} 張圖片`,
      "success"
    );
  },

  // 獲取銀行資訊功能
  fetchBankInfo: async (providedBankId) => {
    console.log("fetchBankInfo 開始執行", providedBankId);

    let bankId = providedBankId;

    if (!bankId) {
        // Fallback: try to find in DOM (deprecated) or fail
        const bankIdField = document.getElementById("cz-bank-id");
        if (bankIdField) {
            bankId = bankIdField.value.trim();
        }
    }

    // 驗證輸入
    if (!bankId) {
      window.czAssistUtils.showNotification("請輸入銀行代號", "error");
      return { success: false, message: "請輸入銀行代號" };
    }

    if (!/^\d+$/.test(bankId)) {
      window.czAssistUtils.showNotification("銀行代號必須是數字", "error");
      return { success: false, message: "銀行代號必須是數字" };
    }

    try {
      // 呼叫 API
      if (useConfig) {
        window.czAssistUtils.showNotification("測試模式已停用", "error");
        return { success: false, message: "測試模式已停用" };
      } else {
        const response = await fetch(`${API_URL}/user`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              BankID: parseInt(bankId),
            }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("API 回應:", data);

        // data.BankID = 1012;
        // data.BankName = "台中銀行";
        // data.CompanyNo = "60597458";
        // data.User = "BUP776655";
        // data.Pass = "DLX887";

        // 根據 BankName 找到對應的配置
        const selectedBankKey = bankNameMap[data.BankName];
        if (selectedBankKey && BANK_CONFIGS[selectedBankKey]) {
          // 套用銀行設定
          window.czAssistUtils.applyBankConfig(data.BankID, data);
          window.czAssistUtils.showNotification("銀行資訊查詢成功", "success");
          
          return { 
              success: true, 
              data: {
                  BankName: data.BankName,
                  CompanyNo: data.CompanyNo,
                  User: data.User,
              ConfigName: `${BANK_CONFIGS[selectedBankKey].name} (${selectedBankKey})`,
            },
          };
        } else {
          window.czAssistUtils.showNotification(
            `此銀行尚未支援: ${data.BankName}`,
            "error"
          );
          return {
            success: false,
            message: `此銀行尚未支援: ${data.BankName}`,
          };
        }
      }
    } catch (error) {
      console.error("查詢銀行資訊失敗:", error);
      window.czAssistUtils.showNotification("查詢銀行資訊失敗", "error");
      return { success: false, message: `查詢失敗: ${error.message}` };
    }
  },

  // 套用銀行設定
  applyBankConfig: (bankId, apiData) => {
    console.log("套用銀行設定，BankName:", apiData.BankName);

    // 根據 BankName 對應到 BANK_CONFIGS
    let selectedBankKey = null;

    // 根據 BankName 映射到對應的銀行設定
    if (apiData.BankName && bankNameMap[apiData.BankName]) {
      selectedBankKey = bankNameMap[apiData.BankName];
    } else {
      console.warn("此銀行尚未支援:", apiData.BankName);
      window.czAssistUtils.showNotification(
        `此銀行尚未支援: ${apiData.BankName}`,
        "error"
      );
      return; // 找不到配置就不繼續
    }

    if (selectedBankKey && BANK_CONFIGS[selectedBankKey]) {
      // 更新全域設定
      window.czAssistExtension.selectedBank = selectedBankKey;

      // 儲存到 chrome.storage，使用 API 回傳的資料
      chrome.storage.local.set({
        selectedBank: selectedBankKey,
        apiLoginData: {
          bankId: bankId,
          companyNo: apiData.CompanyNo,
          user: apiData.User,
          pass: apiData.Pass,
          bankName: apiData.BankName,
          bankSite: apiData.BankSite,
          carder: apiData.Carder,
          timestamp: Date.now(),
        },
      });
      
      // 如果是台灣企銀，更新目標帳號（從 API 的 Carder 獲取）
      if (selectedBankKey === "tbb" && apiData.Carder) {
        window.czAssistExtension.tbbTargetAccount = apiData.Carder;
        console.log("已更新台灣企銀目標帳號:", apiData.Carder);
      }
      
      // 如果是國泰世華，更新目標帳號（從 API 的 Carder 獲取，去掉前綴 0000）
      if (selectedBankKey === "cathay" && apiData.Carder) {
        const carder = apiData.Carder;
        // 去掉前綴 "0000"
        const targetAccount = carder.startsWith("0000")
          ? carder.substring(4)
          : carder;
        window.czAssistExtension.cathayTargetAccount = targetAccount;
        console.log("已更新國泰世華目標帳號:", carder, "->", targetAccount);
      }
      
      // 如果是華南商銀，更新目標帳號（從 API 的 Carder 獲取，去掉前綴 0000）
      if (selectedBankKey === "hncb" && apiData.Carder) {
        const carder = apiData.Carder;
        // 去掉前綴 "0000"
        const targetAccount = carder.startsWith("0000")
          ? carder.substring(4)
          : carder;
        window.czAssistExtension.hncbTargetAccount = targetAccount;
        console.log("已更新華南商銀目標帳號:", carder, "->", targetAccount);
      }

      console.log(`已套用銀行設定: ${BANK_CONFIGS[selectedBankKey].name}`);
      window.czAssistUtils.showNotification(
        `已套用${BANK_CONFIGS[selectedBankKey].name}設定`,
        "success"
      );
      
      // 更新側邊欄 UI 顯示銀行資訊
      const bankInfoDiv = document.getElementById("cz-bank-info");
      const bankNameSpan = document.getElementById("cz-bank-name");
      const bankConfigSpan = document.getElementById("cz-bank-config");
      const companyNoSpan = document.getElementById("cz-company-no");
      const userAccountSpan = document.getElementById("cz-user-account");
      
      if (bankInfoDiv) {
        bankInfoDiv.style.display = "block";
      }
      
      // 啟用「在新分頁中登入」和「開始自動查詢」按鈕
      const autoLoginBtn = document.getElementById("cz-auto-login-btn");
      const startBtn = document.getElementById("cz-start-btn");
      
      if (autoLoginBtn) {
        autoLoginBtn.disabled = false;
        autoLoginBtn.style.backgroundColor = "#007bff";
        autoLoginBtn.style.borderColor = "#007bff";
        autoLoginBtn.style.cursor = "pointer";
      }
      
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.style.backgroundColor = "#007bff";
        startBtn.style.borderColor = "#007bff";
        startBtn.style.cursor = "pointer";
      }
      
      if (bankNameSpan) {
        bankNameSpan.textContent = apiData.BankName || "未知";
      }
      
      if (bankConfigSpan) {
        bankConfigSpan.textContent = `${BANK_CONFIGS[selectedBankKey].name} (${selectedBankKey})`;
      }
      
      if (companyNoSpan) {
        companyNoSpan.textContent = apiData.CompanyNo || "未提供";
      }
      
      if (userAccountSpan) {
        userAccountSpan.textContent = apiData.User || "未提供";
      }
    }
  },

  // 自動登入功能（使用 API 數據）
  autoLogin: () => {
    return new Promise((resolve, reject) => {
    console.log("autoLogin 開始執行");

    // 從 chrome.storage 中讀取 API 登入資料
    chrome.storage.local.get(["apiLoginData"], (result) => {
      const apiData = result.apiLoginData;
      if (!apiData) {
        window.czAssistUtils.showNotification("請先查詢銀行資訊", "error");
            reject({ success: false, message: "請先查詢銀行資訊" });
        return;
      }

      // 檢查資料是否過期（30分鐘）
      const now = Date.now();
      const dataAge = now - (apiData.timestamp || 0);
      if (dataAge > 30 * 60 * 1000) {
        window.czAssistUtils.showNotification("銀行資訊已過期", "error");
            reject({ success: false, message: "銀行資訊已過期，請重新查詢" });
        return;
      }
    
    // 從銀行設定檔取得登入網址
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    const loginUrl = bankConfig?.loginUrl;
    
      if (!loginUrl) {
        window.czAssistUtils.showNotification("找不到銀行登入網址", "error");
            reject({ success: false, message: "找不到銀行登入網址" });
      return;
    }

      console.log("使用 API 資料進行登入:", {
        bankName: apiData.bankName,
        companyNo: apiData.companyNo,
        user: apiData.user,
      });
    
    // 儲存登入資料到 chrome.storage 中，以便在新分頁中使用
        chrome.storage.local.set(
          {
      loginData: {
          companyId: apiData.companyNo,
          userId: apiData.user,
          password: apiData.pass,
          loginUrl: loginUrl,
          timestamp: Date.now(),
        },
          },
          () => {
              // 在新分頁中開啟登入頁面 (Wait for storage set callback)
      chrome.runtime.sendMessage(
        {
          type: "OPEN_LOGIN_TAB",
          loginUrl: loginUrl,
        },
        (response) => {
      if (response && response.success) {
                    console.log("登入頁面已在新分頁開啟");
                  if (
                    window.czAssistUtils &&
                    window.czAssistUtils.showNotification
                  ) {
                    window.czAssistUtils.showNotification(
                      "登入頁面已在新分頁開啟",
                      "success"
                    );
                    }
                    resolve({ success: true });
      } else {
                    console.error("無法開啟新分頁");
                  if (
                    window.czAssistUtils &&
                    window.czAssistUtils.showNotification
                  ) {
                    window.czAssistUtils.showNotification(
                      "無法開啟新分頁",
                      "error"
                    );
                    }
                    reject({ success: false, message: "無法開啟新分頁" });
      }
              }
            );
        }
      );
        });
    });
  },

  // 自動填入表單
  autoFillForm: () => {
    // 從 chrome.storage 中讀取登入資料
    chrome.storage.local.get(["loginData"], (result) => {
      const loginData = result.loginData;
      if (!loginData) {
        console.log("沒有找到登入資料");
        return;
      }
      
      // 檢查資料是否過期（30分鐘）
      const now = Date.now();
      const dataAge = now - (loginData.timestamp || 0);
      if (dataAge > 30 * 60 * 1000) {
        console.log("登入資料已過期");
        return;
      }
      
      console.log("找到登入資料，開始自動填入表單");
      window.czAssistUtils.fillLoginFormWithData(loginData);
    });
  },

  // 使用提供的資料填入登入表單
  fillLoginFormWithData: (loginData) => {
    // 等待頁面完全載入
    setTimeout(() => {
      try {
        // 根據選擇的銀行設定檔取得欄位選擇器
        const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
        if (!bankConfig) {
          console.error(
            "找不到銀行設定檔:",
            window.czAssistExtension.selectedBank
          );
          return;
        }
        
        // 檢查是否需要先點擊登入按鈕（如富邦銀行）
        if (bankConfig.selectors.login.needClickLoginFirst) {
          console.log("需要先點擊登入按鈕讓表單顯示");
          
          // 確定查找範圍：初始登入按鈕可能在不同的 iframe 中
          let searchDoc = document;
          const iframeName =
            bankConfig.selectors.login.initialLoginButtonIframe ||
                             bankConfig.selectors.login.iframeName;
          
          if (iframeName) {
            // 嘗試多種方式查找 iframe/frame
            let iframe =
              document.querySelector(
              `iframe#${iframeName}, iframe[name="${iframeName}"], frame#${iframeName}, frame[name="${iframeName}"]`
            ) || document.getElementById(iframeName);
            
            if (iframe && iframe.contentDocument) {
              searchDoc = iframe.contentDocument;
              console.log("在 iframe/frame 中查找初始登入按鈕:", iframeName);
            } else {
              // 嘗試通過 window.frames 訪問
              try {
                if (
                  window.frames &&
                  window.frames[iframeName] &&
                  window.frames[iframeName].document
                ) {
                  searchDoc = window.frames[iframeName].document;
                  console.log(
                    "通過 window.frames 訪問 iframe/frame:",
                    iframeName
                  );
                } else {
                  console.warn("找不到指定的 iframe/frame:", iframeName);
                }
              } catch (e) {
                console.warn("無法通過 window.frames 訪問 iframe/frame:", e);
              }
            }
          }
          
          const initialLoginButton = 
            searchDoc.querySelector(
              bankConfig.selectors.login.initialLoginButton
            ) ||
            searchDoc.querySelector(
              bankConfig.selectors.login.initialLoginButtonAlt
            );
          
          if (initialLoginButton) {
            console.log("找到初始登入按鈕，點擊中...");
            initialLoginButton.click();
            
            // 也嘗試觸發 onclick 事件
            const onclick = initialLoginButton.getAttribute("onclick");
            if (onclick) {
              try {
                eval(onclick);
              } catch (e) {
                console.warn("執行 onclick 失敗，使用 click:", e);
                initialLoginButton.click();
              }
            }
            
            // 等待表單出現後再填入
            setTimeout(() => {
              window.czAssistUtils.waitAndFillFormFields(loginData, bankConfig);
            }, 1500);
            return;
          } else {
            console.warn("找不到初始登入按鈕，直接嘗試填入表單");
          }
        }
        
        // 直接等待並填入表單
        window.czAssistUtils.waitAndFillFormFields(loginData, bankConfig);
      } catch (error) {
        console.error("自動填入表單時發生錯誤:", error);
        window.czAssistUtils.showNotification(
          "自動填入失敗，請手動輸入",
          "error"
        );
      }
    }, 1500); // 等待1.5秒確保頁面載入完成
  },

  // 等待表單出現並填入欄位
  waitAndFillFormFields: (loginData, bankConfig) => {
    let attempts = 0;
    const maxAttempts = 20;
    
    const waitForForm = () => {
      attempts++;
      
      let searchDoc = document;
      
      // 如果銀行需要在 iframe 中查找登入元素
      if (
        bankConfig.selectors.login.useIframe &&
        bankConfig.selectors.login.iframeName
      ) {
        // 檢查是否需要先進入父 iframe（如富邦銀行的 txnFrame 在 frame1 內部）
        let parentDoc = document;
        if (bankConfig.selectors.login.parentIframe) {
          const parentIframe =
            document.querySelector(
            `iframe#${bankConfig.selectors.login.parentIframe}, iframe[name="${bankConfig.selectors.login.parentIframe}"], frame#${bankConfig.selectors.login.parentIframe}, frame[name="${bankConfig.selectors.login.parentIframe}"]`
            ) ||
            document.getElementById(bankConfig.selectors.login.parentIframe);
          
          if (parentIframe && parentIframe.contentDocument) {
            parentDoc = parentIframe.contentDocument;
            console.log(
              "進入父 iframe/frame:",
              bankConfig.selectors.login.parentIframe
            );
          } else {
            // 嘗試通過 window.frames 訪問父 iframe
            try {
              if (
                window.frames &&
                window.frames[bankConfig.selectors.login.parentIframe] &&
                window.frames[bankConfig.selectors.login.parentIframe].document
              ) {
                parentDoc =
                  window.frames[bankConfig.selectors.login.parentIframe]
                    .document;
                console.log(
                  "通過 window.frames 訪問父 iframe/frame:",
                  bankConfig.selectors.login.parentIframe
                );
              }
            } catch (e) {
              console.warn("無法通過 window.frames 訪問父 iframe/frame:", e);
            }
          }
        }
        
        // 在父文檔或主文檔中查找目標 iframe
        let iframe =
          parentDoc.querySelector(
          `iframe#${bankConfig.selectors.login.iframeName}, iframe[name="${bankConfig.selectors.login.iframeName}"], frame#${bankConfig.selectors.login.iframeName}, frame[name="${bankConfig.selectors.login.iframeName}"]`
        ) || parentDoc.getElementById(bankConfig.selectors.login.iframeName);
        
        if (iframe && iframe.contentDocument) {
          searchDoc = iframe.contentDocument;
          console.log(
            "使用 iframe/frame 中的文檔進行元素查找:",
            bankConfig.selectors.login.iframeName
          );
        } else {
          // 嘗試通過 window.frames 訪問
          try {
            if (
              window.frames &&
              window.frames[bankConfig.selectors.login.iframeName] &&
              window.frames[bankConfig.selectors.login.iframeName].document
            ) {
              searchDoc =
                window.frames[bankConfig.selectors.login.iframeName].document;
              console.log(
                "通過 window.frames 訪問 iframe/frame:",
                bankConfig.selectors.login.iframeName
              );
            } else {
              console.warn(
                "找不到指定的 iframe/frame:",
                bankConfig.selectors.login.iframeName
              );
            }
          } catch (e) {
            console.warn("無法通過 window.frames 訪問 iframe/frame:", e);
          }
        }
      }

      // 使用 querySelector 查找欄位（支持備用選擇器）
      const companyField =
        searchDoc.querySelector(bankConfig.selectors.login.companyId) ||
        (bankConfig.selectors.login.companyIdAlt
          ? searchDoc.querySelector(bankConfig.selectors.login.companyIdAlt)
          : null) ||
        searchDoc.getElementById(
          bankConfig.selectors.login.companyId.replace("#", "")
        );
      const userField =
        searchDoc.querySelector(bankConfig.selectors.login.userId) ||
        (bankConfig.selectors.login.userIdAlt
          ? searchDoc.querySelector(bankConfig.selectors.login.userIdAlt)
          : null);
      const passwordField =
        searchDoc.querySelector(bankConfig.selectors.login.password) ||
        (bankConfig.selectors.login.passwordAlt
          ? searchDoc.querySelector(bankConfig.selectors.login.passwordAlt)
          : null);

      console.log(`嘗試 ${attempts}: 找到的表單欄位:`, {
        companyField,
        userField,
        passwordField,
      });

      // 如果找到所有欄位或達到最大嘗試次數，執行填入
      if (
        (companyField && userField && passwordField) ||
        attempts >= maxAttempts
      ) {
        fillFormFields(companyField, userField, passwordField);
      } else {
        // 繼續等待
        setTimeout(waitForForm, 500);
      }
    };
    
    const fillFormFields = (companyField, userField, passwordField) => {
      console.log("開始填入表單欄位:", {
        companyField,
        userField,
        passwordField,
      });

      // 如果找不到任何欄位，先檢查是否真的在登入頁面
      if (!companyField && !userField && !passwordField) {
        // 檢查當前頁面是否真的是登入頁面
        const currentUrl = window.location.href;
        const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
        
        if (bankConfig) {
          // 檢查 URL 是否符合登入頁面的特徵
          const isLoginPage = bankConfig.detection.loginPage.every((keyword) =>
            currentUrl.includes(keyword)
          );
          
          // 對於新光銀行，額外檢查是否在查詢頁面
          if (window.czAssistExtension.selectedBank === "skbank") {
            const hasQueryElements =
              !!document.querySelector("#accountSelectForSearch") ||
              !!document.querySelector("table.sectionTable.forPrint") ||
              currentUrl.includes("/QueryAcctDetail");
            
            if (hasQueryElements || !isLoginPage) {
              console.log(
                "新光銀行：當前不在登入頁面，跳過表單填入（可能是查詢明細階段）"
              );
              return; // 靜默返回，不顯示警告訊息
            }
          } else {
            // 其他銀行：如果不是登入頁面，靜默返回
            if (!isLoginPage) {
              console.log("當前不在登入頁面，跳過表單填入");
              return; // 靜默返回，不顯示警告訊息
            }
          }
        }
        
        // 如果確認在登入頁面但找不到欄位，才顯示警告
        window.czAssistUtils.showNotification(
          "找不到表單欄位，請手動填入",
          "warning"
        );
        return;
      }

      if (companyField) {
        companyField.value = loginData.companyId;
        companyField.dispatchEvent(new Event("input", { bubbles: true }));
        companyField.dispatchEvent(new Event("change", { bubbles: true }));
        console.log("統一編號已填入:", loginData.companyId);
      }

      if (userField) {
        userField.value = loginData.userId;
        userField.dispatchEvent(new Event("input", { bubbles: true }));
        userField.dispatchEvent(new Event("change", { bubbles: true }));
        console.log("使用者代號已填入:", loginData.userId);
      }

      if (passwordField) {
        passwordField.value = loginData.password;
        passwordField.dispatchEvent(new Event("input", { bubbles: true }));
        passwordField.dispatchEvent(new Event("change", { bubbles: true }));
        console.log("密碼已填入");
      }

      if (companyField || userField || passwordField) {
        window.czAssistUtils.showNotification(
          "表單已自動填入，請輸入圖形驗證碼",
          "success"
        );
        // 開始監聽驗證碼輸入
        window.czAssistUtils.startCaptchaWatcher();
      }
    };
    
    // 開始等待表單載入
    waitForForm();
  },

  // 開始監聽圖形驗證碼輸入
  startCaptchaWatcher: () => {
    // 根據銀行設定檔取得驗證碼欄位選擇器
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      console.error("找不到銀行設定檔:", window.czAssistExtension.selectedBank);
      return;
    }

    // 如果銀行不需要驗證碼，直接執行登入
    if (bankConfig.selectors.login.noCaptcha) {
      console.log("該銀行不需要驗證碼，直接執行登入");
      window.czAssistUtils.showNotification(
        "該銀行不需要驗證碼，正在登入...",
        "info"
      );
      setTimeout(() => {
        window.czAssistUtils.autoClickLogin();
      }, 500);
      return;
    }
    
    let searchDoc = document;
    
    // 如果銀行需要在 iframe 中查找元素
    if (
      bankConfig.selectors.login.useIframe &&
      bankConfig.selectors.login.iframeName
    ) {
      // 檢查是否需要先進入父 iframe（如富邦銀行的 txnFrame 在 frame1 內部）
      let parentDoc = document;
      if (bankConfig.selectors.login.parentIframe) {
        const parentIframe =
          document.querySelector(
          `iframe#${bankConfig.selectors.login.parentIframe}, iframe[name="${bankConfig.selectors.login.parentIframe}"], frame#${bankConfig.selectors.login.parentIframe}, frame[name="${bankConfig.selectors.login.parentIframe}"]`
        ) || document.getElementById(bankConfig.selectors.login.parentIframe);
        
        if (parentIframe && parentIframe.contentDocument) {
          parentDoc = parentIframe.contentDocument;
          console.log(
            "進入父 iframe/frame 查找驗證碼:",
            bankConfig.selectors.login.parentIframe
          );
        } else {
          // 嘗試通過 window.frames 訪問父 iframe
          try {
            if (
              window.frames &&
              window.frames[bankConfig.selectors.login.parentIframe] &&
              window.frames[bankConfig.selectors.login.parentIframe].document
            ) {
              parentDoc =
                window.frames[bankConfig.selectors.login.parentIframe].document;
              console.log(
                "通過 window.frames 訪問父 iframe/frame:",
                bankConfig.selectors.login.parentIframe
              );
            }
          } catch (e) {
            console.warn("無法通過 window.frames 訪問父 iframe/frame:", e);
          }
        }
      }
      
      // 在父文檔或主文檔中查找目標 iframe
      let iframe =
        parentDoc.querySelector(
        `iframe#${bankConfig.selectors.login.iframeName}, iframe[name="${bankConfig.selectors.login.iframeName}"], frame#${bankConfig.selectors.login.iframeName}, frame[name="${bankConfig.selectors.login.iframeName}"]`
      ) || parentDoc.getElementById(bankConfig.selectors.login.iframeName);
      
      if (iframe && iframe.contentDocument) {
        searchDoc = iframe.contentDocument;
        console.log(
          "在 iframe/frame 中查找驗證碼:",
          bankConfig.selectors.login.iframeName
        );
      } else {
        // 嘗試通過 window.frames 訪問
        try {
          if (
            window.frames &&
            window.frames[bankConfig.selectors.login.iframeName] &&
            window.frames[bankConfig.selectors.login.iframeName].document
          ) {
            searchDoc =
              window.frames[bankConfig.selectors.login.iframeName].document;
            console.log(
              "通過 window.frames 訪問 iframe/frame:",
              bankConfig.selectors.login.iframeName
            );
          } else {
            console.warn(
              "找不到指定的 iframe/frame:",
              bankConfig.selectors.login.iframeName
            );
          }
        } catch (e) {
          console.warn("無法通過 window.frames 訪問 iframe/frame:", e);
        }
      }
    }
    
    // 驗證碼選擇器可能包含 # 或複雜選擇器，優先使用 querySelector
    const captchaField =
      searchDoc.querySelector(bankConfig.selectors.login.captcha) ||
      (bankConfig.selectors.login.captchaAlt
        ? searchDoc.querySelector(bankConfig.selectors.login.captchaAlt)
        : null) ||
      (bankConfig.selectors.login.captcha &&
      bankConfig.selectors.login.captcha.startsWith("#")
        ? searchDoc.getElementById(
            bankConfig.selectors.login.captcha.replace("#", "")
          )
        : null);
    
    if (!captchaField) {
      // 如果是條件性驗證碼銀行，檢查是否真的不需要驗證碼
      if (bankConfig.selectors.login.conditionalCaptcha) {
        console.log("該頁面沒有驗證碼輸入框，直接執行登入");
        window.czAssistUtils.showNotification(
          "該頁面不需要驗證碼，正在登入...",
          "info"
        );
        setTimeout(() => {
          window.czAssistUtils.autoClickLogin();
        }, 500);
        return;
      } else {
        console.log("找不到驗證碼輸入框");
      return;
      }
    }

    // 特殊處理：中國信託的條件性驗證碼檢查
    if (
      bankConfig.selectors.login.conditionalCaptcha &&
      bankConfig.selectors.login.captchaContainer
    ) {
      const captchaContainer = searchDoc.querySelector(
        bankConfig.selectors.login.captchaContainer
      );
      if (captchaContainer) {
        const containerStyle = window.getComputedStyle(captchaContainer);
        if (containerStyle.display === "none") {
          console.log("驗證碼容器被隱藏，該頁面不需要驗證碼，直接執行登入");
          window.czAssistUtils.showNotification(
            "該頁面不需要驗證碼，正在登入...",
            "info"
          );
          setTimeout(() => {
            window.czAssistUtils.autoClickLogin();
          }, 500);
          return;
        } else {
          console.log("驗證碼容器可見，等待用戶輸入驗證碼");
        }
      }
    }

    console.log("開始監聽驗證碼輸入:", captchaField);
    
    // 監聽驗證碼輸入
    const handleCaptchaInput = () => {
      const value = captchaField.value.trim();
      console.log("驗證碼輸入:", value);
      
      // 從銀行配置中取得驗證碼長度
      const expectedLength = bankConfig.selectors.login.captchaLength || 4; // 預設4位數
      // 支援數字和英文字母的驗證碼
      const pattern = new RegExp(`^[a-zA-Z0-9]{${expectedLength}}$`);
      
      if (value.length === expectedLength && pattern.test(value)) {
        console.log(
          `偵測到${expectedLength}位驗證碼（數字或英文），準備自動登入`
        );
        window.czAssistUtils.showNotification(
          "偵測到驗證碼，正在登入...",
          "info"
        );
        
        // 等待一小段時間確保輸入完成
        setTimeout(() => {
          window.czAssistUtils.autoClickLogin();
        }, 500);
        
        // 移除事件監聽器避免重複觸發
        captchaField.removeEventListener("input", handleCaptchaInput);
      }
    };

    captchaField.addEventListener("input", handleCaptchaInput);
    window.czAssistUtils.showNotification("正在等待驗證碼輸入...", "info");
  },

  // 自動點擊登入按鈕
  autoClickLogin: () => {
    // 根據銀行設定檔取得登入按鈕選擇器
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      console.error("找不到銀行設定檔:", window.czAssistExtension.selectedBank);
      return;
    }
    
    let searchDoc = document;
    
    // 如果銀行需要在 iframe 中查找元素
    if (
      bankConfig.selectors.login.useIframe &&
      bankConfig.selectors.login.iframeName
    ) {
      // 檢查是否需要先進入父 iframe（如富邦銀行的 txnFrame 在 frame1 內部）
      let parentDoc = document;
      if (bankConfig.selectors.login.parentIframe) {
        const parentIframe =
          document.querySelector(
          `iframe#${bankConfig.selectors.login.parentIframe}, iframe[name="${bankConfig.selectors.login.parentIframe}"], frame#${bankConfig.selectors.login.parentIframe}, frame[name="${bankConfig.selectors.login.parentIframe}"]`
        ) || document.getElementById(bankConfig.selectors.login.parentIframe);
        
        if (parentIframe && parentIframe.contentDocument) {
          parentDoc = parentIframe.contentDocument;
          console.log(
            "進入父 iframe/frame 查找登入按鈕:",
            bankConfig.selectors.login.parentIframe
          );
        } else {
          // 嘗試通過 window.frames 訪問父 iframe
          try {
            if (
              window.frames &&
              window.frames[bankConfig.selectors.login.parentIframe] &&
              window.frames[bankConfig.selectors.login.parentIframe].document
            ) {
              parentDoc =
                window.frames[bankConfig.selectors.login.parentIframe].document;
              console.log(
                "通過 window.frames 訪問父 iframe/frame:",
                bankConfig.selectors.login.parentIframe
              );
            }
          } catch (e) {
            console.warn("無法通過 window.frames 訪問父 iframe/frame:", e);
          }
        }
      }
      
      // 在父文檔或主文檔中查找目標 iframe
      let iframe =
        parentDoc.querySelector(
        `iframe#${bankConfig.selectors.login.iframeName}, iframe[name="${bankConfig.selectors.login.iframeName}"], frame#${bankConfig.selectors.login.iframeName}, frame[name="${bankConfig.selectors.login.iframeName}"]`
      ) || parentDoc.getElementById(bankConfig.selectors.login.iframeName);
      
      if (iframe && iframe.contentDocument) {
        searchDoc = iframe.contentDocument;
        console.log(
          "在 iframe/frame 中查找登入按鈕:",
          bankConfig.selectors.login.iframeName
        );
      } else {
        // 嘗試通過 window.frames 訪問
        try {
          if (
            window.frames &&
            window.frames[bankConfig.selectors.login.iframeName] &&
            window.frames[bankConfig.selectors.login.iframeName].document
          ) {
            searchDoc =
              window.frames[bankConfig.selectors.login.iframeName].document;
            console.log(
              "通過 window.frames 訪問 iframe/frame:",
              bankConfig.selectors.login.iframeName
            );
          } else {
            console.warn(
              "找不到指定的 iframe/frame:",
              bankConfig.selectors.login.iframeName
            );
          }
        } catch (e) {
          console.warn("無法通過 window.frames 訪問 iframe/frame:", e);
        }
      }
    }
    
    // 根據選擇器類型選擇適當的查找方法
    let loginButton;
    if (
      bankConfig.selectors.login.loginButton.startsWith("#") ||
      bankConfig.selectors.login.loginButton.includes(" ") ||
      bankConfig.selectors.login.loginButton.includes("[") ||
      bankConfig.selectors.login.loginButton.includes(".")
    ) {
      // CSS 選擇器
      loginButton = searchDoc.querySelector(
        bankConfig.selectors.login.loginButton
      );
    } else {
      // ID 選擇器
      loginButton =
        searchDoc.getElementById(bankConfig.selectors.login.loginButton) ||
        searchDoc.querySelector(bankConfig.selectors.login.loginButton);
    }

    if (loginButton) {
      console.log("找到登入按鈕，執行點擊:", loginButton);
      
      // 第一銀行的特殊處理
      if (bankConfig.selectors.login.specialLoginButton) {
        window.czAssistUtils.showNotification(
          "找不到登入按鈕，請手動點擊",
          "warning"
        );
        // window.czAssistUtils.handleFirstBankLoginButton(loginButton, searchDoc);
      } else {
      loginButton.click();
      }
      
      window.czAssistUtils.showNotification("已自動點擊登入按鈕", "success");
    } else if (bankConfig.selectors.login.loginButtonAlt) {
      // 嘗試使用備用登入按鈕選擇器
      const altButton = searchDoc.querySelector(
        bankConfig.selectors.login.loginButtonAlt
      );
      if (altButton) {
        console.log("使用備用登入按鈕:", altButton);
        altButton.click();
        window.czAssistUtils.showNotification("已自動點擊登入按鈕", "success");
      } else {
        console.log("找不到登入按鈕（包括備用選擇器）");
        window.czAssistUtils.showNotification(
          "找不到登入按鈕，請手動點擊",
          "warning"
        );
      }
    } else {
      console.log("找不到登入按鈕");
      window.czAssistUtils.showNotification(
        "找不到登入按鈕，請手動點擊",
        "warning"
      );
    }
  },

  // 測試表單值獲取功能
  testFormValues: () => {
    console.log("=== 測試表單值獲取 ===");
    const companyField = document.getElementById("cz-company-id");
    const userField = document.getElementById("cz-user-id");
    const passwordField = document.getElementById("cz-password");
    const urlField = document.getElementById("cz-login-url");

    console.log("表單元素存在性:", {
      companyField: !!companyField,
      userField: !!userField, 
      passwordField: !!passwordField,
      urlField: !!urlField,
    });

    if (companyField) console.log("統一編號值:", companyField.value);
    if (userField) console.log("使用者代號值:", userField.value);
    if (passwordField) console.log("密碼值長度:", passwordField.value.length);
    if (urlField) console.log("登入網址:", urlField.value);

    console.log("儲存的登入資料:", window.czAssistExtension.savedLoginData);

    window.czAssistUtils.showNotification("請查看控制台查看測試結果", "info");
  },

  // 手動開啟登入頁面
  openLoginManually: () => {
    // 從銀行設定檔取得登入網址
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    const loginUrl = bankConfig?.loginUrl;
    
    if (!loginUrl) {
      window.czAssistUtils.showNotification("找不到登入網址設定", "error");
      return;
    }
    
    // 直接開啟新視窗
    window.open(loginUrl, "_blank");
    window.czAssistUtils.showNotification(
      `已開啟${bankConfig.name}登入頁面`,
      "success"
    );
  },

  // 檢查華南商銀是否出現 HTTP INTERNAL SERVER ERROR
  checkHncbServerError: () => {
    try {
      // 方法1：使用 getQueryFrameDocument 獲取 main frame
      try {
        const frameDoc = window.czAssistUtils.getQueryFrameDocument();
        if (frameDoc) {
          // 檢查 <title> 標籤（最可靠的方式）
          const titleElement = frameDoc.querySelector("title");
          if (
            titleElement &&
            titleElement.textContent.includes("HTTP INTERNAL SERVER ERROR")
          ) {
            console.log(
              "華南商銀偵測到 HTTP INTERNAL SERVER ERROR（在 main frame title 中）"
            );
            return true;
          }
          
          // 檢查 <h1 class="title"> 標題
          const errorTitle = frameDoc.querySelector("h1.title");
          if (
            errorTitle &&
            errorTitle.textContent.includes("HTTP INTERNAL SERVER ERROR")
          ) {
            console.log(
              "華南商銀偵測到 HTTP INTERNAL SERVER ERROR（在 main frame h1 中）"
            );
            return true;
          }
          
          // 檢查 container 內的內容
          const container = frameDoc.querySelector("#container.container");
          if (
            container &&
            container.textContent.includes("HTTP INTERNAL SERVER ERROR")
          ) {
            console.log(
              "華南商銀偵測到 HTTP INTERNAL SERVER ERROR（在 main frame container 中）"
            );
            return true;
          }
          
          // 檢查整個 body 的文字內容
          if (
            frameDoc.body &&
            frameDoc.body.textContent.includes("HTTP INTERNAL SERVER ERROR")
          ) {
            console.log(
              "華南商銀偵測到 HTTP INTERNAL SERVER ERROR（在 main frame body 中）"
            );
            return true;
          }
        }
      } catch (e) {
        // getQueryFrameDocument 可能失敗，繼續檢查其他方式
      }
      
      // 方法2：遍歷所有 frame
      const frames = document.querySelectorAll("frame, iframe");
      for (const frame of frames) {
        try {
          const frameDoc =
            frame.contentDocument || frame.contentWindow?.document;
          if (frameDoc) {
            // 檢查 <title> 標籤
            const titleElement = frameDoc.querySelector("title");
            if (
              titleElement &&
              titleElement.textContent.includes("HTTP INTERNAL SERVER ERROR")
            ) {
              console.log(
                `華南商銀偵測到 HTTP INTERNAL SERVER ERROR（在 ${
                  frame.name || "unnamed"
                } frame title 中）`
              );
              return true;
            }
            
            // 檢查 <h1 class="title"> 標題
            const errorTitle = frameDoc.querySelector("h1.title");
            if (
              errorTitle &&
              errorTitle.textContent.includes("HTTP INTERNAL SERVER ERROR")
            ) {
              console.log(
                `華南商銀偵測到 HTTP INTERNAL SERVER ERROR（在 ${
                  frame.name || "unnamed"
                } frame h1 中）`
              );
              return true;
            }
            
            // 檢查 container 內的內容
            const container = frameDoc.querySelector("#container.container");
            if (
              container &&
              container.textContent.includes("HTTP INTERNAL SERVER ERROR")
            ) {
              console.log(
                `華南商銀偵測到 HTTP INTERNAL SERVER ERROR（在 ${
                  frame.name || "unnamed"
                } frame container 中）`
              );
              return true;
            }
          }
        } catch (e) {
          // 跨域 frame 無法存取，忽略
        }
      }
      
      // 方法3：檢查主頁面
      const mainErrorTitle = document.querySelector("h1.title");
      if (
        mainErrorTitle &&
        mainErrorTitle.textContent.includes("HTTP INTERNAL SERVER ERROR")
      ) {
        console.log("華南商銀偵測到 HTTP INTERNAL SERVER ERROR（在主頁面）");
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("檢查華南商銀錯誤時發生例外:", error);
      return false;
    }
  },

  // 處理華南商銀 HTTP INTERNAL SERVER ERROR
  handleHncbServerError: () => {
    console.log("=== 華南商銀 HTTP INTERNAL SERVER ERROR 處理流程 ===");
    window.czAssistUtils.updateAutomationStatus(
      "偵測到伺服器錯誤，5秒後重新開始..."
    );
    
    // 生成新的會話 ID，使舊的等待重試自動失效
    window.czAssistExtension.automation.hncbRetrySessionId =
      Date.now().toString() + "_error_recovery";
    console.log(
      `華南商銀錯誤恢復：生成新會話 ID (${window.czAssistExtension.automation.hncbRetrySessionId})`
    );
    
    // 等待 5 秒後重新開始自動查詢
    setTimeout(() => {
      if (!window.czAssistExtension.automation.isRunning) {
        console.log("自動化已停止，取消錯誤恢復");
        return;
      }
      
      console.log("華南商銀錯誤恢復：重新開始自動查詢");
      window.czAssistUtils.updateAutomationStatus("重新開始自動查詢...");
      
      // 重設到步驟 0（前往帳務查詢總覽）
      window.czAssistExtension.automation.currentStep = 0;
      window.czAssistUtils.executeAutomationStep();
    }, 5000);
  },

  // 處理華南銀行查詢按鈕的 CSP 限制
  handleHncbQueryButton: (queryButton, frameDoc) => {
    console.log("處理華南銀行查詢按鈕 CSP 限制");
    
    try {
      // 方法1: 嘗試通過 DOM 事件觸發原始按鈕
      console.log("嘗試通過 DOM 事件觸發原始按鈕");
      
      // 先嘗試各種鼠標事件
      const events = ["mousedown", "mouseup", "click"];
      for (const eventType of events) {
        const event = new MouseEvent(eventType, {
          bubbles: true,
          cancelable: true,
          view: frameDoc.defaultView,
        });
        queryButton.dispatchEvent(event);
      }
      
      // 等待一下看是否有效果
      // (移除 await，因為這不是 async 函數)
      
      // 方法2: 創建一個完全相同的按鈕來替換原始按鈕
      console.log("創建替換按鈕");
      const form =
        frameDoc.querySelector('form[name="form1"]') ||
        frameDoc.querySelector("form");
      if (!form) {
        console.error("找不到表單");
        return false;
      }
      
      // 手動執行 doSubmit 邏輯的核心部分
      console.log("手動執行 doSubmit 邏輯");
      
      // 1. 設置表單狀態
      const stateField = form.querySelector('input[name="state"]');
      if (stateField) {
        stateField.value = "prompt";
        console.log("設置表單狀態為 prompt");
      }
      
      // 2. 設置 FI_START_DATE 和 FI_END_DATE（模擬 doSubmit 中的邏輯）
      const sYear = form.querySelector('select[name="S_Year"]');
      const sMonth = form.querySelector('select[name="S_Month"]');
      const sDate = form.querySelector('select[name="S_Date"]');
      const eYear = form.querySelector('select[name="E_Year"]');
      const eMonth = form.querySelector('select[name="E_Month"]');
      const eDate = form.querySelector('select[name="E_Date"]');
      
      let fiStartDate = form.querySelector('input[name="FI_START_DATE"]');
      let fiEndDate = form.querySelector('input[name="FI_END_DATE"]');
      
      // 如果不存在這些隱藏字段，創建它們
      if (!fiStartDate) {
        fiStartDate = frameDoc.createElement("input");
        fiStartDate.type = "hidden";
        fiStartDate.name = "FI_START_DATE";
        form.appendChild(fiStartDate);
      }
      
      if (!fiEndDate) {
        fiEndDate = frameDoc.createElement("input");
        fiEndDate.type = "hidden";
        fiEndDate.name = "FI_END_DATE";
        form.appendChild(fiEndDate);
      }
      
      // 設置日期值（按照 doSubmit 的邏輯）
      if (sYear && sMonth && sDate) {
        const startDateStr =
          sYear.value +
          String(sMonth.options[sMonth.selectedIndex].text).padStart(2, "0") +
          String(sDate.options[sDate.selectedIndex].text).padStart(2, "0");
        fiStartDate.value = startDateStr;
        console.log("設置開始日期:", startDateStr);
      }
      
      if (eYear && eMonth && eDate) {
        const endDateStr =
          eYear.value +
          String(eMonth.options[eMonth.selectedIndex].text).padStart(2, "0") +
          String(eDate.options[eDate.selectedIndex].text).padStart(2, "0");
        fiEndDate.value = endDateStr;
        console.log("設置結束日期:", endDateStr);
      }
      
      // 3. 設置帳戶相關字段
      const acctField = form.querySelector('input[name="acct"]');
      const acct1Select = form.querySelector('select[name="acct1"]');
      if (acctField && acct1Select && acct1Select.selectedIndex >= 0) {
        acctField.value = acct1Select.options[acct1Select.selectedIndex].value;
        console.log("設置帳戶:", acctField.value);
      }
      
      // 4. 直接提交表單
      console.log("直接提交表單");
      form.submit();
      
      return true;
    } catch (error) {
      console.error("處理華南銀行查詢按鈕時發生錯誤:", error);
      return false;
    }
  },

  // =============== 自動化交易查詢功能 ===============

  // 更新狀態顯示
  updateAutomationStatus: (message, showProgress = false) => {
    const statusElement = document.querySelector(".cz-status-text");
    const progressBar = document.querySelector(".cz-progress-bar");
    
    if (statusElement) {
      statusElement.textContent = message;
      console.log("自動化狀態:", message);
    }
    
    if (progressBar) {
      progressBar.style.display = showProgress ? "block" : "none";
    }

    // Send update to popup
    chrome.runtime
      .sendMessage({
        type: "STATUS_UPDATE",
        data: {
            statusText: message,
          isRunning: window.czAssistExtension.automation.isRunning,
        },
      })
      .catch(() => {});
  },

  // 更新進度條
  updateProgress: (percent) => {
    const progressElement = document.getElementById("cz-progress");
    if (progressElement) {
      progressElement.style.width = `${percent}%`;
    }
    
    // Send update to popup
    chrome.runtime
      .sendMessage({
        type: "STATUS_UPDATE",
        data: {
          progress: percent,
        },
      })
      .catch(() => {});
  },

  // 開始自動化查詢
  startAutomation: () => {
    if (window.czAssistExtension.automation.isRunning) {
      window.czAssistUtils.showNotification("自動化已在運行中", "warning");
      return;
    }

    console.log("開始自動化交易查詢");
    console.log("=== 當前設定檢查 ===");
    console.log(
      "查詢天數設定 (queryDaysBack):",
      window.czAssistExtension.settings.queryDaysBack
    );
    console.log("完整設定:", window.czAssistExtension.settings);
    
    // 檢查是否需要清理昨天的記錄
    window.czAssistUtils.checkAndCleanIfNewDay();
    
    // 檢查是否跨日，並調整查詢天數
      const now = new Date();
    const today = now.toISOString().split("T")[0]; // YYYY-MM-DD
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const lastQueryDate = window.czAssistExtension.automation.lastQueryDate;
      
      console.log(`=== 跨日檢測 ===`);
      console.log("當前日期:", today);
    console.log(
      "當前時間:",
      `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(
        2,
        "0"
      )}`
    );
      console.log("上次查詢日期:", lastQueryDate);
    console.log(
      "當前查詢天數設定:",
      window.czAssistExtension.settings.queryDaysBack
    );
      
      // 判斷是否在新的一天的前 10 分鐘內（00:00 - 00:10）
      const isInFirstTenMinutes = currentHour === 0 && currentMinute < 10;
      
      // 如果是新的一天且在前 10 分鐘內，暫時調整查詢天數為 1
      if (lastQueryDate && lastQueryDate !== today && isInFirstTenMinutes) {
      console.log(
        `⚠️ 檢測到新的一天且在前10分鐘內（${String(currentHour).padStart(
          2,
          "0"
        )}:${String(currentMinute).padStart(2, "0")}），暫時調整查詢天數為 1`
      );
      window.czAssistExtension.automation.originalQueryDaysBack =
        window.czAssistExtension.settings.queryDaysBack; // 記錄原始設定
        window.czAssistExtension.settings.queryDaysBack = 1; // 暫時設定為 1
      console.log(
        `查詢天數已暫時調整：${window.czAssistExtension.automation.originalQueryDaysBack} → 1`
      );
      } else {
        if (isInFirstTenMinutes) {
        console.log(
          `ℹ️ 在前10分鐘內但是第一次查詢（沒有跨日），使用原始設定 ${window.czAssistExtension.settings.queryDaysBack}`
        );
        } else {
        console.log(
          `ℹ️ 不在前10分鐘內（${String(currentHour).padStart(2, "0")}:${String(
            currentMinute
          ).padStart(2, "0")}），使用原始設定 ${
            window.czAssistExtension.settings.queryDaysBack
          }`
        );
        }
        window.czAssistExtension.automation.originalQueryDaysBack = null; // 不需要恢復
      }
      
      // 更新上次查詢日期為今天
      window.czAssistExtension.automation.lastQueryDate = today;
      
      // 保存到 localStorage
    localStorage.setItem("cz_last_query_date", today);
    
    window.czAssistExtension.automation.isRunning = true;

    // 遞增執行版本號，用於識別並取消舊的 setTimeout 回調（解決並行執行問題）
    window.czAssistExtension.automation.executionId =
      (window.czAssistExtension.automation.executionId || 0) + 1;
    console.log(
      `開始自動化，執行版本號: ${window.czAssistExtension.automation.executionId}`
    );

    // 清理富邦銀行的輪詢計時器（如果有的話）
    if (window.czAssistExtension.fubonQueryPollingTimer) {
      console.log("停止自動化：清理查詢輪詢計時器");
      clearTimeout(window.czAssistExtension.fubonQueryPollingTimer);
      window.czAssistExtension.fubonQueryPollingTimer = null;
    }
    window.czAssistExtension.fubonQueryPollingActive = false;
    
    window.czAssistExtension.automation.currentStep = 0;
    window.czAssistExtension.automation.queryResults = [];
    
    // 啟動線上狀態 API 定時器（每5分鐘呼叫一次）
    window.czAssistUtils.startOnlineStatusTimer();

    // 更新UI
    const startBtn = document.getElementById("cz-start-btn");
    const stopBtn = document.getElementById("cz-stop-btn");
    if (startBtn) startBtn.style.display = "none";
    if (stopBtn) stopBtn.style.display = "inline-block";
    
    // 標記步驟 3 為完成，然後隱藏提示
    window.czAssistUtils.markStepCompleted(3);
    setTimeout(() => {
      window.czAssistUtils.hideAutomationStepsNotice();
    }, 500);

    window.czAssistUtils.updateAutomationStatus("檢查當前頁面...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 檢查是否在登入頁面，如果是則等待登入完成
    let isLoginPage = false;
    let isMainPage = false;

    if (bankConfig.detection.useHashDetection) {
      // 使用 URL hash 檢測（針對 SPA 應用，如台新銀行）
      const result = checkHashPageStatus(bankConfig);
      isLoginPage = result.isLoginPage;
      isMainPage = result.isMainPage;
    } else if (bankConfig.detection.useIframeDetection) {
      // 使用 iframe 內 URL hash 檢測
      const result = checkIframePageStatus(bankConfig);
      isLoginPage = result.isLoginPage;
      isMainPage = result.isMainPage;
    } else if (bankConfig.detection.useLocalStorageDetection) {
      // 使用 localStorage 檢測登入狀態
      const result = checkLocalStorageLoginStatus(bankConfig);
      isLoginPage = result.isLoginPage;
      isMainPage = result.isMainPage;
    } else if (
      bankConfig.detection.useCustomDetection &&
      window.czAssistExtension.selectedBank === "ctbc"
    ) {
      // 使用中國信託自定義檢測
      const result = checkCtbcPageStatus();
      isLoginPage = result.isLoginPage;
      isMainPage = result.isMainPage;
    } else if (
      bankConfig.detection.useElementDetection &&
      window.czAssistExtension.selectedBank === "bok"
    ) {
      // 使用高雄銀行元素檢測
      const result = checkBokPageStatus(bankConfig);
      isLoginPage = result.isLoginPage;
      isMainPage = result.isMainPage;
    } else {
      // 使用傳統 URL 檢測
      const currentUrl = window.location.href;
      isLoginPage = bankConfig.detection.loginPage.some((keyword) =>
        currentUrl.includes(keyword)
      );
      isMainPage = bankConfig.detection.mainPage.some((keyword) =>
        currentUrl.includes(keyword)
      );
    }

    console.log("自動化開始時的頁面狀態:", { 
        isLoginPage, 
        isMainPage,
        currentUrl: window.location.href,
      mainPageKeywords: bankConfig.detection.mainPage,
    });

    // 優先檢查主頁面狀態，如果已經是主頁面就直接開始自動化
    if (isMainPage) {
      console.log("檢測到已在主頁面，直接開始自動化流程");
      window.czAssistUtils.executeAutomationStep();
    } else if (isLoginPage) {
      window.czAssistUtils.updateAutomationStatus("等待登入完成...");
      window.czAssistUtils.waitForLoginSuccess();
    } else {
      console.log("頁面狀態不明確，嘗試直接開始自動化流程 (Force Start)");
      // window.czAssistUtils.executeAutomationStep(); // Keep logic consistent, maybe it is main page but not detected
      // But let's just try to execute step if user clicked start.
      // If we stop here, user sees "Stopped".
      
      // If TBB, maybe main page detection is tricky?
      // Let's allow proceed if user explicitly started.
      window.czAssistUtils.executeAutomationStep();
    }
  },

  // 停止自動化查詢
  stopAutomation: () => {
    console.log("停止自動化交易查詢");
    window.czAssistExtension.automation.isRunning = false;

    // 恢復原始的查詢天數設定（如果之前因跨日而調整過）
    // 適用於所有支援跨日機制的銀行：華南銀行、彰化銀行、台新銀行
    if (window.czAssistExtension.automation.originalQueryDaysBack !== null) {
      const bankNameMap = {
        hncb: "華南銀行",
        chb: "彰化銀行",
        taishin: "台新銀行",
      };
      const bankName =
        bankNameMap[window.czAssistExtension.selectedBank] || "當前銀行";
      console.log(`=== ${bankName}停止時恢復原始查詢天數設定 ===`);
      console.log(
        "恢復為:",
        window.czAssistExtension.automation.originalQueryDaysBack
      );
      
      window.czAssistExtension.settings.queryDaysBack =
        window.czAssistExtension.automation.originalQueryDaysBack;
      window.czAssistExtension.automation.originalQueryDaysBack = null;
      
      // 同步保存到 storage
      chrome.storage.local.set({
        settings: window.czAssistExtension.settings,
      });
    }

    // 清理富邦銀行的輪詢計時器（如果有的話）
    if (window.czAssistExtension.fubonQueryPollingTimer) {
      console.log("停止自動化：清理富邦銀行查詢輪詢計時器");
      clearTimeout(window.czAssistExtension.fubonQueryPollingTimer);
      window.czAssistExtension.fubonQueryPollingTimer = null;
    }
    window.czAssistExtension.fubonQueryPollingActive = false;

    // 清除所有定時器
    if (window.czAssistExtension.automation.intervalId) {
      clearInterval(window.czAssistExtension.automation.intervalId);
    }
    if (window.czAssistExtension.automation.timeoutId) {
      clearTimeout(window.czAssistExtension.automation.timeoutId);
    }
    if (window.czAssistExtension.automation.onlineIntervalId) {
      clearInterval(window.czAssistExtension.automation.onlineIntervalId);
      window.czAssistExtension.automation.onlineIntervalId = null;
      console.log("已清除線上狀態 API 定時器");
    }

    // 更新UI
    const startBtn = document.getElementById("cz-start-btn");
    const stopBtn = document.getElementById("cz-stop-btn");
    if (startBtn) startBtn.style.display = "inline-block";
    if (stopBtn) stopBtn.style.display = "none";

    window.czAssistUtils.updateAutomationStatus("自動化已停止");
    window.czAssistUtils.updateProgress(0);
    window.czAssistUtils.showNotification("自動化查詢已停止", "info");
    
    // 顯示步驟提示並重置步驟狀態
    window.czAssistUtils.showAutomationStepsNotice();
    
    // 標記步驟 2 為完成（因為用戶剛剛點擊了停止按鈕）
    window.czAssistUtils.markStepCompleted(2);
  },
  
  // 顯示自動化步驟提示
  showAutomationStepsNotice: () => {
    const notice = document.getElementById("cz-automation-notice");
    if (notice) {
      notice.style.display = "block";
      // 重置所有步驟狀態
      const steps = notice.querySelectorAll(".cz-step-item");
      steps.forEach((step) => step.classList.remove("cz-step-completed"));
    }
  },
  
  // 隱藏自動化步驟提示
  hideAutomationStepsNotice: () => {
    const notice = document.getElementById("cz-automation-notice");
    if (notice) {
      notice.style.display = "none";
    }
  },
  
  // 標記步驟為完成
  markStepCompleted: (stepNumber) => {
    const step = document.getElementById(`cz-step-${stepNumber}`);
    if (step) {
      step.classList.add("cz-step-completed");
    }
  },

  // 等待登入成功
  waitForLoginSuccess: () => {
    const checkLogin = () => {
      if (!window.czAssistExtension.automation.isRunning) return;
      
      const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
      if (!bankConfig) return;
      
      // 檢查是否已進入主頁面
      let isMainPage = false;

      if (bankConfig.detection.useHashDetection) {
        // 使用 URL hash 檢測（針對 SPA 應用，如台新銀行）
        const result = checkHashPageStatus(bankConfig);
        isMainPage = result.isMainPage;
      } else if (bankConfig.detection.useIframeDetection) {
        // 使用 iframe 內 URL hash 檢測
        const result = checkIframePageStatus(bankConfig);
        isMainPage = result.isMainPage;
      } else if (bankConfig.detection.useLocalStorageDetection) {
        // 使用 localStorage 檢測登入狀態
        const result = checkLocalStorageLoginStatus(bankConfig);
        isMainPage = result.isMainPage;
      } else if (
        bankConfig.detection.useCustomDetection &&
        window.czAssistExtension.selectedBank === "ctbc"
      ) {
        // 使用中國信託自定義檢測
        const result = checkCtbcPageStatus();
        isMainPage = result.isMainPage;
      } else if (
        bankConfig.detection.useElementDetection &&
        window.czAssistExtension.selectedBank === "bok"
      ) {
        // 使用高雄銀行元素檢測
        const result = checkBokPageStatus(bankConfig);
        isMainPage = result.isMainPage;
      } else {
        // 使用傳統 URL 檢測
        isMainPage = bankConfig.detection.mainPage.some((keyword) =>
          window.location.href.includes(keyword)
        );
      }

      const mainFrame =
        document.getElementById(
          bankConfig.selectors.navigation?.mainFrame ||
            bankConfig.detection.iframeName
        ) ||
        document.querySelector(
          bankConfig.selectors.navigation?.mainFrame ||
            bankConfig.detection.iframeName
        );

      console.log("waitForLoginSuccess 檢測狀態:", {
        isMainPage,
        hasMainFrame: !!mainFrame,
        useHashDetection: !!bankConfig.detection.useHashDetection,
        useIframeDetection: !!bankConfig.detection.useIframeDetection,
        useLocalStorageDetection:
          !!bankConfig.detection.useLocalStorageDetection,
        notUsingIframe: !bankConfig.selectors.login.useIframe,
        currentUrl: window.location.href,
      });

      if (
        isMainPage &&
        (mainFrame ||
          bankConfig.detection.useHashDetection ||
          bankConfig.detection.useIframeDetection ||
          bankConfig.detection.useLocalStorageDetection ||
          !bankConfig.selectors.login.useIframe)
      ) {
        window.czAssistUtils.updateAutomationStatus(
          "登入成功，等待5秒後開始自動化..."
        );
        
        setTimeout(() => {
          if (window.czAssistExtension.automation.isRunning) {
            window.czAssistUtils.executeAutomationStep();
          }
        }, 5000);
      } else {
        // 繼續等待
        setTimeout(checkLogin, 2000);
      }
    };
    
    checkLogin();
  },

  // 執行自動化步驟
  executeAutomationStep: () => {
    if (!window.czAssistExtension.automation.isRunning) return;
    
    // 如果正在重新查詢，等待重新查詢完成
    if (window.czAssistExtension.automation.isRequerying) {
      console.log("正在重新查詢中，跳過當前步驟執行");
      return;
    }

    const step = window.czAssistExtension.automation.currentStep;
    console.log(`執行自動化步驟: ${step}`);
    
    // 華南商銀：檢查是否出現 HTTP INTERNAL SERVER ERROR
    // 注意：步驟 0 跳過錯誤檢查，因為步驟 0 會點擊帳務查詢連結來刷新 main frame
    if (window.czAssistExtension.selectedBank === "hncb" && step !== 0) {
      if (window.czAssistUtils.checkHncbServerError()) {
        console.log(
          "華南商銀偵測到 HTTP INTERNAL SERVER ERROR，將重新開始自動查詢"
        );
        window.czAssistUtils.handleHncbServerError();
        return;
      }
    }

    // 處理小數步驟（如 3.5）
    if (step === 3.5) {
      if (window.czAssistExtension.selectedBank === "skbank") {
        // 新光商銀：點擊「自選」radio button
        window.czAssistUtils.step3_5_clickSkbankCustomize();
      } else {
        // 其他銀行不支援 3.5 步驟，跳過
        console.warn("步驟 3.5 不適用於當前銀行，跳過");
        window.czAssistExtension.automation.currentStep = 4;
        window.czAssistUtils.executeAutomationStep();
      }
      return;
    }

    switch (step) {
      case 0:
        if (window.czAssistExtension.selectedBank === "taishin") {
          window.czAssistUtils.step1_clickTaishinDepositService();
        } else if (window.czAssistExtension.selectedBank === "sunny") {
          window.czAssistUtils.step1_clickAccountInquiry();
        } else if (window.czAssistExtension.selectedBank === "ktb") {
          window.czAssistUtils.step1_clickTwdQuery();
        } else if (window.czAssistExtension.selectedBank === "firstbank") {
          window.czAssistUtils.step1_clickQueryLink();
        } else if (window.czAssistExtension.selectedBank === "cathay") {
          window.czAssistUtils.step1_clickQueryLink();
        } else if (window.czAssistExtension.selectedBank === "ctbc") {
          window.czAssistUtils.step1_clickQueryLink();
        } else if (window.czAssistExtension.selectedBank === "bok") {
          window.czAssistUtils.step1_clickQueryLink();
        } else if (window.czAssistExtension.selectedBank === "chb") {
          window.czAssistUtils.step1_clickChbAccountOverview();
        } else if (window.czAssistExtension.selectedBank === "megabank") {
          window.czAssistUtils.step1_clickMegabankAccountQuery();
        } else if (window.czAssistExtension.selectedBank === "tbb") {
          window.czAssistUtils.step1_clickTbbAccountOverview();
        } else if (window.czAssistExtension.selectedBank === "tfcc") {
          window.czAssistUtils.step1_clickTfccAccountOverview();
        } else if (window.czAssistExtension.selectedBank === "ubot") {
          window.czAssistUtils.step1_clickUbotAccountQuery();
        } else if (window.czAssistExtension.selectedBank === "landbank") {
          window.czAssistUtils.step1_clickLandbankQueryService();
        } else if (window.czAssistExtension.selectedBank === "fubon") {
          window.czAssistUtils.step1_clickFubonTransactionQuery();
        } else if (window.czAssistExtension.selectedBank === "skbank") {
          window.czAssistUtils.step1_clickSkbankTransactionQuery();
        } else if (window.czAssistExtension.selectedBank === "tcb") {
          window.czAssistUtils.step0_clickTcbAccountQuery();
        } else {
        window.czAssistUtils.step1_navigateToAccountQuery();
        }
        break;
      case 1:
        // 不同銀行使用不同的步驟1
        if (window.czAssistExtension.selectedBank === "tcb") {
          window.czAssistUtils.step1_clickTcbTransactionQuery();
        } else if (window.czAssistExtension.selectedBank === "taishin") {
          window.czAssistUtils.step2_clickTaishinTransactionQuery();
        } else if (window.czAssistExtension.selectedBank === "hncb") {
          window.czAssistUtils.step2_waitAndClickAccountDetail();
        } else if (window.czAssistExtension.selectedBank === "esun") {
          window.czAssistUtils.step2_setEsunDateRange();
        } else if (window.czAssistExtension.selectedBank === "sunny") {
          window.czAssistUtils.step2_clickDepositBalanceDropdown();
        } else if (window.czAssistExtension.selectedBank === "ktb") {
          window.czAssistUtils.step2_selectCurrentDepositAccts();
        } else if (window.czAssistExtension.selectedBank === "firstbank") {
          window.czAssistUtils.step2_selectFormMenu();
        } else if (window.czAssistExtension.selectedBank === "cathay") {
          window.czAssistUtils.step1_5_selectCathayAccount();
        } else if (window.czAssistExtension.selectedBank === "ctbc") {
          window.czAssistUtils.step2_selectAcctNum();
        } else if (window.czAssistExtension.selectedBank === "bok") {
          window.czAssistUtils.step2_selectBokAccount();
        } else if (window.czAssistExtension.selectedBank === "chb") {
          window.czAssistUtils.step2_clickChbTransactionQuery();
        } else if (window.czAssistExtension.selectedBank === "megabank") {
          window.czAssistUtils.step2_clickMegabankDepositQuery();
        } else if (window.czAssistExtension.selectedBank === "tbb") {
          window.czAssistUtils.step2_selectTbbMaxBalanceAccount();
        } else if (window.czAssistExtension.selectedBank === "tfcc") {
          window.czAssistUtils.step2_clickTfccAccountRow();
        } else if (window.czAssistExtension.selectedBank === "ubot") {
          window.czAssistUtils.step2_clickUbotTransactionQuery();
        } else if (window.czAssistExtension.selectedBank === "landbank") {
          window.czAssistUtils.step2_clickLandbankAccountOverview();
        } else if (window.czAssistExtension.selectedBank === "fubon") {
          window.czAssistUtils.step2_setFubonDateRange();
        } else if (window.czAssistExtension.selectedBank === "skbank") {
          window.czAssistUtils.step2_selectSkbankAccount();
        } else {
          window.czAssistUtils.step2_waitAndClickDepositAccount();
        }
        break;
      case 2:
        // 不同銀行使用不同的步驟2
        if (window.czAssistExtension.selectedBank === "tcb") {
          window.czAssistUtils.step2_selectTcbAccount();
        } else if (window.czAssistExtension.selectedBank === "taishin") {
          window.czAssistUtils.step3_selectTaishinAccount();
        } else if (window.czAssistExtension.selectedBank === "hncb") {
          window.czAssistUtils.step2_5_selectHncbAccount();
        } else if (window.czAssistExtension.selectedBank === "esun") {
          window.czAssistUtils.step3_setEsunOrderType();
        } else if (window.czAssistExtension.selectedBank === "sunny") {
          window.czAssistUtils.step3_selectCompanyAccount();
        } else if (window.czAssistExtension.selectedBank === "ktb") {
          window.czAssistUtils.step3_setKtbDateRange();
        } else if (window.czAssistExtension.selectedBank === "firstbank") {
          window.czAssistUtils.step3_setFirstBankDateRange();
        } else if (window.czAssistExtension.selectedBank === "cathay") {
          window.czAssistUtils.step2_setCathayDateRange();
        } else if (window.czAssistExtension.selectedBank === "ctbc") {
          window.czAssistUtils.step3_setCtbcDateRange();
        } else if (window.czAssistExtension.selectedBank === "bok") {
          window.czAssistUtils.step3_selectBokPeriodType();
        } else if (window.czAssistExtension.selectedBank === "chb") {
          window.czAssistUtils.step3_selectChbAccount();
        } else if (window.czAssistExtension.selectedBank === "megabank") {
          window.czAssistUtils.step3_setMegabankDateRange();
        } else if (window.czAssistExtension.selectedBank === "tbb") {
          window.czAssistUtils.step3_setTbbDateRange();
        } else if (window.czAssistExtension.selectedBank === "tfcc") {
          window.czAssistUtils.step3_setTfccDateRange();
        } else if (window.czAssistExtension.selectedBank === "ubot") {
          window.czAssistUtils.step3_setUbotDateRange();
        } else if (window.czAssistExtension.selectedBank === "landbank") {
          window.czAssistUtils.step3_clickLandbankDepositTransaction();
        } else if (window.czAssistExtension.selectedBank === "fubon") {
          window.czAssistUtils.step3_executeFubonQuery();
        } else if (window.czAssistExtension.selectedBank === "skbank") {
          window.czAssistUtils.step3_setSkbankDateRange();
        } else {
          window.czAssistUtils.step3_clickTransactionQuery();
        }
        break;
      case 3:
        // 不同銀行使用不同的步驟3
        if (window.czAssistExtension.selectedBank === "hncb") {
          window.czAssistUtils.step3_setHncbDateRange();
        } else if (window.czAssistExtension.selectedBank === "tcb") {
          window.czAssistUtils.step3_setTcbDateRange();
        } else if (window.czAssistExtension.selectedBank === "taishin") {
          window.czAssistUtils.step4_selectTaishinPeriod();
        } else if (window.czAssistExtension.selectedBank === "chb") {
          window.czAssistUtils.step4_setChbDateRange();
        } else if (window.czAssistExtension.selectedBank === "hncb") {
          // 華南商銀設定日期範圍（已在 case 3 開頭處理）
          // 這裡不需要額外處理
        } else if (window.czAssistExtension.selectedBank === "esun") {
          // 玉山銀行直接執行查詢
          window.czAssistUtils.step5_executeQuery();
        } else if (window.czAssistExtension.selectedBank === "sunny") {
          // 陽信銀行設定日期範圍
          window.czAssistUtils.step4_setSunnyDateRange();
        } else if (window.czAssistExtension.selectedBank === "ktb") {
          // 京城銀行直接執行查詢
          window.czAssistUtils.step5_executeQuery();
        } else if (window.czAssistExtension.selectedBank === "firstbank") {
          // 第一銀行直接執行查詢
          window.czAssistUtils.step5_executeQuery();
        } else if (window.czAssistExtension.selectedBank === "ctbc") {
          // 中國信託直接執行查詢
          window.czAssistUtils.step5_executeQuery();
        } else if (window.czAssistExtension.selectedBank === "bok") {
          // 高雄銀行設定日期範圍
          window.czAssistUtils.step4_setBokDateRange();
        } else if (window.czAssistExtension.selectedBank === "yuanta") {
          // 元大銀行需要先選擇第二個帳號
          window.czAssistUtils.step3_5_selectSecondAccount();
        } else if (window.czAssistExtension.selectedBank === "megabank") {
          // 兆豐銀行直接執行查詢
          window.czAssistUtils.step5_executeQuery();
        } else if (window.czAssistExtension.selectedBank === "tbb") {
          // 臺灣企銀：點擊「網頁顯示」按鈕
          window.czAssistUtils.step3_clickTbbQueryButton();
        } else if (window.czAssistExtension.selectedBank === "tfcc") {
          // 淡水一信：查詢已自動執行，直接提取數據
          window.czAssistUtils.step5_executeQuery();
        } else if (window.czAssistExtension.selectedBank === "ubot") {
          // 聯邦銀行：點擊查詢按鈕
          window.czAssistUtils.step4_clickUbotQueryButton();
        } else if (window.czAssistExtension.selectedBank === "landbank") {
          window.czAssistUtils.step4_setLandbankDateRange();
        } else if (window.czAssistExtension.selectedBank === "fubon") {
          // 富邦銀行：提取交易數據
          window.czAssistUtils.step6_extractTransactionData();
        } else if (window.czAssistExtension.selectedBank === "cathay") {
          // 國泰世華：執行查詢
          window.czAssistUtils.step5_executeQuery();
        } else {
          window.czAssistUtils.step4_setCurrentMonthDates();
        }
        break;
      case 4:
        // 不同銀行使用不同的步驟4
        if (window.czAssistExtension.selectedBank === "hncb") {
          // 華南商銀：執行查詢
          window.czAssistUtils.step5_executeQuery();
        } else if (window.czAssistExtension.selectedBank === "tcb") {
          window.czAssistUtils.step4_executeTcbQuery();
        } else if (window.czAssistExtension.selectedBank === "taishin") {
          window.czAssistUtils.step5_setTaishinDateRange();
        } else if (window.czAssistExtension.selectedBank === "chb") {
          window.czAssistUtils.step5_executeQuery();
        } else if (window.czAssistExtension.selectedBank === "sunny") {
          // 陽信銀行直接執行查詢
          window.czAssistUtils.step5_executeQuery();
        } else if (window.czAssistExtension.selectedBank === "bok") {
          // 高雄銀行直接執行查詢
          window.czAssistUtils.step5_executeQuery();
        } else if (window.czAssistExtension.selectedBank === "tfcc") {
          // 淡水一信：查詢已自動執行，直接提取數據
          window.czAssistUtils.step4_extractTfccTransactionData();
        } else if (window.czAssistExtension.selectedBank === "landbank") {
          window.czAssistUtils.step5_executeLandbankQuery();
        } else if (window.czAssistExtension.selectedBank === "fubon") {
          // 富邦銀行：等待並重新查詢
          window.czAssistUtils.step7_waitAndRequery();
        } else if (window.czAssistExtension.selectedBank === "skbank") {
          // 新光商銀：點擊查詢按鈕
          window.czAssistUtils.step4_executeSkbankQuery();
        } else {
          window.czAssistUtils.step4_setCurrentMonthDates();
        }
        break;
      case 5:
        // 彰化銀行在步驟5選擇每頁200筆
        if (window.czAssistExtension.selectedBank === "taishin") {
          window.czAssistUtils.step6_setTaishinOrderType();
        } else if (window.czAssistExtension.selectedBank === "chb") {
          window.czAssistUtils.step3_5_selectChbPageSize();
        } else if (window.czAssistExtension.selectedBank === "skbank") {
          // 新光商銀：設定每頁100筆
          window.czAssistUtils.step5_setSkbankPageSize();
        } else if (window.czAssistExtension.selectedBank === "tcb") {
          // 台中銀行：沒有分頁數量按鈕，直接跳到步驟6提取數據
          window.czAssistExtension.automation.currentStep = 6;
          window.czAssistUtils.executeAutomationStep();
        } else if (window.czAssistExtension.selectedBank === "tfcc") {
          // 淡水一信：等待並重新查詢
          window.czAssistUtils.step5_tfccWaitAndRequery();
        } else {
          window.czAssistUtils.step5_executeQuery();
        }
        break;
      case 6:
        if (window.czAssistExtension.selectedBank === "taishin") {
          window.czAssistUtils.step7_executeTaishinQuery();
        } else if (window.czAssistExtension.selectedBank === "landbank") {
          window.czAssistUtils.step6_extractTransactionData();
        } else if (window.czAssistExtension.selectedBank === "fubon") {
          window.czAssistUtils.step6_extractTransactionData();
        } else if (window.czAssistExtension.selectedBank === "skbank") {
          // 新光商銀：提取交易數據
          window.czAssistUtils.step6_extractSkbankTransactionData();
        } else if (window.czAssistExtension.selectedBank === "tcb") {
          // 台中銀行：提取交易數據
          window.czAssistUtils.step6_extractTcbTransactionData();
        } else if (window.czAssistExtension.selectedBank === "ctbc") {
          // 中國信託：提取交易數據
          window.czAssistUtils.step6_extractCtbcTransactionData();
        } else {
          window.czAssistUtils.step6_extractTransactionData();
        }
        break;
      case 7:
        if (window.czAssistExtension.selectedBank === "taishin") {
          window.czAssistUtils.step8_extractTaishinTransactionData();
        } else if (window.czAssistExtension.selectedBank === "landbank") {
          window.czAssistUtils.step7_waitAndRequery();
        } else if (window.czAssistExtension.selectedBank === "fubon") {
          window.czAssistUtils.step7_waitAndRequery();
        } else {
          window.czAssistUtils.step7_waitAndRequery();
        }
        break;
      case 8:
        if (window.czAssistExtension.selectedBank === "taishin") {
          window.czAssistUtils.step9_waitAndRequery();
        } else {
          window.czAssistUtils.stopAutomation();
        }
        break;
      default:
        window.czAssistUtils.stopAutomation();
        break;
    }
  },

  // 獲取 MainFrame iframe 的 document
  getMainFrameDocument: () => {
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (bankConfig && bankConfig.selectors.navigation.mainFrame) {
      // 嘗試通過 ID 查找
      let mainFrame = document.getElementById(
        bankConfig.selectors.navigation.mainFrame
      );
      
      // 如果找不到，嘗試通過選擇器查找（支持 frame[name="main"]）
      if (!mainFrame) {
        mainFrame = document.querySelector(
          bankConfig.selectors.navigation.mainFrame
        );
      }
      
      // 土地銀行特殊處理：通過 name 屬性查找 frame
      if (!mainFrame && window.czAssistExtension.selectedBank === "landbank") {
        mainFrame = document.querySelector('frame[name="main"]');
        // 也嘗試通過 window.frames
        if (!mainFrame) {
          try {
            if (
              window.frames &&
              window.frames["main"] &&
              window.frames["main"].document
            ) {
              return window.frames["main"].document;
            }
          } catch (e) {
            console.warn("無法通過 window.frames 訪問 main frame:", e);
          }
        }
      }
      
      if (mainFrame && mainFrame.contentDocument) {
        return mainFrame.contentDocument;
      }
    }
    return document; // 如果找不到 iframe，fallback 到主文檔
  },

  // 獲取查詢頁面的 document（可能需要雙層 iframe）
  getQueryFrameDocument: () => {
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    
    // 彰化銀行使用 iframe1 (id) 或 frame1 (name)
    if (
      window.czAssistExtension.selectedBank === "chb" &&
      bankConfig.selectors.query.useIframe
    ) {
      let iframe = document.getElementById(
        bankConfig.selectors.query.iframeName
      );
      
      // 如果找不到，嘗試使用 name 屬性
      if (!iframe) {
        iframe = document.querySelector('iframe[name="frame1"]');
        console.log("彰化銀行：使用 name='frame1' 查找 iframe");
      }
      
      if (iframe && iframe.contentDocument) {
        console.log(
          "使用彰化銀行 iframe 進行查詢操作:",
          iframe.id || iframe.name
        );
        return iframe.contentDocument;
      } else {
        console.warn(
          "找不到彰化銀行 iframe 或無法訪問:",
          bankConfig.selectors.query.iframeName
        );
      }
    }
    
    // 第一銀行使用 frame1
    if (
      window.czAssistExtension.selectedBank === "firstbank" &&
      bankConfig.selectors.query.useIframe
    ) {
      const iframe = document.getElementById(
        bankConfig.selectors.query.iframeName
      );
      if (iframe && iframe.contentDocument) {
        console.log(
          "使用第一銀行 iframe 進行查詢操作:",
          bankConfig.selectors.query.iframeName
        );
        return iframe.contentDocument;
      } else {
        console.warn(
          "找不到第一銀行 iframe:",
          bankConfig.selectors.query.iframeName
        );
      }
    }

    if (
      window.czAssistExtension.selectedBank === "bok" &&
      bankConfig.selectors.query.useIframe
    ) {
      const iframe = document.getElementById(
        bankConfig.selectors.query.iframeName
      );
      if (iframe && iframe.contentDocument) {
        console.log(
          "使用高雄銀行 iframe 進行查詢操作:",
          bankConfig.selectors.query.iframeName
        );
        return iframe.contentDocument;
      } else {
        console.warn(
          "找不到高雄銀行 iframe:",
          bankConfig.selectors.query.iframeName
        );
      }
    }
    
    // 兆豐銀行使用 ifrm iframe
    if (
      window.czAssistExtension.selectedBank === "megabank" &&
      bankConfig.selectors.query.useIframe
    ) {
      const iframe = document.getElementById(
        bankConfig.selectors.query.iframeName
      );
      if (iframe && iframe.contentDocument) {
        console.log(
          "使用兆豐銀行 iframe 進行查詢操作:",
          bankConfig.selectors.query.iframeName
        );
        return iframe.contentDocument;
      } else {
        console.warn(
          "找不到兆豐銀行 iframe:",
          bankConfig.selectors.query.iframeName
        );
      }
    }
    
    // 華南商銀使用 main frame
    if (
      window.czAssistExtension.selectedBank === "hncb" &&
      bankConfig.selectors.query.useMainFrame
    ) {
      const mainFrame = document.querySelector(
        bankConfig.selectors.query.mainFrameName
      );
      if (mainFrame && mainFrame.contentDocument) {
        console.log(
          "使用 main frame 進行查詢操作:",
          bankConfig.selectors.query.mainFrameName
        );
        return mainFrame.contentDocument;
      } else {
        console.warn(
          "找不到 main frame:",
          bankConfig.selectors.query.mainFrameName
        );
      }
    }
    
    // 富邦銀行使用 frame1 > txnFrame（嵌套 iframe）
    if (
      window.czAssistExtension.selectedBank === "fubon" &&
      bankConfig.selectors.query.useIframe
    ) {
      // 使用專用函數獲取 txnFrame（在 frame1 內部）
      const txnFrameDoc = window.czAssistUtils.getFubonTxnFrame();
      if (txnFrameDoc) {
        console.log("使用富邦銀行 txnFrame 進行查詢操作");
        return txnFrameDoc;
      } else {
        console.warn("找不到富邦銀行 txnFrame");
      }
    }
    
    // 土地銀行使用 main frame
    if (
      window.czAssistExtension.selectedBank === "landbank" &&
      bankConfig.selectors.query.useIframe
    ) {
      const mainFrame = document.querySelector(
        bankConfig.selectors.query.mainFrameName
      );
      if (mainFrame && mainFrame.contentDocument) {
        console.log(
          "使用土地銀行 main frame 進行查詢操作:",
          bankConfig.selectors.query.mainFrameName
        );
        return mainFrame.contentDocument;
      } else {
        // 嘗試通過 window.frames
        try {
          if (
            window.frames &&
            window.frames["main"] &&
            window.frames["main"].document
          ) {
            console.log("通過 window.frames 訪問土地銀行 main frame");
            return window.frames["main"].document;
          }
        } catch (e) {
          console.warn("無法通過 window.frames 訪問 main frame:", e);
        }
        console.warn(
          "找不到土地銀行 main frame:",
          bankConfig.selectors.query.mainFrameName
        );
      }
    }
    
    // 先獲取主 iframe
    let frameDoc = window.czAssistUtils.getMainFrameDocument();
    
    // 如果需要使用 contextFrame，再進一層
    if (
      bankConfig &&
      bankConfig.selectors.query.useContextFrame &&
      bankConfig.selectors.query.contextFrameName
    ) {
      const contextFrame = frameDoc.getElementById(
        bankConfig.selectors.query.contextFrameName
      );
      if (contextFrame && contextFrame.contentDocument) {
        console.log(
          "使用 contextFrame 進行查詢操作:",
          bankConfig.selectors.query.contextFrameName
        );
        return contextFrame.contentDocument;
      } else {
        console.warn(
          "找不到 contextFrame:",
          bankConfig.selectors.query.contextFrameName
        );
      }
    }
    
    return frameDoc;
  },

  // 根據選擇器獲取元素（支援文字搜尋）
  getElementBySelector: (selector, frameDoc = null) => {
    const doc = frameDoc || window.czAssistUtils.getMainFrameDocument();
    
    // 如果選擇器包含 :contains，需要特殊處理
    if (selector.includes(":contains(")) {
      const match = selector.match(/^([^:]+):contains\("([^"]+)"\)$/);
      if (match) {
        const [, elementSelector, text] = match;
        const elements = doc.querySelectorAll(elementSelector);
        return Array.from(elements).find((el) => el.textContent.includes(text));
      }
    }
    
    // 普通選擇器
    return doc.querySelector(selector) || doc.getElementById(selector);
  },

  // 安全地執行包含 JavaScript URL 的連結
  safeClickJavaScriptLink: (link, frameDoc = null) => {
    const href = link.getAttribute("href");
    
    if (!href) {
      // 嘗試直接點擊事件
      return window.czAssistUtils.triggerClickEvents(link);
    }

    console.log("處理連結:", href);

    // 如果是 javascript: URL，嘗試多種方法
    if (href.startsWith("javascript:")) {
      console.log("檢測到 JavaScript URL，嘗試替代方法...");
      
      // 方法1：嘗試直接解析並調用函數（不使用 eval）
      if (href.includes("changeTask")) {
        const success = window.czAssistUtils.executeChangeTask(href, frameDoc);
        if (success) console.log("executeChangeTask 成功");
        return true;
      }
      
      // 方法2：嘗試觸發原生事件
      const eventSuccess = window.czAssistUtils.triggerNativeEvents(
        link,
        frameDoc
      );
      if (eventSuccess) {
        console.log("triggerNativeEvents 成功");
        return true;
      }
      
      // 方法3：嘗試操作 DOM 來模擬點擊
      const domSuccess = window.czAssistUtils.simulateUserClick(link);
      if (domSuccess) {
        console.log("simulateUserClick 成功");
        return true;
      }
      
      // 方法4：嘗試直接導航（如果可以提取 URL）
      const navSuccess = window.czAssistUtils.directNavigation(href, frameDoc);
      if (navSuccess) {
        console.log("directNavigation 成功");
        return true;
      }
      
      // 方法5：使用 postMessage 繞過 CSP（針對 iframe）
      const postMessageSuccess = window.czAssistUtils.usePostMessage(
        href,
        frameDoc
      );
      if (postMessageSuccess) {
        console.log("usePostMessage 成功");
        return true;
      }
      
      // 方法6：最後手段 - 嘗試修改 DOM 屬性
      const domModifySuccess = window.czAssistUtils.modifyDOMAttributes(
        link,
        href,
        frameDoc
      );
      if (domModifySuccess) {
        console.log("modifyDOMAttributes 成功");
        return true;
      }
    } else {
      // 普通 URL，直接點擊
      link.click();
      return true;
    }

    return false;
  },

  // 方法1：直接解析並調用 changeTask（不使用 eval）
  executeChangeTask: (href, frameDoc) => {
    try {
      // 提取 changeTask 的參數
      const match = href.match(/changeTask\('([^']+)'\)/);
      if (!match) return false;
      
      const taskUrl = match[1];
      console.log("提取到 taskUrl:", taskUrl);
      
      // 獲取目標窗口
      const targetWindow = frameDoc
        ? frameDoc.defaultView || frameDoc.parentWindow
        : window;
      
      // 嘗試直接調用函數
      if (
        targetWindow &&
        targetWindow.changeTask &&
        typeof targetWindow.changeTask === "function"
      ) {
        console.log("找到 changeTask 函數，直接調用");
        targetWindow.changeTask(taskUrl);
        return true;
      }
      
      // 如果找不到函數，嘗試模擬表單提交或直接導航
      console.log("changeTask 函數不存在，嘗試直接導航");
      if (targetWindow) {
        targetWindow.location.href = taskUrl.startsWith("/")
          ? window.location.origin + taskUrl
          : taskUrl;
        return true;
      }
    } catch (error) {
      console.error("executeChangeTask 失敗:", error);
    }
    return false;
  },

  // 方法2：觸發原生事件
  triggerNativeEvents: (link, frameDoc) => {
    try {
      console.log("嘗試觸發原生事件");
      
      // 創建更真實的事件
      const mouseDownEvent = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        view: frameDoc ? frameDoc.defaultView : window,
        button: 0,
        buttons: 1,
        clientX: 100,
        clientY: 100,
      });
      
      const mouseUpEvent = new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        view: frameDoc ? frameDoc.defaultView : window,
        button: 0,
        buttons: 0,
        clientX: 100,
        clientY: 100,
      });
      
      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: frameDoc ? frameDoc.defaultView : window,
        button: 0,
        buttons: 0,
        clientX: 100,
        clientY: 100,
      });
      
      // 按順序觸發事件
      link.dispatchEvent(mouseDownEvent);
      setTimeout(() => {
        link.dispatchEvent(mouseUpEvent);
        setTimeout(() => {
          link.dispatchEvent(clickEvent);
        }, 10);
      }, 10);
      
      return true;
    } catch (error) {
      console.error("triggerNativeEvents 失敗:", error);
      return false;
    }
  },

  // 方法3：模擬用戶點擊
  simulateUserClick: (link) => {
    try {
      console.log("嘗試模擬用戶點擊");
      
      // 嘗試觸發 focus 事件
      if (link.focus) {
        link.focus();
      }
      
      // 嘗試按 Enter 鍵
      const enterEvent = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
      });
      
      link.dispatchEvent(enterEvent);
      
      // 嘗試 submit 事件（如果連結在表單中）
      const form = link.closest("form");
      if (form) {
        console.log("找到父表單，嘗試提交");
        const submitEvent = new Event("submit", {
          bubbles: true,
          cancelable: true,
        });
        form.dispatchEvent(submitEvent);
      }
      
      return true;
    } catch (error) {
      console.error("simulateUserClick 失敗:", error);
      return false;
    }
  },

  // 方法4：直接導航
  directNavigation: (href, frameDoc) => {
    try {
      console.log("嘗試直接導航");
      
      // 如果包含 changeTask，嘗試提取 URL 並直接導航
      if (href.includes("changeTask")) {
        const urlMatch = href.match(/(['"])(\/[^'"]+)\1/);
        if (urlMatch) {
          const targetUrl = urlMatch[2];
          console.log("提取到目標 URL:", targetUrl);
          
          const fullUrl = window.location.origin + targetUrl;
          
          if (frameDoc && frameDoc.defaultView) {
            frameDoc.defaultView.location.href = fullUrl;
          } else {
            window.location.href = fullUrl;
          }
          return true;
        }
      }
    } catch (error) {
      console.error("directNavigation 失敗:", error);
    }
    return false;
  },

  // 方法5：使用 postMessage 繞過 CSP
  usePostMessage: (href, frameDoc) => {
    try {
      console.log("嘗試使用 postMessage");
      
      if (!frameDoc || !frameDoc.defaultView) {
        return false;
      }
      
      // 提取 changeTask 參數
      const match = href.match(/changeTask\('([^']+)'\)/);
      if (match) {
        const taskUrl = match[1];
        
        // 向 iframe 發送消息
        frameDoc.defaultView.postMessage(
          {
            type: "EXECUTE_CHANGE_TASK",
          taskUrl: taskUrl,
            origin: window.location.origin,
          },
          "*"
        );
        
        // 在 iframe 中監聽消息（如果尚未設置）
        if (!frameDoc.defaultView._czMessageListenerSet) {
          frameDoc.defaultView.addEventListener("message", function (event) {
            if (event.data.type === "EXECUTE_CHANGE_TASK") {
              try {
                if (typeof this.changeTask === "function") {
                  this.changeTask(event.data.taskUrl);
                } else {
                  // 如果函數不存在，直接導航
                  this.location.href = event.data.taskUrl.startsWith("/")
                    ? event.data.origin + event.data.taskUrl
                    : event.data.taskUrl;
                }
              } catch (error) {
                console.error("postMessage 執行失敗:", error);
              }
            }
          });
          frameDoc.defaultView._czMessageListenerSet = true;
        }
        
        return true;
      }
    } catch (error) {
      console.error("usePostMessage 失敗:", error);
    }
    return false;
  },

  // 方法6：修改 DOM 屬性作為最後手段
  modifyDOMAttributes: (link, href, frameDoc) => {
    try {
      console.log("嘗試修改 DOM 屬性");
      
      // 提取目標 URL
      const match = href.match(/changeTask\('([^']+)'\)/);
      if (match) {
        const taskUrl = match[1];
        const fullUrl = taskUrl.startsWith("/")
          ? window.location.origin + taskUrl
          : taskUrl;
        
        // 臨時修改連結的 href 屬性
        const originalHref = link.href;
        link.href = fullUrl;
        
        // 移除 onclick 等事件處理器
        const originalOnclick = link.onclick;
        link.onclick = null;
        link.removeAttribute("onclick");
        
        // 嘗試點擊
        console.log("修改連結 href 為:", fullUrl);
        link.click();
        
        // 恢復原始屬性（稍後執行）
        setTimeout(() => {
          link.href = originalHref;
          link.onclick = originalOnclick;
        }, 100);
        
        return true;
      }
      
      // 如果是其他類型的 JavaScript，嘗試創建新的連結
      const newLink = frameDoc
        ? frameDoc.createElement("a")
        : document.createElement("a");
      const urlMatch = href.match(/(['"])(\/[^'"]+)\1/);
      if (urlMatch) {
        const targetUrl = urlMatch[2];
        newLink.href = window.location.origin + targetUrl;
        newLink.target = "_self";
        
        // 隱藏添加到 DOM
        newLink.style.display = "none";
        (frameDoc ? frameDoc.body : document.body).appendChild(newLink);
        
        // 點擊並移除
        newLink.click();
        setTimeout(() => {
          newLink.remove();
        }, 100);
        
        return true;
      }
    } catch (error) {
      console.error("modifyDOMAttributes 失敗:", error);
    }
    return false;
  },

  // 觸發各種點擊事件
  triggerClickEvents: (element) => {
    try {
      console.log("觸發點擊事件");
      element.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true })
      );
      element.dispatchEvent(
        new MouseEvent("mouseup", { bubbles: true, cancelable: true })
      );
      element.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
      return true;
    } catch (error) {
      console.error("觸發事件失敗:", error);
      return false;
    }
  },

  // 步驟1: 導航到帳務查詢總覽
  step1_navigateToAccountQuery: () => {
    window.czAssistUtils.updateAutomationStatus("前往帳務查詢總覽中...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 華南商銀需要在 left frame 中查找帳務查詢連結
    if (window.czAssistExtension.selectedBank === "hncb") {
      const leftFrame = document.querySelector(
        bankConfig.selectors.navigation.leftFrame
      );
      if (leftFrame && leftFrame.contentDocument) {
        const accountQueryLink = leftFrame.contentDocument.querySelector(
          bankConfig.selectors.navigation.accountQuery
        );
        if (accountQueryLink) {
          console.log("找到華南商銀帳務查詢連結，點擊中...");
          accountQueryLink.click();
          
          setTimeout(() => {
            window.czAssistExtension.automation.currentStep = 1;
            window.czAssistUtils.executeAutomationStep();
          }, 3000);
          return;
        }
      }
      console.error("找不到華南商銀帳務查詢連結");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳務查詢連結");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 其他銀行的原有邏輯
    const frameDoc = window.czAssistUtils.getMainFrameDocument();
    
    // 台灣銀行特殊處理：ID 在 span 上，需要找到父元素 a 標籤
    if (window.czAssistExtension.selectedBank === "bot") {
      // 先嘗試通過 ID 找到 span，然後找到父元素 a
      const spanElement = frameDoc.getElementById(
        bankConfig.selectors.navigation.accountQuery
      );
      if (spanElement) {
        const accountQueryLink =
          spanElement.closest("a") || spanElement.parentElement;
        if (accountQueryLink && accountQueryLink.tagName === "A") {
          console.log("找到台灣銀行帳務查詢連結，點擊中...");
          accountQueryLink.click();
          
          setTimeout(() => {
            window.czAssistExtension.automation.currentStep = 1;
            window.czAssistUtils.executeAutomationStep();
          }, 3000);
          return;
        }
      }
      // 如果找不到，嘗試使用 accountQueryAlt 選擇器
      const accountQueryLink = frameDoc.querySelector(
        bankConfig.selectors.navigation.accountQueryAlt
      );
      if (accountQueryLink) {
        console.log("找到台灣銀行帳務查詢連結（使用備用選擇器），點擊中...");
        accountQueryLink.click();
        
        setTimeout(() => {
          window.czAssistExtension.automation.currentStep = 1;
          window.czAssistUtils.executeAutomationStep();
        }, 3000);
        return;
      }
      console.error("找不到台灣銀行帳務查詢連結");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳務查詢連結");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 其他銀行的原有邏輯
    const accountQueryLink =
      frameDoc.getElementById(bankConfig.selectors.navigation.accountQuery) ||
      frameDoc.querySelector(bankConfig.selectors.navigation.accountQueryAlt) ||
      frameDoc.querySelector(bankConfig.selectors.navigation.accountQuery);
    
    if (accountQueryLink) {
      console.log("找到帳務查詢連結，點擊中...");
      accountQueryLink.click();
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 1;
        window.czAssistUtils.executeAutomationStep();
      }, 3000);
    } else {
      console.error("找不到帳務查詢連結");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳務查詢連結");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟2: 等待並點擊帳戶明細（華南商銀專用）
  step2_waitAndClickAccountDetail: (retryCount = 0) => {
    if (window.czAssistExtension.selectedBank !== "hncb") {
      // 非華南商銀，執行原有邏輯
      window.czAssistUtils.step2_waitAndClickDepositAccount();
      return;
    }

    // 檢查是否出現 HTTP INTERNAL SERVER ERROR
    if (window.czAssistUtils.checkHncbServerError()) {
      console.log("華南商銀步驟1偵測到 HTTP INTERNAL SERVER ERROR");
      window.czAssistUtils.handleHncbServerError();
      return;
    }

    window.czAssistUtils.updateAutomationStatus("前往帳戶明細中...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    const frameDoc = window.czAssistUtils.getQueryFrameDocument();
    const accountDetailLink = frameDoc.querySelector(
      bankConfig.selectors.navigation.accountDetail
    );
    
    if (accountDetailLink) {
      console.log("找到帳戶明細連結，點擊中...");
      accountDetailLink.click();
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 2;
        window.czAssistUtils.executeAutomationStep();
      }, 5000);
    } else {
      // 等待重試直到帳戶明細連結出現
      const maxRetries = 60; // 最多重試 60 次（每次 500ms，共 30 秒）
      
      if (retryCount < maxRetries) {
        console.log(
          `華南商銀等待帳戶明細連結出現中... (第 ${
            retryCount + 1
          } 次嘗試，最多 ${maxRetries} 次)`
        );
        window.czAssistUtils.updateAutomationStatus(
          `等待帳戶明細連結... (${retryCount + 1}/${maxRetries})`
        );
        setTimeout(() => {
          window.czAssistUtils.step2_waitAndClickAccountDetail(retryCount + 1);
        }, 500);
        return;
      } else {
        console.error("華南商銀等待帳戶明細連結超時，從步驟 0 重新開始");
        window.czAssistUtils.updateAutomationStatus(
          "找不到帳戶明細連結，5秒後重新開始..."
        );
        
        // 生成新的會話 ID，使舊的等待重試自動失效
        window.czAssistExtension.automation.hncbRetrySessionId =
          Date.now().toString() + "_detail_retry";
        
        // 等待 5 秒後從步驟 0 重新開始
        setTimeout(() => {
          if (!window.czAssistExtension.automation.isRunning) return;
          console.log("華南商銀：重新開始自動查詢（從帳務查詢總覽）");
          window.czAssistUtils.updateAutomationStatus("重新開始自動查詢...");
          window.czAssistExtension.automation.currentStep = 0;
          window.czAssistUtils.executeAutomationStep();
        }, 5000);
      }
    }
  },

  // 步驟2: 等待5秒後點擊存款帳戶
  step2_waitAndClickDepositAccount: () => {
    window.czAssistUtils.updateAutomationStatus("等待5秒...");
    
    setTimeout(() => {
      window.czAssistUtils.updateAutomationStatus("前往存款帳戶中...");
      
      const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
      if (!bankConfig) {
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      const frameDoc = window.czAssistUtils.getMainFrameDocument();
      
      // 台灣銀行特殊處理：存款帳戶在 sideLeft div 中
      if (window.czAssistExtension.selectedBank === "bot") {
        // 先查找 sideLeft div
        const sideLeft = frameDoc.getElementById("sideLeft");
        if (sideLeft) {
          // 在 sideLeft 中查找包含「存款帳戶」文字的 a 標籤
          const depositLinks = sideLeft.querySelectorAll("a");
          const depositLink = Array.from(depositLinks).find(
            (link) =>
              link.textContent.trim() === "存款帳戶" ||
              link.textContent.includes("存款帳戶")
          );
          
          if (depositLink) {
            console.log("找到台灣銀行存款帳戶連結，點擊中...");
            depositLink.click();
            
            setTimeout(() => {
              window.czAssistExtension.automation.currentStep = 2;
              window.czAssistUtils.executeAutomationStep();
            }, 2000);
            return;
          }
        }
        console.error("找不到台灣銀行存款帳戶連結");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到存款帳戶連結");
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      // 其他銀行的原有邏輯
      const depositLink = window.czAssistUtils.getElementBySelector(
        bankConfig.selectors.query.depositAccount,
        frameDoc
      );
      
      if (depositLink) {
        console.log("找到存款帳戶連結，點擊中...");
        depositLink.click();
        
        setTimeout(() => {
          window.czAssistExtension.automation.currentStep = 2;
          window.czAssistUtils.executeAutomationStep();
        }, 2000);
      } else {
        console.error("找不到存款帳戶連結");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到存款帳戶連結");
        window.czAssistUtils.stopAutomation();
      }
    }, 5000);
  },

  // 步驟3: 點擊交易明細查詢
  step3_clickTransactionQuery: () => {
    window.czAssistUtils.updateAutomationStatus("前往交易明細查詢中...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    const frameDoc = window.czAssistUtils.getMainFrameDocument();
    
    // 台灣銀行特殊處理：可以通過 ID 或文字找到交易明細查詢連結
    let transactionLink = null;
    if (window.czAssistExtension.selectedBank === "bot") {
      // 先嘗試通過 ID 找到 span，然後找到父元素 a 標籤
      const spanElement = frameDoc.getElementById("B2C::FAO01003");
      if (spanElement) {
        transactionLink = spanElement.closest("a") || spanElement.parentElement;
        if (transactionLink && transactionLink.tagName === "A") {
          console.log("找到台灣銀行交易明細查詢連結（通過 ID），準備執行...");
        } else {
          transactionLink = null;
        }
      }
      
      // 如果通過 ID 找不到，使用文字查找
      if (!transactionLink) {
        transactionLink = window.czAssistUtils.getElementBySelector(
          bankConfig.selectors.query.transactionQuery,
          frameDoc
        );
        if (transactionLink) {
          console.log("找到台灣銀行交易明細查詢連結（通過文字），準備執行...");
        }
      }
    } else {
      // 其他銀行的原有邏輯
      transactionLink = window.czAssistUtils.getElementBySelector(
        bankConfig.selectors.query.transactionQuery,
        frameDoc
      );
    }
    
    if (transactionLink) {
      console.log("找到交易明細查詢連結，準備執行...");
      
      // 使用安全的連結點擊函數
      const success = window.czAssistUtils.safeClickJavaScriptLink(
        transactionLink,
        frameDoc
      );
      
      if (success) {
        setTimeout(() => {
          window.czAssistExtension.automation.currentStep = 3;
          window.czAssistUtils.executeAutomationStep();
        }, 2000);
      } else {
        console.error("無法執行交易明細查詢連結");
        window.czAssistUtils.updateAutomationStatus(
          "錯誤：無法執行交易明細查詢連結"
        );
        window.czAssistUtils.stopAutomation();
      }
    } else {
      console.error("找不到交易明細查詢連結");
      window.czAssistUtils.updateAutomationStatus(
        "錯誤：找不到交易明細查詢連結"
      );
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟3.5: 選擇第二個帳號（元大銀行專用）
  step3_5_selectSecondAccount: () => {
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig || window.czAssistExtension.selectedBank !== "yuanta") {
      // 非元大銀行，跳過此步驟
      window.czAssistExtension.automation.currentStep = 4;
      window.czAssistUtils.executeAutomationStep();
      return;
    }

    window.czAssistUtils.updateAutomationStatus("選擇第二個帳號...");
    
    const frameDoc = window.czAssistUtils.getQueryFrameDocument();
    const accountCombo = frameDoc.getElementById(
      bankConfig.selectors.query.accountCombo
    );
    
    if (accountCombo && accountCombo.options.length >= 2) {
      // 選擇第二個選項
      accountCombo.selectedIndex = 1;
      accountCombo.value = accountCombo.options[1].value;
      
      // 觸發各種事件確保變更被識別
      accountCombo.dispatchEvent(new Event("input", { bubbles: true }));
      accountCombo.dispatchEvent(new Event("change", { bubbles: true }));
      accountCombo.dispatchEvent(new Event("blur", { bubbles: true }));

      console.log("已選擇第二個帳號:", accountCombo.options[1].text);
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 4;
        window.czAssistUtils.executeAutomationStep();
      }, 1000);
    } else {
      console.error("找不到帳號選擇框或選項不足");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳號選擇框");
      // 繼續執行，不停止自動化
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 4;
        window.czAssistUtils.executeAutomationStep();
      }, 1000);
    }
  },

  // 步驟2.5: 選擇帳號（華南商銀專用，在查詢頁面選擇帳號）
  step2_5_selectHncbAccount: () => {
    window.czAssistUtils.updateAutomationStatus("選擇帳號...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 獲取目標帳號（去掉前綴 0000 後的帳號）
    const targetAccountNumber = window.czAssistUtils.getHncbTargetAccount();
    
    if (!targetAccountNumber) {
      console.error("找不到華南商銀目標帳號，請確認 API 是否正確回傳 Carder");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到目標帳號");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    console.log(`開始尋找華南商銀帳號: ${targetAccountNumber}`);
    
    const frameDoc = window.czAssistUtils.getQueryFrameDocument();
    
    // 等待帳號下拉選單載入
    const waitForAccountSelect = (attempts = 0) => {
      const maxAttempts = 30; // 從 10 增加到 30（總共 15 秒）
      
      // 檢查自動化是否還在運行
      if (!window.czAssistExtension.automation.isRunning) {
        console.log("華南商銀：自動化已停止，停止等待帳號下拉選單");
        return;
      }
      
      if (attempts >= maxAttempts) {
        console.error("等待帳號下拉選單載入超時，從步驟 0 重新開始");
        window.czAssistUtils.updateAutomationStatus(
          "找不到帳號下拉選單，5秒後重新開始..."
        );
        
        // 生成新的會話 ID，使舊的等待重試自動失效
        window.czAssistExtension.automation.hncbRetrySessionId =
          Date.now().toString() + "_account_retry";
        
        // 等待 5 秒後從步驟 0 重新開始
        setTimeout(() => {
          if (!window.czAssistExtension.automation.isRunning) return;
          console.log("華南商銀：重新開始自動查詢（從帳務查詢總覽）");
          window.czAssistUtils.updateAutomationStatus("重新開始自動查詢...");
          window.czAssistExtension.automation.currentStep = 0;
          window.czAssistUtils.executeAutomationStep();
        }, 5000);
        return;
      }
      
      // 查找帳號下拉選單
      const accountSelect =
        frameDoc.querySelector(bankConfig.selectors.query.accountSelect) ||
        frameDoc.querySelector("#acct1");

      if (
        accountSelect &&
        accountSelect.options &&
        accountSelect.options.length > 0
      ) {
        // 尋找目標帳號的選項（value 應該直接是帳號，例如 "180100888981"）
        const option = Array.from(accountSelect.options).find(
          (opt) =>
            opt.value === targetAccountNumber ||
            opt.value.includes(targetAccountNumber)
        );
        
        if (option) {
          console.log(`找到目標帳號 ${targetAccountNumber}，選擇中...`);
          console.log(`選項值: ${option.value}, 選項文字: ${option.text}`);
          accountSelect.value = option.value;
          accountSelect.dispatchEvent(new Event("change", { bubbles: true }));
          accountSelect.dispatchEvent(new Event("input", { bubbles: true }));
          
          // 等待帳號選擇生效後，進入步驟 3（設定日期範圍）
          setTimeout(() => {
            console.log("帳號已選擇，進入日期範圍設定");
            window.czAssistExtension.automation.currentStep = 3;
            window.czAssistUtils.executeAutomationStep();
          }, 1000);
        } else {
          console.error(`找不到帳號選項 ${targetAccountNumber}`);
          console.log(
            "可用選項:",
            Array.from(accountSelect.options).map((opt) => ({
              value: opt.value,
              text: opt.text,
            }))
          );
          window.czAssistUtils.updateAutomationStatus(
            `錯誤：找不到帳號 ${targetAccountNumber}`
          );
          window.czAssistUtils.stopAutomation();
        }
      } else {
        console.log(`等待帳號下拉選單載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForAccountSelect(attempts + 1), 500);
      }
    };
    
    waitForAccountSelect();
  },

  // 步驟3: 設定華南商銀日期範圍
  step3_setHncbDateRange: () => {
    if (window.czAssistExtension.selectedBank !== "hncb") {
      // 非華南商銀，跳過此步驟
      window.czAssistExtension.automation.currentStep = 3;
      window.czAssistUtils.executeAutomationStep();
      return;
    }

    window.czAssistUtils.updateAutomationStatus("設定華南商銀日期範圍...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    const frameDoc = window.czAssistUtils.getQueryFrameDocument();
    
    // 點擊查詢類型 radio button
    const inqTypeRadio = frameDoc.querySelector(
      bankConfig.selectors.query.inqTypeRadio
    );
    if (inqTypeRadio) {
      console.log("點擊查詢類型 radio button");
      inqTypeRadio.click();
    }
    
    // 使用通用日期計算函數
    const dateRange = window.czAssistUtils.calculateQueryDateRange();

    // 解析開始和結束日期
    const startDateParts = dateRange.startDate.split("/"); // [年, 月, 日]
    const endDateParts = dateRange.endDate.split("/"); // [年, 月, 日]

    const startMonth = parseInt(startDateParts[1]);
    const startDay = parseInt(startDateParts[2]);
    const endMonth = parseInt(endDateParts[1]);
    const endDay = parseInt(endDateParts[2]);

    // 設定開始月份
    const startMonthSelect = frameDoc.querySelector(
      bankConfig.selectors.query.startMonth
    );
    if (startMonthSelect) {
      startMonthSelect.value = startMonth.toString();
      startMonthSelect.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`開始月份已設定: ${startMonth}`);
    }

    // 設定開始日期
    const startDateSelect = frameDoc.querySelector(
      bankConfig.selectors.query.startDate
    );
    if (startDateSelect) {
      startDateSelect.value = startDay.toString();
      startDateSelect.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`開始日期已設定: ${startDay}`);
    }

    // 設定結束月份
    const endMonthSelect = frameDoc.querySelector(
      bankConfig.selectors.query.endMonth
    );
    if (endMonthSelect) {
      endMonthSelect.value = endMonth.toString();
      endMonthSelect.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`結束月份已設定: ${endMonth}`);
    }
    
    // 設定結束日期（今天）
    const endDateSelect = frameDoc.querySelector(
      bankConfig.selectors.query.endDate
    );
    if (endDateSelect) {
      endDateSelect.value = endDay.toString();
      endDateSelect.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`結束日期已設定: ${endDay}`);
    }

    // 根據查詢天數顯示不同的日誌訊息
    if (dateRange.daysBack === 0) {
      console.log(
        `華南商銀日期範圍設定完成: ${dateRange.startDate} (僅查詢今天)`
      );
    } else {
      console.log(
        `華南商銀日期範圍設定完成: ${dateRange.startDate} - ${dateRange.endDate} (${dateRange.daysBack}天前至今天)`
      );
    }

    setTimeout(() => {
      window.czAssistExtension.automation.currentStep = 4;
      window.czAssistUtils.executeAutomationStep();
    }, 2000);
  },

  // 步驟2: 設定玉山銀行日期範圍（玉山銀行專用）
  step2_setEsunDateRange: () => {
    if (window.czAssistExtension.selectedBank !== "esun") {
      // 非玉山銀行，跳過此步驟
      window.czAssistExtension.automation.currentStep = 2;
      window.czAssistUtils.executeAutomationStep();
      return;
    }

    window.czAssistUtils.updateAutomationStatus("設定玉山銀行日期範圍...");

    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }

    const frameDoc = window.czAssistUtils.getQueryFrameDocument();

    // 點擊起迄範圍 radio button
    const dateRangeRadio = frameDoc.querySelector(
      bankConfig.selectors.query.dateRangeRadio
    );
    if (dateRangeRadio) {
      console.log("點擊起迄範圍 radio button");
      dateRangeRadio.click();

      // 等待一小段時間讓選項生效
      setTimeout(() => {
        // 使用通用日期計算函數
        const dateRange = window.czAssistUtils.calculateQueryDateRange();

        // 設定開始日期
        const startDateField = frameDoc.querySelector(
          bankConfig.selectors.query.startDate
        );
        if (startDateField) {
          startDateField.value = dateRange.startDate;
          startDateField.dispatchEvent(new Event("input", { bubbles: true }));
          startDateField.dispatchEvent(new Event("change", { bubbles: true }));
          console.log(`玉山銀行開始日期已設定: ${dateRange.startDate}`);
        }

        // 設定結束日期
        const endDateField = frameDoc.querySelector(
          bankConfig.selectors.query.endDate
        );
        if (endDateField) {
          endDateField.value = dateRange.endDate;
          endDateField.dispatchEvent(new Event("input", { bubbles: true }));
          endDateField.dispatchEvent(new Event("change", { bubbles: true }));
          console.log(`玉山銀行結束日期已設定: ${dateRange.endDate}`);
        }

        console.log(
          `玉山銀行日期範圍設定完成: ${dateRange.startDate} - ${dateRange.endDate} (${dateRange.daysBack}天前至今天)`
        );

        setTimeout(() => {
          window.czAssistExtension.automation.currentStep = 2;
          window.czAssistUtils.executeAutomationStep();
        }, 1000);
      }, 500);
    } else {
      console.error("找不到起迄範圍 radio button");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到起迄範圍選項");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟3: 設定玉山銀行排序方式（玉山銀行專用）
  step3_setEsunOrderType: () => {
    if (window.czAssistExtension.selectedBank !== "esun") {
      // 非玉山銀行，跳過此步驟
      window.czAssistExtension.automation.currentStep = 3;
      window.czAssistUtils.executeAutomationStep();
      return;
    }

    window.czAssistUtils.updateAutomationStatus("設定玉山銀行排序方式...");

    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }

    const frameDoc = window.czAssistUtils.getQueryFrameDocument();

    // 點擊由新到舊 radio button
    const orderTypeRadio = frameDoc.querySelector(
      bankConfig.selectors.query.orderTypeRadio
    );
    if (orderTypeRadio) {
      console.log("點擊由新到舊 radio button");
      orderTypeRadio.click();

      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 3;
        window.czAssistUtils.executeAutomationStep();
      }, 1000);
    } else {
      console.error("找不到排序方式 radio button");
      // 繼續執行，不停止自動化
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 3;
        window.czAssistUtils.executeAutomationStep();
      }, 1000);
    }
  },

  // 處理第一銀行的特殊登入按鈕（繞過 CSP 限制）
  handleFirstBankLoginButton: (buttonElement, searchDoc) => {
    console.log("處理第一銀行特殊登入按鈕（CSP 安全模式）");
    
    try {
      // 方法1: 直接調用 clickArea 函數（如果可用）
      if (typeof window.clickArea === "function") {
        console.log("找到全域 clickArea 函數，直接調用");
        window.clickArea();
        return true;
      }
      
      // 方法2: 模擬表單提交（最可靠的方法）
      const form = searchDoc.querySelector(
        'form[name="loginForm"], form[id*="login"], form'
      );
      if (form) {
        console.log("找到表單，模擬登入按鈕點擊");
        
        // 設定隱藏欄位的值（模擬在登入區域的點擊）
        const hitXInput = searchDoc.getElementById("hitXinput");
        const hitYInput = searchDoc.getElementById("hitYinput");
        const positionInput = searchDoc.getElementById("position");
        
        if (hitXInput) {
          hitXInput.value = "50"; // 登入區域中心點 X（coords="15,38,86,68" 的中心）
          console.log("設定 hitX:", hitXInput.value);
        }
        if (hitYInput) {
          hitYInput.value = "53"; // 登入區域中心點 Y
          console.log("設定 hitY:", hitYInput.value);
        }
        if (positionInput) {
          positionInput.value = "1"; // 表示點擊了有效區域
          console.log("設定 position:", positionInput.value);
        }
        
        // 創建一個隱藏的提交按鈕並點擊它
        const submitButton = searchDoc.createElement("button");
        submitButton.type = "submit";
        submitButton.style.display = "none";
        form.appendChild(submitButton);
        
        console.log("提交表單進行登入");
        submitButton.click();
        
        // 清理
        setTimeout(() => {
          if (submitButton.parentNode) {
            submitButton.parentNode.removeChild(submitButton);
          }
        }, 100);
        
        return true;
      }
      
      // 方法3: 嘗試模擬 area 點擊（不執行 JavaScript URL）
      const areaElement = searchDoc.querySelector("area[href*='clickArea']");
      if (areaElement) {
        console.log("找到 area 元素，嘗試觸發點擊事件（不執行 JavaScript）");
        
        // 移除 href 屬性避免 CSP 問題，直接觸發事件
        const originalHref = areaElement.href;
        areaElement.removeAttribute("href");
        
        // 觸發多種事件
        ["mousedown", "mouseup", "click"].forEach((eventType) => {
          areaElement.dispatchEvent(
            new MouseEvent(eventType, {
            bubbles: true,
            cancelable: true,
              button: 0,
            })
          );
        });
        
        // 恢復 href（延遲執行）
        setTimeout(() => {
          areaElement.href = originalHref;
        }, 100);
        
        return true;
      }
      
      // 方法4: 嘗試直接點擊圖片（最後手段）
      console.log("嘗試直接點擊圖片元素");
      buttonElement.click();
      return true;
    } catch (error) {
      console.error("處理第一銀行登入按鈕時發生錯誤:", error);
      return false;
    }
  },

  // =============== 陽信銀行專用步驟 ===============

  // 步驟1: 點擊帳務查詢（陽信銀行專用）
  step1_clickAccountInquiry: () => {
    window.czAssistUtils.updateAutomationStatus("點擊帳務查詢...");

    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }

    const accountInquiryButton = document.querySelector(
      bankConfig.selectors.navigation.accountInquiry
    );

    if (accountInquiryButton) {
      console.log("找到帳務查詢按鈕，點擊中...");
      accountInquiryButton.click();

      // 記錄當前執行版本號
      const currentExecutionId =
        window.czAssistExtension.automation.executionId;
      setTimeout(() => {
        // 檢查執行版本號，如果不匹配則是舊的回調，跳過執行
        if (
          window.czAssistExtension.automation.executionId !== currentExecutionId
        ) {
          console.log(
            `[陽信步驟1] 執行版本號不匹配（當前:${window.czAssistExtension.automation.executionId}, 預期:${currentExecutionId}），跳過執行`
          );
          return;
        }
        window.czAssistExtension.automation.currentStep = 1;
        window.czAssistUtils.executeAutomationStep();
      }, 3000);
    } else {
      console.error("找不到帳務查詢按鈕");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳務查詢按鈕");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟2: 點擊存款餘額下拉選單（陽信銀行專用）
  step2_clickDepositBalanceDropdown: () => {
    window.czAssistUtils.updateAutomationStatus("點擊存款餘額下拉選單...");

    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }

    const dropdownButton = document.querySelector(
      bankConfig.selectors.navigation.depositBalanceDropdown
    );

    if (dropdownButton) {
      console.log("找到存款餘額下拉選單按鈕，點擊中...");
      dropdownButton.click();

      // 記錄當前執行版本號
      const currentExecutionId =
        window.czAssistExtension.automation.executionId;
      setTimeout(() => {
        // 檢查執行版本號，如果不匹配則是舊的回調，跳過執行
        if (
          window.czAssistExtension.automation.executionId !== currentExecutionId
        ) {
          console.log(
            `[陽信步驟2] 執行版本號不匹配（當前:${window.czAssistExtension.automation.executionId}, 預期:${currentExecutionId}），跳過執行`
          );
          return;
        }
        window.czAssistExtension.automation.currentStep = 2;
        window.czAssistUtils.executeAutomationStep();
      }, 2000);
    } else {
      console.error("找不到存款餘額下拉選單按鈕");
      window.czAssistUtils.updateAutomationStatus(
        "錯誤：找不到存款餘額下拉選單"
      );
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟3: 選擇公司帳戶（陽信銀行專用）
  step3_selectCompanyAccount: () => {
    window.czAssistUtils.updateAutomationStatus("選擇公司帳戶...");

    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }

    const companyAccountSelect = document.querySelector(
      bankConfig.selectors.query.companyAccountSelect
    );

    if (companyAccountSelect && companyAccountSelect.options.length > 0) {
      // 選擇第二個選項
      companyAccountSelect.selectedIndex = 0;
      companyAccountSelect.value = companyAccountSelect.options[1].value;

      // 觸發變更事件
      companyAccountSelect.dispatchEvent(new Event("input", { bubbles: true }));
      companyAccountSelect.dispatchEvent(
        new Event("change", { bubbles: true })
      );

      console.log(
        "已選擇第一個公司帳戶:",
        companyAccountSelect.options[0].text
      );

      // 記錄當前執行版本號
      const currentExecutionId =
        window.czAssistExtension.automation.executionId;
      setTimeout(() => {
        // 檢查執行版本號，如果不匹配則是舊的回調，跳過執行
        if (
          window.czAssistExtension.automation.executionId !== currentExecutionId
        ) {
          console.log(
            `[陽信步驟3] 執行版本號不匹配（當前:${window.czAssistExtension.automation.executionId}, 預期:${currentExecutionId}），跳過執行`
          );
          return;
        }
        window.czAssistExtension.automation.currentStep = 3;
        window.czAssistUtils.executeAutomationStep();
      }, 2000);
    } else {
      console.error("找不到公司帳戶選擇框或選項為空");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到公司帳戶選擇框");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟4: 設定陽信銀行日期範圍（陽信銀行專用）
  step4_setSunnyDateRange: () => {
    window.czAssistUtils.updateAutomationStatus("設定陽信銀行日期範圍...");

    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }

    // 使用通用日期計算函數
    const dateRange = window.czAssistUtils.calculateQueryDateRange();

    const startDateField = document.querySelector(
      bankConfig.selectors.query.startDate
    );
    const endDateField = document.querySelector(
      bankConfig.selectors.query.endDate
    );

    if (startDateField) {
      startDateField.value = dateRange.startDate;
      startDateField.dispatchEvent(new Event("input", { bubbles: true }));
      startDateField.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`陽信銀行開始日期已設定: ${dateRange.startDate}`);
    }

    if (endDateField) {
      endDateField.value = dateRange.endDate;
      endDateField.dispatchEvent(new Event("input", { bubbles: true }));
      endDateField.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`陽信銀行結束日期已設定: ${dateRange.endDate}`);
    }

    console.log(
      `陽信銀行日期範圍設定完成: ${dateRange.startDate} - ${dateRange.endDate} (${dateRange.daysBack}天前至今天)`
    );

    // 記錄當前執行版本號
    const currentExecutionId = window.czAssistExtension.automation.executionId;
    setTimeout(() => {
      // 檢查執行版本號，如果不匹配則是舊的回調，跳過執行
      if (
        window.czAssistExtension.automation.executionId !== currentExecutionId
      ) {
        console.log(
          `[陽信步驟4] 執行版本號不匹配（當前:${window.czAssistExtension.automation.executionId}, 預期:${currentExecutionId}），跳過執行`
        );
        return;
      }
      window.czAssistExtension.automation.currentStep = 4;
      window.czAssistUtils.executeAutomationStep();
    }, 2000);
  },

  // 檢查並點擊下一頁（陽信銀行專用）
  checkAndClickSunnyNextPage: () => {
    console.log("=== 陽信銀行：檢查下一頁 ===");
    
    // 陽信銀行的分頁容器在當前文檔中（不使用 iframe）
    const paginationContainer = document.querySelector(".pagination-container");
    
    if (!paginationContainer) {
      console.log("找不到分頁容器，可能沒有分頁");
      return false;
    }
    
    // 查找下一頁按鈕（包含 fa-arrow-right 圖標的按鈕）
    const nextPageIcon = paginationContainer.querySelector(
      "i.fa-arrow-right, i.fal.fa-arrow-right"
    );
    
    if (!nextPageIcon) {
      console.log("找不到下一頁按鈕圖標");
      return false;
    }
    
    // 獲取按鈕元素（圖標的父元素）
    const button = nextPageIcon.closest("button");
    
    if (!button) {
      console.log("找不到下一頁按鈕元素");
      return false;
    }
    
    // 檢查按鈕是否被禁用
    const isDisabled = button.hasAttribute("disabled") || button.disabled;
    
    if (isDisabled) {
      console.log("下一頁按鈕已禁用，已經是最後一頁");
      return false; // 沒有下一頁
    }
    
    // 可以點擊，執行點擊
    console.log("找到可點擊的下一頁按鈕，點擊中...");
    window.czAssistUtils.updateAutomationStatus("載入下一頁...");
    
    button.click();
    
    // 等待頁面載入後，重新提取數據
    setTimeout(() => {
      // 等待表格載入
      const waitForTable = (attempts = 0) => {
        // 檢查自動化是否還在運行
        if (!window.czAssistExtension.automation.isRunning) {
          console.log("自動化已停止，停止等待表格");
          return;
        }
        
        // 檢查是否正在重新查詢
        if (window.czAssistExtension.automation.isRequerying) {
          console.log("正在重新查詢中，停止等待表格");
          return;
        }
        
        // 檢查步驟是否已改變（可能被重新查詢邏輯改變）
        if (window.czAssistExtension.automation.currentStep !== 6) {
          console.log(
            `步驟已改變（從 6 變為 ${window.czAssistExtension.automation.currentStep}），停止等待表格`
          );
          return;
        }
        
        const maxAttempts = 10;
        const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
        const dataGrid = document.querySelector(
          bankConfig?.selectors?.query?.dataGrid
        );
        
        if (dataGrid) {
          console.log("下一頁表格已載入，重新提取交易數據");
          // 再次檢查步驟和自動化狀態
          if (
            !window.czAssistExtension.automation.isRunning ||
              window.czAssistExtension.automation.isRequerying ||
            window.czAssistExtension.automation.currentStep !== 6
          ) {
            console.log("狀態已改變，取消提取數據");
            return;
          }
          window.czAssistExtension.automation.currentStep = 6; // 回到步驟 6 提取數據
          window.czAssistUtils.executeAutomationStep();
        } else if (attempts < maxAttempts) {
          console.log(`等待下一頁表格載入... (${attempts + 1}/${maxAttempts})`);
          setTimeout(() => waitForTable(attempts + 1), 1000);
        } else {
          console.error("等待下一頁表格載入超時");
          window.czAssistUtils.updateAutomationStatus(
            "錯誤：下一頁表格載入超時"
          );
          window.czAssistUtils.stopAutomation();
        }
      };
      
      waitForTable();
    }, 3000); // 等待 3 秒讓頁面載入
    
    return true; // 已點擊下一頁
  },

  // =============== 京城銀行專用步驟 ===============

  // 步驟1: 點擊台幣查詢（京城銀行專用）
  step1_clickTwdQuery: () => {
    window.czAssistUtils.updateAutomationStatus("點擊台幣查詢...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    const twdQueryLink = document.querySelector(
      bankConfig.selectors.navigation.twdQuery
    );
    
    if (twdQueryLink) {
      console.log("找到台幣查詢連結，點擊中...");
      twdQueryLink.click();
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 1;
        window.czAssistUtils.executeAutomationStep();
      }, 3000);
    } else {
      console.error("找不到台幣查詢連結");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到台幣查詢連結");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟2: 選擇帳戶（京城銀行專用）
  step2_selectCurrentDepositAccts: () => {
    window.czAssistUtils.updateAutomationStatus("選擇帳戶...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    const accountSelect = document.querySelector(
      bankConfig.selectors.query.currentDepositAccts
    );
    
    if (accountSelect && accountSelect.options.length >= 2) {
      // 選擇第二個選項
      accountSelect.selectedIndex = 1;
      accountSelect.value = accountSelect.options[1].value;
      
      // 觸發變更事件
      accountSelect.dispatchEvent(new Event("input", { bubbles: true }));
      accountSelect.dispatchEvent(new Event("change", { bubbles: true }));
      
      console.log("已選擇第二個帳戶:", accountSelect.options[1].text);
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 2;
        window.czAssistUtils.executeAutomationStep();
      }, 2000);
    } else {
      console.error("找不到帳戶選擇框或選項不足");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳戶選擇框");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟3: 設定京城銀行日期範圍（京城銀行專用）
  step3_setKtbDateRange: () => {
    window.czAssistUtils.updateAutomationStatus("設定京城銀行日期範圍...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 使用通用日期計算函數
    const dateRange = window.czAssistUtils.calculateQueryDateRange();
    
    const startDateField = document.querySelector(
      bankConfig.selectors.query.startDate
    );
    const endDateField = document.querySelector(
      bankConfig.selectors.query.endDate
    );
    
    if (startDateField) {
      startDateField.value = dateRange.startDate;
      startDateField.dispatchEvent(new Event("input", { bubbles: true }));
      startDateField.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`京城銀行開始日期已設定: ${dateRange.startDate}`);
    }
    
    if (endDateField) {
      endDateField.value = dateRange.endDate;
      endDateField.dispatchEvent(new Event("input", { bubbles: true }));
      endDateField.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`京城銀行結束日期已設定: ${dateRange.endDate}`);
    }
    
    console.log(
      `京城銀行日期範圍設定完成: ${dateRange.startDate} - ${dateRange.endDate} (${dateRange.daysBack}天前至今天)`
    );
    
    setTimeout(() => {
      window.czAssistExtension.automation.currentStep = 3;
      window.czAssistUtils.executeAutomationStep();
    }, 2000);
  },

  // =============== 第一銀行專用步驟 ===============

  // 步驟1: 點擊查詢連結（第一銀行專用）
  step1_clickQueryLink: () => {
    window.czAssistUtils.updateAutomationStatus("點擊查詢連結...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    const queryLink = document.querySelector(
      bankConfig.selectors.navigation.queryLink
    );
    
    if (queryLink) {
      console.log("找到查詢連結，點擊中...");
      queryLink.click();
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 1;
        window.czAssistUtils.executeAutomationStep();
      }, 3000);
    } else {
      console.error("找不到查詢連結");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到查詢連結");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟2: 選擇表單選單（第一銀行專用）
  step2_selectFormMenu: () => {
    window.czAssistUtils.updateAutomationStatus("選擇表單選單...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 獲取 iframe 文檔
    const iframe = document.getElementById(
      bankConfig.selectors.query.iframeName
    );
    let searchDoc = document;
    
    if (iframe && iframe.contentDocument) {
      searchDoc = iframe.contentDocument;
      console.log(
        "使用 iframe 中的文檔進行查詢操作:",
        bankConfig.selectors.query.iframeName
      );
    } else {
      console.warn(
        "找不到指定的 iframe:",
        bankConfig.selectors.query.iframeName
      );
    }
    
    const formMenuSelect = searchDoc.querySelector(
      bankConfig.selectors.query.formMenuSelect
    );
    
    if (formMenuSelect && formMenuSelect.options.length >= 2) {
      // 選擇第二個選項
      formMenuSelect.selectedIndex = 1;
      formMenuSelect.value = formMenuSelect.options[1].value;
      
      // 觸發變更事件
      formMenuSelect.dispatchEvent(new Event("input", { bubbles: true }));
      formMenuSelect.dispatchEvent(new Event("change", { bubbles: true }));
      
      console.log("已選擇第二個表單選單選項:", formMenuSelect.options[1].text);
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 2;
        window.czAssistUtils.executeAutomationStep();
      }, 2000);
    } else {
      console.error("找不到表單選單或選項不足");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到表單選單");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟3: 設定第一銀行日期範圍（第一銀行專用）
  step3_setFirstBankDateRange: () => {
    window.czAssistUtils.updateAutomationStatus("設定第一銀行日期範圍...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 獲取 iframe 文檔
    const iframe = document.getElementById(
      bankConfig.selectors.query.iframeName
    );
    let searchDoc = document;
    
    if (iframe && iframe.contentDocument) {
      searchDoc = iframe.contentDocument;
      console.log(
        "使用 iframe 中的文檔進行日期設定:",
        bankConfig.selectors.query.iframeName
      );
    } else {
      console.warn(
        "找不到指定的 iframe:",
        bankConfig.selectors.query.iframeName
      );
    }
    
    // 使用通用日期計算函數
    const dateRange = window.czAssistUtils.calculateQueryDateRange();
    
    const startDateField = searchDoc.querySelector(
      bankConfig.selectors.query.startDate
    );
    const endDateField = searchDoc.querySelector(
      bankConfig.selectors.query.endDate
    );
    
    if (startDateField) {
      startDateField.value = dateRange.startDate;
      startDateField.dispatchEvent(new Event("input", { bubbles: true }));
      startDateField.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`第一銀行開始日期已設定: ${dateRange.startDate}`);
    }
    
    if (endDateField) {
      endDateField.value = dateRange.endDate;
      endDateField.dispatchEvent(new Event("input", { bubbles: true }));
      endDateField.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`第一銀行結束日期已設定: ${dateRange.endDate}`);
    }
    
    console.log(
      `第一銀行日期範圍設定完成: ${dateRange.startDate} - ${dateRange.endDate} (${dateRange.daysBack}天前至今天)`
    );
    
    setTimeout(() => {
      window.czAssistExtension.automation.currentStep = 3;
      window.czAssistUtils.executeAutomationStep();
    }, 2000);
  },

  // =============== 國泰世華專用步驟 ===============

  // 步驟1.5: 選擇帳號（國泰世華專用，在查詢頁面選擇帳號）
  step1_5_selectCathayAccount: () => {
    window.czAssistUtils.updateAutomationStatus("選擇帳號...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 獲取目標帳號（去掉前綴 0000 後的帳號）
    const targetAccountNumber = window.czAssistUtils.getCathayTargetAccount();
    
    if (!targetAccountNumber) {
      console.error("找不到國泰世華目標帳號，請確認 API 是否正確回傳 Carder");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到目標帳號");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    console.log(`開始尋找國泰世華帳號: ${targetAccountNumber}`);
    
    // 等待帳號下拉選單載入
    const waitForAccountSelect = (attempts = 0) => {
      const maxAttempts = 10;
      
      if (attempts >= maxAttempts) {
        console.error("等待帳號下拉選單載入超時");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳號下拉選單");
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      // 嘗試使用配置的選擇器，如果沒有則嘗試查找所有 select 元素
      let accountSelect = null;
      
      if (bankConfig.selectors.query.accountSelect) {
        accountSelect = document.querySelector(
          bankConfig.selectors.query.accountSelect
        );
      }
      
      // 如果找不到，嘗試查找所有 select 元素，找到包含目標帳號的選項
      if (
        !accountSelect ||
        !accountSelect.options ||
        accountSelect.options.length === 0
      ) {
        const allSelects = document.querySelectorAll("select");
        for (const select of allSelects) {
          if (select.options && select.options.length > 0) {
            // 檢查選項中是否有目標帳號
            // 國泰世華的 value 格式為：帳號||其他資訊||...
            const hasTargetAccount = Array.from(select.options).some((opt) => {
                if (!opt.value) return false;
              const accountPart = opt.value.split("||")[0];
              return (
                accountPart === targetAccountNumber ||
                       opt.text.includes(targetAccountNumber) ||
                opt.value.startsWith(targetAccountNumber + "||")
            );
            });
            if (hasTargetAccount) {
              accountSelect = select;
              console.log("找到包含目標帳號的下拉選單:", select);
              break;
            }
          }
        }
      }
      
      if (
        accountSelect &&
        accountSelect.options &&
        accountSelect.options.length > 0
      ) {
        // 尋找目標帳號的選項
        // 國泰世華的 value 格式為：帳號||其他資訊||...
        // 所以需要檢查 value 是否以目標帳號開頭（在 || 之前的部分）
        const option = Array.from(accountSelect.options).find((opt) => {
            if (!opt.value) return false;
            // 檢查 value 是否以目標帳號開頭（在 || 之前）
          const accountPart = opt.value.split("||")[0];
          return (
            accountPart === targetAccountNumber ||
                   opt.text.includes(targetAccountNumber) ||
            opt.value.startsWith(targetAccountNumber + "||")
        );
        });
        
        if (option) {
          console.log(`找到目標帳號 ${targetAccountNumber}，選擇中...`);
          console.log(`選項值: ${option.value}, 選項文字: ${option.text}`);
          accountSelect.value = option.value;
          accountSelect.dispatchEvent(new Event("change", { bubbles: true }));
          accountSelect.dispatchEvent(new Event("input", { bubbles: true }));
          
          // 等待帳號選擇生效後，進入步驟 2（設定日期範圍）
          setTimeout(() => {
            console.log("帳號已選擇，進入日期範圍設定");
            window.czAssistExtension.automation.currentStep = 2;
            window.czAssistUtils.executeAutomationStep();
          }, 1000);
        } else {
          console.error(`找不到帳號選項 ${targetAccountNumber}`);
          console.log(
            "可用選項:",
            Array.from(accountSelect.options).map((opt) => ({
              value: opt.value,
              text: opt.text,
            }))
          );
          window.czAssistUtils.updateAutomationStatus(
            `錯誤：找不到帳號 ${targetAccountNumber}`
          );
          window.czAssistUtils.stopAutomation();
        }
      } else {
        console.log(`等待帳號下拉選單載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForAccountSelect(attempts + 1), 500);
      }
    };
    
    waitForAccountSelect();
  },

  // 步驟2: 設定國泰世華日期範圍（國泰世華專用）
  step2_setCathayDateRange: () => {
    window.czAssistUtils.updateAutomationStatus("設定國泰世華日期範圍...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 使用通用日期計算函數
    const dateRange = window.czAssistUtils.calculateQueryDateRange();
    
    const startDateField = document.querySelector(
      bankConfig.selectors.query.startDate
    );
    const endDateField = document.querySelector(
      bankConfig.selectors.query.endDate
    );
    
    if (startDateField) {
      startDateField.value = dateRange.startDate;
      startDateField.dispatchEvent(new Event("input", { bubbles: true }));
      startDateField.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`國泰世華開始日期已設定: ${dateRange.startDate}`);
    }
    
    if (endDateField) {
      endDateField.value = dateRange.endDate;
      endDateField.dispatchEvent(new Event("input", { bubbles: true }));
      endDateField.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`國泰世華結束日期已設定: ${dateRange.endDate}`);
    }
    
    console.log(
      `國泰世華日期範圍設定完成: ${dateRange.startDate} - ${dateRange.endDate} (${dateRange.daysBack}天前至今天)`
    );
    
    setTimeout(() => {
      window.czAssistExtension.automation.currentStep = 3;
      window.czAssistUtils.executeAutomationStep();
    }, 2000);
  },

  // =============== 中國信託專用步驟 ===============

  // 步驟2: 選擇帳戶（中國信託專用）
  step2_selectAcctNum: () => {
    window.czAssistUtils.updateAutomationStatus("選擇帳戶...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    const acctNumSelect = document.querySelector(
      bankConfig.selectors.query.acctNumSelect
    );
    
    if (acctNumSelect && acctNumSelect.options.length >= 2) {
      // 選擇第二個選項
      acctNumSelect.selectedIndex = 1;
      acctNumSelect.value = acctNumSelect.options[1].value;
      
      // 觸發變更事件
      acctNumSelect.dispatchEvent(new Event("input", { bubbles: true }));
      acctNumSelect.dispatchEvent(new Event("change", { bubbles: true }));
      
      console.log("已選擇第二個帳戶:", acctNumSelect.options[1].text);
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 2;
        window.czAssistUtils.executeAutomationStep();
      }, 2000);
    } else {
      console.error("找不到帳戶選擇框或選項不足");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳戶選擇框");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟3: 設定中國信託日期範圍（中國信託專用）
  step3_setCtbcDateRange: () => {
    window.czAssistUtils.updateAutomationStatus("設定中國信託日期範圍...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 使用通用日期計算函數
    const dateRange = window.czAssistUtils.calculateQueryDateRange();
    
    const startDateField = document.querySelector(
      bankConfig.selectors.query.startDate
    );
    const endDateField = document.querySelector(
      bankConfig.selectors.query.endDate
    );
    
    if (startDateField) {
      startDateField.value = dateRange.startDate;
      startDateField.dispatchEvent(new Event("input", { bubbles: true }));
      startDateField.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`中國信託開始日期已設定: ${dateRange.startDate}`);
    }
    
    if (endDateField) {
      endDateField.value = dateRange.endDate;
      endDateField.dispatchEvent(new Event("input", { bubbles: true }));
      endDateField.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`中國信託結束日期已設定: ${dateRange.endDate}`);
    }
    
    console.log(
      `中國信託日期範圍設定完成: ${dateRange.startDate} - ${dateRange.endDate} (${dateRange.daysBack}天前至今天)`
    );
    
    setTimeout(() => {
      window.czAssistExtension.automation.currentStep = 3;
      window.czAssistUtils.executeAutomationStep();
    }, 2000);
  },

  // 步驟6: 提取中國信託交易數據（中國信託專用）
  step6_extractCtbcTransactionData: async () => {
    window.czAssistUtils.updateAutomationStatus("提取交易數據...");
    
    // 在開始提取前，先從 storage 恢復之前保存的資料（防止頁面刷新導致資料丟失）
    try {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(["automationState"], resolve);
      });
      if (
        result.automationState &&
        result.automationState.bank === "ctbc" &&
          result.automationState.queryResults && 
        result.automationState.queryResults.length > 0
      ) {
        // 恢復之前保存的資料
        if (!window.czAssistExtension.automation.queryResults) {
          window.czAssistExtension.automation.queryResults = [];
        }
        // 合併資料，避免重複
        const existingIds = new Set(
          window.czAssistExtension.automation.queryResults.map(
            (tx) => tx.uniqueId
          )
        );
        const newResults = result.automationState.queryResults.filter(
          (tx) => tx.uniqueId && !existingIds.has(tx.uniqueId)
        );
        if (newResults.length > 0) {
          window.czAssistExtension.automation.queryResults.push(...newResults);
          console.log(
            `中國信託：從 storage 恢復了 ${newResults.length} 筆之前提取的記錄`
          );
        }
      }
    } catch (error) {
      console.warn("中國信託：恢復資料時發生錯誤:", error);
    }
    
    // 提取當前頁面的交易數據
    const table = document.querySelector("#survivalTable table.data");
    if (!table) {
      console.error("找不到中國信託交易記錄表格");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到交易記錄表格");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    const rows = table.querySelectorAll("tbody tr.data-row");
    console.log(`找到 ${rows.length} 筆交易記錄`);
    
    // 獲取今天的日期（用於判斷交易日期是否為今天）
    const today = new Date();
    const todayStr = `${today.getFullYear()}/${String(
      today.getMonth() + 1
    ).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;
    
    const transactions = [];
    
    rows.forEach((row, index) => {
      try {
        const cells = row.querySelectorAll("td");
        if (cells.length < 9) {
          console.warn(`行 ${index} 欄位不足，跳過`);
          return;
        }
        
        // 提取數據
        // 第1欄：日期 (格式：2025/11/13)
        const dateText =
          cells[0].querySelector("div")?.textContent.trim() ||
          cells[0].textContent.trim();
        // 第5欄：存入金額
        const depositText =
          cells[4].querySelector("div")?.textContent.trim() ||
          cells[4].textContent.trim();
        // 第6欄：餘額
        const balanceText =
          cells[5].querySelector("div")?.textContent.trim() ||
          cells[5].textContent.trim();
        // 第9欄：註記（帳號，格式：000071318**4658*）
        const noteText =
          cells[8].querySelector("div")?.textContent.trim() ||
          cells[8].textContent.trim();
        
        // 只處理有「存入」金額的記錄
        if (
          depositText &&
          depositText !== "0" &&
          depositText !== "" &&
          depositText !== "--"
        ) {
          // 移除金額中的逗號
          const amount = depositText.replace(/,/g, "");
          
          // 判斷交易時間：
          // - 如果交易日期是今天，使用當前時間（發送時間）
          // - 如果交易日期不是今天（是昨天或更早），使用固定時間 23:59:00
          // 這樣可以避免跨日時，昨天的交易時間變成隔天的時間
          let timeStr;
          if (dateText === todayStr) {
            // 今天的交易，使用當前時間
            const now = new Date();
            timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
              now.getMinutes()
            ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
          } else {
            // 昨天或更早的交易，使用固定時間 23:59:00
            timeStr = "23:59:00";
          }
          
          // 組合完整的日期時間
          const datetime = `${dateText} ${timeStr}`;
          
          // 提取註記中的帳號（前3位銀行代碼 + 後16位帳號）
          // 格式：000071318**4658* -> 前3位：000，後16位：071318**4658*
          let account = "";
          if (noteText && noteText !== "-" && noteText.length >= 3) {
            // 前3位銀行代碼
            const bankCode = noteText.substring(0, 3);
            // 後16位帳號（如果不足16位，則取剩餘部分）
            const accountPart = noteText.substring(3);
            // 組合：前3位銀行代碼 + 後16位帳號（如果超過16位則截取前16位）
            account = bankCode + accountPart.substring(0, 16);
          }
          
          // 移除餘額中的逗號
          const balance = balanceText.replace(/,/g, "");
          
          // 唯一ID：日期 + 存入金額 + 餘額
          const uniqueId = `${dateText}_${amount}_${balance}`;
          
          transactions.push({
            date: datetime, // 交易時間
            amount: amount, // 存入金額
            account: account, // 帳號（前3位銀行代碼 + 後16位帳號）
            summary:
              cells[1].querySelector("div")?.textContent.trim() ||
              cells[1].textContent.trim(), // 摘要
            balance: balance, // 帳戶餘額
            uniqueId: uniqueId, // 唯一ID（用於判斷是否已發送）
          });

          console.log(
            `提取交易: ${datetime}, 存入: ${amount}, 帳號: ${account}, 餘額: ${balance}`
          );
        }
      } catch (e) {
        console.error(`解析行 ${index} 時發生錯誤:`, e);
      }
    });
    
    console.log(`本頁提取了 ${transactions.length} 筆存入記錄`);
    
    // 將交易記錄添加到結果中（避免重複）
    if (!window.czAssistExtension.automation.queryResults) {
      window.czAssistExtension.automation.queryResults = [];
    }
    
    // 使用 uniqueId 過濾重複的交易記錄
    const existingIds = new Set(
      window.czAssistExtension.automation.queryResults.map((tx) => tx.uniqueId)
    );
    const newTransactions = transactions.filter(
      (tx) => tx.uniqueId && !existingIds.has(tx.uniqueId)
    );
    
    if (newTransactions.length > 0) {
      window.czAssistExtension.automation.queryResults.push(...newTransactions);
      console.log(
        `新增 ${newTransactions.length} 筆新記錄（跳過 ${
          transactions.length - newTransactions.length
        } 筆重複記錄）`
      );
    } else {
      console.log(`本頁所有記錄都已存在，跳過`);
    }
    
    // 檢查是否有下一頁
    // 下一頁按鈕：<a href="#" onclick="_makePostRequest(2);">下一頁</a>
    // 沒有下一頁時：<span class="step gap">下一頁</span>
    const paginateDiv = document.querySelector(".paginate");
    let hasNextPage = false;
    
    if (paginateDiv) {
      // 查找所有包含 "下一頁" 的元素
      const allElements = paginateDiv.querySelectorAll("a, span");
      let nextButton = null;
      
      for (const el of allElements) {
        if (el.textContent.includes("下一頁")) {
          // 如果是 <a> 標籤且有 onclick 屬性，說明有下一頁
          if (el.tagName === "A" && el.getAttribute("onclick")) {
            nextButton = el;
            break;
          }
          // 如果是 <span> 標籤，說明沒有下一頁
          else if (el.tagName === "SPAN") {
            hasNextPage = false;
            break;
          }
        }
      }
      
      if (nextButton) {
        // 提取下一頁的頁碼
        const onclickAttr = nextButton.getAttribute("onclick");
        if (onclickAttr) {
          const match = onclickAttr.match(/_makePostRequest\((\d+)\)/);
          if (match) {
            hasNextPage = true;
            const nextPageNum = parseInt(match[1]);
            console.log(`找到下一頁按鈕，頁碼: ${nextPageNum}`);
            
            // 在點擊下一頁之前，先保存當前提取的資料到 storage
            const stateToSave = {
              currentStep: 6,
              isRunning: window.czAssistExtension.automation.isRunning,
              lastQueryDate: window.czAssistExtension.automation.lastQueryDate,
              queryResults:
                window.czAssistExtension.automation.queryResults || [],
              bank: window.czAssistExtension.selectedBank,
              timestamp: Date.now(),
            };
            
            chrome.storage.local.set({ automationState: stateToSave }, () => {
              console.log(
                "中國信託：在點擊下一頁前保存資料，已提取",
                stateToSave.queryResults.length,
                "筆記錄"
              );
              
              // 點擊下一頁
              nextButton.click();
              
              // 等待頁面載入後，繼續提取
              setTimeout(() => {
                window.czAssistUtils.step6_extractCtbcTransactionData();
              }, 3000);
            });
          }
        }
      }
    }
    
    if (!hasNextPage) {
      // 沒有下一頁了，完成提取
      console.log(
        `總共提取了 ${window.czAssistExtension.automation.queryResults.length} 筆交易記錄`
      );
      window.czAssistUtils.updateAutomationStatus(
        `已提取 ${window.czAssistExtension.automation.queryResults.length} 筆交易記錄`
      );
      
      // 顯示結果在側邊欄
      if (window.czAssistExtension.automation.queryResults.length > 0) {
        let resultsHtml = '<div class="cz-results-summary">';
        resultsHtml += `<p>找到 ${window.czAssistExtension.automation.queryResults.length} 筆存入記錄</p>`;
        resultsHtml += '<table class="cz-results-table">';
        resultsHtml +=
          "<thead><tr><th>時間</th><th>金額</th><th>帳號</th></tr></thead>";
        resultsHtml += "<tbody>";
        
        window.czAssistExtension.automation.queryResults.forEach((tx) => {
          resultsHtml += "<tr>";
          resultsHtml += `<td>${tx.date}</td>`;
          resultsHtml += `<td style="text-align: right;">${tx.amount}</td>`;
          resultsHtml += `<td>${tx.account || ""}</td>`;
          resultsHtml += "</tr>";
        });
        
        resultsHtml += "</tbody></table></div>";
        
        const resultsContainer = document.getElementById(
          "cz-results-container"
        );
        if (resultsContainer) {
          resultsContainer.innerHTML = resultsHtml;
        }
      }
      
      // 更新側邊欄顯示
      window.czAssistUtils.updateQueryResults();
      
      // 發送交易記錄到 API（等待完成後才進入重新查詢流程）
      if (window.czAssistExtension.automation.queryResults.length > 0) {
        await window.czAssistUtils.sendTransactionsToAPI(
          window.czAssistExtension.automation.queryResults
        );
        // sendTransactionsToAPI 完成後會自動設置步驟 7，不需要手動設置
      } else {
        // 如果沒有交易記錄，直接進入重新查詢流程
        window.czAssistExtension.automation.currentStep = 7;
        setTimeout(() => {
          window.czAssistUtils.executeAutomationStep();
        }, 1000);
      }
    }
  },

  // =============== 高雄銀行專用步驟 ===============

  // 步驟2: 選擇高雄銀行帳戶（高雄銀行專用）
  step2_selectBokAccount: () => {
    window.czAssistUtils.updateAutomationStatus("選擇高雄銀行帳戶...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 獲取 iframe 文檔
    const iframe = document.getElementById(
      bankConfig.selectors.query.iframeName
    );
    let searchDoc = document;
    
    if (iframe && iframe.contentDocument) {
      searchDoc = iframe.contentDocument;
      console.log(
        "使用 iframe 中的文檔進行帳戶選擇:",
        bankConfig.selectors.query.iframeName
      );
    } else {
      console.warn(
        "找不到指定的 iframe:",
        bankConfig.selectors.query.iframeName
      );
    }
    
    // 點擊帳戶下拉選單標籤
    const accountComboLabel = searchDoc.querySelector(
      bankConfig.selectors.query.accountComboLabel
    );
    if (accountComboLabel) {
      console.log("點擊帳戶下拉選單標籤");
      accountComboLabel.click();
      
      // 等待下拉選單展開後，點擊特定選項
      setTimeout(() => {
        const accountOption = searchDoc.querySelector(
          bankConfig.selectors.query.accountOption
        );
        if (accountOption) {
          console.log("點擊帳戶選項:", accountOption.textContent);
          accountOption.click();
          
          setTimeout(() => {
            window.czAssistExtension.automation.currentStep = 2;
            window.czAssistUtils.executeAutomationStep();
          }, 1000);
        } else {
          console.error("找不到帳戶選項");
          window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳戶選項");
          window.czAssistUtils.stopAutomation();
        }
      }, 1000);
    } else {
      console.error("找不到帳戶下拉選單標籤");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳戶下拉選單");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟3: 選擇期間類型（高雄銀行專用）
  step3_selectBokPeriodType: () => {
    window.czAssistUtils.updateAutomationStatus("選擇期間類型...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 獲取 iframe 文檔
    const iframe = document.getElementById(
      bankConfig.selectors.query.iframeName
    );
    let searchDoc = document;
    
    if (iframe && iframe.contentDocument) {
      searchDoc = iframe.contentDocument;
    }
    
    const periodType = searchDoc.querySelector(
      bankConfig.selectors.query.periodType
    );
    if (periodType) {
      console.log("點擊期間類型選項");
      periodType.click();
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 3;
        window.czAssistUtils.executeAutomationStep();
      }, 1000);
    } else {
      console.error("找不到期間類型選項");
      // 繼續執行，不停止自動化
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 3;
        window.czAssistUtils.executeAutomationStep();
      }, 1000);
    }
  },

  // 步驟4: 設定高雄銀行日期範圍（高雄銀行專用）
  step4_setBokDateRange: () => {
    window.czAssistUtils.updateAutomationStatus("設定高雄銀行日期範圍...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 獲取 iframe 文檔
    const iframe = document.getElementById(
      bankConfig.selectors.query.iframeName
    );
    let searchDoc = document;
    
    if (iframe && iframe.contentDocument) {
      searchDoc = iframe.contentDocument;
    }
    
    // 使用通用日期計算函數
    const dateRange = window.czAssistUtils.calculateQueryDateRange();
    
    const startDateField = searchDoc.querySelector(
      bankConfig.selectors.query.startDate
    );
    const endDateField = searchDoc.querySelector(
      bankConfig.selectors.query.endDate
    );
    
    if (startDateField) {
      startDateField.value = dateRange.startDate;
      startDateField.dispatchEvent(new Event("input", { bubbles: true }));
      startDateField.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`高雄銀行開始日期已設定: ${dateRange.startDate}`);
    }
    
    if (endDateField) {
      endDateField.value = dateRange.endDate;
      endDateField.dispatchEvent(new Event("input", { bubbles: true }));
      endDateField.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`高雄銀行結束日期已設定: ${dateRange.endDate}`);
    }
    
    console.log(
      `高雄銀行日期範圍設定完成: ${dateRange.startDate} - ${dateRange.endDate} (${dateRange.daysBack}天前至今天)`
    );
    
    setTimeout(() => {
      window.czAssistExtension.automation.currentStep = 4;
      window.czAssistUtils.executeAutomationStep();
    }, 2000);
  },

  // =============== 兆豐銀行專用步驟 ===============

  // 步驟1: 點擊帳戶查詢（兆豐銀行專用）
  step1_clickMegabankAccountQuery: () => {
    window.czAssistUtils.updateAutomationStatus("點擊帳戶查詢...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 獲取 iframe 文檔
    const iframe = document.getElementById(
      bankConfig.selectors.navigation.mainIframe
    );
    let searchDoc = document;
    
    if (iframe && iframe.contentDocument) {
      searchDoc = iframe.contentDocument;
      console.log(
        "使用 iframe 中的文檔進行操作:",
        bankConfig.selectors.navigation.mainIframe
      );
    } else {
      console.warn(
        "找不到指定的 iframe:",
        bankConfig.selectors.navigation.mainIframe
      );
    }
    
    const accountQueryLink = searchDoc.querySelector(
      bankConfig.selectors.navigation.accountQuery
    );
    
    if (accountQueryLink) {
      console.log("找到帳戶查詢連結，點擊中...");
      accountQueryLink.click();
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 1;
        window.czAssistUtils.executeAutomationStep();
      }, 3000);
    } else {
      console.error("找不到帳戶查詢連結");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳戶查詢連結");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟2: 點擊存款明細查詢（兆豐銀行專用）
  step2_clickMegabankDepositQuery: () => {
    window.czAssistUtils.updateAutomationStatus("點擊存款明細查詢...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 獲取 iframe 文檔
    const iframe = document.getElementById(
      bankConfig.selectors.navigation.mainIframe
    );
    let searchDoc = document;
    
    if (iframe && iframe.contentDocument) {
      searchDoc = iframe.contentDocument;
    }
    
    const depositQueryLink = searchDoc.querySelector(
      bankConfig.selectors.navigation.depositQuery
    );
    
    if (depositQueryLink) {
      console.log("找到存款明細查詢連結，點擊中...");
      depositQueryLink.click();
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 2;
        window.czAssistUtils.executeAutomationStep();
      }, 3000);
    } else {
      console.error("找不到存款明細查詢連結");
      window.czAssistUtils.updateAutomationStatus(
        "錯誤：找不到存款明細查詢連結"
      );
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟3: 設定兆豐銀行日期範圍（兆豐銀行專用）
  step3_setMegabankDateRange: () => {
    const queryDaysBack = window.czAssistExtension.settings.queryDaysBack ?? 0;
    
    // 如果查詢天數為 0，跳過日期設定，直接進入步驟 3（執行查詢）
    if (queryDaysBack === 0) {
      console.log("兆豐銀行查詢天數為 0，跳過日期設定");
      window.czAssistUtils.updateAutomationStatus("查詢天數為 0，跳過日期設定");
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 3;
        window.czAssistUtils.executeAutomationStep();
      }, 500);
      return;
    }
    
    window.czAssistUtils.updateAutomationStatus("設定兆豐銀行日期範圍...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    console.log("=== 兆豐銀行日期設定 ===");
    console.log("iframe 名稱:", bankConfig.selectors.query.iframeName);
    
    // 獲取 iframe 文檔（使用統一方法）
    const frameDoc = window.czAssistUtils.getQueryFrameDocument();
    console.log(
      "已獲取 frameDoc:",
      frameDoc === document ? "主文檔" : "iframe 文檔"
    );
    
    // 使用通用日期計算函數
    const dateRange = window.czAssistUtils.calculateQueryDateRange();
    
    console.log("起始日期選擇器:", bankConfig.selectors.query.startDate);
    
    // 嘗試多種方式查找起始日期輸入框
    let startDateField = frameDoc.querySelector(
      bankConfig.selectors.query.startDate
    );
    console.log("使用 querySelector 查找起始日期輸入框:", !!startDateField);
    
    if (!startDateField) {
      startDateField = frameDoc.getElementById("main:startDate");
      console.log("使用 getElementById 查找起始日期輸入框:", !!startDateField);
    }
    
    if (startDateField) {
      // 兆豐銀行使用 YYYY/MM/DD 格式
      console.log(`設定起始日期為: ${dateRange.startDate}`);
      startDateField.value = dateRange.startDate;
      startDateField.dispatchEvent(new Event("input", { bubbles: true }));
      startDateField.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`兆豐銀行起始日期已設定: ${dateRange.startDate}`);
      
      console.log(
        `兆豐銀行日期設定完成: ${dateRange.startDate} - ${dateRange.endDate} (${dateRange.daysBack}天前至今天)`
      );
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 3;
        window.czAssistUtils.executeAutomationStep();
      }, 2000);
    } else {
      console.error("找不到起始日期輸入框");
      console.error(
        "請檢查選擇器是否正確:",
        bankConfig.selectors.query.startDate
      );
      
      // 列出 iframe 中所有的 input 元素以供調試
      const allInputs = frameDoc.querySelectorAll("input");
      console.log(`iframe 中共有 ${allInputs.length} 個 input 元素:`);
      allInputs.forEach((input, index) => {
        console.log(
          `input ${index}: id="${input.id}", name="${input.name}", type="${input.type}"`
        );
      });
      
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到起始日期輸入框");
      // 繼續執行，不停止自動化（可能不需要設定日期）
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 3;
        window.czAssistUtils.executeAutomationStep();
      }, 1000);
    }
  },

  // =============== 臺灣企銀專用步驟 ===============

  // 步驟1: 點擊帳戶總覽（臺灣企銀專用）
  step1_clickTbbAccountOverview: () => {
    window.czAssistUtils.updateAutomationStatus("點擊帳戶總覽...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    
    // Helper function to find element in a document
    const findInDoc = (doc) => {
        // 1. Try exact selector
      let link = doc.querySelector(
        bankConfig.selectors.navigation.accountOverview
      );
        if (link) return link;

        // 2. Try searching for p.menu-title "帳戶總覽" and get parent a
      const titles = Array.from(doc.querySelectorAll("p.menu-title"));
      const targetTitle = titles.find((p) =>
        p.textContent.includes("帳戶總覽")
      );
        if (targetTitle) {
        return targetTitle.closest("a");
        }

        // 3. Try broad link search
      const links = Array.from(doc.querySelectorAll("a"));
      return links.find(
        (a) =>
          (a.textContent && a.textContent.includes("帳戶總覽")) ||
          (a.onclick && String(a.onclick).includes("/OVERVIEW/initview")) ||
          (a.href && a.href.includes("/OVERVIEW/initview"))
        );
    };

    // Helper function to traverse frames (same-origin only)
    const findInFrames = (win) => {
        try {
            const doc = win.document;
            const found = findInDoc(doc);
            if (found) return { element: found, doc: doc };

            const frames = win.frames;
            for (let i = 0; i < frames.length; i++) {
                try {
                    const result = findInFrames(frames[i]);
                    if (result) return result;
                } catch (e) {
                    // Cross-origin frame, skip
                    void e;
                }
            }
        } catch (e) {
            // Access denied
            void e;
        }
        return null;
    };

    // Search
    let target = null;
    try {
        // Search in top window first
        let element = findInDoc(document);
        if (element) {
            target = { element, doc: document };
        } else {
            // Search in frames
            target = findInFrames(window);
        }
    } catch (e) {
        console.error("Searching elements failed:", e);
    }
    
    if (target && target.element) {
      console.log("找到帳戶總覽連結，點擊中...", target.element);
      
      // IMPORTANT: Update step BEFORE clicking to ensure state is saved before navigation
      window.czAssistExtension.automation.currentStep = 1;
      
      // Force save state before navigation
      const stateToSave = {
          currentStep: 1,
          isRunning: window.czAssistExtension.automation.isRunning,
        lastQueryDate: window.czAssistExtension.automation.lastQueryDate,
          queryResults: window.czAssistExtension.automation.queryResults,
          bank: window.czAssistExtension.selectedBank,
        timestamp: Date.now(),
      };
      chrome.storage.local.set({ automationState: stateToSave }, () => {
          console.log("State saved before navigation:", stateToSave);
          
          // Now click
          target.element.click();
          // Also try manual dispatch if click doesn't work
        target.element.dispatchEvent(
          new MouseEvent("click", {
            view: window,
            bubbles: true,
            cancelable: true,
          })
        );
      });
    } else {
      // Debug: list all links
      const allLinks = Array.from(document.querySelectorAll("a")).map((a) => ({
          text: a.textContent.trim(),
          href: a.href,
        onclick: a.getAttribute("onclick"),
      }));
      console.error("找不到帳戶總覽連結。當前頁面連結列表:", allLinks);
      
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳戶總覽連結");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟2: 選擇指定帳號的帳戶並點擊帳戶明細查詢（臺灣企銀專用）
  step2_selectTbbMaxBalanceAccount: () => {
    window.czAssistUtils.updateAutomationStatus("尋找指定帳號的帳戶...");
    
    // 獲取所有表格行
    const rows = document.querySelectorAll("table tbody tr");
    if (!rows || rows.length === 0) {
      console.error("找不到帳戶表格");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳戶表格");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    const targetAccountNumber = window.czAssistUtils.getTbbTargetAccount();
    let targetSelect = null;
    
    console.log(
      `找到 ${rows.length} 行數據，開始尋找帳號 ${targetAccountNumber}...`
    );
    
    rows.forEach((row, index) => {
      // 跳過合計行
      if (row.cells[0].textContent.includes("合計")) return;
      
      try {
        // 獲取第一欄的帳號
        const accountNumber = row.cells[0].textContent.trim();
        
        // 獲取下拉選單（第6欄）
        const select = row.cells[5].querySelector("select");
        
        console.log(
          `行 ${index}: 帳號=${accountNumber}, 有下拉選單=${!!select}`
        );
        
        // 檢查是否為目標帳號
        if (accountNumber === targetAccountNumber && select) {
          console.log(`找到目標帳號 ${targetAccountNumber}，在下拉選單`);
          targetSelect = select;
        }
      } catch (e) {
        console.warn(`解析行 ${index} 時發生錯誤:`, e);
      }
    });
    
    if (targetSelect) {
      console.log(
        `找到帳號 ${targetAccountNumber} 的帳戶，選擇帳戶明細查詢...`
      );
      window.czAssistUtils.updateAutomationStatus(
        `選擇帳號 ${targetAccountNumber} 的帳戶...`
      );
      
      // IMPORTANT: Update step BEFORE selecting to ensure state is saved before navigation
      window.czAssistExtension.automation.currentStep = 2;
      
      // Force save state before navigation
      const stateToSave = {
          currentStep: 2,
          isRunning: window.czAssistExtension.automation.isRunning,
          lastQueryDate: window.czAssistExtension.automation.lastQueryDate,
          queryResults: window.czAssistExtension.automation.queryResults,
          bank: window.czAssistExtension.selectedBank,
        timestamp: Date.now(),
      };
      chrome.storage.local.set({ automationState: stateToSave }, () => {
          console.log("State saved before account selection:", stateToSave);
          
          // Now select "帳戶明細查詢"
      targetSelect.value = "demand_deposit_detail";
      targetSelect.dispatchEvent(new Event("change", { bubbles: true }));
      });
    } else {
      console.error(`找不到帳號 ${targetAccountNumber} 或該帳號沒有下拉選單`);
      window.czAssistUtils.updateAutomationStatus(
        `錯誤：找不到帳號 ${targetAccountNumber}`
      );
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟3: 設定臺灣企銀日期範圍（臺灣企銀專用）
  step3_setTbbDateRange: () => {
    window.czAssistUtils.updateAutomationStatus("設定日期範圍...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    
    // 0. 檢查並選擇帳號（如果還沒選擇）
    const accountSelect = document.querySelector("#ACN");
    if (
      accountSelect &&
      accountSelect.options &&
      accountSelect.options.length > 0
    ) {
      const targetAccountNumber = window.czAssistUtils.getTbbTargetAccount();
      const currentValue = accountSelect.value;
      
      if (currentValue !== targetAccountNumber) {
        console.log(
          `帳號未選擇或選擇錯誤（當前: ${currentValue}），重新選擇: ${targetAccountNumber}`
        );
        const option = Array.from(accountSelect.options).find(
          (opt) => opt.value === targetAccountNumber
        );
        if (option) {
          accountSelect.value = targetAccountNumber;
          accountSelect.dispatchEvent(new Event("change", { bubbles: true }));
          console.log(`帳號已選擇: ${targetAccountNumber}`);
        } else {
          console.warn(`找不到帳號選項 ${targetAccountNumber}`);
        }
      } else {
        console.log(`帳號已正確選擇: ${currentValue}`);
      }
    }
    
    // 1. 點擊指定區間 Radio
    const periodRadio = document.querySelector(
      bankConfig.selectors.query.periodRadio
    );
    if (periodRadio) {
      periodRadio.click();
      console.log("已點擊指定區間 Radio");
    } else {
      console.warn("找不到指定區間 Radio");
    }
    
    const queryDaysBack = window.czAssistExtension.settings.queryDaysBack ?? 0;
    
    // 如果查詢天數為 0，跳過日期設定（使用預設值），直接進入下一步
    if (queryDaysBack === 0) {
      console.log("查詢天數為 0，使用預設日期");
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 3;
        window.czAssistUtils.executeAutomationStep();
      }, 1000);
      return;
    }
    
    // 計算日期範圍
    const dateRange = window.czAssistUtils.calculateQueryDateRange();
    
    // 2. 設定起始日期
    const startDateField = document.querySelector(
      bankConfig.selectors.query.startDate
    );
    if (startDateField) {
      startDateField.value = dateRange.startDate; // 格式: 2025/11/19
      startDateField.dispatchEvent(new Event("input", { bubbles: true }));
      startDateField.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`起始日期已設定: ${dateRange.startDate}`);
    } else {
      console.error("找不到起始日期輸入框");
    }
    
    // 3. 設定結束日期（雖然通常預設是今天，但明確設定比較保險）
    const endDateField = document.querySelector(
      bankConfig.selectors.query.endDate
    );
    if (endDateField) {
      endDateField.value = dateRange.endDate;
      endDateField.dispatchEvent(new Event("input", { bubbles: true }));
      endDateField.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`結束日期已設定: ${dateRange.endDate}`);
    }
    
    // 4. 進入步驟 3（點擊「網頁顯示」按鈕）
    setTimeout(() => {
      window.czAssistExtension.automation.currentStep = 3;
      window.czAssistUtils.executeAutomationStep();
    }, 1000);
  },

  // 步驟1.5: 重新選擇帳號（臺灣企銀專用，重新查詢時使用）
  step1_5_selectTbbAccount: () => {
    window.czAssistUtils.updateAutomationStatus("選擇帳號...");
    
    const accountSelect = document.querySelector("#ACN");
    if (accountSelect) {
      const targetAccountNumber = window.czAssistUtils.getTbbTargetAccount();
      
      // 檢查目標帳號是否存在於選項中
      const option = Array.from(accountSelect.options).find(
        (opt) => opt.value === targetAccountNumber
      );
      
      if (option) {
        console.log(`找到目標帳號 ${targetAccountNumber}，選擇中...`);
        accountSelect.value = targetAccountNumber;
        accountSelect.dispatchEvent(new Event("change", { bubbles: true }));
        
        // 等待帳號選擇生效後，進入步驟 2（設定日期範圍）
        setTimeout(() => {
          console.log("帳號已選擇，進入日期範圍設定");
          window.czAssistExtension.automation.currentStep = 2;
          window.czAssistUtils.executeAutomationStep();
        }, 1000);
      } else {
        console.error(`找不到帳號選項 ${targetAccountNumber}`);
        window.czAssistUtils.updateAutomationStatus(
          `錯誤：找不到帳號 ${targetAccountNumber}`
        );
        window.czAssistUtils.stopAutomation();
      }
    } else {
      console.error("找不到帳號下拉選單");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳號下拉選單");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟3: 點擊「網頁顯示」按鈕（臺灣企銀專用）
  step3_clickTbbQueryButton: () => {
    window.czAssistUtils.updateAutomationStatus("點擊「網頁顯示」按鈕...");
    
    const queryButton = document.querySelector("#CMSUBMITNOW");
    if (queryButton) {
      console.log("找到「網頁顯示」按鈕，點擊中...");
      
      // IMPORTANT: Update step BEFORE clicking to ensure state is saved before navigation
      window.czAssistExtension.automation.currentStep = 6;
      
      // Force save state before navigation
      const stateToSave = {
          currentStep: 6,
          isRunning: window.czAssistExtension.automation.isRunning,
          lastQueryDate: window.czAssistExtension.automation.lastQueryDate,
          queryResults: window.czAssistExtension.automation.queryResults,
          bank: window.czAssistExtension.selectedBank,
        timestamp: Date.now(),
      };
      chrome.storage.local.set({ automationState: stateToSave }, () => {
          console.log("State saved before clicking query button:", stateToSave);
          
          // Now click
          queryButton.click();
      });
    } else {
      console.error("找不到「網頁顯示」按鈕");
      window.czAssistUtils.updateAutomationStatus(
        "錯誤：找不到「網頁顯示」按鈕"
      );
      window.czAssistUtils.stopAutomation();
    }
  },

  // =============== 淡水一信專用步驟 ===============

  // 步驟1: 點擊活期帳戶總覽（淡水一信專用）
  step1_clickTfccAccountOverview: () => {
    window.czAssistUtils.updateAutomationStatus("點擊活期帳戶總覽...");
    
    // 查找「活期帳戶總覽」連結
    const accountOverviewLink = document.querySelector(
      'a[href="/eb119/acctDataQry"]'
    );
    
    if (accountOverviewLink) {
      console.log("找到活期帳戶總覽連結，點擊中...", accountOverviewLink);
      
      // IMPORTANT: Update step BEFORE clicking to ensure state is saved before navigation
      window.czAssistExtension.automation.currentStep = 1;
      
      // Force save state before navigation
      const stateToSave = {
          currentStep: 1,
          isRunning: window.czAssistExtension.automation.isRunning,
          lastQueryDate: window.czAssistExtension.automation.lastQueryDate,
          queryResults: window.czAssistExtension.automation.queryResults,
          bank: window.czAssistExtension.selectedBank,
        timestamp: Date.now(),
      };
      chrome.storage.local.set({ automationState: stateToSave }, () => {
          console.log("State saved before navigation:", stateToSave);
          
          // Now click
          accountOverviewLink.click();
      });
    } else {
      console.error("找不到活期帳戶總覽連結");
      window.czAssistUtils.updateAutomationStatus(
        "錯誤：找不到活期帳戶總覽連結"
      );
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟2: 點擊帳戶列表中的第一個帳戶（淡水一信專用）
  step2_clickTfccAccountRow: () => {
    window.czAssistUtils.updateAutomationStatus("選擇帳戶...");
    
    // 查找 tr.tr-effect
    const accountRow = document.querySelector("tr.tr-effect");
    
    if (accountRow) {
      console.log("找到帳戶列表行，點擊中...", accountRow);
      
      // IMPORTANT: Update step BEFORE clicking to ensure state is saved before navigation
      window.czAssistExtension.automation.currentStep = 2;
      
      // Force save state before navigation
      const stateToSave = {
          currentStep: 2,
          isRunning: window.czAssistExtension.automation.isRunning,
          lastQueryDate: window.czAssistExtension.automation.lastQueryDate,
          queryResults: window.czAssistExtension.automation.queryResults,
          bank: window.czAssistExtension.selectedBank,
        timestamp: Date.now(),
      };
      chrome.storage.local.set({ automationState: stateToSave }, () => {
          console.log("State saved before account selection:", stateToSave);
          
          // Now click
          accountRow.click();
      });
    } else {
      // 可能已經在查詢頁面了，檢查是否有日期選擇器
      const dateSelector = document.querySelector("#check-btn");
      if (dateSelector) {
        console.log("已經在查詢頁面，跳過帳戶選擇，直接設定日期");
        window.czAssistExtension.automation.currentStep = 2;
        window.czAssistUtils.executeAutomationStep();
      } else {
        console.error("找不到帳戶列表行，也找不到日期選擇器");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳戶列表");
        window.czAssistUtils.stopAutomation();
      }
    }
  },

  // 步驟3: 設定淡水一信日期範圍（淡水一信專用）
  step3_setTfccDateRange: () => {
    window.czAssistUtils.updateAutomationStatus("設定日期範圍...");
    
    const queryDaysBack = window.czAssistExtension.settings.queryDaysBack ?? 0;
    console.log(`淡水一信查詢天數: ${queryDaysBack}`);
    
    const selectElement = document.querySelector("#check-btn");
    
    if (!selectElement) {
      console.error("找不到日期範圍選擇器");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到日期範圍選擇器");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    if (queryDaysBack === 0) {
      // 選擇「今天」選項
      console.log("查詢天數為 0，選擇今天");
      selectElement.value = "0";
      selectElement.dispatchEvent(new Event("change", { bubbles: true }));
      
      // 選擇完會自動查詢，等待查詢完成後直接提取數據（跳過步驟3的executeQuery）
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 4; // 跳到步驟4（提取數據）
        window.czAssistUtils.executeAutomationStep();
      }, 3000);
    } else {
      // 選擇「自訂區間」選項
      console.log("查詢天數不為 0，選擇自訂區間");
      selectElement.value = "custom";
      selectElement.dispatchEvent(new Event("change", { bubbles: true }));
      
      // 等待自訂區間輸入框出現
      setTimeout(() => {
        const startDateField = document.querySelector("#start");
        const endDateField = document.querySelector("#end");
        
        if (startDateField && endDateField) {
          // 計算日期範圍
          const dateRange = window.czAssistUtils.calculateQueryDateRange();
          
          // 設定起始日期（直接修改值）
          startDateField.value = dateRange.startDate; // 格式: 2025/11/19
          startDateField.dispatchEvent(new Event("input", { bubbles: true }));
          startDateField.dispatchEvent(new Event("change", { bubbles: true }));
          
          console.log(`起始日期已設定: ${dateRange.startDate}`);
          
          // 點擊結束日期輸入框以打開 datepicker
          // 嘗試多種方式觸發 datepicker
          endDateField.focus();
          endDateField.click();
          endDateField.dispatchEvent(
            new MouseEvent("mousedown", { bubbles: true })
          );
          endDateField.dispatchEvent(
            new MouseEvent("mouseup", { bubbles: true })
          );
          endDateField.dispatchEvent(new Event("focus", { bubbles: true }));
          
          console.log("已觸發結束日期輸入框的點擊和 focus 事件");
          
          // 等待 datepicker 出現並完全載入
          const waitForDatepicker = (attempts = 0) => {
            const maxAttempts = 10;
            
            // 檢查 datepicker 是否已經載入（有內容）
            const datepicker = document.querySelector("#ui-datepicker-div");
            const hasContent =
              datepicker && datepicker.querySelector(".ui-datepicker-calendar");
            
            if (hasContent) {
              console.log("Datepicker 已載入");
              
              // 獲取今天的日期
              const today = new Date();
              const todayDate = today.getDate();
              const todayMonth = today.getMonth(); // 0-11
              const todayYear = today.getFullYear();
              
              console.log(
                `尋找今天的日期: ${todayYear}年${
                  todayMonth + 1
                }月${todayDate}日 (data-month=${todayMonth})`
              );
              
              // 優先使用 .ui-datepicker-today（最可靠）
              let todayCell = document.querySelector(".ui-datepicker-today a");
              
              if (!todayCell) {
                // 備用方案1：使用 data 屬性
                console.log("嘗試使用 data 屬性查找...");
                todayCell = document.querySelector(
                  `td[data-handler="selectDay"][data-month="${todayMonth}"][data-year="${todayYear}"] a[data-date="${todayDate}"]`
                );
              }
              
              if (!todayCell) {
                // 備用方案2：查找所有可點擊的日期
                console.log("嘗試查找所有可點擊的日期...");
                const allDates = document.querySelectorAll(
                  'td[data-handler="selectDay"] a'
                );
                console.log(`找到 ${allDates.length} 個可點擊的日期`);
                
                // 找到 data-date 匹配今天的
                todayCell = Array.from(allDates).find((a) => {
                  const date = parseInt(a.getAttribute("data-date"));
                  const td = a.closest("td");
                  const month = parseInt(td.getAttribute("data-month"));
                  const year = parseInt(td.getAttribute("data-year"));
                  
                  console.log(`檢查日期: ${year}/${month}/${date}`);
                  return (
                    date === todayDate &&
                    month === todayMonth &&
                    year === todayYear
                  );
                });
              }
              
              if (todayCell) {
                console.log("找到今天的日期，點擊中...", todayCell);
                todayCell.click();
                
                console.log(`結束日期已設定: ${dateRange.endDate}`);
                
                // 設定完日期會自動查詢，等待查詢完成後直接提取數據（跳過步驟3的executeQuery）
                setTimeout(() => {
                  window.czAssistExtension.automation.currentStep = 4; // 跳到步驟4（提取數據）
                  window.czAssistUtils.executeAutomationStep();
                }, 3000);
              } else {
                console.error("找不到今天的日期在 datepicker 中");
                console.error("Datepicker HTML:", datepicker?.outerHTML);
                window.czAssistUtils.updateAutomationStatus(
                  "錯誤：找不到今天的日期"
                );
                window.czAssistUtils.stopAutomation();
              }
            } else if (attempts < maxAttempts) {
              // Datepicker 還沒載入，繼續等待
              console.log(
                `等待 datepicker 載入... (嘗試 ${attempts + 1}/${maxAttempts})`
              );
              setTimeout(() => waitForDatepicker(attempts + 1), 200);
            } else {
              console.error("Datepicker 載入超時");
              console.error("Datepicker HTML:", datepicker?.outerHTML);
              window.czAssistUtils.updateAutomationStatus(
                "錯誤：日期選擇器載入失敗"
              );
              window.czAssistUtils.stopAutomation();
            }
          };
          
          // 開始等待 datepicker
          setTimeout(() => waitForDatepicker(), 200);
        } else {
          console.error("找不到起始日期或結束日期輸入框");
          window.czAssistUtils.updateAutomationStatus("錯誤：找不到日期輸入框");
          window.czAssistUtils.stopAutomation();
        }
      }, 1000);
    }
  },

  // 步驟4: 提取淡水一信交易數據（淡水一信專用）
  step4_extractTfccTransactionData: async () => {
    window.czAssistUtils.updateAutomationStatus("提取交易數據...");
    
    // 先設定每頁顯示 100 筆
    const pageSizeSelect = document.querySelector(
      'select[name="dataList_length"]'
    );
    if (pageSizeSelect && pageSizeSelect.value !== "100") {
      console.log("設定每頁顯示 100 筆");
      pageSizeSelect.value = "100";
      pageSizeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      
      // 等待表格重新載入
      setTimeout(() => {
        window.czAssistUtils.step4_extractTfccTransactionData();
      }, 2000);
      return;
    }
    
    // 提取當前頁面的交易數據
    const table = document.querySelector("#dataList");
    if (!table) {
      console.error("找不到交易記錄表格");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到交易記錄表格");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    const rows = table.querySelectorAll("tbody tr.tr-normal");
    console.log(`找到 ${rows.length} 筆交易記錄`);
    
    // 獲取今天的日期（用於判斷交易日期是否為今天）
    const today = new Date();
    const todayStr = `${today.getFullYear()}/${String(
      today.getMonth() + 1
    ).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;
    
    const transactions = [];
    
    rows.forEach((row, index) => {
      try {
        const cells = row.querySelectorAll("td");
        if (cells.length < 6) {
          console.warn(`行 ${index} 欄位不足，跳過`);
          return;
        }
        
        // 提取數據
        const dateText = cells[0].textContent.trim().replace(/\s*\*\s*$/, ""); // 移除可能的 * 標記
        const summary = cells[1].textContent.trim();
        const expenditure = cells[2].textContent.trim();
        const deposit = cells[3].textContent.trim();
        const balance = cells[4].textContent.trim();
        const remark = cells[5].textContent.trim();
        
        // 只處理有「存入」金額的記錄
        if (deposit && deposit !== "--" && deposit !== "") {
          // 判斷交易時間：
          // - 如果交易日期是今天，使用當前時間（發送時間）
          // - 如果交易日期不是今天（是昨天或更早），使用固定時間 23:59:00
          // 這樣可以避免跨日時，昨天的交易時間變成隔天的時間
          let timeStr;
          if (dateText === todayStr) {
            // 今天的交易，使用當前時間
            const now = new Date();
            timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
              now.getMinutes()
            ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
          } else {
            // 昨天或更早的交易，使用固定時間 23:59:00
            timeStr = "23:59:00";
          }
          
          // 組合完整的日期時間
          const datetime = `${dateText} ${timeStr}`;
          
          // 移除金額中的逗號
          const amount = deposit.replace(/,/g, "");
          
          transactions.push({
            date: datetime, // 交易時間
            amount: amount, // 存入金額
            account: remark, // 備註（帳號）
            summary: summary, // 摘要
            balance: balance.replace(/,/g, ""), // 帳戶餘額
            expenditure:
              expenditure === "--" ? "0" : expenditure.replace(/,/g, ""), // 支出
          });

          console.log(
            `提取交易: ${datetime}, 存入: ${amount}, 備註: ${remark}`
          );
        }
      } catch (e) {
        console.error(`解析行 ${index} 時發生錯誤:`, e);
      }
    });
    
    console.log(`本頁提取了 ${transactions.length} 筆存入記錄`);
    
    // 將交易記錄添加到結果中
    window.czAssistExtension.automation.queryResults.push(...transactions);
    
    // 檢查是否有下一頁
    const nextButton = document.querySelector("#dataList_next");
    const isNextDisabled =
      nextButton &&
      (nextButton.classList.contains("disabled") ||
        nextButton.querySelector("a")?.getAttribute("aria-disabled") ===
          "true");
    
    if (isNextDisabled) {
      // 沒有下一頁了，完成提取
      console.log(
        `總共提取了 ${window.czAssistExtension.automation.queryResults.length} 筆交易記錄`
      );
      window.czAssistUtils.updateAutomationStatus(
        `已提取 ${window.czAssistExtension.automation.queryResults.length} 筆交易記錄`
      );
      
      // 顯示結果在側邊欄
      if (window.czAssistExtension.automation.queryResults.length > 0) {
        let resultsHtml = '<div class="cz-results-summary">';
        resultsHtml += `<p>找到 ${window.czAssistExtension.automation.queryResults.length} 筆存入記錄</p>`;
        resultsHtml += '<table class="cz-results-table">';
        resultsHtml +=
          "<thead><tr><th>時間</th><th>金額</th><th>備註</th></tr></thead>";
        resultsHtml += "<tbody>";
        
        window.czAssistExtension.automation.queryResults.forEach((tx) => {
          resultsHtml += "<tr>";
          resultsHtml += `<td>${tx.date}</td>`;
          resultsHtml += `<td style="text-align: right;">${tx.amount}</td>`;
          resultsHtml += `<td>${tx.account || tx.summary}</td>`;
          resultsHtml += "</tr>";
        });
        
        resultsHtml += "</tbody></table></div>";
        
        // 更新側邊欄結果區域
        const resultsList = document.getElementById("cz-results-list");
        if (resultsList) {
          resultsList.innerHTML = resultsHtml;
        }
      }
      
      // 發送交易記錄到 API
      await window.czAssistUtils.sendTransactionsToAPI(
        window.czAssistExtension.automation.queryResults
      );
      
      // 進入重新查詢循環
      window.czAssistExtension.automation.currentStep = 5;
      window.czAssistUtils.executeAutomationStep();
    } else {
      // 還有下一頁，點擊下一頁按鈕
      console.log("還有下一頁，繼續提取...");
      const nextLink = nextButton.querySelector("a");
      if (nextLink) {
        nextLink.click();
        
        // 等待下一頁載入
        setTimeout(() => {
          window.czAssistUtils.step4_extractTfccTransactionData();
        }, 2000);
      } else {
        console.error("找不到下一頁連結");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到下一頁連結");
        window.czAssistUtils.stopAutomation();
      }
    }
  },

  // 步驟5: 等待並重新查詢（淡水一信專用）
  step5_tfccWaitAndRequery: () => {
    window.czAssistUtils.updateAutomationStatus("等待3秒後重新查詢...", true);
    
    let countdown = 3;
    const countdownInterval = setInterval(() => {
      if (!window.czAssistExtension.automation.isRunning) {
        clearInterval(countdownInterval);
        return;
      }
      
      countdown--;
      window.czAssistUtils.updateAutomationStatus(
        `等待 ${countdown} 秒後重新查詢...`,
        true
      );
      
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        
        // 清空當前查詢結果
        window.czAssistExtension.automation.queryResults = [];
        
        // 重新設定查詢時間（重新執行步驟 2）
        console.log("開始重新查詢，重新設定查詢時間");
        window.czAssistExtension.automation.currentStep = 2;
        window.czAssistUtils.executeAutomationStep();
      }
    }, 1000);
  },

  // =============== 聯邦銀行專用步驟 ===============

  // 步驟1: 點擊帳戶查詢（聯邦銀行專用）
  step1_clickUbotAccountQuery: () => {
    window.czAssistUtils.updateAutomationStatus("點擊帳戶查詢...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 嘗試點擊 label 或 checkbox
    const label = document.querySelector(
      bankConfig.selectors.navigation.accountQueryLabel
    );
    const checkbox = document.querySelector(
      bankConfig.selectors.navigation.accountQueryToggle
    );
    
    if (label) {
      console.log("找到帳戶查詢 label，點擊中...");
      label.click();
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 1;
        window.czAssistUtils.executeAutomationStep();
      }, 3000);
    } else if (checkbox) {
      console.log("找到帳戶查詢 checkbox，點擊中...");
      checkbox.click();
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 1;
        window.czAssistUtils.executeAutomationStep();
      }, 3000);
    } else {
      console.error("找不到帳戶查詢 toggle");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳戶查詢");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟2: 點擊交易明細查詢（聯邦銀行專用）
  step2_clickUbotTransactionQuery: () => {
    window.czAssistUtils.updateAutomationStatus("點擊交易明細查詢...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    const transactionQueryLink = document.querySelector(
      bankConfig.selectors.navigation.transactionQueryLink
    );
    
    if (transactionQueryLink) {
      console.log("找到交易明細查詢連結，點擊中...");
      transactionQueryLink.click();
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 2;
        window.czAssistUtils.executeAutomationStep();
      }, 3000);
    } else {
      console.error("找不到交易明細查詢連結");
      window.czAssistUtils.updateAutomationStatus(
        "錯誤：找不到交易明細查詢連結"
      );
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟3: 設定聯邦銀行日期範圍（聯邦銀行專用）
  step3_setUbotDateRange: () => {
    window.czAssistUtils.updateAutomationStatus("設定日期範圍...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    const queryDaysBack = window.czAssistExtension.settings.queryDaysBack ?? 0;
    console.log(`聯邦銀行查詢天數: ${queryDaysBack}`);
    
    // 計算日期範圍
    const dateRange = window.czAssistUtils.calculateQueryDateRange();
    
    // 轉換日期格式從 YYYY/MM/DD 到 YYYY-MM-DD
    const formatDateForUbot = (dateStr) => {
      return dateStr.replace(/\//g, "-");
    };
    
    const startDateFormatted = formatDateForUbot(dateRange.startDate);
    const endDateFormatted = formatDateForUbot(dateRange.endDate);
    
    console.log(
      `聯邦銀行日期範圍: ${startDateFormatted} - ${endDateFormatted}`
    );
    
    if (queryDaysBack === 0) {
      // 查詢天數為 0，不需要點擊自選日期，直接點擊查詢按鈕
      console.log("查詢天數為 0，跳過日期設定，直接執行查詢");
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 3;
        window.czAssistUtils.executeAutomationStep();
      }, 1000);
    } else {
      // 查詢天數不為 0，需要點擊自選日期，然後設定起日和迄日
      console.log("查詢天數不為 0，點擊自選日期");
      
      const customDateRadio = document.querySelector(
        bankConfig.selectors.query.customDateRadio
      );
      const customDateLabel = document.querySelector(
        bankConfig.selectors.query.customDateLabel
      );
      
      if (customDateLabel) {
        console.log("點擊自選日期 label");
        customDateLabel.click();
      } else if (customDateRadio) {
        console.log("點擊自選日期 radio");
        customDateRadio.click();
      } else {
        console.error("找不到自選日期選項");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到自選日期選項");
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      // 等待自選日期選項生效後，設定日期
      setTimeout(() => {
        window.czAssistUtils.setUbotDates(startDateFormatted, endDateFormatted);
      }, 1000);
    }
  },

  // 設定聯邦銀行起日和迄日（聯邦銀行專用）
  setUbotDates: (startDate, endDate) => {
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    const startDateField = document.querySelector(
      bankConfig.selectors.query.startDate
    );
    const endDateField = document.querySelector(
      bankConfig.selectors.query.endDate
    );
    
    if (!startDateField || !endDateField) {
      console.error("找不到起日或迄日輸入框");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到日期輸入框");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    console.log(`設定起日: ${startDate}, 迄日: ${endDate}`);
    
    // 解析目標日期
    const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
    const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
    const targetStartDate = new Date(startYear, startMonth - 1, startDay);
    const targetEndDate = new Date(endYear, endMonth - 1, endDay);
    
    console.log(
      `解析後的起日: ${startYear}年${startMonth}月${startDay}日, Date對象: ${targetStartDate.toISOString()}`
    );
    console.log(
      `解析後的迄日: ${endYear}年${endMonth}月${endDay}日, Date對象: ${targetEndDate.toISOString()}`
    );
    
    // 檢查日期是否正確
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const startDateStart = new Date(
      targetStartDate.getFullYear(),
      targetStartDate.getMonth(),
      targetStartDate.getDate()
    );
    const isStartDateToday = startDateStart.getTime() === todayStart.getTime();
    console.log(
      `起日是否為今天: ${isStartDateToday}, 今天: ${
        todayStart.toISOString().split("T")[0]
      }, 起日: ${startDateStart.toISOString().split("T")[0]}`
    );
    
    // 找到當前顯示的 datetimepicker（display: block 的那一個）
    const findVisibleDatepicker = () => {
      const allDatepickers = document.querySelectorAll(".datetimepicker");
      console.log(`找到 ${allDatepickers.length} 個 datetimepicker 元素`);
      
      for (const datepicker of allDatepickers) {
        const style = window.getComputedStyle(datepicker);
        const display = style.display;
        const isBlock = display === "block";
        
        console.log(`datetimepicker display: ${display}, isBlock: ${isBlock}`);
        
        // 只選擇 display: block 的 datetimepicker
        if (isBlock && datepicker.querySelector(".datetimepicker-days")) {
          console.log("找到可見的 datetimepicker (display: block)");
          return datepicker;
        }
      }
      
      console.warn("沒有找到 display: block 的 datetimepicker");
      return null;
    };
    
    // 選擇日期的輔助函數
    const selectDateInPicker = (datepicker, targetDate, onSuccess) => {
      if (!datepicker) {
        console.error("datepicker 為 null");
        return false;
      }
      
      const daysView = datepicker.querySelector(".datetimepicker-days");
      if (!daysView) {
        console.error("找不到 datetimepicker-days 視圖");
        return false;
      }
      
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();
      const targetDay = targetDate.getDate();
      
      console.log(
        `尋找日期: ${targetYear}年${targetMonth + 1}月${targetDay}日`
      );

      const monthNames = [
        "一月",
        "二月",
        "三月",
        "四月",
        "五月",
        "六月",
        "七月",
        "八月",
        "九月",
        "十月",
        "十一月",
        "十二月",
      ];
      
      // 嘗試切換到正確的月份和年份
      const navigateToDate = (attempts = 0) => {
        const maxAttempts = 30;
        
        if (attempts >= maxAttempts) {
          console.error("切換月份/年份超時");
          return false;
        }
        
        const switchElement = daysView.querySelector(".switch");
        const currentText = switchElement
          ? switchElement.textContent.trim()
          : "";
        console.log(
          `當前顯示: ${currentText} (嘗試 ${attempts + 1}/${maxAttempts})`
        );
        
        // 檢查是否已經在正確的月份和年份
        const targetMonthName = monthNames[targetMonth];
        const isCorrectMonth =
          currentText.includes(targetMonthName) &&
          currentText.includes(String(targetYear));
        
        if (isCorrectMonth) {
          // 已經在正確的月份，查找日期
          const allDays = daysView.querySelectorAll(".day");
          let targetCell = null;
          
          // 檢查目標日期是否是今天
          const today = new Date();
          const todayStart = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
          );
          const targetDateStart = new Date(
            targetDate.getFullYear(),
            targetDate.getMonth(),
            targetDate.getDate()
          );
          const isToday = targetDateStart.getTime() === todayStart.getTime();
          
          console.log(
            `目標日期: ${targetYear}年${
              targetMonth + 1
            }月${targetDay}日, 是否為今天: ${isToday}`
          );
          
          // 查找所有符合條件的日期元素
          const candidateCells = Array.from(allDays).filter((cell) => {
            const cellText = cell.textContent.trim();
            const isCorrectDay = cellText === String(targetDay);
            const isNotOldOrNew =
              !cell.classList.contains("old") &&
              !cell.classList.contains("new");
            return isCorrectDay && isNotOldOrNew;
          });
          
          console.log(`找到 ${candidateCells.length} 個符合條件的日期元素`);
          
          // 如果目標日期是今天，優先選擇有 today class 的
          if (isToday && candidateCells.length > 0) {
            targetCell =
              candidateCells.find((cell) => cell.classList.contains("today")) ||
              candidateCells[0];
            console.log(`目標日期是今天，選擇 today 元素`);
          } else if (candidateCells.length > 0) {
            // 如果不是今天，絕對不要選擇 today class 的元素
            const nonTodayCells = candidateCells.filter(
              (cell) => !cell.classList.contains("today")
            );
            if (nonTodayCells.length > 0) {
              targetCell = nonTodayCells[0];
              console.log(
                `目標日期不是今天，選擇非 today 元素，共 ${nonTodayCells.length} 個候選`
              );
            } else {
              // 如果所有候選都是 today，這不應該發生，但作為 fallback
              console.warn(
                `警告：所有候選元素都是 today，但目標日期不是今天，使用第一個候選`
              );
              targetCell = candidateCells[0];
            }
          }
          
          if (targetCell) {
            const cellText = targetCell.textContent.trim();
            const cellClasses = Array.from(targetCell.classList).join(" ");
            console.log(
              `找到目標日期，點擊中... 文字: "${cellText}", 類別: ${cellClasses}`
            );
            targetCell.click();
            setTimeout(onSuccess, 500);
            return true;
          } else {
            console.error(
              `找不到目標日期元素 (${targetDay}日)，候選元素數量: ${candidateCells.length}`
            );
            // 輸出所有可用的日期元素用於調試
            const allDayTexts = Array.from(allDays).map((cell) => ({
              text: cell.textContent.trim(),
              classes: Array.from(cell.classList).join(" "),
              isOldOrNew:
                cell.classList.contains("old") ||
                cell.classList.contains("new"),
            }));
            console.log(
              "所有日期元素:",
              allDayTexts.filter((d) => !d.isOldOrNew)
            );
            return false;
          }
        } else {
          // 需要切換月份或年份
          const prevButton = daysView.querySelector(".prev");
          const nextButton = daysView.querySelector(".next");
          
          // 解析當前顯示的月份和年份
          let currentYear = new Date().getFullYear();
          let currentMonth = new Date().getMonth();
          
          // 嘗試從 switch 文本中解析當前月份和年份
          const yearMatch = currentText.match(/(\d{4})/);
          if (yearMatch) {
            currentYear = parseInt(yearMatch[1]);
          }
          
          const currentMonthIndex = monthNames.findIndex((m) =>
            currentText.includes(m)
          );
          if (currentMonthIndex !== -1) {
            currentMonth = currentMonthIndex;
          }
          
          // 判斷需要往前還是往後
          let shouldClickPrev = false;
          let shouldClickNext = false;
          
          if (targetYear < currentYear) {
            shouldClickPrev = true;
          } else if (targetYear > currentYear) {
            shouldClickNext = true;
          } else if (targetMonth < currentMonth) {
            shouldClickPrev = true;
          } else if (targetMonth > currentMonth) {
            shouldClickNext = true;
          }
          
          if (shouldClickPrev && prevButton) {
            console.log("點擊上一頁按鈕");
            prevButton.click();
            setTimeout(() => navigateToDate(attempts + 1), 400);
          } else if (shouldClickNext && nextButton) {
            console.log("點擊下一頁按鈕");
            nextButton.click();
            setTimeout(() => navigateToDate(attempts + 1), 400);
          } else {
            console.error("無法切換到目標月份/年份");
            return false;
          }
          
          return false;
        }
      };
      
      navigateToDate();
      return true;
    };
    
    // 先設定起日
    const setStartDate = () => {
      console.log("開始設定起日，點擊輸入框以打開 datetimepicker");
      // 先觸發 focus 和 click 事件來打開 datetimepicker
      startDateField.focus();
      startDateField.click();
      startDateField.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true })
      );
      startDateField.dispatchEvent(
        new MouseEvent("mouseup", { bubbles: true, cancelable: true })
      );
      startDateField.dispatchEvent(
        new Event("focus", { bubbles: true, cancelable: true })
      );
      startDateField.dispatchEvent(
        new Event("click", { bubbles: true, cancelable: true })
      );
      
      // 等待 datetimepicker 出現
      const waitForDatepicker = (attempts = 0) => {
        const maxAttempts = 20;
        
        // 查找可見的 datetimepicker（display: block 的那一個）
        const datepicker = findVisibleDatepicker();
        const hasContent =
          datepicker && datepicker.querySelector(".datetimepicker-days");
        
        if (hasContent) {
          console.log("Datepicker 已載入，開始選擇起日");
          
          console.log(
            `準備選擇起日，目標日期: ${
              targetStartDate.toISOString().split("T")[0]
            } (${startYear}年${startMonth}月${startDay}日)`
          );
          const success = selectDateInPicker(
            datepicker,
            targetStartDate,
            () => {
            console.log("起日設定完成，開始設定迄日");
            // 檢查輸入框的值是否正確更新
            setTimeout(() => {
              console.log("起日輸入框當前值:", startDateField.value);
              setEndDate();
            }, 1000);
            }
          );
          
          if (!success) {
            // 如果選擇失敗，嘗試直接設定值
            console.log("嘗試直接設定起日值:", startDate);
            console.log("輸入框是否為 readonly:", startDateField.readOnly);
            console.log("輸入框當前值:", startDateField.value);
            
            // 如果輸入框是 readonly，可能需要先觸發點擊來打開日期選擇器，然後直接設定值
            if (startDateField.readOnly) {
              console.log("輸入框為 readonly，嘗試觸發更多事件");
              // 觸發 focus 和 click 事件
              startDateField.focus();
              startDateField.click();
              
              // 等待一下後再嘗試設定值
              setTimeout(() => {
                // 嘗試通過觸發 input 事件來設定值
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                  window.HTMLInputElement.prototype,
                  "value"
                ).set;
                nativeInputValueSetter.call(startDateField, startDate);
                startDateField.dispatchEvent(
                  new Event("input", { bubbles: true })
                );
                startDateField.dispatchEvent(
                  new Event("change", { bubbles: true })
                );
                console.log("已嘗試設定值，當前值:", startDateField.value);
                setTimeout(setEndDate, 1000);
              }, 500);
            } else {
              startDateField.value = startDate;
              startDateField.dispatchEvent(
                new Event("input", { bubbles: true })
              );
              startDateField.dispatchEvent(
                new Event("change", { bubbles: true })
              );
              console.log("已設定值，當前值:", startDateField.value);
              setTimeout(setEndDate, 1000);
            }
          }
        } else if (attempts < maxAttempts) {
          setTimeout(() => waitForDatepicker(attempts + 1), 200);
        } else {
          console.error("Datepicker 載入超時，嘗試直接設定值");
          console.log("輸入框是否為 readonly:", startDateField.readOnly);
          
          if (startDateField.readOnly) {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              "value"
            ).set;
            nativeInputValueSetter.call(startDateField, startDate);
            startDateField.dispatchEvent(new Event("input", { bubbles: true }));
            startDateField.dispatchEvent(
              new Event("change", { bubbles: true })
            );
          } else {
            startDateField.value = startDate;
            startDateField.dispatchEvent(new Event("input", { bubbles: true }));
            startDateField.dispatchEvent(
              new Event("change", { bubbles: true })
            );
          }
          console.log("已設定值，當前值:", startDateField.value);
          setTimeout(setEndDate, 1000);
        }
      };
      
      // 等待 datetimepicker 顯示，給它一些時間來響應點擊事件
      setTimeout(() => waitForDatepicker(), 500);
    };
    
    // 設定迄日
    const setEndDate = () => {
      console.log("開始設定迄日，點擊輸入框以打開 datetimepicker");
      // 先觸發 focus 和 click 事件來打開 datetimepicker
      endDateField.focus();
      endDateField.click();
      endDateField.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true })
      );
      endDateField.dispatchEvent(
        new MouseEvent("mouseup", { bubbles: true, cancelable: true })
      );
      endDateField.dispatchEvent(
        new Event("focus", { bubbles: true, cancelable: true })
      );
      endDateField.dispatchEvent(
        new Event("click", { bubbles: true, cancelable: true })
      );
      
      // 等待 datetimepicker 出現
      const waitForDatepicker = (attempts = 0) => {
        const maxAttempts = 20;
        
        // 查找可見的 datetimepicker（display: block 的那一個）
        const datepicker = findVisibleDatepicker();
        const hasContent =
          datepicker && datepicker.querySelector(".datetimepicker-days");
        
        if (hasContent) {
          console.log("Datepicker 已載入，開始選擇迄日");
          
          console.log(
            `準備選擇迄日，目標日期: ${
              targetEndDate.toISOString().split("T")[0]
            } (${endYear}年${endMonth}月${endDay}日)`
          );
          const success = selectDateInPicker(datepicker, targetEndDate, () => {
            console.log("迄日設定完成，進入下一步");
            // 檢查輸入框的值是否正確更新
            setTimeout(() => {
              console.log("迄日輸入框當前值:", endDateField.value);
              window.czAssistExtension.automation.currentStep = 3;
              window.czAssistUtils.executeAutomationStep();
            }, 1000);
          });
          
          if (!success) {
            // 如果選擇失敗，嘗試直接設定值
            console.log("嘗試直接設定迄日值:", endDate);
            console.log("輸入框是否為 readonly:", endDateField.readOnly);
            console.log("輸入框當前值:", endDateField.value);
            
            if (endDateField.readOnly) {
              console.log("輸入框為 readonly，嘗試觸發更多事件");
              endDateField.focus();
              endDateField.click();
              
              setTimeout(() => {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                  window.HTMLInputElement.prototype,
                  "value"
                ).set;
                nativeInputValueSetter.call(endDateField, endDate);
                endDateField.dispatchEvent(
                  new Event("input", { bubbles: true })
                );
                endDateField.dispatchEvent(
                  new Event("change", { bubbles: true })
                );
                console.log("已嘗試設定值，當前值:", endDateField.value);
                setTimeout(() => {
                  window.czAssistExtension.automation.currentStep = 3;
                  window.czAssistUtils.executeAutomationStep();
                }, 1000);
              }, 500);
            } else {
              endDateField.value = endDate;
              endDateField.dispatchEvent(new Event("input", { bubbles: true }));
              endDateField.dispatchEvent(
                new Event("change", { bubbles: true })
              );
              console.log("已設定值，當前值:", endDateField.value);
              setTimeout(() => {
                window.czAssistExtension.automation.currentStep = 3;
                window.czAssistUtils.executeAutomationStep();
              }, 1000);
            }
          }
        } else if (attempts < maxAttempts) {
          setTimeout(() => waitForDatepicker(attempts + 1), 200);
        } else {
          console.error("Datepicker 載入超時，嘗試直接設定值");
          console.log("輸入框是否為 readonly:", endDateField.readOnly);
          
          if (endDateField.readOnly) {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              "value"
            ).set;
            nativeInputValueSetter.call(endDateField, endDate);
            endDateField.dispatchEvent(new Event("input", { bubbles: true }));
            endDateField.dispatchEvent(new Event("change", { bubbles: true }));
          } else {
            endDateField.value = endDate;
            endDateField.dispatchEvent(new Event("input", { bubbles: true }));
            endDateField.dispatchEvent(new Event("change", { bubbles: true }));
          }
          console.log("已設定值，當前值:", endDateField.value);
          setTimeout(() => {
            window.czAssistExtension.automation.currentStep = 3;
            window.czAssistUtils.executeAutomationStep();
          }, 1000);
        }
      };
      
      // 等待 datetimepicker 顯示，給它一些時間來響應點擊事件
      setTimeout(() => waitForDatepicker(), 500);
    };
    
    // 開始設定起日
    setStartDate();
  },

  // 步驟4: 點擊查詢按鈕（聯邦銀行專用）
  step4_clickUbotQueryButton: () => {
    window.czAssistUtils.updateAutomationStatus("點擊查詢按鈕...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    const queryButton = document.querySelector(
      bankConfig.selectors.query.queryButton
    );
    
    if (queryButton) {
      console.log("找到查詢按鈕，點擊中...");
      
      // IMPORTANT: Update step BEFORE clicking to ensure state is saved before navigation
      window.czAssistExtension.automation.currentStep = 6;
      
      // Force save state before navigation
      const stateToSave = {
        currentStep: 6,
        isRunning: window.czAssistExtension.automation.isRunning,
        lastQueryDate: window.czAssistExtension.automation.lastQueryDate,
        queryResults: window.czAssistExtension.automation.queryResults,
        bank: window.czAssistExtension.selectedBank,
        timestamp: Date.now(),
      };
      chrome.storage.local.set({ automationState: stateToSave }, () => {
        console.log("State saved before clicking query button:", stateToSave);
        
        // Now click
        queryButton.click();
        
        // 等待查詢完成後提取數據
        setTimeout(() => {
          window.czAssistUtils.executeAutomationStep();
        }, 5000);
      });
    } else {
      console.error("找不到查詢按鈕");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到查詢按鈕");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟6: 提取聯邦銀行交易數據（聯邦銀行專用）
  step6_extractUbotTransactionData: async () => {
    window.czAssistUtils.updateAutomationStatus("提取交易數據...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 先設定每頁顯示 100 筆
    const pageSizeLinks = document.querySelectorAll(
      bankConfig.selectors.query.pageSizeDropdown
    );
    
    if (pageSizeLinks.length > 0) {
      // 查找文字為 "100" 的連結
      const pageSize100Link = Array.from(pageSizeLinks).find(
        (link) => link.textContent.trim() === "100"
      );
      const activeLink = document.querySelector(
        "ul.dropdown-menu li.active > a"
      );

      if (
        pageSize100Link &&
        (!activeLink || activeLink.textContent.trim() !== "100")
      ) {
        console.log("設定每頁顯示 100 筆");
        pageSize100Link.click();
        
        // 等待表格重新載入
        setTimeout(() => {
          window.czAssistUtils.step6_extractUbotTransactionData();
        }, 2000);
        return;
      }
    }
    
    // 找到表格
    const table = document.querySelector(bankConfig.selectors.query.dataGrid);
    const tbody = document.querySelector(bankConfig.selectors.query.tbody);
    
    if (!table || !tbody) {
      console.error("找不到交易記錄表格");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到交易記錄表格");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 找到所有交易行
    const rows = tbody.querySelectorAll("tr[data-index]");
    console.log(`找到 ${rows.length} 筆交易記錄`);
    
    const transactions = [];
    
    rows.forEach((row, index) => {
      try {
        const cells = row.querySelectorAll("td");
        if (cells.length < 10) {
          console.warn(`行 ${index} 欄位不足，跳過`);
          return;
        }
        
        // 提取數據
        // 第3欄：交易日期 (TraDate) - 格式: "2025/11/20 18:55:50"
        const dateCell = cells[2];
        // 第6欄：摘要 (Summary) - 帳號
        const accountCell = cells[5];
        // 第7欄：對方銀行代號 (ToBankCode)
        const bankCodeCell = cells[6];
        // 第9欄：存入金額 (Income)
        const amountCell = cells[8];
        // 第10欄：帳戶餘額 (Balance)
        const balanceCell = cells[9];
        
        const dateText = dateCell ? dateCell.textContent.trim() : "";
        const accountText = accountCell ? accountCell.textContent.trim() : "";
        const bankCodeText = bankCodeCell
          ? bankCodeCell.textContent.trim()
          : "";
        const amountText = amountCell ? amountCell.textContent.trim() : "";
        const balanceText = balanceCell ? balanceCell.textContent.trim() : "";
        
        // 只處理有「存入金額」的記錄
        if (amountText && amountText !== "" && amountText !== "--") {
          // 移除金額中的逗號
          const amount = amountText.replace(/,/g, "");
          
          // 組合對方銀行帳號：前3位銀行代碼 + 後16位帳號
          // 摘要欄位（第6欄）包含帳號，銀行代號欄位（第7欄）包含銀行代碼
          let fullAccount = "";
          
          if (bankCodeText && accountText) {
            // 提取銀行代碼（確保是3位數）
            const bankCode = bankCodeText
              .replace(/\D/g, "")
              .padStart(3, "0")
              .substring(0, 3);
            // 提取帳號（移除非數字，確保是16位數）
            const account = accountText
              .replace(/\D/g, "")
              .padStart(16, "0")
              .substring(0, 16);
            // 組合：前3位銀行代碼 + 後16位帳號
            fullAccount = bankCode + account;
            console.log(
              `組合帳號: 銀行代碼=${bankCodeText}->${bankCode}, 帳號=${accountText}->${account}, 完整=${fullAccount}`
            );
          } else if (accountText) {
            // 只有帳號，移除非數字字符
            fullAccount = accountText.replace(/\D/g, "");
            console.log(`只有帳號，無銀行代碼: ${fullAccount}`);
          }
          
          // 移除餘額中的逗號
          const balance = balanceText.replace(/,/g, "");
          
          transactions.push({
            date: dateText, // 交易日期時間
            amount: amount, // 存入金額
            account: fullAccount, // 對方銀行帳號（銀行代號+帳號）
            summary: accountText, // 摘要
            bankCode: bankCodeText, // 對方銀行代號
            balance: balance, // 帳戶餘額
          });

          console.log(
            `提取交易: ${dateText}, 存入: ${amount}, 帳號: ${fullAccount}, 餘額: ${balance}`
          );
        }
      } catch (e) {
        console.error(`解析行 ${index} 時發生錯誤:`, e);
      }
    });
    
    console.log(`本頁提取了 ${transactions.length} 筆存入記錄`);
    
    // 將交易記錄添加到結果中
    window.czAssistExtension.automation.queryResults.push(...transactions);
    
    // 檢查是否有下一頁
    const nextButton = document.querySelector(
      bankConfig.selectors.query.nextPageButton
    );
    const isNextDisabled =
      nextButton && nextButton.closest("li").classList.contains("disabled");
    
    console.log("下一頁按鈕狀態:", {
      exists: !!nextButton,
      isDisabled: isNextDisabled,
      hasNextPage: !!nextButton && !isNextDisabled,
    });
    
    if (nextButton && !isNextDisabled) {
      // 還有下一頁，點擊下一頁按鈕
      console.log("還有下一頁，繼續提取...");
      nextButton.click();
      
      // 等待下一頁載入
      setTimeout(() => {
        window.czAssistUtils.step6_extractUbotTransactionData();
      }, 2000);
    } else {
      // 沒有下一頁了，完成提取並發送到 API
      console.log(
        `總共提取了 ${window.czAssistExtension.automation.queryResults.length} 筆交易記錄`
      );
      await window.czAssistUtils.finishUbotDataExtraction();
    }
  },
  
  // 完成聯邦銀行數據提取並發送到 API
  finishUbotDataExtraction: async () => {
    window.czAssistUtils.updateAutomationStatus(
      `已提取 ${window.czAssistExtension.automation.queryResults.length} 筆交易記錄`
    );
    
    // 顯示結果在側邊欄
    if (window.czAssistExtension.automation.queryResults.length > 0) {
      let resultsHtml = '<div class="cz-results-summary">';
      resultsHtml += `<p>找到 ${window.czAssistExtension.automation.queryResults.length} 筆存入記錄</p>`;
      resultsHtml += '<table class="cz-results-table">';
      resultsHtml +=
        "<thead><tr><th>時間</th><th>金額</th><th>帳號</th></tr></thead>";
      resultsHtml += "<tbody>";
      
      window.czAssistExtension.automation.queryResults.forEach((tx) => {
        resultsHtml += "<tr>";
        resultsHtml += `<td>${tx.date}</td>`;
        resultsHtml += `<td style="text-align: right;">${tx.amount}</td>`;
        resultsHtml += `<td>${tx.account}</td>`;
        resultsHtml += "</tr>";
      });
      
      resultsHtml += "</tbody></table></div>";
      
      const resultsDiv = document.getElementById("cz-results");
      if (resultsDiv) {
        resultsDiv.innerHTML = resultsHtml;
      }
    }
    
    // 發送交易記錄到 API
    await window.czAssistUtils.sendTransactionsToAPI(
      window.czAssistExtension.automation.queryResults
    );
  },

  // =============== 台新銀行專用步驟 ===============

  // 輔助函數：通過文字內容查找元素
  findElementByText: (selector, text, searchDoc = document) => {
    const elements = searchDoc.querySelectorAll(selector);
    return (
      Array.from(elements).find((el) => el.textContent.trim().includes(text)) ||
      null
    );
  },

  // 步驟1: 點擊存匯授信服務（台新銀行專用）
  step1_clickTaishinDepositService: () => {
    window.czAssistUtils.updateAutomationStatus("點擊存匯授信服務...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 通過文字內容查找「存匯授信服務」連結
    const depositServiceLink = window.czAssistUtils.findElementByText(
      "a",
      "存匯授信服務"
    );
    
    if (depositServiceLink) {
      console.log("找到存匯授信服務連結，點擊中...");
      depositServiceLink.click();
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 1;
        window.czAssistUtils.executeAutomationStep();
      }, 3000);
    } else {
      console.error("找不到存匯授信服務連結");
      window.czAssistUtils.updateAutomationStatus(
        "錯誤：找不到存匯授信服務連結"
      );
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟2: 點擊交易明細查詢（台新銀行專用）
  step2_clickTaishinTransactionQuery: () => {
    window.czAssistUtils.updateAutomationStatus("點擊交易明細查詢...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 通過文字內容查找「交易明細查詢」連結
    const transactionQueryLink = window.czAssistUtils.findElementByText(
      "a",
      "交易明細查詢"
    );
    
    if (transactionQueryLink) {
      console.log("找到交易明細查詢連結，點擊中...");
      transactionQueryLink.click();
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 2;
        window.czAssistUtils.executeAutomationStep();
      }, 3000);
    } else {
      console.error("找不到交易明細查詢連結");
      window.czAssistUtils.updateAutomationStatus(
        "錯誤：找不到交易明細查詢連結"
      );
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟3: 選擇帳號（台新銀行專用）
  step3_selectTaishinAccount: () => {
    window.czAssistUtils.updateAutomationStatus("選擇帳號...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 等待下拉選單載入
    const waitForAccountDropdown = (attempts = 0) => {
      const maxAttempts = 10;
      
      if (attempts >= maxAttempts) {
        console.error("等待帳號下拉選單超時");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳號下拉選單");
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      // 查找包含「臺幣活期存款」的 li 元素
      const accountOption = window.czAssistUtils.findElementByText(
        "li.ui-dropdown-item",
        "臺幣活期存款"
      );
      
      if (accountOption) {
        console.log("找到臺幣活期存款選項，點擊中...");
        accountOption.click();
        
        setTimeout(() => {
          window.czAssistExtension.automation.currentStep = 3;
          window.czAssistUtils.executeAutomationStep();
        }, 2000);
      } else {
        console.log(`等待帳號下拉選單載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForAccountDropdown(attempts + 1), 500);
      }
    };
    
    waitForAccountDropdown();
  },

  // 步驟4: 選擇查詢期間（台新銀行專用）
  step4_selectTaishinPeriod: () => {
    window.czAssistUtils.updateAutomationStatus("選擇查詢期間...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 等待期間下拉選單載入
    const waitForPeriodDropdown = (attempts = 0) => {
      const maxAttempts = 10;
      
      if (attempts >= maxAttempts) {
        console.error("等待期間下拉選單超時");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到期間下拉選單");
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      // 先選擇「依交易日期」選項（在點擊自訂之前）
      // 查找日期類型 dropdown（PrimeNG 組件）
      const dateTypeDropdown = document.querySelector("dropdown#queryDateType");
      if (dateTypeDropdown) {
        // 先點擊 label 打開下拉選單
        const dropdownLabel = dateTypeDropdown.querySelector(
          "label.ui-dropdown-label"
        );
        if (dropdownLabel) {
          dropdownLabel.click();
          
          // 等待下拉選單打開後選擇選項（PrimeNG 的下拉選單選項在 body 上）
          setTimeout(() => {
            // 在整個 document 中查找包含「依交易日期」的選項
            const allDropdownItems = document.querySelectorAll(
              "li.ui-dropdown-item"
            );
            let targetOption = null;
            
            for (const item of allDropdownItems) {
              const text = item.textContent.trim();
              if (text === "依交易日期" || text.includes("依交易日期")) {
                targetOption = item;
                break;
              }
            }
            
            if (targetOption) {
              targetOption.click();
              console.log("已選擇「依交易日期」選項");
            } else {
              // 如果找不到選項，嘗試直接設置 select 的值
              const dateTypeSelect = dateTypeDropdown.querySelector(
                "select.selectpicker"
              );
              if (dateTypeSelect) {
                dateTypeSelect.value = "2";
                dateTypeSelect.dispatchEvent(
                  new Event("change", { bubbles: true })
                );
                dateTypeSelect.dispatchEvent(
                  new Event("input", { bubbles: true })
                );
                console.log("已通過設置 select 值選擇「依交易日期」選項");
              } else {
                console.warn(
                  "找不到「依交易日期」選項和 select 元素，繼續執行"
                );
              }
            }
          }, 500);
        } else {
          // 如果找不到 label，嘗試直接設置 select 的值
          const dateTypeSelect = dateTypeDropdown.querySelector(
            "select.selectpicker"
          );
          if (dateTypeSelect) {
            dateTypeSelect.value = "2";
            dateTypeSelect.dispatchEvent(
              new Event("change", { bubbles: true })
            );
            dateTypeSelect.dispatchEvent(new Event("input", { bubbles: true }));
            console.log(
              "已通過設置 select 值選擇「依交易日期」選項（無 label）"
            );
          } else {
            console.warn("找不到日期類型 label 和 select 元素，繼續執行");
          }
        }
      } else {
        console.warn("找不到日期類型 dropdown，繼續執行");
      }
      
      // 查找包含「自訂」的 li 元素
      const periodOption = window.czAssistUtils.findElementByText(
        "li.ui-dropdown-item",
        "自訂"
      );
      
      if (periodOption) {
        console.log("找到自訂期間選項，點擊中...");
        periodOption.click();
        
        setTimeout(() => {
          window.czAssistExtension.automation.currentStep = 4;
          window.czAssistUtils.executeAutomationStep();
        }, 2000);
      } else {
        console.log(`等待期間下拉選單載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForPeriodDropdown(attempts + 1), 500);
      }
    };
    
    waitForPeriodDropdown();
  },

  // 步驟5: 設定日期範圍（台新銀行專用）
  step5_setTaishinDateRange: () => {
    window.czAssistUtils.updateAutomationStatus("設定日期範圍...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 計算日期範圍
    const dateRange = window.czAssistUtils.calculateQueryDateRange();
    
    // 台新銀行日期格式為 YYYY/MM/DD
    const formatDateForTaishin = (dateStr) => {
      return dateStr; // 已經是 YYYY/MM/DD 格式
    };
    
    const startDateFormatted = formatDateForTaishin(dateRange.startDate);
    const endDateFormatted = formatDateForTaishin(dateRange.endDate);
    
    console.log(
      `台新銀行日期範圍: ${startDateFormatted} - ${endDateFormatted}`
    );
    
    // 等待日期輸入框載入
    const waitForDateInputs = (attempts = 0) => {
      const maxAttempts = 10;
      
      if (attempts >= maxAttempts) {
        console.error("等待日期輸入框超時");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到日期輸入框");
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      // 查找起日輸入框（通過 calendar#startDate）
      const startDateCalendar = document.querySelector("calendar#startDate");
      const startDateInput = startDateCalendar
        ? startDateCalendar.querySelector("input.ui-datepicker.hasDatepicker")
        : null;
      
      // 查找迄日輸入框（通過 calendar#endDate 或查找第二個日期輸入框）
      const endDateCalendar = document.querySelector("calendar#endDate");
      const endDateInput = endDateCalendar
        ? endDateCalendar.querySelector("input.ui-datepicker.hasDatepicker")
        : null;
      
      // 如果找不到，嘗試通過查找所有日期輸入框（排除時間輸入框）
      let startDateInputFallback = null;
      let endDateInputFallback = null;
      
      if (!startDateInput || !endDateInput) {
        // 查找所有日期輸入框，但排除時間輸入框（時間輸入框在 calendar#startTime 或 calendar#endTime 中）
        const allDateInputs = document.querySelectorAll(
          "input.ui-datepicker.hasDatepicker"
        );
        const dateInputs = [];
        
        for (const input of allDateInputs) {
          // 檢查是否在時間 calendar 中
          const calendar = input.closest("calendar");
          if (
            calendar &&
            (calendar.id === "startTime" || calendar.id === "endTime")
          ) {
            continue; // 跳過時間輸入框
          }
          dateInputs.push(input);
        }
      
      if (dateInputs.length >= 2) {
          startDateInputFallback = dateInputs[0];
          endDateInputFallback = dateInputs[1];
        }
      }
      
      // 使用找到的輸入框（優先使用通過 ID 找到的）
      const finalStartDateInput = startDateInput || startDateInputFallback;
      const finalEndDateInput = endDateInput || endDateInputFallback;
      
      if (finalStartDateInput && finalEndDateInput) {
        console.log("找到日期輸入框，設定日期中...");
        
        // 設定起日
        finalStartDateInput.value = startDateFormatted;
        finalStartDateInput.dispatchEvent(
          new Event("input", { bubbles: true })
        );
        finalStartDateInput.dispatchEvent(
          new Event("change", { bubbles: true })
        );
          console.log(`起日已設定: ${startDateFormatted}`);
        
        // 設定迄日
        finalEndDateInput.value = endDateFormatted;
        finalEndDateInput.dispatchEvent(new Event("input", { bubbles: true }));
        finalEndDateInput.dispatchEvent(new Event("change", { bubbles: true }));
          console.log(`迄日已設定: ${endDateFormatted}`);
        
        setTimeout(() => {
          window.czAssistExtension.automation.currentStep = 5;
          window.czAssistUtils.executeAutomationStep();
        }, 2000);
      } else {
        console.log(`等待日期輸入框載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForDateInputs(attempts + 1), 500);
      }
    };
    
    waitForDateInputs();
  },

  // 步驟6: 設定排序方式（台新銀行專用）
  step6_setTaishinOrderType: () => {
    window.czAssistUtils.updateAutomationStatus("設定排序方式...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 查找「由近至遠」的 radio input
    const orderTypeInput = document.querySelector(
      'input[type="radio"][name="orderType"][value="2"]'
    );
    
    if (orderTypeInput) {
      console.log("找到由近至遠 radio，點擊中...");
      
      // 點擊 radio input
      orderTypeInput.click();
      orderTypeInput.dispatchEvent(new Event("change", { bubbles: true }));
      
      // 也嘗試點擊外層的 radiobutton 元素
      const radiobutton = orderTypeInput.closest("radiobutton");
      if (radiobutton) {
        radiobutton.click();
      }
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 6;
        window.czAssistUtils.executeAutomationStep();
      }, 2000);
    } else {
      console.error("找不到由近至遠 radio，從步驟 0 重新開始");
      window.czAssistUtils.updateAutomationStatus(
        "找不到排序選項，5秒後重新開始..."
      );
      
      // 等待 5 秒後從步驟 0 重新開始
      setTimeout(() => {
        if (!window.czAssistExtension.automation.isRunning) return;
        console.log("台新銀行：重新開始自動查詢（從存匯授信服務）");
        window.czAssistUtils.updateAutomationStatus("重新開始自動查詢...");
        window.czAssistExtension.automation.currentStep = 0;
        window.czAssistUtils.executeAutomationStep();
      }, 5000);
    }
  },

  // 步驟7: 執行查詢（台新銀行專用）
  step7_executeTaishinQuery: () => {
    window.czAssistUtils.updateAutomationStatus("點擊查詢按鈕...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 查找查詢按鈕
    const queryButton = document.querySelector("button.submit_btn");
    
    if (queryButton) {
      console.log("找到查詢按鈕，點擊中...");
      
      // 更新步驟並保存狀態
      window.czAssistExtension.automation.currentStep = 7;
      
      const stateToSave = {
        currentStep: 7,
        isRunning: window.czAssistExtension.automation.isRunning,
        lastQueryDate: window.czAssistExtension.automation.lastQueryDate,
        queryResults: window.czAssistExtension.automation.queryResults,
        bank: window.czAssistExtension.selectedBank,
        timestamp: Date.now(),
      };
      chrome.storage.local.set({ automationState: stateToSave }, () => {
        console.log("State saved before clicking query button:", stateToSave);
        
        // 點擊查詢按鈕
        queryButton.click();
        
        // 等待查詢完成後提取數據
        setTimeout(() => {
          window.czAssistUtils.executeAutomationStep();
        }, 5000);
      });
    } else {
      console.error("找不到查詢按鈕");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到查詢按鈕");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟8: 提取台新銀行交易數據（台新銀行專用）
  step8_extractTaishinTransactionData: async (retryCount = 0) => {
    const maxRetries = 10; // 最多重試 10 次，每次 2 秒 = 最多等待 20 秒
    
    window.czAssistUtils.updateAutomationStatus(
      retryCount > 0 ? `等待表格載入... (${retryCount}/${maxRetries})` : "提取交易數據..."
    );
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 找到表格（先檢查表格是否存在，再處理每頁筆數設定）
    const table = document.querySelector(bankConfig.selectors.query.dataGrid);
    const tbody = document.querySelector(bankConfig.selectors.query.tbody);

    if (!table || !tbody) {
      // 表格還沒載入，進行重試
      if (retryCount < maxRetries) {
        console.log(`台新銀行：等待表格載入... (${retryCount + 1}/${maxRetries})`);
        setTimeout(() => {
          window.czAssistUtils.step8_extractTaishinTransactionData(retryCount + 1);
        }, 2000);
        return;
      } else {
        // 重試次數用完，停止自動化
        console.error("台新銀行：等待表格載入超時，找不到交易記錄表格");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到交易記錄表格（載入超時）");
        window.czAssistUtils.stopAutomation();
        return;
      }
    }
    
    console.log("台新銀行：找到交易記錄表格");
    
    // 表格已載入，重置重試計數
    // 先設定每頁顯示 50 筆
    const pageSizeSelect = document.querySelector(
      bankConfig.selectors.query.pageSizeDropdown
    );
    if (pageSizeSelect) {
      const currentValue = pageSizeSelect.value;
      const option50 = pageSizeSelect.querySelector(
        bankConfig.selectors.query.pageSizeOption
      );
      
      if (option50 && currentValue !== "50") {
        console.log("設定每頁顯示 50 筆");
        
        // 找到外層的 dropdown 元素
        const dropdownElement = pageSizeSelect.closest("dropdown");
        const dropdownTrigger = dropdownElement
          ? dropdownElement.querySelector(".ui-dropdown-trigger")
          : null;
        
        // 嘗試點擊 dropdown 觸發器打開下拉選單
        if (dropdownTrigger) {
          console.log("點擊 dropdown 觸發器打開下拉選單");
          dropdownTrigger.click();
          
          // 等待下拉選單打開，然後點擊 option
          setTimeout(() => {
            // 找到下拉選單中的 option 並點擊
            const dropdownItems = document.querySelectorAll(
              ".ui-dropdown-items-wrapper li.ui-dropdown-item"
            );
            const item50 = Array.from(dropdownItems).find(
              (item) => item.textContent.trim() === "50"
            );
            
            if (item50) {
              console.log("點擊 50 選項");
              item50.click();
            } else {
              // 如果找不到下拉選單項目，直接設定 select 的 value
              console.log("找不到下拉選單項目，直接設定 select value");
              pageSizeSelect.value = "50";
              pageSizeSelect.dispatchEvent(
                new Event("change", { bubbles: true })
              );
              pageSizeSelect.dispatchEvent(
                new Event("input", { bubbles: true })
              );
            }

            // 等待表格重新載入，重置重試計數
            setTimeout(() => {
              window.czAssistUtils.step8_extractTaishinTransactionData(0);
            }, 2000);
          }, 500);
          return;
        } else {
          // 如果找不到 dropdown 觸發器，直接設定 select 的 value
          console.log("直接設定 select value 為 50");
          pageSizeSelect.value = "50";
          pageSizeSelect.dispatchEvent(new Event("change", { bubbles: true }));
          pageSizeSelect.dispatchEvent(new Event("input", { bubbles: true }));
          
          // 等待表格重新載入，重置重試計數
          setTimeout(() => {
            window.czAssistUtils.step8_extractTaishinTransactionData(0);
          }, 2000);
          return;
        }
      } else if (currentValue === "50") {
        console.log("每頁筆數已經是 50，繼續提取數據");
      }
    }
    
    // 找到所有交易行
    const rows = tbody.querySelectorAll("tr.ui-widget-content");
    console.log(`找到 ${rows.length} 筆交易記錄`);
    
    const transactions = [];
    
    rows.forEach((row, index) => {
      try {
        const cells = row.querySelectorAll("td");
        if (cells.length < 11) {
          console.warn(`行 ${index} 欄位不足，跳過`);
          return;
        }
        
        // 提取交易日期（第3欄，在 calendarcell > span 中）
        const dateCell = cells[2];
        const dateSpan = dateCell.querySelector("calendarcell span");
        const transactionDate = dateSpan ? dateSpan.textContent.trim() : "";
        
        // 提取交易時間（第4欄）
        const timeCell = cells[3];
        const timeSpan = timeCell.querySelector("span");
        const transactionTime = timeSpan ? timeSpan.textContent.trim() : "";
        
        // 組合完整的日期時間：YYYY/MM/DD HH:MM:SS
        const datetime =
          transactionDate && transactionTime
            ? `${transactionDate} ${transactionTime}`
            : "";
        
        // 提取存入金額（第9欄）
        const amountCell = cells[8];
        const amountSpan = amountCell.querySelector("span");
        const depositAmount = amountSpan ? amountSpan.textContent.trim() : "";
        
        // 只處理有「存入金額」的記錄
        if (
          depositAmount &&
          depositAmount !== "0" &&
          depositAmount !== "" &&
          depositAmount !== "--"
        ) {
          // 提取帳戶餘額（第10欄）
          const balanceCell = cells[9];
          const balanceSpan = balanceCell.querySelector("span");
          const balanceText = balanceSpan ? balanceSpan.textContent.trim() : "";
          // 移除餘額中的逗號
          const balance = balanceText.replace(/,/g, "");
          console.log(`台新銀行餘額提取: ${balanceText} -> ${balance}`);
          
          // 提取備註（第11欄）中的帳號
          const accountCell = cells[10];
          const accountSpan = accountCell.querySelector("span");
          const remarkText = accountSpan ? accountSpan.textContent.trim() : "";

          // 從備註中提取帳號，支援兩種格式：
          // 格式1: V 82200000182540324119 822A4277B4 202511242521
          //        取 V 之後的第一組數字（前3位銀行代碼 + 後16位帳號）
          // 格式2: 轉出0028881019538923 或 轉入0028881019538923
          //        這是同銀行（台新銀行 812）轉帳，後面的數字就是完整的16位帳號
          //        例如：812 + 0028881019538923 = 8120028881019538923
          let account = "";
          if (remarkText) {
            // 先嘗試匹配「轉出」或「轉入」後面跟著的連續數字
            let match = remarkText.match(/轉[出入](\d+)/);
            if (match && match[1]) {
              const rawNumber = match[1];
              // 「轉出/轉入」格式代表同銀行轉帳，銀行代碼固定是 812（台新銀行）
              // 後面的數字就是完整的16位帳號
              const bankCode = "812"; // 台新銀行代碼
              // 確保帳號是16位（如果不足補0，如果超過截取前16位）
              // 超過16位的話截取後16位
              const paddedAccountNumber = rawNumber.length > 16
                ? rawNumber.slice(-16)
                : rawNumber.padStart(16, "0");
              account = bankCode + paddedAccountNumber;
              console.log(
                `從備註 "${remarkText}" 提取帳號（轉出/轉入格式-同行轉帳）: ${rawNumber} -> 銀行代碼:${bankCode}（台新）, 帳號:${paddedAccountNumber} -> 組合:${account}`
              );
            } else {
              // 再嘗試匹配 V 後面跟著的第一組連續數字
              match = remarkText.match(/V\s+(\d+)/);
            if (match && match[1]) {
              account = match[1];
                console.log(
                  `從備註 "${remarkText}" 提取帳號（V格式）: ${account}`
                );
              }
            }
          }
          
          // 移除金額中的逗號
          const amount = depositAmount.replace(/,/g, "");
          
          transactions.push({
            date: datetime, // 交易時間
            amount: amount, // 存入金額
            account: account, // 帳號（從備註提取）
            summary: "", // 摘要（可選）
            balance: balance, // 帳戶餘額
            expenditure: "0", // 支出金額
          });

          console.log(
            `提取交易: ${datetime}, 存入: ${amount}, 帳號: ${account}, 餘額: ${balance}`
          );
        }
      } catch (e) {
        console.error(`解析行 ${index} 時發生錯誤:`, e);
      }
    });
    
    console.log(`本頁提取了 ${transactions.length} 筆存入記錄`);
    
    // 將交易記錄添加到結果中
    window.czAssistExtension.automation.queryResults.push(...transactions);
    
    // 檢查是否有下一頁
    // 台新銀行的下一頁按鈕是 <a class="btn_i"> 裡面有 <i class="fa fa-play"></i> 的
    // 需要排除有 ui-state-disabled 類的，以及有 backward 類的（backward 是上一頁）
    const allButtons = document.querySelectorAll("a.btn_i");
    let nextButton = null;
    
    console.log(`找到 ${allButtons.length} 個 btn_i 按鈕`);
    
    // 找到下一頁按鈕：有 fa-play icon，沒有 ui-state-disabled，沒有 backward 類
    for (const button of allButtons) {
      const icon = button.querySelector("i.fa-play");
      const hasBackwardClass = button.classList.contains("backward");
      const isDisabled = button.classList.contains("ui-state-disabled");
      const hasStepBackwardIcon = button.querySelector("i.fa-step-backward");
      const hasStepForwardIcon = button.querySelector("i.fa-step-forward");
      
      console.log(`檢查按鈕:`, {
        hasPlayIcon: !!icon,
        hasBackwardClass,
        isDisabled,
        hasStepBackwardIcon: !!hasStepBackwardIcon,
        hasStepForwardIcon: !!hasStepForwardIcon,
        classes: Array.from(button.classList),
      });
      
      // 下一頁按鈕：有 fa-play icon，沒有 backward 類，沒有 disabled，不是 step-backward 或 step-forward
      if (
        icon &&
        !hasBackwardClass &&
        !isDisabled &&
        !hasStepBackwardIcon &&
        !hasStepForwardIcon
      ) {
        nextButton = button;
        console.log("找到下一頁按鈕！", button);
        break;
      }
    }
    
    console.log("檢查下一頁按鈕結果:", {
      found: !!nextButton,
      button: nextButton,
      allButtonsCount: allButtons.length,
      buttonClasses: nextButton ? Array.from(nextButton.classList) : null,
      buttonHTML: nextButton ? nextButton.outerHTML : null,
    });
    
    const hasNextPage = nextButton !== null;
    
    if (!hasNextPage) {
      // 沒有下一頁了，完成提取並發送到 API
      console.log(
        `沒有下一頁（下一頁按鈕已 disabled 或不存在），總共提取了 ${window.czAssistExtension.automation.queryResults.length} 筆交易記錄`
      );
      
      // 檢查是否真的沒有下一頁按鈕，還是按鈕被 disabled
      const disabledNextButton = Array.from(allButtons).find((button) => {
        const icon = button.querySelector("i.fa-play");
        const hasBackwardClass = button.classList.contains("backward");
        const isDisabled = button.classList.contains("ui-state-disabled");
        const hasStepBackwardIcon = button.querySelector("i.fa-step-backward");
        const hasStepForwardIcon = button.querySelector("i.fa-step-forward");
        
        // 找到被 disabled 的下一頁按鈕
        return (
          icon &&
          !hasBackwardClass &&
          isDisabled &&
          !hasStepBackwardIcon &&
          !hasStepForwardIcon
        );
      });
      
      if (disabledNextButton) {
        console.log(
          "確認下一頁按鈕已被 disabled，沒有更多資料，進入重新查詢流程"
        );
      } else {
        console.log("確認沒有下一頁按鈕，沒有更多資料，進入重新查詢流程");
      }
      
      await window.czAssistUtils.finishTaishinDataExtraction();
    } else {
      // 還有下一頁，點擊下一頁按鈕
      console.log("找到下一頁按鈕，繼續提取...");
      nextButton.click();
      
      // 等待下一頁載入
      setTimeout(() => {
        window.czAssistUtils.step8_extractTaishinTransactionData();
      }, 2000);
    }
  },
  
  // 完成台新銀行數據提取並發送到 API
  finishTaishinDataExtraction: async () => {
    const totalResults =
      window.czAssistExtension.automation.queryResults.length;
    window.czAssistUtils.updateAutomationStatus(
      `已提取 ${totalResults} 筆交易記錄，準備發送到 API...`
    );
    
    // 顯示結果在側邊欄
    if (totalResults > 0) {
      let resultsHtml = '<div class="cz-results-summary">';
      resultsHtml += `<p>找到 ${totalResults} 筆存入記錄</p>`;
      resultsHtml += '<table class="cz-results-table">';
      resultsHtml +=
        "<thead><tr><th>時間</th><th>金額</th><th>帳號</th></tr></thead>";
      resultsHtml += "<tbody>";
      
      window.czAssistExtension.automation.queryResults.forEach((tx) => {
        resultsHtml += "<tr>";
        resultsHtml += `<td>${tx.date}</td>`;
        resultsHtml += `<td style="text-align: right;">${tx.amount}</td>`;
        resultsHtml += `<td>${tx.account}</td>`;
        resultsHtml += "</tr>";
      });
      
      resultsHtml += "</tbody></table></div>";
      
      const resultsDiv = document.getElementById("cz-results");
      if (resultsDiv) {
        resultsDiv.innerHTML = resultsHtml;
      }
    }
    
    // 發送交易記錄到 API
    // 注意：如果 sendTransactionsToAPI 發現沒有新記錄，會直接設置 currentStep 並返回
    // 這裡不需要再設置 currentStep，因為 sendTransactionsToAPI 已經處理了
    const currentStepBeforeSend =
      window.czAssistExtension.automation.currentStep;
    await window.czAssistUtils.sendTransactionsToAPI(
      window.czAssistExtension.automation.queryResults
    );
    const currentStepAfterSend =
      window.czAssistExtension.automation.currentStep;

    console.log(
      `台新銀行：sendTransactionsToAPI 執行完成，currentStep: ${currentStepBeforeSend} -> ${currentStepAfterSend}`
    );
    
    // 只有在 sendTransactionsToAPI 發送了記錄的情況下，才需要進入重新查詢循環
    // 如果沒有新記錄，sendTransactionsToAPI 已經設置了 currentStep = 8
    // 這裡檢查一下，避免重複設置
    if (
      window.czAssistExtension.automation.isRunning &&
      currentStepAfterSend === 7
    ) {
      // 如果還在 step 7，說明 sendTransactionsToAPI 沒有提前返回
      // 這意味著有記錄被發送，需要進入重新查詢等待
      console.log("台新銀行：數據已發送到 API，進入重新查詢等待");
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 8;
        window.czAssistUtils.executeAutomationStep();
      }, 5000); // 從 1000ms 增加到 5000ms，給更多時間讓 API 處理完成
    } else {
      console.log(
        "台新銀行：sendTransactionsToAPI 已處理流程，currentStep =",
        currentStepAfterSend
      );
    }
  },

  // 步驟9: 等待並重新查詢（台新銀行專用）
  step9_waitAndRequery: () => {
    // 清理之前的倒數計時器（防止多重執行）
    if (window.czAssistExtension.automation.intervalId) {
      console.log("台新銀行：清理之前的倒數計時器");
      clearInterval(window.czAssistExtension.automation.intervalId);
      window.czAssistExtension.automation.intervalId = null;
    }
    
    // 恢復原始的查詢天數設定（如果之前因跨日而調整過）
    if (window.czAssistExtension.automation.originalQueryDaysBack !== null) {
      console.log(`=== 台新銀行恢復原始查詢天數設定 ===`);
      console.log(
        "當前查詢天數:",
        window.czAssistExtension.settings.queryDaysBack
      );
      console.log(
        "原始查詢天數:",
        window.czAssistExtension.automation.originalQueryDaysBack
      );

      window.czAssistExtension.settings.queryDaysBack =
        window.czAssistExtension.automation.originalQueryDaysBack;
      window.czAssistExtension.automation.originalQueryDaysBack = null; // 清除記錄
      
      // 同步保存到 storage
      chrome.storage.local.set({
        settings: window.czAssistExtension.settings,
      });
      
      console.log(
        "查詢天數已恢復為:",
        window.czAssistExtension.settings.queryDaysBack
      );
    }
    
    // 台新銀行使用更長的等待時間（10秒）
    window.czAssistUtils.updateAutomationStatus("等待10秒後重新查詢...", true);
    
    let countdown = 10;
    const countdownInterval = setInterval(() => {
      if (!window.czAssistExtension.automation.isRunning) {
        clearInterval(countdownInterval);
        return;
      }
      
      countdown--;
      window.czAssistUtils.updateAutomationStatus(
        `等待${countdown}秒後重新查詢...`
      );
      window.czAssistUtils.updateProgress(((10 - countdown) / 10) * 100);
      
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        window.czAssistExtension.automation.intervalId = null;
        window.czAssistUtils.updateAutomationStatus("重新查詢中...");
        
        // 台新銀行：重新執行完整查詢流程
        console.log("台新銀行重新查詢：執行完整查詢流程");
        window.czAssistExtension.automation.currentStep = 0;
        window.czAssistUtils.executeAutomationStep();
      }
    }, 1000);
    
    // 保存 interval ID，以便後續清理
    window.czAssistExtension.automation.intervalId = countdownInterval;
  },

  // =============== 富邦銀行專用步驟 ===============

  // 輔助函數：獲取富邦銀行的 frame1 document
  getFubonMainFrame: () => {
    // 嘗試通過 ID 和 name 屬性查找 frame
    const mainFrame = document.querySelector(
      'frame#frame1, frame[name="frame1"]'
    );
    if (mainFrame && mainFrame.contentDocument) {
      return mainFrame.contentDocument;
    }
    
    // 嘗試通過 window.frames
    try {
      if (
        window.frames &&
        window.frames["frame1"] &&
        window.frames["frame1"].document
      ) {
        return window.frames["frame1"].document;
      }
    } catch (e) {
      console.warn("無法通過 window.frames 訪問 frame1:", e);
    }
    
    console.warn("找不到富邦銀行 frame1，使用主文檔");
    return document;
  },

  // 輔助函數：獲取富邦銀行的 txnFrame document (在 frame1 內部)
  getFubonTxnFrame: () => {
    // 先獲取 frame1 的 document
    const frame1Doc = window.czAssistUtils.getFubonMainFrame();
    
    // 在 frame1 中查找 txnFrame
    let txnFrame =
      frame1Doc.querySelector('iframe#txnFrame, iframe[name="txnFrame"]') ||
      frame1Doc.getElementById("txnFrame");
    
    if (txnFrame && txnFrame.contentDocument) {
      console.log("找到富邦銀行 txnFrame");
      return txnFrame.contentDocument;
    }
    
    // 嘗試通過 window.frames 訪問
    try {
      if (
        window.frames &&
        window.frames["txnFrame"] &&
        window.frames["txnFrame"].document
      ) {
        console.log("通過 window.frames 訪問富邦銀行 txnFrame");
        return window.frames["txnFrame"].document;
      }
    } catch (e) {
      console.warn("無法通過 window.frames 訪問 txnFrame:", e);
    }
    
    console.warn("找不到富邦銀行 txnFrame，使用 frame1");
    return frame1Doc;
  },

  // 步驟1: 點擊存款交易查詢（富邦銀行專用）
  step1_clickFubonTransactionQuery: () => {
    window.czAssistUtils.updateAutomationStatus("點擊存款交易查詢...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 獲取 txnFrame 的 document（存款交易查詢連結在 frame1 > txnFrame 中）
    const frameDoc = window.czAssistUtils.getFubonTxnFrame();
    
    // 等待連結載入
    const waitForLink = (attempts = 0) => {
      const maxAttempts = 10;
      
      if (attempts >= maxAttempts) {
        console.error("等待存款交易查詢連結載入超時");
        window.czAssistUtils.updateAutomationStatus(
          "錯誤：找不到存款交易查詢連結"
        );
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      const transactionLink =
        frameDoc.querySelector(
          bankConfig.selectors.navigation.transactionQueryLink
        ) ||
        frameDoc.querySelector(
          bankConfig.selectors.navigation.transactionQueryLinkAlt
        );
      
      if (transactionLink) {
        console.log("找到存款交易查詢連結，點擊中...");
        transactionLink.click();
        
        // 也嘗試觸發 onclick 事件（如果有）
        const onclick = transactionLink.getAttribute("onclick");
        if (onclick) {
          try {
            eval(onclick);
          } catch (e) {
            console.warn("執行 onclick 失敗，使用 click:", e);
            transactionLink.click();
          }
        }
        
        setTimeout(() => {
          window.czAssistExtension.automation.currentStep = 1;
          window.czAssistUtils.executeAutomationStep();
        }, 3000);
      } else {
        console.log(
          `等待存款交易查詢連結載入... (${attempts + 1}/${maxAttempts})`
        );
        setTimeout(() => waitForLink(attempts + 1), 500);
      }
    };
    
    waitForLink();
  },

  // 步驟2: 設定日期範圍（富邦銀行專用）
  step2_setFubonDateRange: () => {
    window.czAssistUtils.updateAutomationStatus("設定日期範圍...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 獲取 txnFrame 的 document（查詢表單在 txnFrame 中）
    const frameDoc = window.czAssistUtils.getFubonTxnFrame();
    
    // 計算日期範圍
    const dateRange = window.czAssistUtils.calculateQueryDateRange();
    
    // 富邦銀行日期格式為 YYYY/MM/DD
    const startDateFormatted = dateRange.startDate;
    
    console.log(`富邦銀行起日: ${startDateFormatted}`);
    
    // 等待起日輸入框載入
    const waitForDateInput = (attempts = 0) => {
      const maxAttempts = 10;
      
      if (attempts >= maxAttempts) {
        console.error("等待起日輸入框載入超時");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到起日輸入框");
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      const startDateInput =
        frameDoc.querySelector(bankConfig.selectors.query.startDate) ||
        frameDoc.querySelector(bankConfig.selectors.query.startDateAlt);
      
      if (startDateInput) {
        console.log("找到起日輸入框，設定日期中...");
        
        // 先選擇「自訂查詢」radio button（手動點擊會觸發 onfocus 自動選擇）
        const customRadio = frameDoc.querySelector(
          '#form1\\:rdoCustom, input[name="form1:rdoGroup21"][value="2"]'
        );
        if (customRadio) {
          customRadio.checked = true;
          customRadio.dispatchEvent(new Event("change", { bubbles: true }));
          customRadio.dispatchEvent(new Event("click", { bubbles: true }));
          console.log("已選擇「自訂查詢」");
        }
        
        // 先 focus 輸入框來觸發 onfocus 事件（這會自動選擇自訂查詢）
        startDateInput.focus();
        
        // 等待一下讓 onfocus 事件處理完成
        setTimeout(() => {
          // 設定起日
          startDateInput.value = startDateFormatted;
          
          // 觸發輸入事件（模擬用戶輸入）
          startDateInput.dispatchEvent(new Event("input", { bubbles: true }));
          startDateInput.dispatchEvent(new Event("change", { bubbles: true }));
          startDateInput.dispatchEvent(
            new KeyboardEvent("keyup", { bubbles: true })
          );
          
          // 觸發 blur 事件（模擬用戶離開輸入框）
          startDateInput.blur();
          startDateInput.dispatchEvent(new Event("blur", { bubbles: true }));
          
          console.log(`起日已設定: ${startDateFormatted}`);
          
          // 確保自訂查詢 radio 仍然被選中
          if (customRadio) {
            customRadio.checked = true;
          }
          
          setTimeout(() => {
            window.czAssistExtension.automation.currentStep = 2;
            window.czAssistUtils.executeAutomationStep();
          }, 1000);
        }, 200); // 等待 onfocus 處理完成
      } else {
        console.log(`等待起日輸入框載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForDateInput(attempts + 1), 500);
      }
    };
    
    waitForDateInput();
  },

  // 步驟3: 執行查詢（富邦銀行專用）
  step3_executeFubonQuery: () => {
    // 清理之前的輪詢計時器（如果有的話）
    if (window.czAssistExtension.fubonQueryPollingTimer) {
      console.log("清理之前的查詢輪詢計時器");
      clearTimeout(window.czAssistExtension.fubonQueryPollingTimer);
      window.czAssistExtension.fubonQueryPollingTimer = null;
    }
    
    window.czAssistUtils.updateAutomationStatus("執行查詢...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 獲取 txnFrame 的 document（查詢按鈕在 txnFrame 中）
    const frameDoc = window.czAssistUtils.getFubonTxnFrame();
    
    // 等待查詢按鈕載入
    const waitForQueryButton = (attempts = 0) => {
      const maxAttempts = 10;
      
      if (attempts >= maxAttempts) {
        console.error("等待查詢按鈕載入超時");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到查詢按鈕");
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      const queryButton =
        frameDoc.querySelector(bankConfig.selectors.query.queryButton) ||
        frameDoc.querySelector(bankConfig.selectors.query.queryButtonAlt);
      
      if (queryButton) {
        console.log("找到查詢按鈕，點擊中...");
        queryButton.click();
        
        // 也嘗試觸發 onclick 事件
        const onclick = queryButton.getAttribute("onclick");
        if (onclick) {
          try {
            eval(onclick);
          } catch (e) {
            console.warn("執行 onclick 失敗，使用 click:", e);
            queryButton.click();
          }
        }
        
        // 使用輪詢方式等待查詢結果載入（不適用固定 setTimeout，因為可能等很久）
        window.czAssistUtils.updateAutomationStatus("查詢中，等待結果載入...");
        
        const waitForQueryResult = (attempts = 0) => {
          const maxAttempts = 200; // 最多等待 200 次，每次 1 秒 = 最多 200 秒（約 3.3 分鐘）
          
          // 檢查是否被新的輪詢取代（通過檢查計時器是否仍然有效）
          if (window.czAssistExtension.fubonQueryPollingActive === false) {
            console.log("查詢輪詢已被取消");
            return;
          }
          
          if (attempts >= maxAttempts) {
            console.error("等待查詢結果載入超時");
            window.czAssistUtils.updateAutomationStatus(
              "錯誤：查詢結果載入超時"
            );
            window.czAssistUtils.stopAutomation();
            window.czAssistExtension.fubonQueryPollingTimer = null;
            window.czAssistExtension.fubonQueryPollingActive = false;
            return;
          }
          
          // 獲取 txnFrame 的 document（查詢結果也在 txnFrame 中）
          const frameDoc = window.czAssistUtils.getFubonTxnFrame();
          
          // 檢查是否有載入遮罩（如果有的話，需要等待遮罩消失）
          // 富邦銀行可能使用 screenMask() 來顯示載入遮罩
          const loadingMask = frameDoc.querySelector(
            '#js_overLayer, [class*="mask"], [id*="mask"]'
          );
          if (loadingMask && loadingMask.style.display !== "none") {
            // 還在載入中，繼續等待
            if (attempts % 5 === 0) {
              console.log("等待載入遮罩消失...");
            }
            window.czAssistExtension.fubonQueryPollingTimer = setTimeout(
              () => waitForQueryResult(attempts + 1),
              1000
            );
            return;
          }
          
          // 檢查查詢結果表格是否出現
          const dataGrid =
            frameDoc.querySelector(bankConfig.selectors.query.dataGrid) ||
            frameDoc.querySelector(bankConfig.selectors.query.dataGridAlt);
          
          if (dataGrid) {
            // 檢查表格中是否有數據（至少有一個 tbody）
            const tbody = dataGrid.querySelector("tbody");
            if (tbody) {
              const rows = tbody.querySelectorAll("tr");
              
              // 檢查是否有實際數據行（跳過表頭）
              // 表頭通常包含「帳務日期」、「交易時間」等文字，或是在第一個 tr 中
              let hasDataRows = false;
              let headerRowFound = false;
              
              rows.forEach((row, index) => {
                const text = row.textContent.trim();
                // 檢查是否是表頭（包含特定的表頭文字）
                if (
                  text.includes("帳務日期") ||
                  text.includes("交易時間") ||
                  text.includes("摘要") ||
                  text.includes("支出金額") ||
                  text.includes("存入金額") ||
                  text.includes("即時餘額")
                ) {
                  headerRowFound = true;
                } else if (text.length > 0 && index > 0) {
                  // 有內容且不是第一行，視為數據行
                  hasDataRows = true;
                } else if (text.length > 0 && !headerRowFound && index === 0) {
                  // 第一行有內容但沒有找到表頭文字，可能是數據行
                  hasDataRows = true;
                }
              });
              
              // 如果有數據行，或者表格有內容（可能是空的查詢結果）
              if (
                hasDataRows ||
                rows.length > 1 ||
                (rows.length === 1 && !headerRowFound)
              ) {
                console.log(`查詢結果已載入，找到 ${rows.length} 行數據`);
                window.czAssistUtils.updateAutomationStatus(
                  "查詢完成，提取數據中..."
                );
                
                // 清理輪詢計時器
                window.czAssistExtension.fubonQueryPollingTimer = null;
                window.czAssistExtension.fubonQueryPollingActive = false;
                
                // 等待一下確保數據完全載入
                setTimeout(() => {
                  window.czAssistExtension.automation.currentStep = 3;
                  window.czAssistUtils.executeAutomationStep();
                }, 1000);
                return;
              } else if (rows.length > 0) {
                // 只有表頭，沒有數據行，但也算是載入完成了（可能是沒有數據）
                console.log("查詢結果已載入（無數據）");
                window.czAssistUtils.updateAutomationStatus(
                  "查詢完成（無數據），提取數據中..."
                );
                
                // 清理輪詢計時器
                window.czAssistExtension.fubonQueryPollingTimer = null;
                window.czAssistExtension.fubonQueryPollingActive = false;
                
                setTimeout(() => {
                  window.czAssistExtension.automation.currentStep = 3;
                  window.czAssistUtils.executeAutomationStep();
                }, 1000);
                return;
              }
            }
          }
          
          // 還沒載入完成，繼續等待
          if (attempts % 10 === 0) {
            // 每 10 秒更新一次狀態
            const elapsedSeconds = attempts;
            window.czAssistUtils.updateAutomationStatus(
              `查詢中，已等待 ${elapsedSeconds} 秒...`
            );
            console.log(`等待查詢結果載入... (${attempts + 1}/${maxAttempts})`);
          }
          
          window.czAssistExtension.fubonQueryPollingTimer = setTimeout(
            () => waitForQueryResult(attempts + 1),
            1000
          ); // 每秒檢查一次
        };
        
        // 標記輪詢為活動狀態
        window.czAssistExtension.fubonQueryPollingActive = true;
        
        // 等待 2 秒後開始檢查（給查詢請求一些時間）
        window.czAssistExtension.fubonQueryPollingTimer = setTimeout(() => {
          waitForQueryResult();
        }, 2000);
      } else {
        console.log(`等待查詢按鈕載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForQueryButton(attempts + 1), 500);
      }
    };
    
    waitForQueryButton();
  },

  // 步驟6: 提取富邦銀行交易數據（富邦銀行專用）
  step6_extractFubonTransactionData: async () => {
    window.czAssistUtils.updateAutomationStatus("提取交易數據...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 獲取 txnFrame 的 document（表格在 frame1 > txnFrame 中）
    const frameDoc = window.czAssistUtils.getFubonTxnFrame();
    
    // 銀行名稱到三碼銀行代碼的映射
    const bankNameToCode = {
      玉山銀行: "808",
      中國信託: "822",
      連線商業銀行: "803",
      台灣銀行: "004",
      土地銀行: "005",
      合作金庫: "006",
      第一銀行: "007",
      華南銀行: "008",
      彰化銀行: "009",
      上海銀行: "011",
      台北富邦: "012",
      國泰世華: "013",
      高雄銀行: "016",
      兆豐銀行: "017",
      台灣企銀: "050",
      渣打銀行: "052",
      台中銀行: "053",
      京城銀行: "054",
      匯豐銀行: "081",
      瑞興銀行: "101",
      華泰銀行: "102",
      新光銀行: "103",
      陽信銀行: "108",
      板信銀行: "118",
      三信銀行: "147",
      聯邦銀行: "803",
      遠東銀行: "805",
      元大銀行: "806",
      永豐銀行: "807",
      日盛銀行: "815",
      安泰銀行: "816",
      大眾銀行: "817",
      中華郵政: "700",
    };
    
    // 等待表格載入
    const waitForTable = async (attempts = 0) => {
      const maxAttempts = 10;
      
      if (attempts >= maxAttempts) {
        console.error("等待交易表格載入超時");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到交易表格");
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      const dataGrid =
        frameDoc.querySelector(bankConfig.selectors.query.dataGrid) ||
        frameDoc.querySelector(bankConfig.selectors.query.dataGridAlt);
      
      if (!dataGrid) {
        console.log(`等待交易表格載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForTable(attempts + 1), 500);
        return;
      }
      
      const tbody = dataGrid.querySelector("tbody");
      if (!tbody) {
        console.log(`等待表格 tbody 載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForTable(attempts + 1), 500);
        return;
      }
      
      const rows = tbody.querySelectorAll("tr");
      console.log(`找到 ${rows.length} 行數據`);
      
      if (rows.length === 0) {
        console.log("表格為空，等待數據載入...");
        setTimeout(() => waitForTable(attempts + 1), 500);
        return;
      }
      
      const transactions = [];
      
      // 提取交易記錄
      rows.forEach((row, index) => {
        // 跳過表頭行（第一行通常是表頭）
        if (index === 0) {
          // 檢查是否是表頭（包含「帳務日期」、「交易時間」等文字）
          const headerText = row.textContent;
          if (
            headerText.includes("帳務日期") ||
            headerText.includes("交易時間") ||
            headerText.includes("摘要") ||
            headerText.includes("支出金額") ||
            headerText.includes("存入金額")
          ) {
            return; // 跳過表頭
          }
        }
        
        const cells = row.querySelectorAll("td");
        if (cells.length < 7) {
          return; // 跳過欄位不足的行
        }
        
        // 提取欄位
        // 第1欄：帳務日期 (td:nth-child(1))
        // 第2欄：交易時間 (td:nth-child(2))
        // 第3欄：摘要 (td:nth-child(3))
        // 第4欄：支出金額 (td:nth-child(4))
        // 第5欄：存入金額 (td:nth-child(5))
        // 第6欄：即時餘額 (td:nth-child(6))
        // 第7欄：附註 (td:nth-child(7))
        
        const transactionTime = cells[1]?.textContent.trim() || ""; // 交易時間
        const depositAmount = cells[4]?.textContent.trim() || ""; // 存入金額
        const note = cells[6]?.textContent.trim() || ""; // 附註
        
        // 只處理有存入金額的交易
        if (
          !depositAmount ||
          depositAmount === "" ||
          depositAmount === "&nbsp;"
        ) {
          return;
        }
        
        // 解析備註：格式為 ********79130798\n玉山銀行
        let account = "";
        const noteLines = note
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line);
        
        if (noteLines.length >= 2) {
          // 第一行是帳號（格式：********79130798）
          const accountLine = noteLines[0];
          // 提取帳號數字部分
          const accountMatch = accountLine.match(/\*+(\d+)/);
          if (accountMatch) {
            const accountNumber = accountMatch[1];
            
            // 第二行是銀行名稱
            const bankName = noteLines[1];
            const bankCode = bankNameToCode[bankName] || "000";
            
            // 組合：前3位銀行代碼 + 後16位帳號
            const paddedAccount = accountNumber
              .padStart(16, "0")
              .substring(0, 16);
            account = bankCode + paddedAccount;
            
            console.log(
              `解析備註: 銀行=${bankName}(${bankCode}), 帳號=${accountNumber}, 完整=${account}`
            );
          }
        } else if (noteLines.length === 1) {
          // 只有帳號，沒有銀行名稱
          const accountLine = noteLines[0];
          const accountMatch = accountLine.match(/\*+(\d+)/);
          if (accountMatch) {
            const accountNumber = accountMatch[1];
            const paddedAccount = accountNumber
              .padStart(16, "0")
              .substring(0, 16);
            account = "000" + paddedAccount; // 預設銀行代碼為 000
            console.log(`只有帳號，無銀行名稱: ${account}`);
          }
        }
        
        // 清理金額（移除逗號和空格）
        const cleanAmount = depositAmount.replace(/,/g, "").replace(/\s/g, "");
        
        if (cleanAmount && parseFloat(cleanAmount) > 0) {
          transactions.push({
            date: transactionTime,
            amount: cleanAmount,
            account: account,
          });
        }
      });
      
      console.log(`本頁提取了 ${transactions.length} 筆存入記錄`);
      
      // 將交易記錄添加到結果中
      if (!window.czAssistExtension.automation.queryResults) {
        window.czAssistExtension.automation.queryResults = [];
      }
      window.czAssistExtension.automation.queryResults.push(...transactions);
      
      // 檢查是否有下一頁
      // 需要找到所有符合條件的按鈕，然後選擇文字為「下一頁」的按鈕
      const allPageButtons = frameDoc.querySelectorAll(
        'a[onclick*="setDataGridCurrentPage"][href="#"]'
      );
      let nextPageButton = null;
      
      // 找到文字為「下一頁」的按鈕
      for (let button of allPageButtons) {
        const buttonText = button.textContent.trim();
        if (buttonText === "下一頁") {
          const onclick = button.getAttribute("onclick");
          // 確認這是下一頁按鈕（onclick 中的頁碼應該大於當前頁碼）
          if (onclick && onclick.includes("setDataGridCurrentPage")) {
            // 提取 onclick 中的頁碼
            const pageMatch = onclick.match(
              /setDataGridCurrentPage\([^,]+,\s*(\d+)/
            );
            if (pageMatch) {
              const targetPage = parseInt(pageMatch[1]);
              // 檢查這是否是向前的頁碼（下一頁應該是更大的頁碼）
              // 但如果我們不確定當前頁碼，至少確認按鈕文字是「下一頁」
              nextPageButton = button;
              console.log(`找到下一頁按鈕，目標頁碼: ${targetPage}`);
              break;
            }
          }
        }
      }
      
      // 如果找不到文字為「下一頁」的按鈕，嘗試在分頁區域查找
      if (!nextPageButton) {
        // 查找頁碼分頁區域（通常在表格底部）
        // 分頁區域可能是：table.tb_page 或包含「上一頁」/「下一頁」文字的區域
        const paginationTable = frameDoc.querySelector("table.tb_page");
        if (paginationTable) {
          const paginationTd =
            paginationTable.querySelector('td[align="right"]');
          if (paginationTd) {
            // 在分頁區域中查找「下一頁」連結
            const links = paginationTd.querySelectorAll(
              'a[onclick*="setDataGridCurrentPage"]'
            );
            for (let link of links) {
              if (link.textContent.trim() === "下一頁") {
                nextPageButton = link;
                console.log("在分頁區域找到下一頁按鈕");
                break;
              }
            }
          }
        }
        
        // 如果還是找不到，嘗試在整個文檔中查找包含「下一頁」文字的連結
        if (!nextPageButton) {
          const allLinks = frameDoc.querySelectorAll(
            'a[onclick*="setDataGridCurrentPage"]'
          );
          for (let link of allLinks) {
            if (link.textContent.trim() === "下一頁") {
              nextPageButton = link;
              console.log("在文檔中找到下一頁按鈕");
              break;
            }
          }
        }
      }
      
      let hasNextPage = false;
      
      if (nextPageButton) {
        // 檢查按鈕是否可點擊
        const onclick = nextPageButton.getAttribute("onclick");
        const href = nextPageButton.getAttribute("href");
        
        // 如果是一個可點擊的連結（有 onclick 和 href="#"）
        if (
          onclick &&
          onclick.includes("setDataGridCurrentPage") &&
          href === "#"
        ) {
          hasNextPage = true;
        }
      } else {
        // 檢查是否有不可點擊的「下一頁」文字（表示已經是最後一頁）
        // 如果文字「下一頁」存在但不是可點擊的連結，表示已經是最後一頁
        const paginationTable = frameDoc.querySelector("table.tb_page");
        if (paginationTable) {
          const paginationTd =
            paginationTable.querySelector('td[align="right"]');
          if (paginationTd) {
            const text = paginationTd.textContent;
            // 檢查是否有「下一頁」文字
            if (text.includes("下一頁")) {
              // 檢查是否有可點擊的「下一頁」連結
              const nextPageLink = Array.from(
                paginationTd.querySelectorAll("a")
              ).find(
                (link) =>
                  link.textContent.trim() === "下一頁" &&
                  link.getAttribute("onclick")
              );
              
              if (!nextPageLink) {
                console.log(
                  "找到「下一頁」文字但沒有可點擊的連結，已經是最後一頁"
                );
                hasNextPage = false;
              }
            }
          }
        }
      }
      
      console.log("下一頁按鈕狀態:", {
        foundButton: !!nextPageButton,
        buttonText: nextPageButton ? nextPageButton.textContent.trim() : null,
        hasNextPage: hasNextPage,
      });
      
      if (hasNextPage && nextPageButton) {
        // 還有下一頁，點擊下一頁按鈕
        const onclick = nextPageButton.getAttribute("onclick");
        const pageMatch = onclick
          ? onclick.match(/setDataGridCurrentPage\([^,]+,\s*(\d+)/)
          : null;
        const targetPage = pageMatch ? pageMatch[1] : "未知";
        
        console.log(`還有下一頁，點擊中... (將跳到第 ${targetPage} 頁)`);
        window.czAssistUtils.updateAutomationStatus(
          `載入第 ${targetPage} 頁...`
        );
        
        nextPageButton.click();
        
        // 也嘗試觸發 onclick 事件
        if (onclick) {
          try {
            eval(onclick);
          } catch (e) {
            console.warn("執行 onclick 失敗，使用 click:", e);
            nextPageButton.click();
          }
        }
        
        // 等待下一頁載入
        setTimeout(() => {
          window.czAssistUtils.step6_extractFubonTransactionData();
        }, 2000);
      } else {
        // 沒有下一頁了，完成提取並發送到 API
        console.log(
          `總共提取了 ${window.czAssistExtension.automation.queryResults.length} 筆交易記錄`
        );
        await window.czAssistUtils.finishFubonDataExtraction();
      }
    };
    
    waitForTable();
  },

  // =============== 國泰世華專用提取函數 ===============

  // 步驟6: 提取國泰世華交易數據（處理 more 按鈕）
  step6_extractCathayTransactionData: async () => {
    window.czAssistUtils.updateAutomationStatus("提取交易數據...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 初始化交易結果陣列
    if (!window.czAssistExtension.automation.queryResults) {
      window.czAssistExtension.automation.queryResults = [];
    }
    
    // 追蹤已處理的行數（避免 more 按鈕點擊後重複提取）
    let processedRowCount = 0;
    
    // 提取當前頁面的交易資料（只提取新增的行）
    const extractCurrentPageData = () => {
      const transactions = [];
      const dataGrid = document.querySelector(
        bankConfig.selectors.query.dataGrid
      );
      
      if (!dataGrid) {
        console.log("找不到國泰世華交易表格");
        return transactions;
      }
      
      const rows = dataGrid.querySelectorAll("tr.data-row");
      console.log(
        `國泰世華：找到 ${rows.length} 行資料（已處理 ${processedRowCount} 行）`
      );
      
      // 只處理尚未處理的行
      const rowsArray = Array.from(rows);
      const newRows = rowsArray.slice(processedRowCount);
      
      newRows.forEach((row, index) => {
        const actualIndex = processedRowCount + index;
        const cells = row.querySelectorAll("td");
        if (cells.length < 13) {
          console.log(`行 ${actualIndex} 欄位不足，跳過`);
          return;
        }
        
        // 提取欄位
        // 第4欄：存入金額 (td:nth-child(4))
        const depositAmountText = cells[3]?.textContent.trim() || "";
        
        // 只處理有存入金額的交易
        if (
          !depositAmountText ||
          depositAmountText === "" ||
          depositAmountText === "&nbsp;"
        ) {
          return;
        }
        
        // 第12欄：交易日 (td:nth-child(12))
        const dateText = cells[11]?.textContent.trim() || ""; // 1141127（民國114年11月27日）
        
        // 第13欄：時間 (td:nth-child(13))
        const timeText = cells[12]?.textContent.trim() || ""; // 161334
        
        // 第7欄：對方帳號 (td:nth-child(7))
        const accountText = cells[6]?.textContent.trim() || ""; // 0000598540591219
        
        // 第5欄：餘額 (td:nth-child(5))
        const balanceText = cells[4]?.textContent.trim() || "";
        
        // 轉換日期格式：1141127 -> 2025/11/27
        let date = "";
        if (dateText.length >= 7) {
          const rocYear = parseInt(dateText.substring(0, 3)); // 114
          const month = dateText.substring(3, 5); // 11
          const day = dateText.substring(5, 7); // 27
          const westernYear = rocYear + 1911; // 2025
          
          // 轉換時間格式：161334 -> 16:13:34
          let hour = "00",
            minute = "00",
            second = "00";
          if (timeText.length >= 6) {
            hour = timeText.substring(0, 2);
            minute = timeText.substring(2, 4);
            second = timeText.substring(4, 6);
          } else if (timeText.length >= 4) {
            hour = timeText.substring(0, 2);
            minute = timeText.substring(2, 4);
          }
          
          date = `${westernYear}/${month}/${day} ${hour}:${minute}:${second}`;
        }
        
        // 清理金額（移除逗號）
        const amount = parseFloat(depositAmountText.replace(/,/g, "")) || 0;
        const balance = balanceText.replace(/,/g, "");
        
        if (amount > 0) {
          const transaction = {
            date: date,
            account: accountText,
            amount: amount.toString(),
            balance: balance,
          };
          
          console.log(
            `國泰世華交易記錄: 日期=${date}, 帳號=${accountText}, 金額=${amount}, 餘額=${balance}`
          );
          transactions.push(transaction);
        }
      });
      
      // 更新已處理的行數
      processedRowCount = rows.length;
      console.log(`國泰世華：已處理行數更新為 ${processedRowCount}`);
      
      return transactions;
    };
    
    // 檢查並點擊 more 按鈕
    const clickMoreButtonAndExtract = async () => {
      // 提取當前頁面資料
      const currentPageData = extractCurrentPageData();
      console.log(`本次提取了 ${currentPageData.length} 筆存入記錄`);
      
      // 將資料添加到結果中
      window.czAssistExtension.automation.queryResults.push(...currentPageData);
      
      // 檢查是否有 more 按鈕
      // more 按鈕格式：<td id="divbtn3" colspan="13">more</td>
      const moreButton = document.querySelector("#divbtn3");
      const hasMoreButton =
        moreButton && moreButton.textContent.trim().toLowerCase() === "more";
      
      if (hasMoreButton) {
        console.log("找到 more 按鈕，點擊獲取更多資料...");
        window.czAssistUtils.updateAutomationStatus("載入更多資料...");
        
        // 記錄當前資料行數，用於判斷新資料是否載入完成
        const dataGrid = document.querySelector(
          bankConfig.selectors.query.dataGrid
        );
        const currentRowCount = dataGrid
          ? dataGrid.querySelectorAll("tr.data-row").length
          : 0;
        
        // 點擊 more 按鈕
        moreButton.click();
        
        // 等待新資料載入（監測資料行數變化或 more 按鈕消失）
        const waitForNewData = (attempts = 0) => {
          const maxAttempts = 30; // 最多等待 30 次，每次 500ms = 15 秒
          
          if (attempts >= maxAttempts) {
            console.log("等待新資料超時，繼續處理");
            // 遞迴檢查是否還有更多資料
            clickMoreButtonAndExtract();
            return;
          }
          
          const newDataGrid = document.querySelector(
            bankConfig.selectors.query.dataGrid
          );
          const newRowCount = newDataGrid
            ? newDataGrid.querySelectorAll("tr.data-row").length
            : 0;
          const newMoreButton = document.querySelector("#divbtn3");
          const stillHasMore =
            newMoreButton &&
            newMoreButton.textContent.trim().toLowerCase() === "more";
          
          // 如果資料行數增加了或 more 按鈕消失了，表示載入完成
          if (newRowCount > currentRowCount || !stillHasMore) {
            console.log(
              `新資料載入完成: ${currentRowCount} -> ${newRowCount} 行`
            );
            // 等待一下讓 DOM 完全更新
            setTimeout(() => {
              clickMoreButtonAndExtract();
            }, 500);
          } else {
            // 繼續等待
            setTimeout(() => waitForNewData(attempts + 1), 500);
          }
        };
        
        // 開始等待新資料
        setTimeout(() => waitForNewData(0), 500);
      } else {
        // 沒有 more 按鈕了，完成提取
        console.log(
          `國泰世華：沒有更多資料，總共提取了 ${window.czAssistExtension.automation.queryResults.length} 筆交易記錄`
        );
        
        // 完成提取並發送到 API
        await window.czAssistUtils.finishCathayDataExtraction();
      }
    };
    
    // 等待表格載入
    const waitForTable = (attempts = 0) => {
      const maxAttempts = 20;
      
      if (attempts >= maxAttempts) {
        console.error("等待國泰世華交易表格載入超時");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到交易表格");
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      const dataGrid = document.querySelector(
        bankConfig.selectors.query.dataGrid
      );
      
      if (!dataGrid) {
        console.log(
          `等待國泰世華交易表格載入... (${attempts + 1}/${maxAttempts})`
        );
        setTimeout(() => waitForTable(attempts + 1), 500);
        return;
      }
      
      // 檢查是否有資料行
      const rows = dataGrid.querySelectorAll("tr.data-row");
      if (rows.length === 0) {
        // 可能正在載入中，繼續等待
        console.log(
          `表格已載入但無資料，繼續等待... (${attempts + 1}/${maxAttempts})`
        );
        setTimeout(() => waitForTable(attempts + 1), 500);
        return;
      }
      
      console.log(`國泰世華交易表格載入完成，找到 ${rows.length} 行資料`);
      
      // 開始提取資料（包含處理 more 按鈕）
      clickMoreButtonAndExtract();
    };
    
    waitForTable();
  },

  // 完成國泰世華數據提取並發送到 API
  finishCathayDataExtraction: async () => {
    window.czAssistUtils.updateAutomationStatus(
      `已提取 ${window.czAssistExtension.automation.queryResults.length} 筆交易記錄`
    );
    
    // 顯示結果在側邊欄
    if (window.czAssistExtension.automation.queryResults.length > 0) {
      let resultsHtml = '<div class="cz-results-summary">';
      resultsHtml += `<p>找到 ${window.czAssistExtension.automation.queryResults.length} 筆存入記錄</p>`;
      resultsHtml += '<table class="cz-results-table">';
      resultsHtml +=
        "<thead><tr><th>時間</th><th>金額</th><th>帳號</th></tr></thead>";
      resultsHtml += "<tbody>";
      
      window.czAssistExtension.automation.queryResults.forEach((tx) => {
        resultsHtml += "<tr>";
        resultsHtml += `<td>${tx.date}</td>`;
        resultsHtml += `<td style="text-align: right;">${tx.amount}</td>`;
        resultsHtml += `<td>${tx.account}</td>`;
        resultsHtml += "</tr>";
      });
      
      resultsHtml += "</tbody></table></div>";
      
      const resultsDiv = document.getElementById("cz-results");
      if (resultsDiv) {
        resultsDiv.innerHTML = resultsHtml;
      }
    }
    
    // 發送交易記錄到 API
    await window.czAssistUtils.sendTransactionsToAPI(
      window.czAssistExtension.automation.queryResults
    );
    
    // 進入重新查詢循環
    window.czAssistExtension.automation.currentStep = 7;
    window.czAssistUtils.executeAutomationStep();
  },

  // =============== 台中銀行專用步驟 ===============

  // 步驟0: 點擊帳戶查詢（台中銀行專用）
  step0_clickTcbAccountQuery: () => {
    window.czAssistUtils.updateAutomationStatus("點擊帳戶查詢...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 等待帳戶查詢連結載入
    const waitForLink = (attempts = 0) => {
      const maxAttempts = 10;
      
      if (attempts >= maxAttempts) {
        console.error("等待帳戶查詢連結載入超時");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳戶查詢連結");
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      // 查找帳戶查詢連結（包含「帳戶查詢」文字且 target="iframe1"）
      let accountQueryLink = Array.from(
        document.querySelectorAll('a[target="iframe1"]')
      ).find((link) => {
        const span = link.querySelector("span");
        return span && span.textContent.trim().includes("帳戶查詢");
      });
      
      // 如果找不到，嘗試直接查找包含「帳戶查詢」文字的連結
      if (!accountQueryLink) {
        accountQueryLink = Array.from(document.querySelectorAll("a")).find(
          (link) => {
            const span = link.querySelector("span");
            return (
              span &&
              span.textContent.trim().includes("帳戶查詢") &&
              link.getAttribute("target") === "iframe1"
            );
          }
        );
      }
      
      if (accountQueryLink) {
        console.log("找到帳戶查詢連結，點擊中...");
        accountQueryLink.click();
        
        // 等待頁面跳轉
        setTimeout(() => {
          if (window.czAssistExtension.automation.isRequerying) {
            console.log("檢測到正在重新查詢，取消當前步驟執行");
            return;
          }
          window.czAssistExtension.automation.currentStep = 1;
          window.czAssistUtils.executeAutomationStep();
        }, 3000);
      } else {
        console.log(`等待帳戶查詢連結載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => {
          if (window.czAssistExtension.automation.isRequerying) {
            console.log("檢測到正在重新查詢，取消等待");
            return;
          }
          waitForLink(attempts + 1);
        }, 500);
      }
    };
    
    waitForLink();
  },

  // 步驟1: 點擊交易明細查詢（台中銀行專用）
  step1_clickTcbTransactionQuery: () => {
    window.czAssistUtils.updateAutomationStatus("點擊交易明細查詢...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 等待交易明細查詢連結載入
    const waitForLink = (attempts = 0) => {
      const maxAttempts = 10;
      
      if (attempts >= maxAttempts) {
        console.error("等待交易明細查詢連結載入超時");
        window.czAssistUtils.updateAutomationStatus(
          "錯誤：找不到交易明細查詢連結"
        );
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      // 查找交易明細查詢連結（文字為「交易明細查詢」且 target="iframe1"）
      let transactionQueryLink = Array.from(
        document.querySelectorAll('a[target="iframe1"]')
      ).find((link) => {
        const b = link.querySelector("b");
        return b && b.textContent.trim().includes("交易明細查詢");
      });
      
      // 如果找不到，嘗試查找包含「交易明細查詢」文字的連結
      if (!transactionQueryLink) {
        transactionQueryLink = Array.from(
          document.querySelectorAll('a[target="iframe1"]')
        ).find((link) => {
          return (
            link.textContent.includes("交易明細查詢") ||
            link.innerHTML.includes("交易明細查詢")
          );
        });
      }
      
      if (transactionQueryLink) {
        console.log("找到交易明細查詢連結，點擊中...");
        transactionQueryLink.click();
        
        // 等待頁面跳轉
        setTimeout(() => {
          if (window.czAssistExtension.automation.isRequerying) {
            console.log("檢測到正在重新查詢，取消當前步驟執行");
            return;
          }
          window.czAssistExtension.automation.currentStep = 2;
          window.czAssistUtils.executeAutomationStep();
        }, 3000);
      } else {
        console.log(
          `等待交易明細查詢連結載入... (${attempts + 1}/${maxAttempts})`
        );
        setTimeout(() => {
          if (window.czAssistExtension.automation.isRequerying) {
            console.log("檢測到正在重新查詢，取消等待");
            return;
          }
          waitForLink(attempts + 1);
        }, 500);
      }
    };
    
    waitForLink();
  },

  // 步驟2: 選擇帳號（台中銀行專用）
  step2_selectTcbAccount: () => {
    window.czAssistUtils.updateAutomationStatus("選擇帳號...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 獲取 iframe 的 document
    const getIframeDocument = () => {
      const iframe = document.querySelector(
        'iframe#iframe1, iframe[name="iframe1"]'
      );
      if (iframe && iframe.contentDocument) {
        return iframe.contentDocument;
      }
      return null;
    };
    
    // 等待帳號下拉選單載入
    const waitForAccountSelect = (attempts = 0) => {
      const maxAttempts = 10;
      
      if (attempts >= maxAttempts) {
        console.error("等待帳號下拉選單載入超時");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳號下拉選單");
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      const iframeDoc = getIframeDocument();
      if (!iframeDoc) {
        console.log(`等待 iframe 載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => {
          if (window.czAssistExtension.automation.isRequerying) {
            console.log("檢測到正在重新查詢，取消等待");
            return;
          }
          waitForAccountSelect(attempts + 1);
        }, 500);
        return;
      }
      
      const accountSelect =
        iframeDoc.querySelector(bankConfig.selectors.query.accountSelect) ||
        iframeDoc.querySelector(bankConfig.selectors.query.accountSelectAlt);
      
      if (accountSelect && accountSelect.options.length > 1) {
        // 選擇第一個非「請選擇」的選項
        const firstOption = Array.from(accountSelect.options).find(
          (opt) => opt.value !== "none" && opt.value !== ""
        );
        if (firstOption) {
          console.log(`選擇帳號: ${firstOption.text} (${firstOption.value})`);
          accountSelect.value = firstOption.value;
          accountSelect.dispatchEvent(new Event("change", { bubbles: true }));
          
          setTimeout(() => {
            if (window.czAssistExtension.automation.isRequerying) {
              console.log("檢測到正在重新查詢，取消當前步驟執行");
              return;
            }
            window.czAssistExtension.automation.currentStep = 3;
            window.czAssistUtils.executeAutomationStep();
          }, 2000);
        } else {
          console.error("找不到可選的帳號選項");
          window.czAssistUtils.updateAutomationStatus("錯誤：找不到可選的帳號");
          window.czAssistUtils.stopAutomation();
        }
      } else {
        console.log(`等待帳號選項載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForAccountSelect(attempts + 1), 500);
      }
    };
    
    waitForAccountSelect();
  },

  // 步驟3: 設定日期範圍（台中銀行專用）
  step3_setTcbDateRange: () => {
    window.czAssistUtils.updateAutomationStatus("設定查詢日期範圍...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 計算日期範圍
    const dateRange = window.czAssistUtils.calculateQueryDateRange();
    const startDateFormatted = dateRange.startDate; // YYYY/MM/DD 格式
    
    console.log(`目標日期: ${startDateFormatted}`);
    
    // 獲取 iframe 的 document
    const getIframeDocument = () => {
      const iframe = document.querySelector(
        'iframe#iframe1, iframe[name="iframe1"]'
      );
      if (iframe && iframe.contentDocument) {
        return iframe.contentDocument;
      }
      return null;
    };
    
    // 等待起日輸入框載入
    const waitForDateInput = (attempts = 0) => {
      const maxAttempts = 10;
      
      if (attempts >= maxAttempts) {
        console.error("等待起日輸入框載入超時");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到起日輸入框");
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      const iframeDoc = getIframeDocument();
      if (!iframeDoc) {
        console.log(`等待 iframe 載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => {
          if (window.czAssistExtension.automation.isRequerying) {
            console.log("檢測到正在重新查詢，取消等待");
            return;
          }
          waitForDateInput(attempts + 1);
        }, 500);
        return;
      }
      
      const startDateInput =
        iframeDoc.querySelector(bankConfig.selectors.query.startDate) ||
        iframeDoc.querySelector(bankConfig.selectors.query.startDateAlt);
      
      if (startDateInput) {
        // 檢查日期輸入框是否已經有值，且符合目標日期
        const currentValue = startDateInput.value.trim();
        if (currentValue) {
          const currentDateMatch = currentValue.match(
            /(\d{4})\/(\d{1,2})\/(\d{1,2})/
          );
          if (currentDateMatch) {
            const currentYear = parseInt(currentDateMatch[1], 10);
            const currentMonth = parseInt(currentDateMatch[2], 10);
            const currentDay = parseInt(currentDateMatch[3], 10);
            const [targetYear, targetMonth, targetDay] = startDateFormatted
              .split("/")
              .map(Number);

            if (
              currentYear === targetYear &&
              currentMonth === targetMonth &&
              currentDay === targetDay
            ) {
              console.log(`日期已經設定為目標日期: ${currentValue}，跳過設定`);
              setTimeout(() => {
                if (window.czAssistExtension.automation.isRequerying) {
                  console.log("檢測到正在重新查詢，取消當前步驟執行");
                  return;
                }
                window.czAssistExtension.automation.currentStep = 4;
                window.czAssistUtils.executeAutomationStep();
              }, 500);
              return;
            }
          }
        }
        
        console.log(`設定起日: ${startDateFormatted}`);
        
        // 設定起日
        startDateInput.value = startDateFormatted;
        startDateInput.dispatchEvent(new Event("input", { bubbles: true }));
        startDateInput.dispatchEvent(new Event("change", { bubbles: true }));
        startDateInput.dispatchEvent(
          new KeyboardEvent("keyup", { bubbles: true })
        );
        startDateInput.blur();
        startDateInput.dispatchEvent(new Event("blur", { bubbles: true }));
        
        setTimeout(() => {
          window.czAssistExtension.automation.currentStep = 4;
          window.czAssistUtils.executeAutomationStep();
        }, 2000);
      } else {
        console.log(`等待起日輸入框載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForDateInput(attempts + 1), 500);
      }
    };
    
    waitForDateInput();
  },

  // 步驟4: 執行查詢（台中銀行專用）
  step4_executeTcbQuery: () => {
    window.czAssistUtils.updateAutomationStatus("執行查詢...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 獲取 iframe 的 document
    const getIframeDocument = () => {
      const iframe = document.querySelector(
        'iframe#iframe1, iframe[name="iframe1"]'
      );
      if (iframe && iframe.contentDocument) {
        return iframe.contentDocument;
      }
      return null;
    };
    
    // 等待查詢按鈕載入
    const waitForQueryButton = (attempts = 0) => {
      const maxAttempts = 10;
      
      if (attempts >= maxAttempts) {
        console.error("等待查詢按鈕載入超時");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到查詢按鈕");
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      const iframeDoc = getIframeDocument();
      if (!iframeDoc) {
        console.log(`等待 iframe 載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForQueryButton(attempts + 1), 500);
        return;
      }
      
      const queryButton =
        iframeDoc.querySelector(bankConfig.selectors.query.queryButton) ||
        iframeDoc.querySelector(bankConfig.selectors.query.queryButtonAlt);
      
      if (queryButton) {
        console.log("找到查詢按鈕，點擊中...");
        queryButton.click();
        
        // 等待查詢結果載入（直接跳到步驟6提取數據，因為沒有分頁數量按鈕）
        setTimeout(() => {
          if (window.czAssistExtension.automation.isRequerying) {
            console.log("檢測到正在重新查詢，取消當前步驟執行");
            return;
          }
          window.czAssistExtension.automation.currentStep = 6;
          window.czAssistUtils.executeAutomationStep();
        }, 5000);
      } else {
        console.log(`等待查詢按鈕載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForQueryButton(attempts + 1), 500);
      }
    };
    
    waitForQueryButton();
  },

  // 步驟5: 設定每頁100筆（台中銀行專用）
  step5_setTcbPageSize: () => {
    window.czAssistUtils.updateAutomationStatus("設定每頁顯示100筆...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 獲取 iframe 的 document
    const getIframeDocument = () => {
      const iframe = document.querySelector(
        'iframe#iframe1, iframe[name="iframe1"]'
      );
      if (iframe && iframe.contentDocument) {
        return iframe.contentDocument;
      }
      return null;
    };
    
    // 等待分頁數量按鈕載入
    const waitForPageSizeButton = (attempts = 0) => {
      const maxAttempts = 10;
      
      if (attempts >= maxAttempts) {
        console.error("等待分頁數量按鈕載入超時");
        // 如果找不到，直接進入提取數據步驟
        window.czAssistExtension.automation.currentStep = 6;
        window.czAssistUtils.executeAutomationStep();
        return;
      }
      
      const iframeDoc = getIframeDocument();
      if (!iframeDoc) {
        console.log(`等待 iframe 載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForPageSizeButton(attempts + 1), 500);
        return;
      }
      
      // 查找包含"100"的分頁數量按鈕
      const pageSizeContainer = iframeDoc.querySelector("div.showPages");
      if (pageSizeContainer) {
        const allLinks = pageSizeContainer.querySelectorAll("a");
        let pageSize100Button = null;
        
        for (const link of allLinks) {
          const span = link.querySelector("span");
          if (span && span.textContent.trim() === "100") {
            // 檢查是否已經選中
            if (!link.classList.contains("on")) {
              pageSize100Button = link;
              break;
            } else {
              // 已經選中100，直接進入提取數據步驟
              console.log("每頁顯示筆數已經是100，直接提取數據");
              setTimeout(() => {
                window.czAssistExtension.automation.currentStep = 6;
                window.czAssistUtils.executeAutomationStep();
              }, 1000);
              return;
            }
          }
        }
        
        if (pageSize100Button) {
          console.log("找到每頁100筆按鈕，點擊中...");
          pageSize100Button.click();
          
          // 等待頁面重新載入
          setTimeout(() => {
            window.czAssistExtension.automation.currentStep = 6;
            window.czAssistUtils.executeAutomationStep();
          }, 3000);
        } else {
          console.log("找不到每頁100筆按鈕或已經選中，直接提取數據");
          setTimeout(() => {
            window.czAssistExtension.automation.currentStep = 6;
            window.czAssistUtils.executeAutomationStep();
          }, 1000);
        }
      } else {
        console.log(`等待分頁數量容器載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForPageSizeButton(attempts + 1), 500);
      }
    };
    
    waitForPageSizeButton();
  },

  // 步驟6: 提取交易數據並處理分頁（台中銀行專用）
  step6_extractTcbTransactionData: async () => {
    window.czAssistUtils.updateAutomationStatus("提取交易數據...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 初始化查詢結果陣列（如果還沒有）
    if (!window.czAssistExtension.automation.queryResults) {
      window.czAssistExtension.automation.queryResults = [];
    }
    
    // 獲取 iframe 的 document
    const getIframeDocument = () => {
      const iframe = document.querySelector(
        'iframe#iframe1, iframe[name="iframe1"]'
      );
      if (iframe && iframe.contentDocument) {
        return iframe.contentDocument;
      }
      return null;
    };
    
    const iframeDoc = getIframeDocument();
    if (!iframeDoc) {
      console.error("找不到 iframe1");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到 iframe1");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 提取當前頁面的交易數據
    const extractCurrentPageData = () => {
      const dataGrid =
        iframeDoc.querySelector(bankConfig.selectors.query.dataGrid) ||
        iframeDoc.querySelector(bankConfig.selectors.query.dataGridAlt);
      
      if (!dataGrid) {
        console.warn("找不到交易表格");
        return [];
      }
      
      const tbody = dataGrid.querySelector("tbody");
      if (!tbody) {
        console.warn("找不到表格 tbody");
        return [];
      }
      
      // 排除表頭行（class="hd1" 或包含表頭文字的行）
      const rows = Array.from(tbody.querySelectorAll("tr")).filter((row) => {
        return (
          !row.classList.contains("hd1") &&
          !row.querySelector("td.hd1") &&
          row.querySelectorAll("td").length >= 8
        );
      });
      const transactions = [];
      
      // 獲取今天的日期（用於判斷交易日期是否為今天）
      const today = new Date();
      const todayStr = `${today.getFullYear()}/${String(
        today.getMonth() + 1
      ).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;
      
      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 8) return; // 至少需要8個欄位
        
        // 1. 存入金額（第4欄，index 3）
        const depositCell = cells[3];
        const depositText = depositCell
          ? depositCell.textContent.trim().replace(/,/g, "")
          : "0";
        const depositAmount = parseFloat(depositText) || 0;
        
        // 只處理存入金額 > 0 的交易
        if (depositAmount <= 0) return;
        
        // 2. 交易日期（第1欄，index 0）
        const dateCell = cells[0];
        const transactionDate = dateCell ? dateCell.textContent.trim() : "";
        
        // 3. 餘額（第5欄，index 4）- 用於唯一ID
        const balanceCell = cells[4];
        const balance = balanceCell
          ? balanceCell.textContent.trim().replace(/,/g, "")
          : "";
        
        // 4. 交易行（第6欄，index 5）- 3位銀行代碼
        const bankCodeCell = cells[5];
        const bankCode = bankCodeCell ? bankCodeCell.textContent.trim() : "";
        
        // 5. 說明（第7欄，index 6）- 16位帳號
        const accountCell = cells[6];
        // 帳號可能有 - 分隔符（例如 028-22-0070951），需要去掉
        let accountNumber = accountCell ? accountCell.textContent.trim() : "";
        accountNumber = accountNumber.replace(/-/g, "");
        
        // 組合帳號：前3位銀行代碼 + 後16位帳號
        let fullAccount = "";
        if (bankCode && accountNumber) {
          // 確保銀行代碼是3位數
          const bankCode3 = bankCode.padStart(3, "0").substring(0, 3);
          // 確保帳號是16位數（如果不足16位，前面補0）
          const account16 = accountNumber.padStart(16, "0").substring(0, 16);
          fullAccount = bankCode3 + account16;
        }
        
        // 判斷交易時間：
        // - 如果交易日期是今天，使用當前時間（發送時間）
        // - 如果交易日期不是今天（是昨天或更早），使用固定時間 23:59:00
        // 這樣可以避免跨日時，昨天的交易時間變成隔天的時間
        let timeStr;
        if (transactionDate === todayStr) {
          // 今天的交易，使用當前時間
          const now = new Date();
          timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
            now.getMinutes()
          ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
        } else {
          // 昨天或更早的交易，使用固定時間 23:59:00
          timeStr = "23:59:00";
        }
        
        // 組合完整的日期時間
        const datetime = `${transactionDate} ${timeStr}`;
        
        // 使用日期 + 餘額 + 存入金額作為唯一ID
        const uniqueId = `${transactionDate}_${balance}_${depositAmount}`;
        
        transactions.push({
          date: datetime,
          amount: depositAmount,
          account: fullAccount,
          uniqueId: uniqueId,
          balance: balance, // 保存餘額，用於 generateTransactionId 的 fallback
        });
      });
      
      return transactions;
    };
    
    // 提取當前頁面的數據
    const currentPageTransactions = extractCurrentPageData();
    if (currentPageTransactions.length > 0) {
      console.log(
        `當前頁面提取了 ${currentPageTransactions.length} 筆存入記錄`
      );
      
      // 過濾重複的交易（使用 uniqueId）
      const existingIds = new Set(
        window.czAssistExtension.automation.queryResults.map(
          (tx) => tx.uniqueId
        )
      );
      
      const newTransactions = currentPageTransactions.filter(
        (tx) => !existingIds.has(tx.uniqueId)
      );
      
      if (newTransactions.length > 0) {
        window.czAssistExtension.automation.queryResults.push(
          ...newTransactions
        );
        console.log(`新增 ${newTransactions.length} 筆交易記錄`);
      } else {
        console.log("當前頁面的交易記錄都已存在，跳過");
      }
    }
    
    // 查找下一頁按鈕
    const nextPageButton = iframeDoc.querySelector(
      bankConfig.selectors.query.nextPageButton
    );
    
    if (nextPageButton && !nextPageButton.classList.contains("disabled")) {
      // 檢查是否還有下一頁（通過 onclick 屬性）
      const onclick = nextPageButton.getAttribute("onclick");
      if (onclick && onclick.includes("setDataGridCurrentPage")) {
        console.log("找到下一頁按鈕，點擊中...");
        window.czAssistUtils.updateAutomationStatus("載入下一頁...");
        
        nextPageButton.click();
        
        // 也嘗試觸發 onclick 事件
        try {
          eval(onclick);
        } catch (e) {
          console.warn("執行 onclick 失敗，使用 click:", e);
        }
        
        // 等待下一頁載入
        setTimeout(() => {
          window.czAssistUtils.step6_extractTcbTransactionData();
        }, 2000);
      } else {
        // 沒有下一頁了，完成提取
        console.log(
          `總共提取了 ${window.czAssistExtension.automation.queryResults.length} 筆交易記錄`
        );
        await window.czAssistUtils.finishTcbDataExtraction();
      }
    } else {
      // 沒有下一頁了，完成提取
      console.log(
        `總共提取了 ${window.czAssistExtension.automation.queryResults.length} 筆交易記錄`
      );
      await window.czAssistUtils.finishTcbDataExtraction();
    }
  },

  // 完成台中銀行數據提取並發送到 API
  finishTcbDataExtraction: async () => {
    window.czAssistUtils.updateAutomationStatus(
      `已提取 ${window.czAssistExtension.automation.queryResults.length} 筆交易記錄`
    );
    
    // 顯示結果在側邊欄
    if (window.czAssistExtension.automation.queryResults.length > 0) {
      let resultsHtml = '<div class="cz-results-summary">';
      resultsHtml += `<p>找到 ${window.czAssistExtension.automation.queryResults.length} 筆存入記錄</p>`;
      resultsHtml += '<table class="cz-results-table">';
      resultsHtml +=
        "<thead><tr><th>時間</th><th>金額</th><th>帳號</th></tr></thead>";
      resultsHtml += "<tbody>";
      
      window.czAssistExtension.automation.queryResults.forEach((tx) => {
        resultsHtml += "<tr>";
        resultsHtml += `<td>${tx.date}</td>`;
        resultsHtml += `<td style="text-align: right;">${tx.amount.toLocaleString()}</td>`;
        resultsHtml += `<td>${tx.account}</td>`;
        resultsHtml += "</tr>";
      });
      
      resultsHtml += "</tbody></table></div>";
      
      const resultsDiv = document.getElementById("cz-query-results");
      if (resultsDiv) {
        resultsDiv.innerHTML = resultsHtml;
      }
    }
    
    // 發送到 API
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (
      bankConfig &&
      window.czAssistExtension.automation.queryResults.length > 0
    ) {
      try {
        await window.czAssistUtils.sendTransactionsToAPI(
          window.czAssistExtension.automation.queryResults,
          bankConfig.loginData.bankId,
          bankConfig.loginData.bankName
        );
      } catch (error) {
        console.error("發送交易記錄到 API 失敗:", error);
      }
    }
    
    // 進入重新查詢循環
    window.czAssistExtension.automation.currentStep = 7;
    window.czAssistUtils.executeAutomationStep();
  },

  // =============== 新光商銀專用步驟 ===============

  // 步驟1: 點擊臺/外幣交易明細查詢（新光商銀專用）
  step1_clickSkbankTransactionQuery: () => {
    window.czAssistUtils.updateAutomationStatus("點擊臺/外幣交易明細查詢...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 等待連結載入
    const waitForLink = (attempts = 0) => {
      const maxAttempts = 10;
      
      if (attempts >= maxAttempts) {
        console.error("等待交易明細查詢連結載入超時");
        window.czAssistUtils.updateAutomationStatus(
          "錯誤：找不到交易明細查詢連結"
        );
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      const queryLink =
        document.querySelector(
          bankConfig.selectors.navigation.transactionQueryLink
        ) ||
        document.querySelector(
          bankConfig.selectors.navigation.transactionQueryLinkAlt
        );
      
      if (queryLink) {
        console.log("找到交易明細查詢連結，點擊中...");
        queryLink.click();
        
        // 等待頁面跳轉
        setTimeout(() => {
          window.czAssistExtension.automation.currentStep = 1;
          window.czAssistUtils.executeAutomationStep();
        }, 3000);
      } else {
        console.log(
          `等待交易明細查詢連結載入... (${attempts + 1}/${maxAttempts})`
        );
        setTimeout(() => waitForLink(attempts + 1), 500);
      }
    };
    
    waitForLink();
  },

  // 步驟2: 選擇第一個帳號（新光商銀專用）
  step2_selectSkbankAccount: () => {
    window.czAssistUtils.updateAutomationStatus("選擇帳號...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 等待帳號下拉選單載入
    const waitForAccountSelect = (attempts = 0) => {
      const maxAttempts = 10;
      
      if (attempts >= maxAttempts) {
        console.error("等待帳號下拉選單載入超時");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳號下拉選單");
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      const accountSelect = document.querySelector(
        bankConfig.selectors.query.accountSelect
      );

      if (
        accountSelect &&
        accountSelect.options &&
        accountSelect.options.length > 1
      ) {
        // 選擇第一個帳號（跳過「請選擇...」選項）
        const firstAccountOption = accountSelect.options[1];
        if (firstAccountOption && firstAccountOption.value) {
          console.log(
            `選擇帳號: ${firstAccountOption.text} (${firstAccountOption.value})`
          );
          accountSelect.value = firstAccountOption.value;
          accountSelect.dispatchEvent(new Event("change", { bubbles: true }));
          
          setTimeout(() => {
            window.czAssistExtension.automation.currentStep = 2;
            window.czAssistUtils.executeAutomationStep();
          }, 2000);
        } else {
          console.log(`等待帳號選項載入... (${attempts + 1}/${maxAttempts})`);
          setTimeout(() => waitForAccountSelect(attempts + 1), 500);
        }
      } else {
        console.log(`等待帳號下拉選單載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForAccountSelect(attempts + 1), 500);
      }
    };
    
    waitForAccountSelect();
  },

  // 步驟3: 設定日期範圍（新光商銀專用）
  step3_setSkbankDateRange: () => {
    window.czAssistUtils.updateAutomationStatus("設定查詢日期範圍...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 計算日期範圍
    const dateRange = window.czAssistUtils.calculateQueryDateRange();
    const startDateFormatted = dateRange.startDate; // YYYY/MM/DD 格式
    
    // 解析目標日期
    const [targetYear, targetMonth, targetDay] = startDateFormatted
      .split("/")
      .map(Number);
    
    console.log(`目標日期: ${targetYear}/${targetMonth}/${targetDay}`);
    
    // 等待起日輸入框載入
    const waitForDateInput = (attempts = 0) => {
      const maxAttempts = 10;
      
      if (attempts >= maxAttempts) {
        console.error("等待起日輸入框載入超時");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到起日輸入框");
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      const startDateInput =
        document.querySelector(bankConfig.selectors.query.startDate) ||
        document.querySelector(bankConfig.selectors.query.startDateAlt);
      
      if (startDateInput) {
        // 檢查日期輸入框是否已經有值，且符合目標日期
        const currentValue = startDateInput.value.trim();
        if (currentValue) {
          // 嘗試解析當前值（可能是 YYYY/MM/DD 格式）
          const currentDateMatch = currentValue.match(
            /(\d{4})\/(\d{1,2})\/(\d{1,2})/
          );
          if (currentDateMatch) {
            const currentYear = parseInt(currentDateMatch[1], 10);
            const currentMonth = parseInt(currentDateMatch[2], 10);
            const currentDay = parseInt(currentDateMatch[3], 10);
            // 如果當前日期已經符合目標日期，跳過 datepicker 設定
            if (
              currentYear === targetYear &&
              currentMonth === targetMonth &&
              currentDay === targetDay
            ) {
              console.log(
                `日期已經設定為目標日期: ${currentValue}，跳過 datepicker 設定`
              );
              setTimeout(() => {
                window.czAssistExtension.automation.currentStep = 3.5;
                window.czAssistUtils.executeAutomationStep();
              }, 500);
              return;
            }
          }
        }
        
        console.log(`Focus 起日輸入框以打開 datepicker...`);
        
        // Focus 輸入框來觸發 datepicker
        startDateInput.focus();
        startDateInput.click();
        startDateInput.dispatchEvent(new Event("focus", { bubbles: true }));
        startDateInput.dispatchEvent(
          new MouseEvent("mousedown", { bubbles: true })
        );
        startDateInput.dispatchEvent(
          new MouseEvent("mouseup", { bubbles: true })
        );
        
        // 使用標記來追蹤 datepicker 是否已經處理完成
        let datepickerHandled = false;
        
        // 等待 datepicker 出現
        const waitForDatepicker = (pickerAttempts = 0) => {
          const maxPickerAttempts = 10;
          
          // 如果已經處理完成，停止等待
          if (datepickerHandled) {
            console.log("Datepicker 已處理完成，停止等待");
            return;
          }
          
          if (pickerAttempts >= maxPickerAttempts) {
            // 如果已經處理完成，不要報錯
            if (datepickerHandled) {
              console.log("Datepicker 等待超時，但已處理完成");
              return;
            }
            console.error("等待 datepicker 載入超時");
            window.czAssistUtils.updateAutomationStatus(
              "錯誤：datepicker 未出現"
            );
            window.czAssistUtils.stopAutomation();
            return;
          }
          
          // 查找 datepicker
          const datepicker = document.querySelector("div.datepicker-days");
          
          if (datepicker && datepicker.style.display !== "none") {
            console.log("Datepicker 已出現，尋找目標日期...");
            
            // 先檢查 datepicker 顯示的月份和年份
            const datepickerSwitch =
              datepicker.querySelector(".datepicker-switch");
            let currentMonth = null;
            let currentYear = null;
            
            if (datepickerSwitch) {
              const switchText = datepickerSwitch.textContent.trim();
              console.log(`Datepicker 顯示: ${switchText}`);
              
              // 格式可能是 "November 2025" 或類似
              const monthMatch = switchText.match(/(\w+)\s+(\d+)/);
              if (monthMatch) {
                const monthNames = [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ];
                const monthName = monthMatch[1];
                currentYear = parseInt(monthMatch[2]);
                const monthIndex = monthNames.findIndex(
                  (m) => m.toLowerCase() === monthName.toLowerCase()
                );
                if (monthIndex >= 0) {
                  currentMonth = monthIndex + 1; // 轉換為 1-based
                }
              }
            }
            
            console.log(
              `Datepicker 當前月份: ${currentYear}/${currentMonth}, 目標: ${targetYear}/${targetMonth}`
            );
            
            // 如果需要切換月份
            if (currentMonth !== null && currentYear !== null) {
              if (
                currentYear < targetYear ||
                (currentYear === targetYear && currentMonth < targetMonth)
              ) {
                // 需要往前切換月份
                const nextButton = datepicker.querySelector(".next");
                if (nextButton) {
                  console.log("目標月份在未來，點擊「下一月」按鈕");
                  nextButton.click();
                  setTimeout(() => waitForDatepicker(0), 1000);
                  return;
                }
              } else if (
                currentYear > targetYear ||
                (currentYear === targetYear && currentMonth > targetMonth)
              ) {
                // 需要往後切換月份
                const prevButton = datepicker.querySelector(".prev");
                if (prevButton) {
                  console.log("目標月份在過去，點擊「上一月」按鈕");
                  prevButton.click();
                  setTimeout(() => waitForDatepicker(0), 1000);
                  return;
                }
              }
            }
            
            // 查找所有日期單元格（排除 old 和 new 類別）
            const allDayCells = datepicker.querySelectorAll(
              "td.day:not(.old):not(.new)"
            );
            
            // 找到目標日期的單元格
            let targetCell = null;
            
            // 如果已經在正確的月份，直接查找日期
            if (currentMonth === targetMonth && currentYear === targetYear) {
              for (const cell of allDayCells) {
                const cellText = cell.textContent.trim();
                const dayNumber = parseInt(cellText);
                
                if (dayNumber === targetDay) {
                  targetCell = cell;
                  console.log(`找到目標日期單元格: ${cellText}`);
                  break;
                }
              }
            } else {
              // 如果月份不匹配，先嘗試切換月份
              if (currentMonth !== null && currentYear !== null) {
                if (
                  currentYear < targetYear ||
                  (currentYear === targetYear && currentMonth < targetMonth)
                ) {
                  const nextButton = datepicker.querySelector(".next");
                  if (nextButton) {
                    console.log("需要切換到未來月份");
                    nextButton.click();
                    setTimeout(() => waitForDatepicker(0), 1000);
                    return;
                  }
                } else {
                  const prevButton = datepicker.querySelector(".prev");
                  if (prevButton) {
                    console.log("需要切換到過去月份");
                    prevButton.click();
                    setTimeout(() => waitForDatepicker(0), 1000);
                    return;
                  }
                }
              }
              
              // 如果無法切換月份，嘗試直接查找日期（可能月份已經正確）
              for (const cell of allDayCells) {
                const cellText = cell.textContent.trim();
                const dayNumber = parseInt(cellText);
                if (dayNumber === targetDay) {
                  targetCell = cell;
                  console.log(`找到目標日期單元格（未驗證月份）: ${cellText}`);
                  break;
                }
              }
            }
            
            if (targetCell) {
              console.log(
                `找到目標日期單元格，點擊中... (${targetCell.textContent.trim()})`
              );
              
              // 標記 datepicker 已處理
              datepickerHandled = true;
              
              // 點擊日期單元格
              targetCell.click();
              
              // 也嘗試點擊內部的元素（如果有）
              const innerLink = targetCell.querySelector("a");
              if (innerLink) {
                innerLink.click();
              }
              
              // 等待日期設定完成
              setTimeout(() => {
                // 檢查輸入框的值是否已更新
                const currentValue = startDateInput.value;
                console.log(`日期設定完成，輸入框值: ${currentValue}`);
                
                window.czAssistExtension.automation.currentStep = 3.5;
                window.czAssistUtils.executeAutomationStep();
              }, 1500);
            } else {
              console.error(`找不到目標日期 ${targetDay} 在 datepicker 中`);
              console.log(
                "可用的日期:",
                Array.from(allDayCells).map((c) => c.textContent.trim())
              );
              console.log(
                `Datepicker 當前顯示: ${currentYear}/${currentMonth}, 目標: ${targetYear}/${targetMonth}`
              );
              
              // 如果還是找不到，直接進入下一步（可能日期已經設定或需要手動處理）
              console.warn("無法找到目標日期，但繼續執行");
              datepickerHandled = true; // 標記已處理，停止等待
              setTimeout(() => {
                window.czAssistExtension.automation.currentStep = 3.5;
                window.czAssistUtils.executeAutomationStep();
              }, 1000);
            }
          } else {
            // 如果 datepicker 已處理完成，停止等待
            if (datepickerHandled) {
              console.log("Datepicker 已處理完成，停止等待");
              return;
            }
            console.log(
              `等待 datepicker 出現... (${
                pickerAttempts + 1
              }/${maxPickerAttempts})`
            );
            setTimeout(() => waitForDatepicker(pickerAttempts + 1), 500);
          }
        };
        
        // 等待一小段時間讓 datepicker 有時間出現
        setTimeout(() => {
          waitForDatepicker();
        }, 500);
      } else {
        console.log(`等待起日輸入框載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForDateInput(attempts + 1), 500);
      }
    };
    
    waitForDateInput();
  },

  // 步驟3.5: 點擊「自選」radio button（新光商銀專用）
  step3_5_clickSkbankCustomize: () => {
    window.czAssistUtils.updateAutomationStatus("點擊「自選」選項...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 等待「自選」label 載入
    const waitForCustomizeLabel = (attempts = 0) => {
      const maxAttempts = 10;
      
      if (attempts >= maxAttempts) {
        console.error("等待「自選」label 載入超時");
        // 如果找不到，直接進入下一步（點擊查詢按鈕）
        window.czAssistExtension.automation.currentStep = 4;
        window.czAssistUtils.executeAutomationStep();
        return;
      }
      
      // 查找「自選」label（id="customize"）
      const customizeLabel = document.querySelector("label#customize");
      
      if (customizeLabel) {
        console.log("找到「自選」label，點擊中...");
        
        // 點擊 label
        customizeLabel.click();
        
        // 也嘗試點擊內部的 radio button
        const radioInput = customizeLabel.querySelector('input[type="radio"]');
        if (radioInput) {
          radioInput.checked = true;
          radioInput.dispatchEvent(new Event("change", { bubbles: true }));
          radioInput.dispatchEvent(new Event("click", { bubbles: true }));
          console.log("已設定「自選」radio button 為選中狀態");
        }
        
        // 等待一下後進入下一步（點擊查詢按鈕）
        setTimeout(() => {
          window.czAssistExtension.automation.currentStep = 4;
          window.czAssistUtils.executeAutomationStep();
        }, 1000);
      } else {
        console.log(
          `等待「自選」label 載入... (${attempts + 1}/${maxAttempts})`
        );
        setTimeout(() => waitForCustomizeLabel(attempts + 1), 500);
      }
    };
    
    waitForCustomizeLabel();
  },

  // 步驟4: 執行查詢（新光商銀專用）
  step4_executeSkbankQuery: () => {
    window.czAssistUtils.updateAutomationStatus("執行查詢...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 等待查詢按鈕載入
    const waitForQueryButton = (attempts = 0) => {
      const maxAttempts = 10;
      
      if (attempts >= maxAttempts) {
        console.error("等待查詢按鈕載入超時");
        window.czAssistUtils.updateAutomationStatus("錯誤：找不到查詢按鈕");
        window.czAssistUtils.stopAutomation();
        return;
      }
      
      const queryButton =
        document.querySelector(bankConfig.selectors.query.queryButton) ||
        document.querySelector(bankConfig.selectors.query.queryButtonAlt);
      
      if (queryButton) {
        console.log("找到查詢按鈕，點擊中...");
        queryButton.click();
        
        // 等待查詢結果載入
        setTimeout(() => {
          window.czAssistExtension.automation.currentStep = 5;
          window.czAssistUtils.executeAutomationStep();
        }, 5000);
      } else {
        console.log(`等待查詢按鈕載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForQueryButton(attempts + 1), 500);
      }
    };
    
    waitForQueryButton();
  },

  // 步驟5: 設定每頁100筆（新光商銀專用）
  step5_setSkbankPageSize: () => {
    window.czAssistUtils.updateAutomationStatus("設定每頁顯示100筆...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 等待分頁數量按鈕載入
    const waitForPageSizeButton = (attempts = 0) => {
      const maxAttempts = 10;
      
      if (attempts >= maxAttempts) {
        console.error("等待分頁數量按鈕載入超時");
        // 如果找不到，直接進入提取數據步驟
        window.czAssistExtension.automation.currentStep = 6;
        window.czAssistUtils.executeAutomationStep();
        return;
      }
      
      // 查找包含"100"的分頁數量按鈕（可能在 pager-info 或 div.showPages 中）
      const pageSizeContainer = document.querySelector(
        "pager-info div.showPages, div.showPages"
      );
      if (pageSizeContainer) {
        const allLinks = pageSizeContainer.querySelectorAll("a");
        let pageSize100Button = null;
        
        for (const link of allLinks) {
          const span = link.querySelector("span");
          if (span && span.textContent.trim() === "100") {
            // 檢查是否已經選中
            if (!link.classList.contains("on")) {
              pageSize100Button = link;
              break;
            } else {
              // 已經選中100，直接進入提取數據步驟
              console.log("每頁顯示筆數已經是100，直接提取數據");
              setTimeout(() => {
                window.czAssistExtension.automation.currentStep = 6;
                window.czAssistUtils.executeAutomationStep();
              }, 1000);
              return;
            }
          }
        }
        
        if (pageSize100Button) {
          console.log("找到每頁100筆按鈕，點擊中...");
          pageSize100Button.click();
          
          // 等待頁面重新載入
          setTimeout(() => {
            window.czAssistExtension.automation.currentStep = 6;
            window.czAssistUtils.executeAutomationStep();
          }, 3000);
        } else {
          console.log("找不到每頁100筆按鈕或已經選中，直接提取數據");
          setTimeout(() => {
            window.czAssistExtension.automation.currentStep = 6;
            window.czAssistUtils.executeAutomationStep();
          }, 1000);
        }
      } else {
        console.log(`等待分頁數量容器載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForPageSizeButton(attempts + 1), 500);
      }
    };
    
    waitForPageSizeButton();
  },

  // 步驟6: 提取交易數據並處理分頁（新光商銀專用）
  step6_extractSkbankTransactionData: async () => {
    window.czAssistUtils.updateAutomationStatus("提取交易數據...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 初始化查詢結果陣列（如果還沒有）
    if (!window.czAssistExtension.automation.queryResults) {
      window.czAssistExtension.automation.queryResults = [];
    }
    
    // 提取當前頁面的交易數據
    const extractCurrentPageData = () => {
      const dataTable = document.querySelector(
        bankConfig.selectors.query.dataTable
      );
      
      if (!dataTable) {
        console.warn("找不到交易表格");
        return [];
      }
      
      const tbody = dataTable.querySelector("tbody");
      if (!tbody) {
        console.warn("找不到表格 tbody");
        return [];
      }
      
      const rows = tbody.querySelectorAll("tr");
      const transactions = [];
      
      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 9) return; // 至少需要9個欄位
        
        // 1. 存入金額（第6欄，index 5）
        const depositCell = cells[5];
        const depositText = depositCell
          ? depositCell.textContent.trim().replace(/,/g, "")
          : "0";
        const depositAmount = parseFloat(depositText) || 0;
        
        // 只處理存入金額 > 0 的交易
        if (depositAmount <= 0) return;
        
        // 2. 交易日/交易時間（第2欄，index 1）
        const dateCell = cells[1];
        let transactionDate = "";
        let transactionTime = "";
        let fullDateTime = "";
        if (dateCell) {
          // 新光商銀的日期時間在 div 內，格式：2025/11/25<br>00:57:53
          const dateDiv = dateCell.querySelector("div");
          if (dateDiv) {
            // 使用 innerText 可以正確處理 <br> 標籤，會轉換為換行符
            const dateText = dateDiv.innerText.trim();
            // 格式：2025/11/25\n00:57:53 或 2025/11/25 00:57:53
            const parts = dateText
              .split(/\n|\r/)
              .map((part) => part.trim())
              .filter((part) => part);
            if (parts.length >= 2) {
              transactionDate = parts[0];
              transactionTime = parts[1];
              fullDateTime = `${transactionDate} ${transactionTime}`;
            } else if (parts.length === 1) {
              // 如果只有一個部分，嘗試用空格分割
              const spaceParts = parts[0].split(/\s+/);
              if (spaceParts.length >= 2) {
                transactionDate = spaceParts[0];
                transactionTime = spaceParts[1];
                fullDateTime = `${transactionDate} ${transactionTime}`;
              } else {
                transactionDate = parts[0];
                fullDateTime = transactionDate;
              }
            }
          } else {
            // 如果沒有 div，直接使用 textContent
          const dateText = dateCell.textContent.trim();
            const parts = dateText
              .split(/\n|\r/)
              .map((part) => part.trim())
              .filter((part) => part);
          if (parts.length >= 2) {
              transactionDate = parts[0];
              transactionTime = parts[1];
              fullDateTime = `${transactionDate} ${transactionTime}`;
          } else {
            transactionDate = dateText;
              fullDateTime = transactionDate;
            }
          }
        }
        
        // 3. 代理行（第3欄，index 2）- 提取銀行代碼（3位數）
        const bankCodeCell = cells[2];
        let bankCode = "";
        if (bankCodeCell) {
          const bankCodeText = bankCodeCell.textContent.trim();
          // 格式：004 台灣銀行
          // 提取開頭的3位數字
          const bankCodeMatch = bankCodeText.match(/^(\d{3})/);
          if (bankCodeMatch) {
            bankCode = bankCodeMatch[1]; // 004
          }
        }
        
        // 4. 備註1/備註2/對方帳號（第9欄，index 8）- 提取帳號
        const noteCell = cells[8];
        let accountNumber = "";
        if (noteCell) {
          // 使用 innerHTML 或 innerText 來處理 <br> 標籤
          const noteDiv = noteCell.querySelector("div");
          const noteText = noteDiv
            ? noteDiv.innerText.trim()
            : noteCell.textContent.trim();
          // 格式：0000087004681337 / --\n0000087004681337
          const lines = noteText
            .split(/\n|\r/)
            .map((line) => line.trim())
            .filter((line) => line);
          if (lines.length >= 2) {
            // 取最後一行的帳號（<br> 之後的帳號）
            const accountLine = lines[lines.length - 1].trim();
            if (accountLine && /^\d+$/.test(accountLine)) {
              accountNumber = accountLine; // 0000087004681337
            }
          } else if (lines.length === 1) {
            // 只有一行，嘗試解析（可能是 0000087004681337 / -- 格式）
            const parts = lines[0].split("/");
            if (parts.length > 0) {
              const accountPart = parts[0].trim();
              if (/^\d+$/.test(accountPart)) {
                accountNumber = accountPart; // 0000087004681337
              }
            }
          }
        }
        
        // 組合帳號：銀行代碼（3位）+ 帳號（16位）
        let fullAccount = "";
        if (bankCode && accountNumber) {
          // 確保帳號是16位（如果不足16位，前面補0；如果超過16位，截取前16位）
          const account16 = accountNumber.padStart(16, "0").substring(0, 16);
          fullAccount = bankCode + account16; // 0040000087004681337
        } else if (accountNumber) {
          // 如果沒有銀行代碼，只使用帳號（補0到16位）
          fullAccount = accountNumber.padStart(16, "0").substring(0, 16);
        }
        
        // 5. 帳戶餘額（第7欄，index 6）
        const balanceCell = cells[6];
        let balance = "";
        if (balanceCell) {
          const balanceDiv = balanceCell.querySelector("div");
          const balanceText = balanceDiv
            ? balanceDiv.textContent.trim()
            : balanceCell.textContent.trim();
          balance = balanceText.replace(/,/g, "");
          console.log(`新光商銀餘額提取: ${balanceText} -> ${balance}`);
        }
        
        if (transactionDate && fullAccount) {
          transactions.push({
            date: fullDateTime || transactionDate, // 使用完整的日期時間字串
            time: transactionTime,
            amount: depositAmount,
            account: fullAccount, // 使用組合後的完整帳號（銀行代碼 + 帳號）
            balance: balance, // 帳戶餘額
          });
        }
      });
      
      return transactions;
    };
    
    // 提取當前頁面的數據
    const currentPageTransactions = extractCurrentPageData();
    console.log(`當前頁面提取了 ${currentPageTransactions.length} 筆存入記錄`);
    
    // 將當前頁面的數據加入結果陣列
    window.czAssistExtension.automation.queryResults.push(
      ...currentPageTransactions
    );
    
    // 查找所有頁碼按鈕
    const pagination = document.querySelector(
      bankConfig.selectors.query.pagination
    );
    if (!pagination) {
      console.warn("找不到分頁容器");
      // 沒有分頁，直接完成提取
      await window.czAssistUtils.finishSkbankDataExtraction();
      return;
    }
    
    // 獲取所有可見的頁碼按鈕（排除上一頁、下一頁等）
    const allPageLinks = pagination.querySelectorAll("li:not(.hidden) a");
    const pageNumberLinks = Array.from(allPageLinks).filter((link) => {
      const text = link.textContent.trim();
      const classes = link.className;
      // 排除導航按鈕（上一頁、下一頁等）
      return (
        !classes.includes("prev") &&
        !classes.includes("next") &&
        !classes.includes("prevFirst") &&
        !classes.includes("nextLast") &&
             text && 
        /^\d+$/.test(text)
      ); // 只保留數字頁碼
    });
    
    // 獲取當前已點擊的頁碼
    const currentPageLinks =
      window.czAssistExtension.automation.skbankClickedPages || [];
    
    // 找出尚未點擊的頁碼
    const unclickedPages = pageNumberLinks.filter((link) => {
      const pageNum = link.textContent.trim();
      return !currentPageLinks.includes(pageNum);
    });
    
    if (unclickedPages.length === 0) {
      // 所有頁碼都已點擊，但還需要點一次「下一頁」按鈕（因為分頁按鈕有 bug）
      console.log("所有頁碼都已點擊，檢查是否需要點擊「下一頁」按鈕...");
      
      // 檢查是否已經點擊過「下一頁」按鈕
      if (window.czAssistExtension.automation.skbankClickedNextPage) {
        // 已經點擊過「下一頁」，完成提取
        console.log("已點擊過「下一頁」按鈕，完成提取");
        console.log(
          `總共提取了 ${window.czAssistExtension.automation.queryResults.length} 筆交易記錄`
        );
        await window.czAssistUtils.finishSkbankDataExtraction();
        return;
      }
      
      // 查找「下一頁」按鈕（查找所有可能的下一頁按鈕）
      let nextPageButton = null;
      
      // 嘗試多種選擇器
      const nextPageSelectors = [
        'li[name="post"]:not(.hidden) a',
        'li[name="post"] a.next',
        "li:not(.hidden) a.next",
        "a.next",
        'li[name="lastPage"]:not(.hidden) a',
      ];
      
      for (const selector of nextPageSelectors) {
        const button = pagination.querySelector(selector);
        if (button) {
          const parentLi = button.closest("li");
          if (parentLi && !parentLi.classList.contains("hidden")) {
            nextPageButton = button;
            break;
          }
        }
      }
      
      if (nextPageButton) {
        console.log("找到「下一頁」按鈕，點擊中...");
        window.czAssistUtils.updateAutomationStatus("點擊「下一頁」按鈕...");
        
        // 標記已點擊過「下一頁」
        window.czAssistExtension.automation.skbankClickedNextPage = true;
        
        nextPageButton.click();
        
        // 等待頁面載入後提取最後一頁的數據
        setTimeout(() => {
          const lastPageTransactions = extractCurrentPageData();
          if (lastPageTransactions.length > 0) {
            console.log(
              `最後一頁提取了 ${lastPageTransactions.length} 筆存入記錄`
            );
            window.czAssistExtension.automation.queryResults.push(
              ...lastPageTransactions
            );
          }
          
          // 完成提取
          console.log(
            `總共提取了 ${window.czAssistExtension.automation.queryResults.length} 筆交易記錄`
          );
          window.czAssistUtils.finishSkbankDataExtraction();
        }, 3000);
      } else {
        // 找不到「下一頁」按鈕，直接完成提取
        console.log("找不到「下一頁」按鈕，完成提取");
        console.log(
          `總共提取了 ${window.czAssistExtension.automation.queryResults.length} 筆交易記錄`
        );
        await window.czAssistUtils.finishSkbankDataExtraction();
      }
      return;
    }
    
    // 點擊下一個未點擊的頁碼
    const nextPageLink = unclickedPages[0];
    const pageNum = nextPageLink.textContent.trim();
    
    console.log(`點擊頁碼 ${pageNum}...`);
    window.czAssistUtils.updateAutomationStatus(`提取第 ${pageNum} 頁數據...`);
    
    // 記錄已點擊的頁碼
    if (!window.czAssistExtension.automation.skbankClickedPages) {
      window.czAssistExtension.automation.skbankClickedPages = [];
    }
    window.czAssistExtension.automation.skbankClickedPages.push(pageNum);
    
    // 點擊頁碼
    nextPageLink.click();
    
    // 等待頁面載入後繼續提取
    setTimeout(() => {
      window.czAssistUtils.step6_extractSkbankTransactionData();
    }, 3000);
  },

  // 完成新光商銀數據提取並發送到 API
  finishSkbankDataExtraction: async () => {
    window.czAssistUtils.updateAutomationStatus(
      `已提取 ${window.czAssistExtension.automation.queryResults.length} 筆交易記錄`
    );
    
    // 清除已點擊頁碼記錄
    window.czAssistExtension.automation.skbankClickedPages = null;
    // 清除已點擊「下一頁」標記
    window.czAssistExtension.automation.skbankClickedNextPage = false;
    
    // 顯示結果在側邊欄
    if (window.czAssistExtension.automation.queryResults.length > 0) {
      let resultsHtml = '<div class="cz-results-summary">';
      resultsHtml += `<p>找到 ${window.czAssistExtension.automation.queryResults.length} 筆存入記錄</p>`;
      resultsHtml += '<table class="cz-results-table">';
      resultsHtml +=
        "<thead><tr><th>時間</th><th>金額</th><th>帳號</th></tr></thead>";
      resultsHtml += "<tbody>";

      window.czAssistExtension.automation.queryResults.forEach((tx) => {
        resultsHtml += "<tr>";
        resultsHtml += `<td>${tx.date} ${tx.time || ""}</td>`;
        resultsHtml += `<td style="text-align: right;">${tx.amount.toLocaleString()}</td>`;
        resultsHtml += `<td>${tx.account}</td>`;
        resultsHtml += "</tr>";
      });
      
      resultsHtml += "</tbody></table></div>";
      
      const resultsDiv = document.getElementById("cz-query-results");
      if (resultsDiv) {
        resultsDiv.innerHTML = resultsHtml;
      }
    }
    
    // 發送到 API
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (
      bankConfig &&
      window.czAssistExtension.automation.queryResults.length > 0
    ) {
      try {
        await window.czAssistUtils.sendTransactionsToAPI(
          window.czAssistExtension.automation.queryResults,
          bankConfig.loginData.bankId,
          bankConfig.loginData.bankName
        );
        window.czAssistUtils.updateAutomationStatus("數據已成功發送到 API");
      } catch (error) {
        console.error("發送數據到 API 失敗:", error);
        window.czAssistUtils.updateAutomationStatus("發送數據到 API 失敗");
      }
    }
    
    // 進入重新查詢流程
    setTimeout(() => {
      window.czAssistUtils.step7_waitAndRequery();
    }, 2000);
  },

  // 完成富邦銀行數據提取並發送到 API
  finishFubonDataExtraction: async () => {
    window.czAssistUtils.updateAutomationStatus(
      `已提取 ${window.czAssistExtension.automation.queryResults.length} 筆交易記錄`
    );
    
    // 顯示結果在側邊欄
    if (window.czAssistExtension.automation.queryResults.length > 0) {
      let resultsHtml = '<div class="cz-results-summary">';
      resultsHtml += `<p>找到 ${window.czAssistExtension.automation.queryResults.length} 筆存入記錄</p>`;
      resultsHtml += '<table class="cz-results-table">';
      resultsHtml +=
        "<thead><tr><th>時間</th><th>金額</th><th>帳號</th></tr></thead>";
      resultsHtml += "<tbody>";
      
      window.czAssistExtension.automation.queryResults.forEach((tx) => {
        resultsHtml += "<tr>";
        resultsHtml += `<td>${tx.date}</td>`;
        resultsHtml += `<td style="text-align: right;">${tx.amount}</td>`;
        resultsHtml += `<td>${tx.account}</td>`;
        resultsHtml += "</tr>";
      });
      
      resultsHtml += "</tbody></table></div>";
      
      const resultsDiv = document.getElementById("cz-results");
      if (resultsDiv) {
        resultsDiv.innerHTML = resultsHtml;
      }
    }
    
    // 發送交易記錄到 API
    await window.czAssistUtils.sendTransactionsToAPI(
      window.czAssistExtension.automation.queryResults
    );
    
    // 進入重新查詢循環
    window.czAssistExtension.automation.currentStep = 7;
    window.czAssistUtils.executeAutomationStep();
  },

  // =============== 土地銀行專用步驟 ===============

  // 輔助函數：獲取土地銀行的 main frame document
  getLandbankMainFrame: () => {
    // 嘗試通過 name 屬性查找 frame
    const mainFrame = document.querySelector('frame[name="main"]');
    if (mainFrame && mainFrame.contentDocument) {
      return mainFrame.contentDocument;
    }
    
    // 嘗試通過 window.frames
    try {
      if (
        window.frames &&
        window.frames["main"] &&
        window.frames["main"].document
      ) {
        return window.frames["main"].document;
      }
    } catch (e) {
      console.warn("無法通過 window.frames 訪問 main frame:", e);
    }
    
    console.warn("找不到土地銀行 main frame，使用主文檔");
    return document;
  },

  // 輔助函數：將西元年轉換為民國年格式 (YYYY/MM/DD -> ROC/MM/DD)
  convertWesternDateToROC: (westernDateStr) => {
    try {
      // 解析西元年日期格式 YYYY/MM/DD
      const match = westernDateStr.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
      if (!match) {
        console.warn(`無法解析西元年日期格式: ${westernDateStr}`);
        return westernDateStr;
      }
      
      const [, year, month, day] = match;
      const westernYear = parseInt(year);
      const rocYear = westernYear - 1911; // 西元轉民國
      
      // 格式化為 ROC/MM/DD
      const rocDate = `${rocYear}/${month}/${day}`;
      console.log(`日期轉換: ${westernDateStr} -> ${rocDate}`);
      return rocDate;
    } catch (error) {
      console.error(
        `轉換西元年日期為民國年時發生錯誤: ${westernDateStr}`,
        error
      );
      return westernDateStr;
    }
  },

  // 檢測土地銀行 500 錯誤（土地銀行專用）
  checkLandbankServerError: () => {
    try {
      // 檢查 main frame 中是否有 500 錯誤訊息
      const frameDoc = window.czAssistUtils.getLandbankMainFrame();

      // 檢查頁面內容是否包含 500 錯誤相關文字
      const pageText = frameDoc.body ? frameDoc.body.textContent : "";
      const hasServerError =
        pageText.includes("500") &&
        (pageText.includes("Internal Server Error") ||
          pageText.includes("伺服器錯誤") ||
          pageText.includes("系統忙碌") ||
          pageText.includes("請稍後再試") ||
          pageText.includes("網頁暫時無法回應，請稍後再試"));

      // 檢查是否找不到預期的頁面元素（可能是 500 錯誤導致）
      const hasMenu =
        frameDoc.querySelector("#MENU1") || frameDoc.querySelector("li#MENU1");
      const hasQueryButton = frameDoc.querySelector(
        "#ContentPlaceHolder1_btn_1"
      );
      const hasTable = frameDoc.querySelector("#grvAccount1");

      // 如果頁面沒有任何預期元素，且頁面已載入完成，可能是 500 錯誤
      const pageLoaded = document.readyState === "complete";
      const noExpectedElements = !hasMenu && !hasQueryButton && !hasTable;

      if (hasServerError) {
        console.log("土地銀行：偵測到 500 伺服器錯誤（頁面內容）");
        return true;
      }

      if (
        pageLoaded &&
        noExpectedElements &&
        frameDoc.body &&
        frameDoc.body.textContent.trim().length > 0
      ) {
        console.log(
          "土地銀行：頁面已載入但找不到任何預期元素，可能是 500 錯誤"
        );
        return true;
      }

      return false;
    } catch (error) {
      console.warn("檢測土地銀行 500 錯誤時發生異常:", error);
      return false;
    }
  },

  // 處理土地銀行 500 錯誤：刷新頁面並繼續自動化（土地銀行專用）
  handleLandbankServerError: () => {
    console.log("=== 土地銀行：處理 500 錯誤，準備刷新頁面 ===");
    window.czAssistUtils.updateAutomationStatus(
      "偵測到伺服器錯誤，5秒後刷新頁面..."
    );

    // 保存自動化狀態到 storage，以便刷新後恢復
    const stateToSave = {
      isRunning: true,
      currentStep: 0, // 刷新後從步驟 0 開始
      selectedBank: window.czAssistExtension.selectedBank,
      timestamp: Date.now(),
      reason: "landbank_500_error_refresh",
    };

    chrome.storage.local.set(
      {
        automationState: stateToSave,
      },
      () => {
        console.log("土地銀行：自動化狀態已保存，準備刷新頁面");

        // 等待 5 秒後刷新頁面
        setTimeout(() => {
          console.log("土地銀行：刷新頁面");
          window.location.reload();
        }, 5000);
      }
    );
  },

  // 步驟1: 點擊查詢服務（土地銀行專用）
  step1_clickLandbankQueryService: () => {
    window.czAssistUtils.updateAutomationStatus("點擊查詢服務...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }

    // 檢查是否有 500 錯誤
    if (window.czAssistUtils.checkLandbankServerError()) {
      console.log("土地銀行步驟1：偵測到 500 錯誤");
      window.czAssistUtils.handleLandbankServerError();
      return;
    }
    
    // 獲取 main frame 的 document
    const frameDoc = window.czAssistUtils.getLandbankMainFrame();
    
    // 等待 frame 載入
    const waitForFrame = (attempts = 0) => {
      const maxAttempts = 10;

      // 再次檢查 500 錯誤
      if (window.czAssistUtils.checkLandbankServerError()) {
        console.log("土地銀行步驟1：等待中偵測到 500 錯誤");
        window.czAssistUtils.handleLandbankServerError();
        return;
      }
      
      if (attempts >= maxAttempts) {
        // 超時後檢查是否是 500 錯誤
        if (window.czAssistUtils.checkLandbankServerError()) {
          console.log("土地銀行步驟1：超時且偵測到 500 錯誤，刷新頁面");
          window.czAssistUtils.handleLandbankServerError();
          return;
        }

        console.error("等待 main frame 載入超時");
        window.czAssistUtils.updateAutomationStatus(
          "錯誤：無法訪問 main frame，5秒後刷新頁面..."
        );

        // 無法訪問 main frame 也嘗試刷新頁面
        window.czAssistUtils.handleLandbankServerError();
        return;
      }
      
      const queryServiceLink = frameDoc.querySelector(
        bankConfig.selectors.navigation.queryServiceLink
      );
      
      if (queryServiceLink) {
        console.log("找到查詢服務連結，點擊中...");
        queryServiceLink.click();
        
        // 也嘗試觸發 onclick 事件
        const onclick = queryServiceLink.getAttribute("onclick");
        if (onclick) {
          try {
            // 執行 onclick 中的 JavaScript
            eval(onclick);
          } catch (e) {
            console.warn("執行 onclick 失敗，使用 click:", e);
            queryServiceLink.click();
          }
        }
        
        setTimeout(() => {
          window.czAssistExtension.automation.currentStep = 1;
          window.czAssistUtils.executeAutomationStep();
        }, 3000);
      } else {
        console.log(`等待查詢服務連結載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForFrame(attempts + 1), 500);
      }
    };
    
    waitForFrame();
  },

  // 步驟2: 點擊帳務總覽查詢（土地銀行專用）
  step2_clickLandbankAccountOverview: () => {
    window.czAssistUtils.updateAutomationStatus("點擊帳務總覽查詢...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }

    // 檢查是否有 500 錯誤
    if (window.czAssistUtils.checkLandbankServerError()) {
      console.log("土地銀行步驟2：偵測到 500 錯誤");
      window.czAssistUtils.handleLandbankServerError();
      return;
    }
    
    // 獲取 main frame 的 document
    const frameDoc = window.czAssistUtils.getLandbankMainFrame();
    
    // 等待連結載入
    const waitForLink = (attempts = 0) => {
      const maxAttempts = 10;

      // 檢查 500 錯誤
      if (window.czAssistUtils.checkLandbankServerError()) {
        console.log("土地銀行步驟2：等待中偵測到 500 錯誤");
        window.czAssistUtils.handleLandbankServerError();
        return;
      }
      
      if (attempts >= maxAttempts) {
        // 超時後檢查是否是 500 錯誤
        if (window.czAssistUtils.checkLandbankServerError()) {
          console.log("土地銀行步驟2：超時且偵測到 500 錯誤，刷新頁面");
          window.czAssistUtils.handleLandbankServerError();
          return;
        }

        console.error("等待帳務總覽查詢連結載入超時");
        window.czAssistUtils.updateAutomationStatus(
          "找不到帳務總覽查詢連結，5秒後刷新頁面..."
        );
        window.czAssistUtils.handleLandbankServerError();
        return;
      }
      
      const accountOverviewLink = frameDoc.querySelector(
        bankConfig.selectors.navigation.accountOverviewLink
      );
      
      if (accountOverviewLink) {
        console.log("找到帳務總覽查詢連結，點擊中...");
        accountOverviewLink.click();
        
        // 也嘗試觸發 onclick 事件
        const onclick = accountOverviewLink.getAttribute("onclick");
        if (onclick) {
          try {
            eval(onclick);
          } catch (e) {
            console.warn("執行 onclick 失敗，使用 click:", e);
            accountOverviewLink.click();
          }
        }
        
        setTimeout(() => {
          window.czAssistExtension.automation.currentStep = 2;
          window.czAssistUtils.executeAutomationStep();
        }, 3000);
      } else {
        console.log(
          `等待帳務總覽查詢連結載入... (${attempts + 1}/${maxAttempts})`
        );
        setTimeout(() => waitForLink(attempts + 1), 500);
      }
    };
    
    waitForLink();
  },

  // 步驟3: 點擊存款交易明細查詢（土地銀行專用）
  step3_clickLandbankDepositTransaction: () => {
    window.czAssistUtils.updateAutomationStatus("點擊存款交易明細查詢...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 獲取 main frame 的 document
    const frameDoc = window.czAssistUtils.getLandbankMainFrame();
    
    // 記錄當前步驟，用於檢查是否被其他流程改變
    const expectedStep = 2; // 步驟3對應 currentStep = 2
    
    // 等待按鈕載入（土地銀行系統查詢較慢，增加等待時間）
    const waitForButton = (attempts = 0) => {
      const maxAttempts = 60; // 從10增加到30，土地銀行系統載入較慢
      const waitInterval = 1000; // 從500ms增加到1000ms，每次等待1秒
      
      // 檢查自動化是否還在運行，以及步驟是否已改變
      if (!window.czAssistExtension.automation.isRunning) {
        console.log("自動化已停止，停止等待按鈕");
        return;
      }
      
      // 檢查步驟是否已改變（可能被重新查詢邏輯改變）
      if (window.czAssistExtension.automation.currentStep !== expectedStep) {
        console.log(
          `步驟已改變（從 ${expectedStep} 變為 ${window.czAssistExtension.automation.currentStep}），停止等待按鈕`
        );
        return;
      }
      
      if (attempts >= maxAttempts) {
        console.error("等待存款交易明細查詢按鈕載入超時，從步驟 0 重新開始");
        window.czAssistUtils.updateAutomationStatus(
          "找不到存款交易明細查詢按鈕，5秒後重新開始..."
        );
        
        // 標記正在重新查詢
        window.czAssistExtension.automation.isRequerying = true;
        
        // 等待 5 秒後從步驟 0 重新開始
        setTimeout(() => {
          if (!window.czAssistExtension.automation.isRunning) {
            window.czAssistExtension.automation.isRequerying = false;
            return;
          }
          console.log("土地銀行：重新開始自動查詢（從帳務總覽查詢）");
          window.czAssistUtils.updateAutomationStatus("重新開始自動查詢...");
          window.czAssistExtension.automation.isRequerying = false;
          window.czAssistExtension.automation.currentStep = 0;
          window.czAssistUtils.executeAutomationStep();
        }, 5000);
        return;
      }
      
      const depositButton = frameDoc.querySelector(
        bankConfig.selectors.navigation.depositTransactionButton
      );
      
      if (depositButton) {
        console.log("找到存款交易明細查詢按鈕，點擊中...");
        depositButton.click();
        
        // 也嘗試觸發 onclick 事件
        const onclick = depositButton.getAttribute("onclick");
        if (onclick) {
          try {
            eval(onclick);
          } catch (e) {
            console.warn("執行 onclick 失敗，使用 click:", e);
            depositButton.click();
          }
        }
        
        // 再次檢查步驟是否已改變
        if (window.czAssistExtension.automation.currentStep !== expectedStep) {
          console.log("步驟已改變，取消進入下一步驟");
          return;
        }
        
        setTimeout(() => {
          // 再次檢查步驟和自動化狀態
          if (!window.czAssistExtension.automation.isRunning) {
            console.log("自動化已停止，取消進入下一步驟");
            return;
          }
          if (
            window.czAssistExtension.automation.currentStep !== expectedStep
          ) {
            console.log("步驟已改變，取消進入下一步驟");
            return;
          }
          window.czAssistExtension.automation.currentStep = 3;
          window.czAssistUtils.executeAutomationStep();
        }, 3000);
      } else {
        console.log(
          `等待存款交易明細查詢按鈕載入... (${attempts + 1}/${maxAttempts})`
        );
        setTimeout(() => waitForButton(attempts + 1), waitInterval);
      }
    };
    
    waitForButton();
  },

  // 步驟4: 設定日期範圍（土地銀行專用）
  step4_setLandbankDateRange: () => {
    window.czAssistUtils.updateAutomationStatus("設定日期範圍...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 獲取 main frame 的 document
    const frameDoc = window.czAssistUtils.getLandbankMainFrame();
    
    // 記錄當前步驟，用於檢查是否被其他流程改變
    const expectedStep = 3; // 步驟4對應 currentStep = 3
    
    // 等待表單載入
    const waitForForm = (attempts = 0) => {
      const maxAttempts = 10; // 從 10 增加到 10（總共 5 秒）
      
      // 檢查自動化是否還在運行，以及步驟是否已改變
      if (!window.czAssistExtension.automation.isRunning) {
        console.log("自動化已停止，停止等待表單");
        return;
      }
      
      // 檢查步驟是否已改變（可能被重新查詢邏輯改變）
      if (window.czAssistExtension.automation.currentStep !== expectedStep) {
        console.log(
          `步驟已改變（從 ${expectedStep} 變為 ${window.czAssistExtension.automation.currentStep}），停止等待表單`
        );
        return;
      }
      
      if (attempts >= maxAttempts) {
        console.error("等待表單載入超時，從步驟 0 重新開始");
        window.czAssistUtils.updateAutomationStatus(
          "找不到日期輸入框，5秒後重新開始..."
        );
        
        // 標記正在重新查詢
        window.czAssistExtension.automation.isRequerying = true;
        
        // 等待 5 秒後從步驟 0 重新開始
        setTimeout(() => {
          if (!window.czAssistExtension.automation.isRunning) {
            window.czAssistExtension.automation.isRequerying = false;
            return;
          }
          console.log("土地銀行：重新開始自動查詢（從帳務總覽查詢）");
          window.czAssistUtils.updateAutomationStatus("重新開始自動查詢...");
          window.czAssistExtension.automation.isRequerying = false;
          window.czAssistExtension.automation.currentStep = 0;
          window.czAssistUtils.executeAutomationStep();
        }, 5000);
        return;
      }
      
      // 先點擊「自訂」radio
      const customRadio = frameDoc.querySelector(
        bankConfig.selectors.query.customRadio
      );
      const startDateInput = frameDoc.querySelector(
        bankConfig.selectors.query.startDate
      );
      const endDateInput = frameDoc.querySelector(
        bankConfig.selectors.query.endDate
      );
      
      if (customRadio && startDateInput && endDateInput) {
        console.log("找到表單元素，開始設定...");
        
        // 點擊「自訂」radio
        customRadio.click();
        customRadio.dispatchEvent(new Event("change", { bubbles: true }));
        console.log("已點擊自訂 radio");
        
        // 等待一下讓表單啟用，並檢查輸入框是否已啟用
        const waitForInputsEnabled = (retryCount = 0) => {
          const maxRetries = 10;
          
          // 檢查自動化是否還在運行，以及步驟是否已改變
          if (!window.czAssistExtension.automation.isRunning) {
            console.log("自動化已停止，停止等待輸入框啟用");
            return;
          }
          
          // 檢查步驟是否已改變
          if (
            window.czAssistExtension.automation.currentStep !== expectedStep
          ) {
            console.log(
              `步驟已改變（從 ${expectedStep} 變為 ${window.czAssistExtension.automation.currentStep}），停止等待輸入框啟用`
            );
            return;
          }
          
          // 檢查輸入框是否已啟用（移除 aspNetDisabled class 或 disabled 屬性）
          const isStartDateEnabled =
            !startDateInput.disabled &&
            !startDateInput.classList.contains("aspNetDisabled") &&
            !startDateInput.hasAttribute("disabled");
          const isEndDateEnabled =
            !endDateInput.disabled &&
            !endDateInput.classList.contains("aspNetDisabled") &&
            !endDateInput.hasAttribute("disabled");

          if (
            (isStartDateEnabled && isEndDateEnabled) ||
            retryCount >= maxRetries
          ) {
            // 如果輸入框還是 disabled，嘗試手動啟用
            if (!isStartDateEnabled || !isEndDateEnabled) {
              console.log("輸入框仍為 disabled，嘗試手動啟用");
              startDateInput.removeAttribute("disabled");
              endDateInput.removeAttribute("disabled");
              startDateInput.classList.remove("aspNetDisabled");
              endDateInput.classList.remove("aspNetDisabled");
            }
            
            // 再次檢查步驟是否已改變
            if (
              window.czAssistExtension.automation.currentStep !== expectedStep
            ) {
              console.log("步驟已改變，取消設定日期");
              return;
            }
            
            // 計算日期範圍（西元年）
            const dateRange = window.czAssistUtils.calculateQueryDateRange();
            
            // 轉換為民國年格式
            const startDateROC = window.czAssistUtils.convertWesternDateToROC(
              dateRange.startDate
            );
            const endDateROC = window.czAssistUtils.convertWesternDateToROC(
              dateRange.endDate
            );

            console.log(
              `土地銀行日期範圍（民國年）: ${startDateROC} - ${endDateROC}`
            );
            
            // 設定起日
            startDateInput.value = startDateROC;
            startDateInput.dispatchEvent(new Event("input", { bubbles: true }));
            startDateInput.dispatchEvent(
              new Event("change", { bubbles: true })
            );
            console.log(`起日已設定: ${startDateROC}`);
            
            // 設定迄日
            endDateInput.value = endDateROC;
            endDateInput.dispatchEvent(new Event("input", { bubbles: true }));
            endDateInput.dispatchEvent(new Event("change", { bubbles: true }));
            console.log(`迄日已設定: ${endDateROC}`);
            
            setTimeout(() => {
              // 再次檢查步驟和自動化狀態
              if (!window.czAssistExtension.automation.isRunning) {
                console.log("自動化已停止，取消進入下一步驟");
                return;
              }
              if (
                window.czAssistExtension.automation.currentStep !== expectedStep
              ) {
                console.log("步驟已改變，取消進入下一步驟");
                return;
              }
              window.czAssistExtension.automation.currentStep = 4;
              window.czAssistUtils.executeAutomationStep();
            }, 2000);
          } else {
            console.log(`等待輸入框啟用... (${retryCount + 1}/${maxRetries})`);
            setTimeout(() => waitForInputsEnabled(retryCount + 1), 500);
          }
        };
        
        // 開始等待輸入框啟用
        setTimeout(() => waitForInputsEnabled(), 500);
      } else {
        console.log(`等待表單載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForForm(attempts + 1), 500);
      }
    };
    
    waitForForm();
  },

  // 步驟5: 執行查詢（土地銀行專用）
  step5_executeLandbankQuery: () => {
    window.czAssistUtils.updateAutomationStatus("執行查詢...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 獲取 main frame 的 document
    const frameDoc = window.czAssistUtils.getLandbankMainFrame();
    
    // 等待查詢按鈕載入
    const waitForButton = (attempts = 0) => {
      const maxAttempts = 30; // 從 10 增加到 30（總共 15 秒）
      
      // 檢查是否正在重新查詢，如果是則停止當前等待
      if (window.czAssistExtension.automation.isRequerying) {
        console.log("土地銀行：偵測到正在重新查詢，停止等待查詢按鈕");
        return;
      }
      
      // 檢查自動化是否還在運行
      if (!window.czAssistExtension.automation.isRunning) {
        console.log("土地銀行：自動化已停止，停止等待查詢按鈕");
        return;
      }
      
      if (attempts >= maxAttempts) {
        console.error("等待查詢按鈕載入超時，從步驟 0 重新開始");
        window.czAssistUtils.updateAutomationStatus(
          "找不到查詢按鈕，5秒後重新開始..."
        );
        
        // 標記正在重新查詢
        window.czAssistExtension.automation.isRequerying = true;
        
        // 等待 5 秒後從步驟 0 重新開始
        setTimeout(() => {
          if (!window.czAssistExtension.automation.isRunning) {
            window.czAssistExtension.automation.isRequerying = false;
            return;
          }
          console.log("土地銀行：重新開始自動查詢（從帳務總覽查詢）");
          window.czAssistUtils.updateAutomationStatus("重新開始自動查詢...");
          window.czAssistExtension.automation.isRequerying = false;
          window.czAssistExtension.automation.currentStep = 0;
          window.czAssistUtils.executeAutomationStep();
        }, 5000);
        return;
      }
      
      const queryButton = frameDoc.querySelector(
        bankConfig.selectors.query.queryButton
      );
      
      if (queryButton) {
        console.log("找到查詢按鈕，點擊中...");
        queryButton.click();
        queryButton.dispatchEvent(new Event("click", { bubbles: true }));
        
        // 土地銀行沒有分頁，資料會一次全部載入，需要等待較長時間
        setTimeout(() => {
          window.czAssistExtension.automation.currentStep = 6;
          window.czAssistUtils.executeAutomationStep();
        }, 8000); // 等待8秒讓資料完全載入
      } else {
        console.log(`等待查詢按鈕載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForButton(attempts + 1), 500);
      }
    };
    
    waitForButton();
  },

  // 步驟6: 提取土地銀行交易數據（土地銀行專用）
  step6_extractLandbankTransactionData: async () => {
    window.czAssistUtils.updateAutomationStatus("提取交易數據...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 獲取 main frame 的 document
    const frameDoc = window.czAssistUtils.getLandbankMainFrame();
    
    // 等待表格載入
    const waitForTable = async (attempts = 0) => {
      const maxAttempts = 20; // 土地銀行資料載入較久，增加嘗試次數
      
      // 檢查是否正在重新查詢
      if (window.czAssistExtension.automation.isRequerying) {
        console.log("土地銀行：偵測到正在重新查詢，停止等待交易表格");
        return;
      }
      
      // 檢查自動化是否還在運行
      if (!window.czAssistExtension.automation.isRunning) {
        console.log("土地銀行：自動化已停止，停止等待交易表格");
        return;
      }
      
      if (attempts >= maxAttempts) {
        console.error("等待交易表格載入超時，從步驟 0 重新開始");
        window.czAssistUtils.updateAutomationStatus(
          "找不到交易表格，5秒後重新開始..."
        );
        
        // 標記正在重新查詢
        window.czAssistExtension.automation.isRequerying = true;
        
        // 等待 5 秒後從步驟 0 重新開始
        setTimeout(() => {
          if (!window.czAssistExtension.automation.isRunning) {
            window.czAssistExtension.automation.isRequerying = false;
            return;
          }
          console.log("土地銀行：重新開始自動查詢（從查詢服務）");
          window.czAssistUtils.updateAutomationStatus("重新開始自動查詢...");
          window.czAssistExtension.automation.isRequerying = false;
          window.czAssistExtension.automation.currentStep = 0;
          window.czAssistUtils.executeAutomationStep();
        }, 5000);
        return;
      }
      
      const dataGrid = frameDoc.querySelector(
        bankConfig.selectors.query.dataGrid
      );
      const tbody = dataGrid ? dataGrid.querySelector("tbody") : null;
      
      if (dataGrid && tbody) {
        const rows = tbody.querySelectorAll(
          "tr.editTableRow, tr.editTableOddRow"
        );
        console.log(`找到 ${rows.length} 筆交易記錄`);
        
        if (rows.length === 0 && attempts < maxAttempts - 5) {
          // 如果還沒有資料，繼續等待
          console.log(`等待交易資料載入... (${attempts + 1}/${maxAttempts})`);
          setTimeout(() => waitForTable(attempts + 1), 1000);
          return;
        }
        
        const transactions = [];
        
        rows.forEach((row, index) => {
          try {
            const cells = row.querySelectorAll("td");
            if (cells.length < 9) {
              console.warn(`行 ${index} 欄位不足，跳過`);
              return;
            }
            
            // 提取數據
            // 第1個 td (索引0): 交易日期+時間 "114/11/22 00:10:21"
            const dateTimeText = cells[0].textContent.trim();
            
            // 第6個 td (索引5): 存入金額 "1,000.00"
            const amountText = cells[5].textContent.trim();
            
            // 第7個 td (索引6): 餘額 "362,361.00"
            const balanceText = cells[6].textContent.trim();
            
            // 第8個 td (索引7): 備註 "007-0000070668104794"
            const remarkText = cells[7].textContent.trim();
            
            // 只處理有存入金額的記錄
            if (
              !amountText ||
              amountText === "" ||
              amountText === "&nbsp;" ||
              amountText.trim() === ""
            ) {
              return;
            }
            
            // 轉換民國年日期為西元年
            // 格式：114/11/22 00:10:21
            const dateTimeMatch = dateTimeText.match(
              /^(\d{3})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/
            );
            if (!dateTimeMatch) {
              console.warn(`無法解析日期時間格式: ${dateTimeText}`);
              return;
            }
            
            const [, rocYear, month, day, hour, minute, second] = dateTimeMatch;
            const westernYear = parseInt(rocYear) + 1911; // 民國轉西元
            
            // 組合完整的日期時間：2025/11/22 00:10:21
            const datetime = `${westernYear}/${month}/${day} ${hour}:${minute}:${second}`;
            
            // 移除金額中的逗號並轉換為數字
            const cleanAmountText = amountText.replace(/,/g, "").trim();
            // 轉換為數字，如果小數部分是 .00 則轉為整數
            const amount = parseFloat(cleanAmountText) || 0;
            
            // 提取備註中的帳號
            // 格式1：007-0000070668104794 (銀行代碼-帳號)
            // 格式2：NET+0000143215026995 (同銀行轉帳，銀行代碼固定為 005)
            // 格式3：119-1190117221884320 (銀行代碼-銀行代碼+帳號，需要去掉重複的銀行代碼)
            // 需要提取前3位銀行代碼 + 後16位帳號
            let account = "";
            if (remarkText && remarkText !== "" && remarkText !== "&nbsp;") {
              // 特殊格式1：NET+... 代表同銀行（土地銀行代碼 005）
              if (remarkText.startsWith("NET+")) {
                const accountNumber = remarkText.substring(4).trim(); // 移除 "NET+"
                // 確保帳號是16位（不足補0，超過截取前16位）
                const paddedAccountNumber = accountNumber.padStart(16, "0").substring(0, 16);
                account = "005" + paddedAccountNumber; // 土地銀行代碼 + 16位帳號
                console.log(
                  `土地銀行帳號（NET+同行轉帳）: ${remarkText} -> 銀行代碼:005, 帳號:${paddedAccountNumber} -> ${account}`
                );
              }
              // 特殊格式2：XXX-XXX... 檢查是否是銀行代碼重複的格式（如 119-1190117221884320）
              else if (remarkText.match(/^(\d{3})-\1/)) {
                // 格式：119-1190117221884320，第一組3位和第二組前3位相同
                const match = remarkText.match(/^(\d{3})-(\d{3})(\d+)$/);
                if (match) {
                  const bankCode = match[1]; // 119
                  const accountNumber = match[3]; // 0117221884320（去掉重複的銀行代碼）
                  // 確保帳號是16位（不足補0，超過截取前16位）
                  const paddedAccountNumber = accountNumber.padStart(16, "0").substring(0, 16);
                  account = bankCode + paddedAccountNumber;
                  console.log(
                    `土地銀行帳號（重複銀行代碼格式）: ${remarkText} -> 銀行代碼:${bankCode}, 帳號:${accountNumber} -> 補位後:${paddedAccountNumber} -> ${account}`
                  );
                }
              }
              // 一般格式：007-0000070668104794
              else {
                // 移除所有分隔線
                const accountWithoutDash = remarkText.replace(/-/g, "").trim();
                
                // 提取前3位銀行代碼 + 後16位帳號
                if (accountWithoutDash.length >= 19) {
                  // 前3位是銀行代碼，後16位是帳號，總共19位
                  const bankCode = accountWithoutDash.substring(0, 3);
                  const accountNumber = accountWithoutDash.substring(3, 19); // 取第4到第19位（共16位）
                  account = bankCode + accountNumber;
                } else if (accountWithoutDash.length > 0) {
                  // 如果長度不足19位，直接使用全部（可能格式不同）
                  account = accountWithoutDash;
                  console.warn(
                    `土地銀行帳號長度異常 (${accountWithoutDash.length} 位): ${accountWithoutDash}`
                  );
                }
              }
            }
            
            // 移除餘額中的逗號並轉換為數字字串
            const balance = balanceText.replace(/,/g, "").trim();
            console.log(`土地銀行餘額提取: ${balanceText} -> ${balance}`);
            
            transactions.push({
              date: datetime, // 交易時間（西元年格式）
              amount: amount, // 存入金額
              account: account, // 帳號（前3位銀行代碼+後16位帳號）
              balance: balance, // 餘額
            });

            console.log(
              `提取交易: ${datetime}, 存入: ${amount}, 帳號: ${account}, 餘額: ${balance}`
            );
          } catch (e) {
            console.error(`解析行 ${index} 時發生錯誤:`, e);
          }
        });
        
        console.log(`土地銀行：本頁提取了 ${transactions.length} 筆存入記錄`);
        
        // 將交易記錄添加到結果中
        window.czAssistExtension.automation.queryResults.push(...transactions);
        
        // 顯示結果在側邊欄
        const totalResults =
          window.czAssistExtension.automation.queryResults.length;
        if (totalResults > 0) {
          let resultsHtml = '<div class="cz-results-summary">';
          resultsHtml += `<p>找到 ${totalResults} 筆存入記錄</p>`;
          resultsHtml += '<table class="cz-results-table">';
          resultsHtml +=
            "<thead><tr><th>時間</th><th>金額</th><th>帳號</th></tr></thead>";
          resultsHtml += "<tbody>";
          
          window.czAssistExtension.automation.queryResults.forEach((tx) => {
            resultsHtml += "<tr>";
            resultsHtml += `<td>${tx.date}</td>`;
            resultsHtml += `<td style="text-align: right;">${tx.amount}</td>`;
            resultsHtml += `<td>${tx.account}</td>`;
            resultsHtml += "</tr>";
          });
          
          resultsHtml += "</tbody></table></div>";
          
          const resultsDiv = document.getElementById("cz-results");
          if (resultsDiv) {
            resultsDiv.innerHTML = resultsHtml;
          }
        }
        
        // 發送交易記錄到 API
        window.czAssistUtils.updateAutomationStatus(
          `已提取 ${totalResults} 筆交易記錄，準備發送到 API...`
        );
        
        await window.czAssistUtils.sendTransactionsToAPI(
          window.czAssistExtension.automation.queryResults
        );
        
        // 土地銀行沒有分頁，提取完成後直接進入重新查詢等待
        setTimeout(() => {
          window.czAssistExtension.automation.currentStep = 7;
          window.czAssistUtils.executeAutomationStep();
        }, 1000);
      } else {
        console.log(`等待交易表格載入... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => waitForTable(attempts + 1), 1000);
      }
    };
    
    waitForTable();
  },

  // 步驟6: 提取台灣企銀交易數據（台灣企銀專用）
  step6_extractTbbTransactionData: async () => {
    window.czAssistUtils.updateAutomationStatus("提取交易數據...");
    
    // 找到表格
    const table = document.querySelector("#DataTables_Table_0");
    if (!table) {
      console.error("找不到交易記錄表格");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到交易記錄表格");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 找到所有交易行（tr.odd 和 tr.even）
    const rows = table.querySelectorAll("tbody tr.odd, tbody tr.even");
    console.log(`找到 ${rows.length} 筆交易記錄`);
    
    const transactions = [];
    
    rows.forEach((row, index) => {
      try {
        const cells = row.querySelectorAll("td");
        if (cells.length < 9) {
          console.warn(`行 ${index} 欄位不足，跳過`);
          return;
        }
        
        // 提取數據
        const changeDate = cells[0].textContent.trim(); // 異動日：114/10/27
        const summary = cells[1].textContent.trim(); // 摘要
        const expenditure = cells[2].textContent.trim(); // 支出金額
        const income = cells[3].textContent.trim(); // 收入金額
        const balance = cells[4].textContent.trim(); // 餘額
        // const checkNumber = cells[5].textContent.trim(); // 票據號碼（未使用）
        const remark = cells[6].textContent.trim(); // 交易備註(給自己) - 含帳號（16位）
        const bankCode = cells[7].textContent.trim(); // 收付行 - 銀行代碼（3位）
        const time = cells[8].textContent.trim(); // 交易時間：11:31:24
        
        // 只處理有「收入金額」的記錄
        if (income && income !== "" && income !== "--") {
          // 轉換民國年日期為西元年
          // 114/10/27 -> 2025/10/27
          const dateMatch = changeDate.match(/^(\d{3})\/(\d{2})\/(\d{2})$/);
          if (!dateMatch) {
            console.warn(`無法解析日期格式: ${changeDate}`);
            return;
          }
          
          const rocYear = parseInt(dateMatch[1]);
          const month = dateMatch[2];
          const day = dateMatch[3];
          const westernYear = rocYear + 1911; // 民國轉西元
          
          // 組合完整的日期時間：2025/10/27 11:31:24
          const datetime = `${westernYear}/${month}/${day} ${time}`;
          
          // 移除金額中的逗號
          const amount = income.replace(/,/g, "");

          // 組合帳號：收付行（3位銀行代碼）+ 交易備註（16位帳號）
          // 例如：822 + 0001111970262880 = 8220001111970262880
          // 特例：當收付行是 824 或 806 時，交易備註只有4碼，直接使用4碼作為帳號
          let fullAccount = "";
          const bankCodeClean = bankCode.replace(/\D/g, "");
          
          if (bankCode && remark) {
            // 檢查是否為特殊銀行代碼（824 或 806），這種情況交易備註只有4碼
            // 格式：銀行三碼 + 0 + 四碼帳號 = 8碼（例如：80609225、82404210）
            if (bankCodeClean === "824" || bankCodeClean === "806") {
              // 4碼帳號前補一個0，組成 銀行三碼 + 05碼帳號
              const account4 = remark.replace(/\D/g, "");
              const account5 = "0" + account4; // 補一個0變成5碼
              fullAccount = bankCodeClean + account5;
              console.log(
                `台灣企銀特殊帳號（收付行=${bankCode}）: ${account4} -> ${account5}, 完整=${fullAccount}`
              );
            } else {
              // 一般情況：確保銀行代碼是3位數（不足補0）
              const bankCode3 = bankCodeClean
                .padStart(3, "0")
                .substring(0, 3);
              // 確保帳號是16位數（不足補0，超過截取前16位）
              const account16 = remark
                .replace(/\D/g, "")
                .padStart(16, "0")
                .substring(0, 16);
              fullAccount = bankCode3 + account16;
              console.log(
                `台灣企銀組合帳號: 收付行=${bankCode}->${bankCode3}, 帳號=${remark}->${account16}, 完整=${fullAccount}`
              );
            }
          } else if (remark) {
            // 如果沒有銀行代碼，只使用帳號（補足16位）
            fullAccount = remark
              .replace(/\D/g, "")
              .padStart(16, "0")
              .substring(0, 16);
            console.log(
              `台灣企銀帳號（無銀行代碼）: ${remark} -> ${fullAccount}`
            );
          }
          
          transactions.push({
            date: datetime, // 交易時間（西元年格式）
            amount: amount, // 收入金額
            account: fullAccount, // 完整帳號（3位銀行代碼 + 16位帳號）
            summary: summary, // 摘要
            balance: balance.replace(/,/g, ""), // 餘額
            expenditure:
              expenditure === "" || expenditure === "--"
                ? "0"
                : expenditure.replace(/,/g, ""), // 支出金額
          });

          console.log(
            `提取交易: ${datetime}, 收入: ${amount}, 帳號: ${fullAccount}`
          );
        }
      } catch (e) {
        console.error(`解析行 ${index} 時發生錯誤:`, e);
      }
    });
    
    console.log(`本頁提取了 ${transactions.length} 筆收入記錄`);
    
    // 將交易記錄添加到結果中
    window.czAssistExtension.automation.queryResults.push(...transactions);
    
    // 完成當前頁面提取後，檢查是否有下一頁
    const nextButton = document.querySelector("#DataTables_Table_0_next");
    
    // 檢查是否有下一頁（按鈕存在且未禁用）
    let hasNextPage = false;
    let nextLink = null;
    
    if (nextButton) {
      const isDisabled = nextButton.classList.contains("disabled");
      nextLink = nextButton.querySelector("a");
      const ariaDisabled = nextLink?.getAttribute("aria-disabled") === "true";
      
      hasNextPage = !isDisabled && !ariaDisabled && !!nextLink;
      
      console.log("下一頁按鈕狀態:", {
        exists: !!nextButton,
        isDisabled: isDisabled,
        hasLink: !!nextLink,
        ariaDisabled: ariaDisabled,
        hasNextPage: hasNextPage,
      });
    } else {
      console.log("找不到下一頁按鈕");
    }
    
    if (hasNextPage && nextLink) {
      // 還有下一頁，點擊下一頁按鈕
      console.log("還有下一頁，繼續提取...");
      nextLink.click();
      
      // 等待下一頁載入
      setTimeout(() => {
        window.czAssistUtils.step6_extractTbbTransactionData();
      }, 2000);
    } else {
      // 沒有下一頁了，完成提取
      console.log(
        `總共提取了 ${window.czAssistExtension.automation.queryResults.length} 筆交易記錄`
      );
      await window.czAssistUtils.finishTbbDataExtraction();
    }
  },

  // 完成台灣企銀數據提取並發送到 API
  finishTbbDataExtraction: async () => {
    window.czAssistUtils.updateAutomationStatus(
      `已提取 ${window.czAssistExtension.automation.queryResults.length} 筆交易記錄`
    );
    
    // 顯示結果在側邊欄
    if (window.czAssistExtension.automation.queryResults.length > 0) {
      let resultsHtml = '<div class="cz-results-summary">';
      resultsHtml += `<p>找到 ${window.czAssistExtension.automation.queryResults.length} 筆收入記錄</p>`;
      resultsHtml += '<table class="cz-results-table">';
      resultsHtml +=
        "<thead><tr><th>時間</th><th>金額</th><th>備註</th></tr></thead>";
      resultsHtml += "<tbody>";
      
      window.czAssistExtension.automation.queryResults.forEach((tx) => {
        resultsHtml += "<tr>";
        resultsHtml += `<td>${tx.date}</td>`;
        resultsHtml += `<td style="text-align: right;">${tx.amount}</td>`;
        resultsHtml += `<td>${tx.account || tx.summary}</td>`;
        resultsHtml += "</tr>";
      });
      
      resultsHtml += "</tbody></table></div>";
      
      // 更新側邊欄結果區域
      const resultsList = document.getElementById("cz-results-list");
      if (resultsList) {
        resultsList.innerHTML = resultsHtml;
      }
    }
    
    // 發送交易記錄到 API
    if (window.czAssistExtension.automation.queryResults.length > 0) {
      console.log("開始發送交易記錄到 API...");
      await window.czAssistUtils.sendTransactionsToAPI(
        window.czAssistExtension.automation.queryResults
      );
    }
    
    // 點擊「回上頁」按鈕並重新查詢流程
    console.log("數據提取完成，點擊回上頁按鈕...");
    const backButton = document.querySelector("#CMBACK");
    if (backButton) {
      backButton.click();
      
      // 等待頁面回到查詢表單
      // 使用輪詢檢查機制，確保帳號下拉選單已載入
      const waitForAccountSelect = (attempts = 0) => {
        const maxAttempts = 15; // 最多嘗試 15 次（3 秒）
        
        const accountSelect = document.querySelector("#ACN");

        if (
          accountSelect &&
          accountSelect.options &&
          accountSelect.options.length > 0
        ) {
          // 帳號下拉選單已載入
          console.log("帳號下拉選單已載入，開始選擇帳號");
          
          const targetAccountNumber =
            window.czAssistUtils.getTbbTargetAccount();
          
          // 檢查目標帳號是否存在於選項中
          const option = Array.from(accountSelect.options).find(
            (opt) => opt.value === targetAccountNumber
          );
          
          if (option) {
            console.log(`找到目標帳號 ${targetAccountNumber}，選擇中...`);
            accountSelect.value = targetAccountNumber;
            accountSelect.dispatchEvent(new Event("change", { bubbles: true }));
            
            // 驗證是否選擇成功
            if (accountSelect.value === targetAccountNumber) {
              console.log(`帳號已成功選擇: ${accountSelect.value}`);
            } else {
              console.warn(`帳號選擇可能失敗，當前值: ${accountSelect.value}`);
            }
            
            // 等待帳號選擇生效後，進入步驟 2（設定日期範圍）
            setTimeout(() => {
              console.log("帳號已選擇，進入日期範圍設定");
              window.czAssistExtension.automation.currentStep = 2;
              window.czAssistExtension.automation.queryResults = []; // 清空結果
              window.czAssistUtils.executeAutomationStep();
            }, 1000);
          } else {
            console.error(
              `找不到帳號選項 ${targetAccountNumber}，直接進入步驟 2`
            );
            const allOptions = Array.from(accountSelect.options).map(
              (opt) => opt.value
            );
            console.error("可用的帳號選項:", allOptions);
            window.czAssistExtension.automation.currentStep = 2;
            window.czAssistExtension.automation.queryResults = [];
            window.czAssistUtils.executeAutomationStep();
          }
        } else if (attempts < maxAttempts) {
          // 帳號下拉選單還沒載入，繼續等待
          console.log(
            `等待帳號下拉選單載入... (嘗試 ${attempts + 1}/${maxAttempts})`
          );
          setTimeout(() => waitForAccountSelect(attempts + 1), 200);
        } else {
          console.error("帳號下拉選單載入超時，直接進入步驟 2");
          window.czAssistExtension.automation.currentStep = 2;
          window.czAssistExtension.automation.queryResults = [];
          window.czAssistUtils.executeAutomationStep();
        }
      };
      
      // 開始等待帳號下拉選單
      setTimeout(() => waitForAccountSelect(), 500);
    } else {
      console.error("找不到回上頁按鈕，進入重新查詢等待");
      // 如果找不到回上頁按鈕，進入重新查詢等待
      window.czAssistExtension.automation.currentStep = 7;
      window.czAssistUtils.executeAutomationStep();
    }
  },

  // =============== 彰化銀行專用步驟 ===============

  // 步驟1: 點擊帳務總覽（彰化銀行專用）
  step1_clickChbAccountOverview: () => {
    window.czAssistUtils.updateAutomationStatus("點擊帳務總覽...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    const accountOverviewLink = document.querySelector(
      bankConfig.selectors.navigation.accountOverview
    );
    
    if (accountOverviewLink) {
      console.log("找到帳務總覽連結，點擊中...");
      accountOverviewLink.click();
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 1;
        window.czAssistUtils.executeAutomationStep();
      }, 3000);
    } else {
      console.error("找不到帳務總覽連結");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳務總覽連結");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟2: 點擊活期性存款明細查詢（彰化銀行專用）
  step2_clickChbTransactionQuery: () => {
    window.czAssistUtils.updateAutomationStatus("點擊活期性存款明細查詢...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    console.log("=== 彰化銀行：點擊活期性存款明細查詢 ===");
    console.log("iframe 名稱:", bankConfig.selectors.query.iframeName);
    
    // 獲取 iframe 文檔
    const iframe = document.getElementById(
      bankConfig.selectors.query.iframeName
    );
    console.log("找到 iframe (by id):", !!iframe);
    
    // 如果找不到，嘗試使用 name 屬性
    const iframeByName =
      iframe || document.querySelector('iframe[name="frame1"]');
    console.log("找到 iframe (by name):", !!iframeByName);
    
    let searchDoc = document;
    
    if (iframeByName && iframeByName.contentDocument) {
      searchDoc = iframeByName.contentDocument;
      console.log("成功獲取 iframe.contentDocument");
    } else if (iframeByName) {
      console.warn("iframe 存在但無法訪問 contentDocument，等待載入...");
      // iframe 可能還在載入中，延遲重試
      setTimeout(() => {
        window.czAssistUtils.step2_clickChbTransactionQuery();
      }, 2000);
      return;
    } else {
      console.warn("找不到 iframe，在主文檔中查找");
    }
    
    console.log(
      "查詢連結選擇器:",
      bankConfig.selectors.navigation.transactionQuery
    );
    const transactionQueryLink = searchDoc.querySelector(
      bankConfig.selectors.navigation.transactionQuery
    );
    console.log("找到活期性存款明細查詢連結:", !!transactionQueryLink);
    
    if (transactionQueryLink) {
      console.log("找到活期性存款明細查詢連結，點擊中...");
      transactionQueryLink.click();
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 2;
        window.czAssistUtils.executeAutomationStep();
      }, 5000);
    } else {
      console.error("找不到活期性存款明細查詢連結");
      console.error(
        "當前搜尋文檔:",
        searchDoc === document ? "主文檔" : "iframe 文檔"
      );
      window.czAssistUtils.updateAutomationStatus(
        "錯誤：找不到活期性存款明細查詢連結"
      );
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟3: 選擇帳號（彰化銀行專用）
  step3_selectChbAccount: (retryCount = 0) => {
    window.czAssistUtils.updateAutomationStatus("選擇帳號...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    console.log("=== 彰化銀行：選擇帳號 ===");
    console.log("重試次數:", retryCount);
    console.log("iframe 設定名稱:", bankConfig.selectors.query.iframeName);
    
    // 獲取 iframe 文檔（先嘗試 id，再嘗試 name）
    let iframe = document.getElementById(bankConfig.selectors.query.iframeName);
    console.log("找到 iframe (by id 'iframe1'):", !!iframe);
    
    if (!iframe) {
      console.log("使用 id 找不到，嘗試使用 name 屬性查找 'frame1'");
      iframe = document.querySelector('iframe[name="frame1"]');
      console.log("找到 iframe (by name='frame1'):", !!iframe);
    }
    
    if (!iframe) {
      console.log("嘗試查找所有 iframe:");
      const allIframes = document.querySelectorAll("iframe");
      console.log("頁面上的 iframe 總數:", allIframes.length);
      allIframes.forEach((frame, index) => {
        console.log(
          `iframe ${index}: id="${frame.id}", name="${frame.name}", src="${frame.src}"`
        );
      });
    }
    
    let searchDoc = document;
    
    if (iframe && iframe.contentDocument) {
      searchDoc = iframe.contentDocument;
      console.log("成功獲取 iframe.contentDocument");
      console.log(
        "iframe id:",
        iframe.id,
        "name:",
        iframe.name,
        "src:",
        iframe.src
      );
    } else if (iframe) {
      console.warn("iframe 存在但無法訪問 contentDocument");
      
      // 如果重試次數少於3次，延遲重試
      if (retryCount < 3) {
        console.log(`等待 iframe 載入，2秒後重試 (${retryCount + 1}/3)...`);
        setTimeout(() => {
          window.czAssistUtils.step3_selectChbAccount(retryCount + 1);
        }, 2000);
        return;
      } else {
        console.error("重試3次後仍無法訪問 iframe");
        window.czAssistUtils.updateAutomationStatus("錯誤：無法訪問 iframe");
        window.czAssistUtils.stopAutomation();
        return;
      }
    } else {
      console.error("完全找不到 iframe");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到 iframe");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    console.log("帳號選擇器:", bankConfig.selectors.query.accountCombo);
    let accountCombo = searchDoc.querySelector(
      bankConfig.selectors.query.accountCombo
    );
    console.log("找到帳號選擇框 (轉義版本):", !!accountCombo);
    
    if (!accountCombo) {
      // 嘗試不使用轉義的版本
      console.log("嘗試不轉義冒號的選擇器: #form1:accountCombo");
      accountCombo = searchDoc.querySelector("#form1:accountCombo");
      console.log("找到帳號選擇框 (不轉義):", !!accountCombo);
    }
    
    if (!accountCombo) {
      // 嘗試使用 getElementById
      console.log("嘗試使用 getElementById: form1:accountCombo");
      accountCombo = searchDoc.getElementById("form1:accountCombo");
      console.log("找到帳號選擇框 (getElementById):", !!accountCombo);
    }
    
    if (accountCombo) {
      console.log("帳號選擇框選項數量:", accountCombo.options.length);
      for (let i = 0; i < accountCombo.options.length; i++) {
        console.log(
          `選項 ${i}:`,
          accountCombo.options[i].text,
          "value:",
          accountCombo.options[i].value
        );
      }
    }
    
    if (accountCombo && accountCombo.options.length >= 2) {
      // 選擇第二個選項（TWD）
      accountCombo.selectedIndex = 1;
      accountCombo.value = accountCombo.options[1].value;
      
      // 觸發變更事件
      accountCombo.dispatchEvent(new Event("input", { bubbles: true }));
      accountCombo.dispatchEvent(new Event("change", { bubbles: true }));
      
      console.log("已選擇第二個帳號（TWD）:", accountCombo.options[1].text);
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 3;
        window.czAssistUtils.executeAutomationStep();
      }, 3000);
    } else {
      console.error("找不到帳號選擇框或選項不足");
      console.error("accountCombo:", accountCombo);
      console.error(
        "選項數量:",
        accountCombo ? accountCombo.options.length : "N/A"
      );
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到帳號選擇框");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟5: 選擇每頁顯示200筆（彰化銀行專用，在第一次查詢後執行）
  step3_5_selectChbPageSize: () => {
    console.log("========================================");
    console.log("步驟5: step3_5_selectChbPageSize 函數已被調用");
    console.log("========================================");
    
    window.czAssistUtils.updateAutomationStatus("選擇每頁顯示200筆...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    console.log("=== 彰化銀行：選擇每頁顯示筆數 ===");
    console.log("當前銀行:", window.czAssistExtension.selectedBank);
    
    const frameDoc = window.czAssistUtils.getQueryFrameDocument();
    console.log(
      "已獲取 frameDoc:",
      frameDoc === document ? "主文檔" : "iframe 文檔"
    );
    
    // 嘗試查找頁面大小選擇框
    console.log("開始查找頁面大小選擇框: cboCurrentPageSize2");
    let pageSizeSelect = frameDoc.getElementById("cboCurrentPageSize2");
    console.log("使用 getElementById 查找頁面大小選擇框:", !!pageSizeSelect);
    
    // 如果找不到，嘗試使用 querySelector
    if (!pageSizeSelect) {
      console.log("getElementById 找不到，嘗試 querySelector");
      pageSizeSelect = frameDoc.querySelector("#cboCurrentPageSize2");
      console.log("使用 querySelector 查找頁面大小選擇框:", !!pageSizeSelect);
    }
    
    // 如果還是找不到，列出所有 select 元素
    if (!pageSizeSelect) {
      console.log("查找所有 select 元素:");
      const allSelects = frameDoc.querySelectorAll("select");
      console.log("select 元素總數:", allSelects.length);
      allSelects.forEach((select, index) => {
        console.log(
          `select ${index}: id="${select.id}", name="${select.name}"`
        );
      });
    }
    
    if (pageSizeSelect) {
      console.log("找到頁面大小選擇框，當前值:", pageSizeSelect.value);
      console.log(
        "可用選項:",
        Array.from(pageSizeSelect.options).map((opt) => opt.value)
      );
      
      // 如果已經是200筆，跳過選擇直接進入下一步
      if (pageSizeSelect.value === "200") {
        console.log("已經是每頁顯示200筆，跳過選擇");
        setTimeout(() => {
          window.czAssistExtension.automation.currentStep = 6;
          window.czAssistUtils.executeAutomationStep();
        }, 500);
        return;
      }
      
      // 選擇200筆
      pageSizeSelect.value = "200";
      
      // 觸發 change 事件（會自動調用 setDataGridCurrentPageSize）
      pageSizeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      
      console.log("已選擇每頁顯示200筆，等待頁面重新載入...");
      
      // 等待頁面重新載入後跳到步驟6（提取數據）
      setTimeout(() => {
        console.log("頁面已重新載入為200筆/頁模式，開始提取數據");
        window.czAssistExtension.automation.currentStep = 6;
        window.czAssistUtils.executeAutomationStep();
      }, 5000);
    } else {
      console.error("找不到頁面大小選擇框");
      // 繼續執行，不停止自動化（可能預設就是200筆）
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 6;
        window.czAssistUtils.executeAutomationStep();
      }, 1000);
    }
  },

  // 步驟3: 設定彰化銀行日期範圍（彰化銀行專用）
  step4_setChbDateRange: () => {
    const queryDaysBack = window.czAssistExtension.settings.queryDaysBack ?? 0;
    
    // 如果查詢天數為 0，跳過日期設定，直接進入步驟4（執行查詢）
    if (queryDaysBack === 0) {
      console.log("彰化銀行查詢天數為 0，跳過日期設定");
      window.czAssistUtils.updateAutomationStatus("查詢天數為 0，跳過日期設定");
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 4;
        window.czAssistUtils.executeAutomationStep();
      }, 500);
      return;
    }
    
    window.czAssistUtils.updateAutomationStatus("設定彰化銀行日期範圍...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    const frameDoc = window.czAssistUtils.getQueryFrameDocument();
    
    // 使用通用日期計算函數
    const dateRange = window.czAssistUtils.calculateQueryDateRange();
    
    console.log("=== 彰化銀行日期設定 ===");
    console.log("起日選擇器:", bankConfig.selectors.query.startDate);
    
    // 嘗試多種方式查找起日輸入框
    let startDateField = frameDoc.querySelector(
      bankConfig.selectors.query.startDate
    );
    if (!startDateField) {
      startDateField = frameDoc.getElementById("form1:startdate");
      console.log("使用 getElementById 查找起日輸入框:", !!startDateField);
    }
    
    if (startDateField) {
      // 彰化銀行使用 YYYY/MM/DD 格式
      startDateField.value = dateRange.startDate;
      startDateField.dispatchEvent(new Event("input", { bubbles: true }));
      startDateField.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`彰化銀行起日已設定: ${dateRange.startDate}`);
      
      if (queryDaysBack === 1) {
        console.log(
          `彰化銀行日期設定完成: ${dateRange.startDate} (查詢昨天至今天，可能是跨日調整)`
        );
      } else {
        console.log(
          `彰化銀行日期設定完成: ${dateRange.startDate} - ${dateRange.endDate} (${dateRange.daysBack}天前至今天)`
        );
      }
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 4;
        window.czAssistUtils.executeAutomationStep();
      }, 3000);
    } else {
      console.error("找不到起日輸入框");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到起日輸入框");
      // 繼續執行，不停止自動化（可能不需要設定日期）
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 4;
        window.czAssistUtils.executeAutomationStep();
      }, 1000);
    }
  },

  // 步驟4: 設定當月日期和貨幣
  step4_setCurrentMonthDates: () => {
    window.czAssistUtils.updateAutomationStatus("設定查詢日期和貨幣...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    const frameDoc = window.czAssistUtils.getQueryFrameDocument();
    
    // 元大銀行需要先點擊「查詢依據：交易日」radio button，再點擊日期範圍 radio button
    if (window.czAssistExtension.selectedBank === "yuanta") {
      // 先點擊「查詢依據：交易日」
      if (bankConfig.selectors.query.queryWaysRadio) {
        const queryWaysRadio = frameDoc.getElementById(
          bankConfig.selectors.query.queryWaysRadio
        );
        if (queryWaysRadio) {
          console.log(
            "點擊查詢依據 radio button（交易日）:",
            bankConfig.selectors.query.queryWaysRadio
          );
          queryWaysRadio.click();

          // 等待一小段時間讓 radio button 的變更生效，再點擊日期範圍
          setTimeout(() => {
            window.czAssistUtils.clickYuantaDateRangeAndSetDate(
              frameDoc,
              bankConfig
            );
          }, 500);
          return;
        } else {
          console.warn(
            "找不到查詢依據 radio button:",
            bankConfig.selectors.query.queryWaysRadio
          );
          // 找不到查詢依據 radio，繼續點擊日期範圍
          window.czAssistUtils.clickYuantaDateRangeAndSetDate(
            frameDoc,
            bankConfig
          );
          return;
        }
      }

      // 如果沒有配置 queryWaysRadio，直接點擊日期範圍
      window.czAssistUtils.clickYuantaDateRangeAndSetDate(frameDoc, bankConfig);
      return;
    }

    // 非元大銀行，直接設定日期
    window.czAssistUtils.proceedWithDateSetting(frameDoc, bankConfig);
  },

  // 元大銀行專用：點擊日期範圍 radio button 後設定日期
  clickYuantaDateRangeAndSetDate: (frameDoc, bankConfig) => {
    if (bankConfig.selectors.query.dateRangeRadio) {
      const dateRangeRadio = frameDoc.getElementById(
        bankConfig.selectors.query.dateRangeRadio
      );
      if (dateRangeRadio) {
        console.log(
          "點擊日期範圍 radio button:",
          bankConfig.selectors.query.dateRangeRadio
        );
        dateRangeRadio.click();
        
        // 等待一小段時間讓 radio button 的變更生效
        setTimeout(() => {
          window.czAssistUtils.proceedWithDateSetting(frameDoc, bankConfig);
        }, 1000);
        return;
      } else {
        console.warn(
          "找不到日期範圍 radio button:",
          bankConfig.selectors.query.dateRangeRadio
        );
      }
    }
    
    // 找不到日期範圍 radio button，直接設定日期
    window.czAssistUtils.proceedWithDateSetting(frameDoc, bankConfig);
  },

  // 繼續進行日期設定的函數
  proceedWithDateSetting: (frameDoc, bankConfig) => {
    const startDateField =
      frameDoc.getElementById(bankConfig.selectors.query.startDate) ||
      frameDoc.querySelector(bankConfig.selectors.query.startDate);
    const endDateField =
      frameDoc.getElementById(bankConfig.selectors.query.endDate) ||
      frameDoc.querySelector(bankConfig.selectors.query.endDate);
    const currencySelect =
      frameDoc.getElementById(bankConfig.selectors.query.currency) ||
      frameDoc.querySelector(bankConfig.selectors.query.currency);

    console.log("找到的表單元素:", {
      startDateField: !!startDateField, 
      endDateField: !!endDateField, 
      currencySelect: !!currencySelect,
    });

    // 使用通用日期計算函數
    const dateRange = window.czAssistUtils.calculateQueryDateRange();
    
    let success = true;
    
    // 設定開始日期
    if (startDateField) {
      startDateField.value = dateRange.startDate;
      startDateField.dispatchEvent(new Event("input", { bubbles: true }));
      startDateField.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`開始日期已設定: ${dateRange.startDate}`);
    } else {
      console.error("找不到開始日期輸入框");
      success = false;
    }
    
    // 設定結束日期（今天）
    if (endDateField) {
      endDateField.value = dateRange.endDate;
      endDateField.dispatchEvent(new Event("input", { bubbles: true }));
      endDateField.dispatchEvent(new Event("change", { bubbles: true }));
      console.log(`結束日期已設定: ${dateRange.endDate}`);
    } else {
      console.error("找不到結束日期輸入框");
      success = false;
    }
    
    // 設定貨幣為 TWD
    if (currencySelect) {
      // 嘗試找到 TWD 選項
      const twdOption = Array.from(currencySelect.options).find(
        (option) =>
          option.value === "TWD" ||
          option.text === "TWD" ||
          option.text.includes("TWD")
      );
      
      if (twdOption) {
        currencySelect.value = twdOption.value;
        currencySelect.selectedIndex = twdOption.index;
        
        // 觸發各種事件確保變更被識別
        currencySelect.dispatchEvent(new Event("input", { bubbles: true }));
        currencySelect.dispatchEvent(new Event("change", { bubbles: true }));
        currencySelect.dispatchEvent(new Event("blur", { bubbles: true }));
        
        console.log(`貨幣已設定為: ${twdOption.value} (${twdOption.text})`);
      } else {
        console.warn(
          "找不到 TWD 選項，可用選項:",
          Array.from(currencySelect.options).map(
            (opt) => `${opt.value}:${opt.text}`
          )
        );
        
        // 如果找不到 TWD，嘗試設定第一個選項或保持預設
        if (currencySelect.options.length > 0) {
          console.log(
            "使用第一個可用貨幣選項:",
            currencySelect.options[0].text
          );
        }
      }
    } else {
      console.error("找不到貨幣選擇框");
      success = false;
    }

    // 台灣銀行專用：如果是假日，點擊「僅查詢當日」選項
    if (window.czAssistExtension.selectedBank === "bot") {
      const isHoliday = window.czAssistUtils.isHoliday();
      console.log(`台灣銀行：今天是否為假日: ${isHoliday}`);

      if (isHoliday && bankConfig.selectors.query.queryTypeOnlyToday) {
        const queryTypeOnlyToday = frameDoc.getElementById(
          bankConfig.selectors.query.queryTypeOnlyToday
        );

        if (queryTypeOnlyToday) {
          console.log("台灣銀行：假日模式，點擊「僅查詢當日」選項");
          queryTypeOnlyToday.click();

          // 也觸發 onclick 事件（如果有的話）
          const onclick = queryTypeOnlyToday.getAttribute("onclick");
          if (onclick) {
            try {
              // 呼叫 clickOnlyToday() 函數
              if (frameDoc.defaultView && frameDoc.defaultView.eval) {
                frameDoc.defaultView.eval(onclick);
              } else {
                eval(onclick);
              }
            } catch (e) {
              console.warn("執行 onclick 失敗:", e);
            }
          }

          console.log("台灣銀行：已選擇「僅查詢當日」模式");
        } else {
          console.warn("台灣銀行：找不到「僅查詢當日」選項");
        }
      }
    }
    
    if (success || (startDateField && endDateField)) {
      console.log(
        `查詢設定完成: ${dateRange.startDate} - ${dateRange.endDate}, 貨幣: ${
          currencySelect?.value || "未設定"
        } (${dateRange.daysBack}天前至今天)`
      );
      
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 5;
        window.czAssistUtils.executeAutomationStep();
      }, 2000);
    } else {
      console.error("設定查詢參數失敗");
      window.czAssistUtils.updateAutomationStatus("錯誤：無法設定查詢參數");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 判斷今天是否為假日（週六或週日）
  isHoliday: () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = 週日, 6 = 週六
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    console.log(
      `今天是星期${
        ["日", "一", "二", "三", "四", "五", "六"][dayOfWeek]
      }，isWeekend: ${isWeekend}`
    );

    return isWeekend;
  },

  // 步驟5: 執行查詢
  step5_executeQuery: (retryCount = 0, sessionId = null) => {
    // 華南商銀等待重試機制的會話 ID 檢查
    if (window.czAssistExtension.selectedBank === "hncb" && retryCount > 0) {
      // 檢查會話 ID 是否匹配，避免舊的重試與新流程並行
      if (
        sessionId !== window.czAssistExtension.automation.hncbRetrySessionId
      ) {
        console.log(
          `華南商銀等待重試被取消（會話 ID 不匹配: ${sessionId} vs ${window.czAssistExtension.automation.hncbRetrySessionId}）`
        );
        return;
      }
    }
    
    window.czAssistUtils.updateAutomationStatus("查詢中...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    const frameDoc = window.czAssistUtils.getQueryFrameDocument();
    let queryButton;
    
    // 臺灣企銀直接從 document 查找
    if (window.czAssistExtension.selectedBank === "tbb") {
      queryButton = document.querySelector(
        bankConfig.selectors.query.queryButton
      );
    } else {
      queryButton =
        frameDoc.getElementById(bankConfig.selectors.query.queryButton) ||
        frameDoc.querySelector(bankConfig.selectors.query.queryButton);
    }
    
    if (queryButton) {
      console.log("點擊查詢按鈕...");
      
      // 華南商銀：找到按鈕後清除會話 ID
      if (window.czAssistExtension.selectedBank === "hncb") {
        window.czAssistExtension.automation.hncbRetrySessionId = null;
      }
      
      // 華南銀行需要特殊處理 CSP 限制
      if (window.czAssistExtension.selectedBank === "hncb") {
        const success = window.czAssistUtils.handleHncbQueryButton(
          queryButton,
          frameDoc
        );
        if (!success) {
          console.error("華南銀行查詢按鈕執行失敗");
          window.czAssistUtils.updateAutomationStatus("錯誤：無法執行查詢");
          window.czAssistUtils.stopAutomation();
          return;
        }
      } else {
        // 其他銀行使用普通點擊
        queryButton.click();
      }
      
      // 從銀行配置中取得等待時間
      // 華南商銀：額外增加 10 秒等待時間（共 15 秒）
      // 元大銀行：數據較多，等待 15 秒確保完全載入
      let waitTime = 5000;
      if (window.czAssistExtension.selectedBank === "hncb") {
        waitTime = 15000;
      } else if (window.czAssistExtension.selectedBank === "yuanta") {
        waitTime = 15000;
      }
      
      // 彰化銀行在查詢後需要先選擇每頁200筆（步驟5），其他銀行直接提取數據（步驟6）
      if (window.czAssistExtension.selectedBank === "chb") {
        console.log(
          `彰化銀行查詢按鈕已點擊，等待 ${waitTime / 1000} 秒後選擇每頁200筆...`
        );
        setTimeout(() => {
          window.czAssistExtension.automation.currentStep = 5;
          window.czAssistUtils.executeAutomationStep();
        }, waitTime);
      } else {
        console.log(`查詢按鈕已點擊，等待 ${waitTime / 1000} 秒後提取數據...`);
        
        // 記錄當前步驟，防止在等待期間被其他邏輯改變
        const expectedStep = 6;
        
        setTimeout(() => {
          // 檢查自動化是否還在運行且步驟沒有被改變
          if (!window.czAssistExtension.automation.isRunning) {
            console.log("自動化已停止，取消提取數據");
            return;
          }
          
          // 如果步驟已經被改變（例如被重新查詢邏輯改變），不要覆蓋
          // if (window.czAssistExtension.automation.currentStep !== 5 &&
          //     window.czAssistExtension.automation.currentStep !== expectedStep) {
          //   console.log(`步驟已改變為 ${window.czAssistExtension.automation.currentStep}，取消設定步驟 6`);
          //   return;
          // }
          
          window.czAssistExtension.automation.currentStep = expectedStep;
          window.czAssistUtils.executeAutomationStep();
          try {
            document.getElementById("js_overLayer").style.display = "none";
          } catch {
            // 忽略錯誤，可能該元素不存在
          }
        }, waitTime);
      }
    } else {
      // 華南商銀：等待重試直到查詢按鈕出現
      if (window.czAssistExtension.selectedBank === "hncb") {
        // 檢查是否出現 HTTP INTERNAL SERVER ERROR
        if (window.czAssistUtils.checkHncbServerError()) {
          console.log("華南商銀等待重試時偵測到 HTTP INTERNAL SERVER ERROR");
          window.czAssistUtils.handleHncbServerError();
          return;
        }
        
        const maxRetries = 60; // 最多重試 60 次（每次 500ms，共 30 秒）
        
        // 第一次重試時生成會話 ID
        let currentSessionId = sessionId;
        if (retryCount === 0) {
          currentSessionId = Date.now().toString();
          window.czAssistExtension.automation.hncbRetrySessionId =
            currentSessionId;
          console.log(
            `華南商銀開始等待查詢按鈕（會話 ID: ${currentSessionId}）`
          );
        }
        
        if (retryCount < maxRetries) {
          console.log(
            `華南商銀等待查詢按鈕出現中... (第 ${
              retryCount + 1
            } 次嘗試，最多 ${maxRetries} 次)`
          );
          window.czAssistUtils.updateAutomationStatus(
            `等待查詢按鈕... (${retryCount + 1}/${maxRetries})`
          );
          setTimeout(() => {
            window.czAssistUtils.step5_executeQuery(
              retryCount + 1,
              currentSessionId
            );
          }, 500);
          return;
        } else {
          console.error("華南商銀等待查詢按鈕超時");
          window.czAssistUtils.updateAutomationStatus("錯誤：等待查詢按鈕超時");
          window.czAssistExtension.automation.hncbRetrySessionId = null;
          window.czAssistUtils.stopAutomation();
          return;
        }
      }
      
      console.error("找不到查詢按鈕");
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到查詢按鈕");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 步驟6: 提取交易數據
  step6_extractTransactionData: () => {
    // 華南商銀：先檢查是否出現 HTTP INTERNAL SERVER ERROR
    if (window.czAssistExtension.selectedBank === "hncb") {
      if (window.czAssistUtils.checkHncbServerError()) {
        console.log(
          "華南商銀步驟6（提取數據）偵測到 HTTP INTERNAL SERVER ERROR"
        );
        window.czAssistUtils.handleHncbServerError();
        return;
      }
    }
    
    window.czAssistUtils.updateAutomationStatus("比對數據中...");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    // 台灣企銀：使用專用提取邏輯
    if (window.czAssistExtension.selectedBank === "tbb") {
      window.czAssistUtils.step6_extractTbbTransactionData();
      return;
    }
    
    // 聯邦銀行：使用專用提取邏輯
    if (window.czAssistExtension.selectedBank === "ubot") {
      window.czAssistUtils.step6_extractUbotTransactionData();
      return;
    }
    
    // 土地銀行：使用專用提取邏輯
    if (window.czAssistExtension.selectedBank === "landbank") {
      window.czAssistUtils.step6_extractLandbankTransactionData();
      return;
    }
    
    // 富邦銀行：使用專用提取邏輯
    if (window.czAssistExtension.selectedBank === "fubon") {
      window.czAssistUtils.step6_extractFubonTransactionData();
      return;
    }
    
    // 國泰世華：使用專用提取邏輯（處理 more 按鈕）
    if (window.czAssistExtension.selectedBank === "cathay") {
      window.czAssistUtils.step6_extractCathayTransactionData();
      return;
    }
    
    // 台灣銀行：等待 loading 消失後再提取資料
    if (window.czAssistExtension.selectedBank === "bot") {
      const waitForLoading = (attempts = 0) => {
        const maxAttempts = 60; // 最多等待 60 次，每次 1000ms = 最多 60 秒
        
        if (attempts >= maxAttempts) {
          console.warn("等待台灣銀行 loading 消失超時，繼續提取資料");
          window.czAssistUtils.extractTransactionDataAfterLoading();
          return;
        }
        
        const loadingOverlay = document.getElementById("js_overLayer");
        // 檢查 loading 是否已消失（display: none 或元素不存在）
        const isHidden =
          !loadingOverlay ||
          loadingOverlay.style.display === "none" ||
          getComputedStyle(loadingOverlay).display === "none";
        
        if (isHidden) {
          // loading 已消失，開始提取資料
          console.log("台灣銀行 loading 已消失，開始提取資料");
          window.czAssistUtils.extractTransactionDataAfterLoading();
        } else {
          // 還在載入中，繼續等待
          if (attempts % 10 === 0) {
            console.log(
              `等待台灣銀行 loading 消失... (${attempts + 1}/${maxAttempts})`
            );
          }
          setTimeout(() => waitForLoading(attempts + 1), 1000);
        }
      };
      
      waitForLoading();
      return;
    }
    
    // 其他銀行直接提取資料
    window.czAssistUtils.extractTransactionDataAfterLoading();
  },

  // 提取交易數據（在等待 loading 後執行）
  extractTransactionDataAfterLoading: () => {
    // 華南商銀：先檢查是否出現 HTTP INTERNAL SERVER ERROR
    if (window.czAssistExtension.selectedBank === "hncb") {
      if (window.czAssistUtils.checkHncbServerError()) {
        console.log("華南商銀提取數據時偵測到 HTTP INTERNAL SERVER ERROR");
        window.czAssistUtils.handleHncbServerError();
        return;
      }
    }
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到銀行設定檔");
      window.czAssistUtils.stopAutomation();
      return;
    }
    
    const frameDoc = window.czAssistUtils.getQueryFrameDocument();
    // 先嘗試 getElementById，如果失敗再嘗試 querySelector
    let dataGrid = frameDoc.getElementById(bankConfig.selectors.query.dataGrid);
    if (!dataGrid) {
      try {
        const selector = bankConfig.selectors.query.dataGrid;
        // 判斷選擇器類型：
        // 1. 如果包含 > 、空格、[ ] 等符號，說明是複雜的 CSS 選擇器，直接使用
        // 2. 如果以 # 或 . 開頭，說明已經是 CSS 選擇器格式，直接使用
        // 3. 如果已包含轉義的冒號 \:，說明已經處理過，直接使用
        // 4. 如果是元素選擇器格式（如 table.class、table#id、div.class），直接使用
        // 5. 否則假設是 ID 格式，需要轉義冒號後作為 ID 選擇器使用
        const isComplexSelector = /[>\s\[\]]/.test(selector);
        const isCssSelector =
          selector.startsWith("#") || selector.startsWith(".");
        const hasEscapedColon = selector.includes("\\:");
        // 檢測元素選擇器格式：以小寫字母開頭，後面跟著 . 或 # （如 table.tb_mul、table#grvAccount1）
        const isElementSelector = /^[a-z]+[.#]/.test(selector);

        if (
          isComplexSelector ||
          isCssSelector ||
          hasEscapedColon ||
          isElementSelector
        ) {
          // 是複雜選擇器、CSS 選擇器或元素選擇器格式，直接使用
          console.log("使用 CSS 選擇器查找 dataGrid:", selector);
          dataGrid = frameDoc.querySelector(selector);
        } else {
          // 是簡單的 ID 格式（可能包含冒號，如 cacdp003:datagrid_DataGridBody），需要轉義冒號後作為 ID 選擇器使用
          const escapedSelector = selector.replace(/:/g, "\\:");
          console.log(
            "使用轉義後的 ID 選擇器查找 dataGrid:",
            `#${escapedSelector}`
          );
          dataGrid = frameDoc.querySelector(`#${escapedSelector}`);
        }
      } catch (e) {
        console.warn("querySelector 查找 dataGrid 失敗:", e);
        dataGrid = null;
      }
    }
    
    // 獲取今天的日期（用於判斷交易日期是否為今天）
    const today = new Date();
    const todayStr = `${today.getFullYear()}/${String(
      today.getMonth() + 1
    ).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;
    
    if (dataGrid) {
      const transactions = [];
      const rows = dataGrid.querySelectorAll("tr");
      
      rows.forEach((row, index) => {
        // 跳過表頭和總計行
        if (index === 0 || row.textContent.includes("總計")) return;
        
        // 華南商銀：只處理有效的交易記錄行
        if (window.czAssistExtension.selectedBank === "hncb") {
          const className = row.className;
          if (
            !className.includes("Table_contentWt_C") &&
            !className.includes("Table_contentBu_C")
          ) {
            return; // 跳過非交易記錄行
          }
        }

        // 玉山銀行：只處理有效的交易記錄行
        if (window.czAssistExtension.selectedBank === "esun") {
          const className = row.className;
          // 只處理包含 "ui-datatable" 的行，跳過表頭等其他行
          if (!className.includes("ui-datatable")) {
            return; // 跳過非交易記錄行
          }
        }

        // 陽信銀行：只處理有效的交易記錄行
        if (window.czAssistExtension.selectedBank === "sunny") {
          // 只處理有 role="row" 的行，且包含實際數據
          if (!row.hasAttribute("role") || row.getAttribute("role") !== "row") {
            return; // 跳過表頭或其他非數據行
          }
          
          // 檢查是否有足夠的欄位
          const cells = row.querySelectorAll("td");
          if (cells.length < 6) {
            return; // 跳過欄位不足的行
          }
        }
        
        // 京城銀行：只處理有效的交易記錄行
        if (window.czAssistExtension.selectedBank === "ktb") {
          const className = row.className;
          // 只處理包含 "ng-star-inserted" 的行，跳過表頭等其他行
          if (!className.includes("ng-star-inserted")) {
            return; // 跳過非交易記錄行
          }
          
          // 檢查是否有足夠的欄位
          const cells = row.querySelectorAll("td");
          if (cells.length < 5) {
            return; // 跳過欄位不足的行
          }
        }
        
        // 第一銀行：只處理有效的交易記錄行
        if (window.czAssistExtension.selectedBank === "firstbank") {
          // 跳過表頭行（通常第一行）
          if (index === 0) {
            return; // 跳過表頭行
          }
          
          // 檢查是否有足夠的欄位
          const cells = row.querySelectorAll("td");
          if (cells.length < 7) {
            return; // 跳過欄位不足的行
          }
          
          // 檢查是否包含實際數據（第1欄應該有日期）
          const firstCell = cells[0];
          if (
            !firstCell ||
            !firstCell.textContent.trim().match(/\d{4}\/\d{2}\/\d{2}/)
          ) {
            return; // 跳過沒有日期格式的行
          }
        }
        
        // 國泰世華：只處理有效的交易記錄行
        if (window.czAssistExtension.selectedBank === "cathay") {
          const className = row.className;
          // 只處理包含 "data-row" 的行，跳過表頭等其他行
          if (!className.includes("data-row")) {
            return; // 跳過非交易記錄行
          }
          
          // 檢查是否有足夠的欄位
          const cells = row.querySelectorAll("td");
          if (cells.length < 13) {
            return; // 跳過欄位不足的行
          }
        }
        
        // 高雄銀行：只處理有效的交易記錄行
        if (window.czAssistExtension.selectedBank === "bok") {
          // 只處理有 role="row" 的行，且包含實際數據
          if (!row.hasAttribute("role") || row.getAttribute("role") !== "row") {
            return; // 跳過表頭或其他非數據行
          }
          
          // 檢查是否有足夠的欄位（高雄銀行表格有7個欄位）
          const cells = row.querySelectorAll("td");
          if (cells.length < 7) {
            return; // 跳過欄位不足的行
          }
          
          // 檢查是否包含實際數據（第1欄應該有日期）
          const firstCell = cells[0];
          if (
            !firstCell ||
            !firstCell.textContent.trim().match(/\d{4}\/\d{2}\/\d{2}/)
          ) {
            return; // 跳過沒有日期格式的行
          }
        }
        
        // 彰化銀行：只處理有效的交易記錄行
        if (window.czAssistExtension.selectedBank === "chb") {
          const className = row.className;
          // 跳過表頭行（class="hd"）和小計行（class="subtotal"）
          if (className.includes("hd") || className.includes("subtotal")) {
            return;
          }
          
          // 檢查是否有足夠的欄位
          const cells = row.querySelectorAll("td");
          if (cells.length < 11) {
            return; // 跳過欄位不足的行
          }
        }
        
        // 兆豐銀行：只處理有效的交易記錄行
        if (window.czAssistExtension.selectedBank === "megabank") {
          // 檢查是否有足夠的欄位
          const cells = row.querySelectorAll("td");
          if (cells.length < 7) {
            return; // 跳過欄位不足的行（可能是合計行）
          }
          
          // 跳過合計行（第1欄包含"本頁合計"或"累計"）
          const firstCell = cells[0];
          if (
            firstCell &&
            (firstCell.textContent.includes("本頁合計") ||
              firstCell.textContent.includes("累計"))
          ) {
            return;
          }
        }
        
        const dateCell = row.querySelector(bankConfig.selectors.query.dateCell);
        const accountCell = row.querySelector(
          bankConfig.selectors.query.accountCell
        );
        const amountCell = row.querySelector(
          bankConfig.selectors.query.amountCell
        );
        
        if (dateCell && accountCell && amountCell) {
          // 先檢查金額欄位是否有值（過濾掉轉出記錄）
          const amountCellText = amountCell.textContent.trim();
          if (
            !amountCellText ||
            amountCellText === "" ||
            amountCellText === "&nbsp;"
          ) {
            // 金額為空，跳過此記錄（這是轉出交易，不是存入）
            console.log(`跳過空金額記錄（轉出交易）: 第 ${index} 行`);
            return;
          }
          
          let date = dateCell.textContent.trim();
          let account = "";
          let amount = 0;
          let balance = ""; // 帳戶餘額（華南商銀、彰化銀行等有此欄位的銀行）
          
          // 根據銀行類型處理帳號和金額
          if (window.czAssistExtension.selectedBank === "hncb") {
            // 華南商銀：有兩種表格格式，需要動態檢測
            // 3012 server 表格（有交易序號欄位）：日期(1), 交易序號(2), 時間(3), 帳號(8)
            // 3006 表格（沒有交易序號欄位）：日期(1), 時間(2), 帳務日(3), 帳號(9)

            // 檢測表格類型：通過表頭是否包含「交易序號」來判斷
            const headerRow = dataGrid.querySelector("tr.Table_subjectBu_C");
            const headerText = headerRow ? headerRow.textContent : "";
            const is3012Server = headerText.includes("交易序號");

            console.log(`=== 華南商銀表格類型檢測 ===`);
            console.log(`表頭內容: ${headerText.substring(0, 100)}...`);
            console.log(`是否為 3012 server 表格: ${is3012Server}`);

            // 根據表格類型選擇正確的欄位
            let timeCellSelector, accountCellSelector;
            if (is3012Server) {
              // 3012 server 表格
              timeCellSelector = "td:nth-child(3)"; // 時間在第3欄
              accountCellSelector = "td:nth-child(8)"; // 帳號在第8欄
            } else {
              // 3006 表格
              timeCellSelector = "td:nth-child(2)"; // 時間在第2欄
              accountCellSelector = "td:nth-child(9)"; // 帳號在第9欄
            }

            const timeCell = row.querySelector(timeCellSelector);
            const hncbAccountCell = row.querySelector(accountCellSelector);

            const dateText = dateCell.textContent.trim();
            const timeText = timeCell ? timeCell.textContent.trim() : "";
            const rawDate = `${dateText} ${timeText}`.trim();
            
            // 將民國年日期轉換為西元年格式，並處理分秒為60的情況
            date = window.czAssistUtils.convertROCDateToWestern(rawDate);
            
            // 對方帳號 - 可能是數字帳號或中文姓名
            console.log("=== 華南商銀帳號提取除錯 ===");
            console.log(`使用 ${is3012Server ? "3012" : "3006"} 表格格式`);
            console.log(
              `時間欄位: ${timeCellSelector}, 帳號欄位: ${accountCellSelector}`
            );
            console.log(
              "accountCell textContent:",
              hncbAccountCell ? hncbAccountCell.textContent : "null"
            );

            let accountText = hncbAccountCell
              ? hncbAccountCell.textContent.trim()
              : "";
            
            // 檢查是否包含數字（銀行帳號）
            const hasNumbers = /\d/.test(accountText);
            
            if (hasNumbers) {
              // 如果包含數字，提取純數字（銀行帳號）
              // 使用 replace(/\D/g, '') 保留所有數字，包括前面的0
              account = accountText.replace(/\D/g, "");
              console.log("原始文字:", accountText);
              console.log("提取的帳號（數字，保留前導0）:", account);
              
              // 華南商銀帳號格式修正：如果前三碼為 132 且第4~6碼也是 132，則將第4~6碼改為 000
              // 例如：1321320118220754530 -> 1320000118220754530
              if (account.startsWith("132132")) {
                const correctedAccount = "132000" + account.substring(6);
                console.log(`華南商銀帳號格式修正: ${account} -> ${correctedAccount}`);
                account = correctedAccount;
              }
              
              // 驗證帳號長度（通常銀行帳號是14-20位）
              if (account.length < 10) {
                console.warn(
                  `警告：帳號長度異常 (${account.length} 位): ${account}`
                );
                console.warn("可能 selector 選錯了欄位，請檢查 HTML 結構");
              }
            } else {
              // 如果沒有數字，可能是中文姓名，保留原始文字
              account = accountText;
              console.log("原始文字:", accountText);
              console.log("提取的帳號（中文姓名）:", account);
            }
            
            // 存入金額（去除逗號）
            const amountText = amountCell.textContent.trim();
            amount = parseFloat(amountText.replace(/,/g, "")) || 0;
            
            // 提取餘額（第7欄）
            const balanceCellSelector = bankConfig.selectors.query.balanceCell;
            const balanceCellElem = row.querySelector(balanceCellSelector);
            if (balanceCellElem) {
              const balanceText = balanceCellElem.textContent.trim();
              balance = balanceText.replace(/,/g, "");
              console.log(`華南商銀餘額提取: ${balanceText} -> ${balance}`);
            }
          } else if (window.czAssistExtension.selectedBank === "yuanta") {
            // 元大銀行：從備註欄位提取帳號
            const accountText = accountCell.textContent.trim();
            // 匹配格式：700-0003011781007939 或 013-0000012506203790
            // 提取銀行代碼（3位）和帳號部分（移除短橫線）
            const accountMatch = accountText.match(/(\d{3})-(\d+)/);
            if (accountMatch) {
              // 銀行代碼（前3位，保留前面的0）
              const bankCode = accountMatch[1]; // 700 或 013
              // 帳號部分（保留完整的數字，包括前面的0）
              const accountNumber = accountMatch[2]; // 0003011781007939 或 0000012506203790
              // 確保帳號是16位（如果不足16位，前面補0；如果超過16位，截取前16位）
              const account16 = accountNumber
                .padStart(16, "0")
                .substring(0, 16);
              // 組合：前3位銀行代碼 + 後16位帳號
              account = bankCode + account16; // 7000003011781007939 或 0130000012506203790
            } else {
              // 如果沒有短橫線格式，嘗試移除非數字字符
              account = accountText.replace(/\D/g, ""); // 移除非數字字符
            }
            
            // 存入金額（去除逗號）
            const amountText = amountCell.textContent.trim();
            amount = parseFloat(amountText.replace(/,/g, "")) || 0;
            
            // 提取帳面餘額（第8欄）
            const balanceCellSelector = bankConfig.selectors.query.balanceCell;
            const balanceCellElem = row.querySelector(balanceCellSelector);
            if (balanceCellElem) {
              const balanceText = balanceCellElem.textContent.trim();
              balance = balanceText.replace(/,/g, "");
              console.log(`元大銀行餘額提取: ${balanceText} -> ${balance}`);
            }
          } else if (window.czAssistExtension.selectedBank === "esun") {
            // 玉山銀行：組合日期和時間，提取帳號和金額
            const timeCell = row.querySelector(
              bankConfig.selectors.query.timeCell
            );
            const dateText = dateCell.textContent.trim();
            const timeText = timeCell ? timeCell.textContent.trim() : "";
            date = `${dateText} ${timeText}`.trim();

            // 轉出入銀行代號/帳號（格式：822/0000288540261956）
            const accountText = accountCell.textContent.trim();
            // 提取帳號部分（斜線後面的數字）
            const accountMatch = accountText.match(/(\d{3})\/(\d+)/);
            if (accountMatch) {
              account = accountMatch[2]; // 只保留帳號部分（如：0000288540261956）
            } else {
              // 如果沒有斜線格式，嘗試直接提取數字
              const numberMatch = accountText.match(/\d{10,}/);
              account = numberMatch ? numberMatch[0] : "";
            }

            // 存入金額（去除逗號和其他文字，只保留數字）
            const amountText = amountCell.textContent.trim();
            // 使用正則表達式提取數字（包含逗號）
            const amountMatch = amountText.match(/[\d,]+/);
            const cleanAmountText = amountMatch ? amountMatch[0] : amountText;
            amount = parseFloat(cleanAmountText.replace(/,/g, "")) || 0;

            console.log(
              `玉山銀行交易記錄解析: 原始帳號="${accountText}", 提取帳號="${account}", 原始金額="${amountText}", 清理後金額="${cleanAmountText}" -> ${amount}`
            );
          } else if (window.czAssistExtension.selectedBank === "sunny") {
            // 陽信銀行：提取日期時間、帳號和金額
            const dateText = dateCell.textContent.trim(); // 已包含日期和時間
            date = dateText; // 2025/06/04 16:08:21

            // 對方帳號（格式：008-0000310200511217 或 822-0000277540482416）
            const accountText = accountCell.textContent.trim();
            // 提取銀行代碼和帳號部分
            const accountMatch = accountText.match(/(\d{3})-(\d+)/);
            if (accountMatch) {
              // 銀行代碼（前3位）
              const bankCode = accountMatch[1]; // 008 或 822
              // 帳號部分（保留完整的數字，包括前面的0）
              const accountNumber = accountMatch[2]; // 0000310200511217
              // 組合：前3位銀行代碼 + 後16位帳號
              // 確保帳號是16位（如果不足16位，前面補0；如果超過16位，截取前16位）
              const account16 = accountNumber
                .padStart(16, "0")
                .substring(0, 16);
              account = bankCode + account16; // 0080000310200511217
            } else {
              // 如果沒有短橫線格式，直接使用原文字（移除非數字字符）
              account = accountText.replace(/\D/g, ""); // 移除非數字字符
            }

            // 存入金額（去除逗號）
            const amountText = amountCell.textContent.trim();
            // 直接解析數字，陽信銀行的金額格式比較乾淨
            amount = parseFloat(amountText.replace(/,/g, "")) || 0;

            // 提取餘額（第4欄）
            const balanceCellSelector = bankConfig.selectors.query.balanceCell;
            const balanceCellElem = row.querySelector(balanceCellSelector);
            if (balanceCellElem) {
              const balanceText = balanceCellElem.textContent.trim();
              balance = balanceText.replace(/,/g, "");
              console.log(`陽信銀行餘額提取: ${balanceText} -> ${balance}`);
            }

            console.log(
               `陽信銀行交易記錄解析: 日期="${dateText}", 原始帳號="${accountText}", 提取帳號="${account}", 金額="${amountText}" -> ${amount}, 餘額="${balance}"`
             );
          } else if (window.czAssistExtension.selectedBank === "ktb") {
            // 京城銀行：提取日期時間、帳號和金額
            const dateText = dateCell.textContent.trim();
            // 移除 "交易日" 標題，只保留實際日期時間
            date = dateText.replace("交易日", "").trim(); // 2025/08/11 22:08:52

            // 支出帳號（第4欄）
            const accountText = accountCell.textContent.trim();
            // 移除 "支出" 標題，只保留帳號
            account = accountText.replace("支出", "").trim(); // 0000657540210402

            // 存入金額（第5欄）
            const amountText = amountCell.textContent.trim();
            // 移除 "存入" 標題，只保留金額
            const cleanAmountText = amountText.replace("存入", "").trim();
            amount = parseFloat(cleanAmountText.replace(/,/g, "")) || 0;
            
            console.log(
              `京城銀行交易記錄解析: 日期="${date}", 原始帳號="${accountText}", 提取帳號="${account}", 原始金額="${amountText}", 清理後金額="${cleanAmountText}" -> ${amount}`
            );
          } else if (window.czAssistExtension.selectedBank === "firstbank") {
            // 第一銀行：提取日期時間、帳號和金額
            const dateText = dateCell.textContent.trim();
            date = dateText; // 2025/08/05 12:03:19（已經是完整格式）

            // 帳號（第7欄）
            const accountText = accountCell.textContent.trim();
            // 直接使用帳號文字，移除多餘的空白
            account = accountText.replace(/\s+/g, ""); // 8080000130940022028

            // 存入金額（第4欄）
            const amountText = amountCell.textContent.trim();
            // 去除逗號並轉換為數字
            amount = parseFloat(amountText.replace(/,/g, "")) || 0;
            
            // 提取餘額（第5欄）
            const balanceCellSelector = bankConfig.selectors.query.balanceCell;
            const balanceCellElem = row.querySelector(balanceCellSelector);
            if (balanceCellElem) {
              const balanceText = balanceCellElem.textContent.trim();
              balance = balanceText.replace(/,/g, "");
              console.log(`第一銀行餘額提取: ${balanceText} -> ${balance}`);
            }
            
            console.log(
              `第一銀行交易記錄解析: 日期="${date}", 原始帳號="${accountText}", 提取帳號="${account}", 金額="${amountText}" -> ${amount}, 餘額="${balance}"`
            );
          } else if (window.czAssistExtension.selectedBank === "cathay") {
            // 國泰世華：組合日期和時間，提取帳號和金額
            const timeCell = row.querySelector(
              bankConfig.selectors.query.timeCell
            );
            const dateText = dateCell.textContent.trim(); // 1141125（民國114年11月25日）或 1140707
            const timeText = timeCell ? timeCell.textContent.trim() : ""; // 205039 或 145741
            
            // 轉換日期格式：1141125 -> 2025/11/25，1140707 -> 2025/07/07
            // 日期格式可能是7位數（YYYMMDD）或6位數（YYMMDD）
            let rocYear, month, day;
            if (dateText.length === 7) {
              // 7位數格式：1141125（民國114年11月25日）
              rocYear = parseInt(dateText.substring(0, 3)); // 114
              month = dateText.substring(3, 5); // 11
              day = dateText.substring(5, 7); // 25
            } else if (dateText.length === 6) {
              // 6位數格式：1140707（民國114年07月07日）
              rocYear = parseInt(dateText.substring(0, 3)); // 114
              month = dateText.substring(3, 5); // 07
              day = dateText.substring(5, 7); // 07
            } else {
              // 其他格式，嘗試解析
              rocYear = parseInt(dateText.substring(0, 3));
              month = dateText.substring(3, 5);
              day = dateText.substring(5, 7);
            }
            
            // 將民國年轉換為西元年：114 + 1911 = 2025
            const westernYear = rocYear + 1911;
            
            // 轉換時間格式：205039 -> 20:50:39，145741 -> 14:57:41
            let hour = "00";
            let minute = "00";
            let second = "00";
            if (timeText.length >= 6) {
              hour = timeText.substring(0, 2); // 20 或 14
              minute = timeText.substring(2, 4); // 50 或 57
              second = timeText.substring(4, 6); // 39 或 41
            } else if (timeText.length >= 4) {
              hour = timeText.substring(0, 2);
              minute = timeText.substring(2, 4);
            }
            
            date = `${westernYear}/${month}/${day} ${hour}:${minute}:${second}`;

            // 帳號（第7欄）
            const accountText = accountCell.textContent.trim();
            account = accountText; // 0000021035009342

            // 存入金額（第4欄）
            const amountText = amountCell.textContent.trim();
            // 去除逗號並轉換為數字
            amount = parseFloat(amountText.replace(/,/g, "")) || 0;
            
            // 提取餘額（第5欄）
            const balanceCellSelector = bankConfig.selectors.query.balanceCell;
            const balanceCellElem = row.querySelector(balanceCellSelector);
            if (balanceCellElem) {
              const balanceText = balanceCellElem.textContent.trim();
              balance = balanceText.replace(/,/g, "");
              console.log(`國泰世華餘額提取: ${balanceText} -> ${balance}`);
            }
            
            console.log(
              `國泰世華交易記錄解析: 原始日期="${dateText}", 原始時間="${timeText}", 組合日期="${date}", 帳號="${account}", 金額="${amountText}" -> ${amount}, 餘額="${balance}"`
            );
          } else if (window.czAssistExtension.selectedBank === "bok") {
            // 高雄銀行：提取日期、帳號和金額
            const dateText = dateCell.textContent.trim();
            date = dateText; // 2025/08/01（已經是完整格式）

            // 帳號（第6欄）
            const accountText = accountCell.textContent.trim();
            // 高雄銀行帳號格式：824-****5749，提取數字部分
            const accountMatch = accountText.match(/(\d{3})-(\*+)(\d+)/);
            if (accountMatch) {
              account = accountMatch[1] + accountMatch[3]; // 8245749
            } else {
              // 如果沒有短橫線格式，直接使用原文字
              account = accountText.replace(/\D/g, ""); // 移除非數字字符
            }

            // 存入金額（第4欄）
            const amountText = amountCell.textContent.trim();
            // 去除逗號並轉換為數字
            amount = parseFloat(amountText.replace(/,/g, "")) || 0;
            
            console.log(
              `高雄銀行交易記錄解析: 日期="${date}", 原始帳號="${accountText}", 提取帳號="${account}", 金額="${amountText}" -> ${amount}`
            );
          } else if (window.czAssistExtension.selectedBank === "chb") {
            // 彰化銀行：組合交易日和時間，提取帳號和金額
            const timeCell = row.querySelector(
              bankConfig.selectors.query.timeCell
            );
            const dateText = dateCell.textContent.trim(); // 114/10/01（民國年）
            const timeText = timeCell ? timeCell.textContent.trim() : ""; // 10:58:26
            const rocDate = `${dateText} ${timeText}`.trim(); // 114/10/01 10:58:26
            
            // 將民國年日期轉換為西元年格式
            date = window.czAssistUtils.convertChbROCDateToWestern(rocDate);
            
            // 存匯代號（第12欄）- 可能是數字帳號或中文姓名
            const accountText = accountCell.textContent.trim();
            console.log("=== 彰化銀行帳號提取 ===");
            console.log("存匯代號原始文字:", accountText);
            
            // 檢查是否包含數字（銀行帳號）
            const hasNumbers = /\d/.test(accountText);
            
            if (hasNumbers) {
              // 如果包含數字，提取純數字（銀行帳號）
              account = accountText.replace(/\D/g, "");
              console.log("提取的帳號（數字）:", account);
            } else {
              // 如果沒有數字，可能是中文姓名或其他，保留原始文字
              account = accountText;
              console.log("提取的帳號（中文姓名）:", account);
            }
            
            // 存入金額（第7欄）
            const amountText = amountCell.textContent.trim();
            amount = parseFloat(amountText.replace(/,/g, "")) || 0;
            
            // 提取存款餘額（第11欄）
            const balanceCellSelector = bankConfig.selectors.query.balanceCell;
            const balanceCellElem = row.querySelector(balanceCellSelector);
            if (balanceCellElem) {
              const balanceText = balanceCellElem.textContent.trim();
              balance = balanceText.replace(/,/g, "");
              console.log(`彰化銀行餘額提取: ${balanceText} -> ${balance}`);
            }
            
            console.log(
              `彰化銀行交易記錄解析: 原始日期="${rocDate}", 轉換日期="${date}", 帳號="${account}", 金額="${amountText}" -> ${amount}, 餘額="${balance}"`
            );
          } else if (window.czAssistExtension.selectedBank === "megabank") {
            // 兆豐銀行：提取日期時間、帳號和金額
            const dateText = dateCell.textContent.trim(); // 2025/11/13(00:01:08)
            
            // 轉換日期格式：2025/11/13(00:01:08) -> 2025/11/13 00:01:08
            const dateMatch = dateText.match(
              /^(\d{4}\/\d{2}\/\d{2})\((\d{2}:\d{2}:\d{2})\)$/
            );
            if (dateMatch) {
              date = `${dateMatch[1]} ${dateMatch[2]}`; // 2025/11/13 00:01:08
            } else {
              date = dateText; // 如果格式不符，使用原始文字
            }
            
            // 備註帳號（格式：822-000050954029076​1 或 ​​822​​​​-​​​​000050954029076​​​​​​1​​）
            const accountText = accountCell.textContent.trim();
            console.log("=== 兆豐銀行帳號提取 ===");
            console.log("備註原始文字:", accountText);
            
            // 移除所有非數字字符（包括短橫線和不可見字符）
            account = accountText.replace(/[^\d]/g, "");
            console.log("提取的帳號（純數字）:", account);
            
            // 存入金額（去除逗號）
            const amountText = amountCell.textContent.trim();
            amount = parseFloat(amountText.replace(/,/g, "")) || 0;
            
            console.log(
              `兆豐銀行交易記錄解析: 原始日期="${dateText}", 轉換日期="${date}", 帳號="${account}", 金額="${amountText}" -> ${amount}`
            );
          } else if (window.czAssistExtension.selectedBank === "bot") {
            // 臺灣銀行：提取銀行代碼和帳號
            // 格式：822 中國信託商業銀行<br>0000428540937901
            
            // 處理日期時間：
            // 日期格式可能是：
            // - 只有日期：2025/11/26
            // - 日期+時間：2025/11/29 19:55:27
            const dateText = dateCell.textContent.trim();
            
            // 檢查 dateText 是否已經包含時間（格式：YYYY/MM/DD HH:MM:SS）
            const dateTimeMatch = dateText.match(/^(\d{4}\/\d{2}\/\d{2})\s+(\d{2}:\d{2}:\d{2})$/);
            
            if (dateTimeMatch) {
              // 已經包含時間，直接使用
              date = dateText;
              console.log(`臺灣銀行：日期時間已包含在欄位中: ${date}`);
            } else {
              // 只有日期，需要添加時間
              // 提取日期部分（去除可能的多餘空格）
              const dateOnly = dateText.match(/^\d{4}\/\d{2}\/\d{2}/)?.[0] || dateText;
              
            let timeStr;
              if (dateOnly === todayStr) {
              // 今天的交易，使用當前時間
              const now = new Date();
                timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
                  now.getMinutes()
                ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
            } else {
              // 昨天或更早的交易，使用固定時間 23:59:00
                timeStr = "23:59:00";
            }
            // 組合完整的日期時間
              date = `${dateOnly} ${timeStr}`;
              console.log(`臺灣銀行：組合日期時間: ${dateOnly} + ${timeStr} = ${date}`);
            }
            
            const accountText = accountCell.innerHTML;
            
            // 提取銀行代碼（<br> 之前的第一個3位數字）
            const bankCodeMatch = accountText.match(/^(\d{3})\s/);
            const bankCode = bankCodeMatch ? bankCodeMatch[1] : "";
            
            // 提取帳號（<br> 之後的數字）
            const accountMatch = accountText.match(/<br[^>]*>(\d+)/);
            const accountNumber = accountMatch ? accountMatch[1] : "";
            
            if (bankCode && accountNumber) {
              // 組合：前3位銀行代碼 + 後16位帳號
              // 確保帳號是16位（如果不足16位，前面補0；如果超過16位，截取前16位）
              const account16 = accountNumber
                .padStart(16, "0")
                .substring(0, 16);
              account = bankCode + account16; // 8220000428540937901
            } else if (accountNumber) {
              // 如果沒有銀行代碼，只使用帳號
              account = accountNumber.padStart(16, "0").substring(0, 16);
          } else {
              // 如果都沒有，嘗試提取所有數字
              const allNumbers = accountText.replace(/\D/g, "");
              account = allNumbers;
            }
            
            const amountText = amountCell.textContent.trim();
            amount = parseFloat(amountText.replace(/,/g, "")) || 0;
            
            // 提取結餘金額（第7欄）
            const balanceCellSelector = bankConfig.selectors.query.balanceCell;
            const balanceCellElem = row.querySelector(balanceCellSelector);
            if (balanceCellElem) {
              const balanceText = balanceCellElem.textContent.trim();
              balance = balanceText.replace(/,/g, "");
              console.log(`臺灣銀行餘額提取: ${balanceText} -> ${balance}`);
            }
            
            console.log(
              `臺灣銀行交易記錄解析: 原始日期="${dateText}", 完整日期時間="${date}", 原始HTML="${accountText}", 銀行代碼="${bankCode}", 帳號="${accountNumber}", 組合帳號="${account}", 金額="${amountText}" -> ${amount}, 餘額="${balance}"`
            );
          } else {
            // 其他銀行：原有邏輯
            const accountText = accountCell.innerHTML;
            const accountMatch = accountText.match(/(\d{10,})/);
            account = accountMatch ? accountMatch[1] : "";
            const amountText = amountCell.textContent.trim();
            amount = parseFloat(amountText.replace(/,/g, "")) || 0;
          }
          
          if (date && amount > 0) {
            // 帳號格式處理（所有銀行統一處理）
            const originalAccount = account;
            if (account && typeof account === "string") {
              // 國泰世華：帳號沒有銀行代碼，直接在前面加上3個0
              if (window.czAssistExtension.selectedBank === "cathay") {
                // 保留原始帳號（不移除前導零）
                // 確保帳號是16位（如果不足16位，前面補0；如果超過16位，截取前16位）
                const account16 = account.padStart(16, "0").substring(0, 16);
                // 在前面加上3個0作為銀行代碼
                account = "000" + account16;
                console.log(
                  `國泰世華帳號格式化: ${originalAccount} -> ${account} (銀行代碼:000, 帳號:${account16})`
                );
              } else if (window.czAssistExtension.selectedBank === "sunny") {
                // 陽信銀行：已經正確組合了帳號（銀行代碼+帳號），直接使用，不移除前導零
                // 帳號格式已經是：0080000310200511217（3位銀行代碼 + 16位帳號）
                console.log(`陽信銀行帳號已正確組合: ${account}`);
              } else if (window.czAssistExtension.selectedBank === "yuanta") {
                // 元大銀行：已經正確組合了帳號（銀行代碼+帳號），直接使用，不移除前導零
                // 帳號格式已經是：0130000012506203790（3位銀行代碼 + 16位帳號）
                console.log(`元大銀行帳號已正確組合: ${account}`);
              } else if (window.czAssistExtension.selectedBank === "bot") {
                // 臺灣銀行：已經正確組合了帳號（銀行代碼+帳號），直接使用，不移除前導零
                // 帳號格式已經是：0120081680011832098（3位銀行代碼 + 16位帳號）
                console.log(`臺灣銀行帳號已正確組合: ${account}`);
              } else {
                // 其他銀行：統一處理
              // 步驟1: 移除前導零
                account = account.replace(/^0+/, "") || "0";
              
              // 步驟2: 檢查是否為純數字帳號
              if (/^\d+$/.test(account)) {
                // 步驟3: 格式化為 19 位（前3位銀行代碼 + 後16位帳號）
                if (account.length >= 3) {
                  const bankCode = account.substring(0, 3); // 前3位銀行代碼
                  const accountNumber = account.substring(3); // 後面的帳號
                  
                  // 步驟4: 帳號部分補0到16位
                    const paddedAccountNumber = accountNumber.padStart(16, "0");
                  
                  // 步驟5: 組合為最終格式
                  const formattedAccount = bankCode + paddedAccountNumber;
                  
                  if (formattedAccount !== account) {
                      console.log(
                        `帳號格式化: ${originalAccount} -> ${account} -> ${formattedAccount} (銀行代碼:${bankCode}, 帳號:${paddedAccountNumber})`
                      );
                  } else if (originalAccount !== account) {
                      console.log(
                        `帳號前導零移除: ${originalAccount} -> ${account}`
                      );
                  }
                  
                  account = formattedAccount;
                } else {
                  // 如果長度小於3，可能不是標準銀行帳號格式，保留原樣
                  console.log(`帳號長度不足3位，保留原樣: ${account}`);
                }
              } else {
                // 非純數字帳號（可能是中文姓名），只移除前導零
                if (originalAccount !== account) {
                    console.log(
                      `非數字帳號，僅移除前導零: ${originalAccount} -> ${account}`
                    );
                  }
                }
              }
            }
            
            // 只記錄有存入金額的交易
            transactions.push({ date, account, amount, balance });
            console.log(
              `交易記錄 ${index}: 日期=${date}, 帳號=${account}, 金額=${amount}, 餘額=${balance}`
            );
          }
        }
      });
      
      // 將結果加入到全域陣列
      window.czAssistExtension.automation.queryResults.push({
        timestamp: new Date().toLocaleString(),
        count: transactions.length,
        transactions,
      });
      
      // 更新側邊欄顯示
      window.czAssistUtils.updateQueryResults();
      
      // 發送交易記錄到 API
      // 注意：sendTransactionsToAPI 會自動通過資料庫 API 檢查並過濾已存在的交易
      if (transactions.length > 0) {
        window.czAssistUtils.sendTransactionsToAPI(transactions);
      } else {
        // 如果沒有交易記錄，檢查是否有下一頁（華南銀行和彰化銀行專用）
        if (window.czAssistExtension.selectedBank === "hncb") {
          const hasNextPage = window.czAssistUtils.checkAndClickNextPage();
          if (!hasNextPage) {
            // 沒有下一頁，進入等待步驟
            window.czAssistExtension.automation.currentStep = 7;
            window.czAssistUtils.executeAutomationStep();
          }
          // 如果有下一頁，函數內部已經處理點擊和重新提取
        } else if (window.czAssistExtension.selectedBank === "chb") {
          const hasNextPage = window.czAssistUtils.checkAndClickChbNextPage();
          if (!hasNextPage) {
            // 沒有下一頁，進入等待步驟
            window.czAssistExtension.automation.currentStep = 7;
            window.czAssistUtils.executeAutomationStep();
          }
          // 如果有下一頁，函數內部已經處理點擊和重新提取
        } else {
          // 其他銀行直接進入等待步驟
          window.czAssistExtension.automation.currentStep = 7;
          window.czAssistUtils.executeAutomationStep();
        }
      }
    } else {
      console.error("找不到數據表格");
      
      // 華南商銀：檢查是否出現 HTTP INTERNAL SERVER ERROR，或者直接重新開始
      if (window.czAssistExtension.selectedBank === "hncb") {
        if (window.czAssistUtils.checkHncbServerError()) {
          console.log(
            "華南商銀找不到數據表格，偵測到 HTTP INTERNAL SERVER ERROR"
          );
          window.czAssistUtils.handleHncbServerError();
          return;
        }
        
        // 沒有 HTTP 錯誤，但找不到數據表格，從步驟 0 重新開始
        console.log("華南商銀找不到數據表格，從步驟 0 重新開始");
        window.czAssistUtils.updateAutomationStatus(
          "找不到數據表格，5秒後重新開始..."
        );
        
        // 生成新的會話 ID，使舊的等待重試自動失效
        window.czAssistExtension.automation.hncbRetrySessionId =
          Date.now().toString() + "_table_retry";
        
        // 等待 5 秒後從步驟 0 重新開始
        setTimeout(() => {
          if (!window.czAssistExtension.automation.isRunning) return;
          console.log("華南商銀：重新開始自動查詢（從帳務查詢總覽）");
          window.czAssistUtils.updateAutomationStatus("重新開始自動查詢...");
          window.czAssistExtension.automation.currentStep = 0;
          window.czAssistUtils.executeAutomationStep();
        }, 5000);
        return;
      }

      // 元大銀行：找不到表格時（可能無數據），進入重新查詢流程
      if (window.czAssistExtension.selectedBank === "yuanta") {
        console.log(
          "元大銀行找不到數據表格（可能無數據），5秒後進入重新查詢流程"
        );
        window.czAssistUtils.updateAutomationStatus("無數據，5秒後重新查詢...");

        // 等待 5 秒後進入 step7 重新查詢流程
        setTimeout(() => {
          if (!window.czAssistExtension.automation.isRunning) return;
          console.log("元大銀行：進入重新查詢流程");
          window.czAssistExtension.automation.currentStep = 7;
          window.czAssistUtils.executeAutomationStep();
        }, 5000);
        return;
      }
      
      window.czAssistUtils.updateAutomationStatus("錯誤：找不到數據表格");
      window.czAssistUtils.stopAutomation();
    }
  },

  // 檢查並點擊下一頁（兆豐銀行專用）
  checkAndClickMegabankNextPage: () => {
    console.log("=== 兆豐銀行：檢查下一頁 ===");
    
    const frameDoc = window.czAssistUtils.getQueryFrameDocument();
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    
    if (!bankConfig) {
      console.error("找不到銀行設定檔");
      return false;
    }
    
    // 查找下一頁按鈕
    const nextPageButton = frameDoc.querySelector(
      bankConfig.selectors.query.nextPageButton
    );
    console.log(`找到下一頁按鈕:`, !!nextPageButton);
    
    if (nextPageButton) {
      // 檢查按鈕是否可點擊（有 onclick 屬性）
      const onclickAttr = nextPageButton.getAttribute("onclick");
      if (onclickAttr && onclickAttr.includes("__pagerNext")) {
        console.log("找到可點擊的下一頁按鈕");
        window.czAssistUtils.updateAutomationStatus("載入下一頁...");
        
        nextPageButton.click();
        
        // 等待頁面載入後，重新提取數據
        setTimeout(() => {
          console.log("下一頁已載入，重新提取交易數據");
          window.czAssistExtension.automation.currentStep = 6; // 回到步驟 6 提取數據
          window.czAssistUtils.executeAutomationStep();
        }, 5000);
        
        return true; // 已點擊下一頁
      } else {
        console.log("下一頁按鈕存在但無法點擊，可能已經是最後一頁");
        return false;
      }
    } else {
      console.log("沒有找到下一頁按鈕，已經是最後一頁");
      return false; // 沒有下一頁
    }
  },

  // 檢查並點擊下一頁（元大銀行專用）
  checkAndClickYuantaNextPage: () => {
    console.log("=== 元大銀行：檢查下一頁 ===");

    const frameDoc = window.czAssistUtils.getQueryFrameDocument();
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];

    if (!bankConfig) {
      console.error("找不到銀行設定檔");
      return false;
    }

    // 元大銀行下一頁按鈕邏輯：
    // - 可點擊時：<a class="next_btn" href="#" onclick="setDataGridCurrentPage(...)">下一頁</a>
    // - 不可點擊時：<span class="next_btn">下一頁</span>

    // 先查找 a 標籤的下一頁按鈕（可點擊的）
    const nextPageLink = frameDoc.querySelector(
      'a.next_btn[onclick*="setDataGridCurrentPage"]'
    );

    if (nextPageLink) {
      console.log("找到可點擊的下一頁按鈕（a 標籤）");
      window.czAssistUtils.updateAutomationStatus("載入下一頁...");

      nextPageLink.click();

      // 等待頁面載入後，重新提取數據
      setTimeout(() => {
        console.log("元大銀行下一頁已載入，重新提取交易數據");
        window.czAssistExtension.automation.currentStep = 6; // 回到步驟 6 提取數據
        window.czAssistUtils.executeAutomationStep();
      }, 3000);

      return true; // 已點擊下一頁
    }

    // 檢查是否有 span 標籤的下一頁（不可點擊，表示已經是最後一頁）
    const nextPageSpan = frameDoc.querySelector("span.next_btn");
    if (nextPageSpan && nextPageSpan.textContent.trim() === "下一頁") {
      console.log("找到不可點擊的下一頁按鈕（span 標籤），已經是最後一頁");
      return false;
    }

    console.log("沒有找到下一頁按鈕，已經是最後一頁");
    return false; // 沒有下一頁
  },

  // 檢查並點擊下一頁（彰化銀行專用）
  checkAndClickChbNextPage: () => {
    console.log("=== 彰化銀行：檢查下一頁 ===");
    
    const frameDoc = window.czAssistUtils.getQueryFrameDocument();
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    
    if (!bankConfig) {
      console.error("找不到銀行設定檔");
      return false;
    }
    
    // 查找所有可能的下一頁按鈕
    const allButtons = frameDoc.querySelectorAll(
      bankConfig.selectors.query.nextPageButton
    );
    console.log(`找到 ${allButtons.length} 個符合條件的按鈕`);
    
    // 找到文字為"下一頁"的按鈕
    let nextPageButton = null;
    for (let button of allButtons) {
      console.log(
        `檢查按鈕: 文字="${button.textContent.trim()}", onclick="${button.getAttribute(
          "onclick"
        )}"`
      );
      if (button.textContent.trim() === "下一頁") {
        nextPageButton = button;
        console.log("找到下一頁按鈕！");
        break;
      }
    }
    
    if (nextPageButton) {
      // 提取當前頁碼和下一頁頁碼（用於日誌）
      const onclickAttr = nextPageButton.getAttribute("onclick");
      const pageMatch = onclickAttr.match(
        /setDataGridCurrentPage\([^,]+,\s*(\d+)/
      );
      const nextPage = pageMatch ? pageMatch[1] : "未知";
      
      console.log(`找到下一頁按鈕，將跳到第 ${nextPage} 頁`);
      window.czAssistUtils.updateAutomationStatus(`載入第 ${nextPage} 頁...`);
      
      nextPageButton.click();
      
      // 等待頁面載入後，重新提取數據
      setTimeout(() => {
        console.log(`第 ${nextPage} 頁已載入，重新提取交易數據`);
        window.czAssistExtension.automation.currentStep = 6; // 回到步驟 6 提取數據
        window.czAssistUtils.executeAutomationStep();
      }, 5000);
      
      return true; // 已點擊下一頁
    } else {
      console.log("沒有找到下一頁按鈕，已經是最後一頁");
      return false; // 沒有下一頁
    }
  },

  // 檢查並點擊下一頁（台灣銀行專用）
  checkAndClickBotNextPage: () => {
    console.log("=== 台灣銀行：檢查下一頁 ===");
    
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    if (!bankConfig) {
      console.error("找不到銀行設定檔");
      return false;
    }
    
    // 台灣銀行使用 MainFrame iframe
    const frameDoc = window.czAssistUtils.getMainFrameDocument();
    
    if (!frameDoc) {
      console.error("找不到 MainFrame iframe");
      return false;
    }
    
    // 查找下一頁按鈕（id="form1:headercmd2"）
    const nextPageButton = frameDoc.querySelector(
      "#form1\\:headercmd2, a#form1\\:headercmd2"
    );
    
    if (!nextPageButton) {
      console.log("找不到下一頁按鈕，可能沒有分頁或已經是最後一頁");
      return false;
    }
    
    // 檢查按鈕是否被禁用（檢查 class 是否包含 disabled 或按鈕是否被禁用）
    const isDisabled =
      nextPageButton.classList.contains("btndisabled") ||
      nextPageButton.hasAttribute("disabled") ||
                       nextPageButton.disabled;
    
    if (isDisabled) {
      console.log("下一頁按鈕已禁用，已經是最後一頁");
      return false; // 沒有下一頁
    }
    
    // 可以點擊，執行點擊
    console.log("找到可點擊的下一頁按鈕，點擊中...");
    window.czAssistUtils.updateAutomationStatus("載入下一頁...");
    
    // 先嘗試直接點擊
    nextPageButton.click();
    
    // 也嘗試觸發 onclick 事件（台灣銀行的按鈕有複雜的 onclick 邏輯）
    const onclick = nextPageButton.getAttribute("onclick");
    if (onclick) {
      try {
        // 在 iframe 的 context 中執行 onclick
        const iframe =
          document.getElementById("MainFrame") ||
          document.querySelector('iframe[name="MainFrame"]');
        if (iframe && iframe.contentWindow) {
          // 使用 iframe 的 window 來執行 onclick
          const onclickFunc = new iframe.contentWindow.Function(
            "return function() { " + onclick + " }"
          )();
          if (typeof onclickFunc === "function") {
            onclickFunc.call(nextPageButton);
          }
        }
      } catch (e) {
        console.warn("執行 onclick 失敗，已使用 click:", e);
      }
    }
    
    // 也嘗試直接觸發表單提交（因為 onclick 中有 form.submit()）
    try {
      const form =
        frameDoc.querySelector('form[name="form1"]') || frameDoc.forms["form1"];
      if (form) {
        // 設置按鈕值（onclick 中有設置 form1:headercmd2.value）
        const buttonInput = form.querySelector(
          'input[name="form1:headercmd2"]'
        );
        if (buttonInput) {
          buttonInput.value = "form1:headercmd2";
          buttonInput.disabled = false;
        }
        // 觸發表單提交
        form.submit();
      }
    } catch (e) {
      console.warn("觸發表單提交失敗:", e);
    }
    
    // 等待頁面載入後，重新提取數據
    setTimeout(() => {
      // 等待表格載入
      const waitForTable = (attempts = 0) => {
        // 檢查自動化是否還在運行
        if (!window.czAssistExtension.automation.isRunning) {
          console.log("自動化已停止，停止等待表格");
          return;
        }
        
        // 檢查是否正在重新查詢
        if (window.czAssistExtension.automation.isRequerying) {
          console.log("正在重新查詢中，停止等待表格");
          return;
        }
        
        // 檢查步驟是否已改變
        if (window.czAssistExtension.automation.currentStep !== 6) {
          console.log(
            `步驟已改變（從 6 變為 ${window.czAssistExtension.automation.currentStep}），停止等待表格`
          );
          return;
        }
        
        const maxAttempts = 10;
        const dataGrid = frameDoc.querySelector(
          bankConfig?.selectors?.query?.dataGrid
        );
        
        if (dataGrid) {
          console.log("下一頁表格已載入，重新提取交易數據");
          // 再次檢查步驟和自動化狀態
          if (
            !window.czAssistExtension.automation.isRunning ||
              window.czAssistExtension.automation.isRequerying ||
            window.czAssistExtension.automation.currentStep !== 6
          ) {
            console.log("狀態已改變，取消提取數據");
            return;
          }
          window.czAssistExtension.automation.currentStep = 6; // 回到步驟 6 提取數據
          window.czAssistUtils.executeAutomationStep();
        } else if (attempts < maxAttempts) {
          console.log(`等待下一頁表格載入... (${attempts + 1}/${maxAttempts})`);
          setTimeout(() => waitForTable(attempts + 1), 1000);
        } else {
          console.error("等待下一頁表格載入超時");
          window.czAssistUtils.updateAutomationStatus(
            "錯誤：下一頁表格載入超時"
          );
          window.czAssistUtils.stopAutomation();
        }
      };
      
      waitForTable();
    }, 3000); // 等待 3 秒讓頁面載入
    
    return true; // 已點擊下一頁
  },

  // 檢查並跳到最後一頁（華南銀行專用）
  checkAndClickNextPage: () => {
    console.log("=== 檢查分頁狀態 ===");
    
    const frameDoc = window.czAssistUtils.getQueryFrameDocument();
    
    // 先查找頁碼下拉框
    const pageNumSelect = frameDoc.querySelector(
      'select#pageNum[name="pageNum"]'
    );
    
    if (pageNumSelect && pageNumSelect.options.length > 0) {
      console.log(`找到頁碼下拉框，共 ${pageNumSelect.options.length} 頁`);
      
      // 找到 value 最大的 option
      let maxValue = 0;
      let maxOption = null;
      
      Array.from(pageNumSelect.options).forEach((option) => {
        const value = parseInt(option.value);
        console.log(
          `頁碼選項: value=${value}, text=${option.text}, selected=${option.selected}`
        );
        
        if (value > maxValue) {
          maxValue = value;
          maxOption = option;
        }
      });
      
      if (maxOption) {
        const currentPage = parseInt(pageNumSelect.value);
        console.log(`當前頁: ${currentPage}, 最後一頁: ${maxValue}`);
        
        // 如果當前頁不是最後一頁，跳到最後一頁
        if (currentPage < maxValue) {
          console.log(`跳到最後一頁: 第 ${maxValue} 頁`);
          window.czAssistUtils.updateAutomationStatus(
            `跳到第 ${maxValue} 頁...`
          );
          
          // 選擇最大的頁碼
          pageNumSelect.value = maxOption.value;
          pageNumSelect.selectedIndex = maxOption.index;
          
          // 觸發 change 事件（會自動調用 changeNewPage）
          pageNumSelect.dispatchEvent(new Event("change", { bubbles: true }));
          
          // 等待頁面載入後，重新提取數據
          const pageLoadWaitTime = 10000;
          setTimeout(() => {
            console.log(`第 ${maxValue} 頁已載入，重新提取交易數據`);
            window.czAssistExtension.automation.currentStep = 6; // 回到步驟 6 提取數據
            window.czAssistUtils.executeAutomationStep();
          }, pageLoadWaitTime);
          
          return true; // 已經跳到最後一頁
        } else {
          console.log(`已經在最後一頁 (第 ${maxValue} 頁)，沒有更多頁面`);
          return false; // 已經在最後一頁
        }
      }
    } else {
      console.log("沒有找到頁碼下拉框，檢查下一頁按鈕...");
      
      // 如果沒有下拉框，回退到原來的按鈕點擊邏輯
      const nextPageButtons = frameDoc.querySelectorAll(
        'input[type="button"][value="下一頁"]'
      );
      console.log(`找到 ${nextPageButtons.length} 個下一頁按鈕`);
      
      for (let button of nextPageButtons) {
        if (!button.disabled) {
          console.log("找到可點擊的下一頁按鈕");
          window.czAssistUtils.updateAutomationStatus("載入下一頁...");
          button.click();
          
          setTimeout(() => {
            console.log("下一頁已載入，重新提取交易數據");
            window.czAssistExtension.automation.currentStep = 6;
            window.czAssistUtils.executeAutomationStep();
          }, 10000);
          
          return true;
        }
      }
      
      console.log("沒有找到可點擊的下一頁按鈕");
    }
    
    return false; // 沒有更多頁面
  },

  // 步驟7: 等待3秒後重新查詢
  step7_waitAndRequery: () => {
    // 清理之前的倒數計時器（防止多重執行）
    if (window.czAssistExtension.automation.intervalId) {
      console.log("清理之前的倒數計時器");
      clearInterval(window.czAssistExtension.automation.intervalId);
      window.czAssistExtension.automation.intervalId = null;
    }
    
    // 恢復原始的查詢天數設定（如果之前因跨日而調整過）
    // 適用於所有支援跨日機制的銀行：華南銀行、彰化銀行、台新銀行
    if (window.czAssistExtension.automation.originalQueryDaysBack !== null) {
      const bankNameMap = {
        hncb: "華南銀行",
        chb: "彰化銀行",
        taishin: "台新銀行",
      };
      const bankName =
        bankNameMap[window.czAssistExtension.selectedBank] || "當前銀行";
      console.log(`=== ${bankName}恢復原始查詢天數設定 ===`);
      console.log(
        "當前查詢天數:",
        window.czAssistExtension.settings.queryDaysBack
      );
      console.log(
        "原始查詢天數:",
        window.czAssistExtension.automation.originalQueryDaysBack
      );

      window.czAssistExtension.settings.queryDaysBack =
        window.czAssistExtension.automation.originalQueryDaysBack;
      window.czAssistExtension.automation.originalQueryDaysBack = null; // 清除記錄
      
      // 同步保存到 storage
      chrome.storage.local.set({
        settings: window.czAssistExtension.settings,
      });
      
      console.log(
        "查詢天數已恢復為:",
        window.czAssistExtension.settings.queryDaysBack
      );
    }
    
    window.czAssistUtils.updateAutomationStatus("等待3秒後重新查詢...", true);
    
    let countdown = 3;
    const countdownInterval = setInterval(() => {
      if (!window.czAssistExtension.automation.isRunning) {
        clearInterval(countdownInterval);
        return;
      }
      
      countdown--;
      window.czAssistUtils.updateAutomationStatus(
        `等待${countdown}秒後重新查詢...`
      );
      window.czAssistUtils.updateProgress(((10 - countdown) / 10) * 100);
      
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        window.czAssistUtils.updateAutomationStatus("重新查詢中...");
        
        // 重新查詢的處理方式根據不同銀行而異
        const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];

        if (window.czAssistExtension.selectedBank === "sunny") {
          // 陽信銀行：從模擬點擊帳務查詢開始重新查詢
          console.log("陽信銀行重新查詢：從模擬點擊帳務查詢開始");

          // 遞增執行版本號，使舊的 setTimeout 回調失效
          window.czAssistExtension.automation.executionId =
            (window.czAssistExtension.automation.executionId || 0) + 1;
          console.log(
            `陽信銀行重新查詢，新執行版本號: ${window.czAssistExtension.automation.executionId}`
          );
          
          // 標記正在重新查詢，清除所有待執行的計時器
          window.czAssistExtension.automation.isRequerying = true;
          if (window.czAssistExtension.automation.pendingTimers) {
            window.czAssistExtension.automation.pendingTimers.forEach(
              (timerId) => {
              clearTimeout(timerId);
              clearInterval(timerId);
              }
            );
            window.czAssistExtension.automation.pendingTimers = [];
          }
          
          // 清空之前的查詢結果
          window.czAssistExtension.automation.queryResults = [];
          
          // 重設到步驟0（點擊帳務查詢）
          const timerId = setTimeout(() => {
            window.czAssistExtension.automation.isRequerying = false;
            window.czAssistExtension.automation.currentStep = 0;
            window.czAssistUtils.executeAutomationStep();
          }, 1000);
          
          // 記錄計時器ID
          if (!window.czAssistExtension.automation.pendingTimers) {
            window.czAssistExtension.automation.pendingTimers = [];
          }
          window.czAssistExtension.automation.pendingTimers.push(timerId);
        } else if (window.czAssistExtension.selectedBank === "ktb") {
          // 京城銀行：直接點擊查詢按鈕重新查詢
          console.log("京城銀行重新查詢：點擊查詢按鈕");
          const queryButton = document.querySelector(
            bankConfig?.selectors.query.queryButton
          );
          if (queryButton) {
            queryButton.click();
            console.log("已點擊京城銀行查詢按鈕，重新查詢");
            
            // 等待查詢完成後，重設到步驟6（提取數據）
            setTimeout(() => {
              window.czAssistExtension.automation.currentStep = 6;
              window.czAssistUtils.executeAutomationStep();
            }, 5000);
          } else {
            console.error("找不到京城銀行查詢按鈕");
            // 如果找不到按鈕，重設到步驟2重新開始
            setTimeout(() => {
              window.czAssistExtension.automation.currentStep = 2;
              window.czAssistUtils.executeAutomationStep();
            }, 1000);
          }
        } else if (window.czAssistExtension.selectedBank === "firstbank") {
          // 第一銀行：點擊重新查詢按鈕
          console.log("第一銀行重新查詢：點擊重新查詢按鈕");
        const frameDoc = window.czAssistUtils.getQueryFrameDocument();
          const requeryButton = frameDoc.querySelector(
            bankConfig?.selectors.query.requeryButton
          );
          if (requeryButton) {
            requeryButton.click();
            console.log("已點擊第一銀行重新查詢按鈕");
            
            // 等待查詢完成後，重設到步驟6（提取數據）
            setTimeout(() => {
              window.czAssistExtension.automation.currentStep = 6;
              window.czAssistUtils.executeAutomationStep();
            }, 5000);
          } else {
            console.error("找不到第一銀行重新查詢按鈕");
            // 如果找不到按鈕，重設到步驟2重新開始
            setTimeout(() => {
              window.czAssistExtension.automation.currentStep = 2;
              window.czAssistUtils.executeAutomationStep();
            }, 1000);
          }
        } else if (window.czAssistExtension.selectedBank === "cathay") {
          // 國泰世華：點擊返回按鈕，然後重新設定日期和查詢
          console.log("國泰世華重新查詢：點擊返回按鈕");
          const returnButton = document.querySelector(
            bankConfig?.selectors.query.returnButton
          );
          if (returnButton) {
            returnButton.click();
            console.log("已點擊國泰世華返回按鈕，回到查詢表單");
            
            // 等待頁面切換後，重設到步驟1（設定日期）
            setTimeout(() => {
              window.czAssistExtension.automation.currentStep = 1;
              window.czAssistUtils.executeAutomationStep();
            }, 2000);
          } else {
            console.error("找不到國泰世華返回按鈕");
            // 如果找不到按鈕，重設到步驟1重新開始
            setTimeout(() => {
              window.czAssistExtension.automation.currentStep = 1;
              window.czAssistUtils.executeAutomationStep();
            }, 1000);
          }
        } else if (window.czAssistExtension.selectedBank === "yuanta") {
          // 元大銀行：重新查詢流程（需要重新選擇第二個帳號）
          console.log("元大銀行重新查詢：執行完整查詢流程");
          const frameDoc = window.czAssistUtils.getQueryFrameDocument();
          
          try {
            // 1. 重新選擇第二個帳號
            const accountCombo = frameDoc.getElementById(
              "cacdp003:accountCombo"
            );
            if (accountCombo && accountCombo.options.length >= 2) {
              accountCombo.selectedIndex = 1;
              accountCombo.value = accountCombo.options[1].value;
              accountCombo.dispatchEvent(new Event("input", { bubbles: true }));
              accountCombo.dispatchEvent(
                new Event("change", { bubbles: true })
              );
              console.log(
                "已重新選擇元大銀行第二個帳號:",
                accountCombo.options[1].text
              );
              
              setTimeout(() => {
                // 2. 設定日期範圍
                const startDateField = frameDoc.querySelector(
                  "#cacdp003\\:startDate"
                );
                const endDateField = frameDoc.querySelector(
                  "#cacdp003\\:endDate"
                );
                
                if (startDateField && endDateField) {
                  const dateRange =
                    window.czAssistUtils.calculateQueryDateRange();
                  startDateField.value = dateRange.startDate;
                  endDateField.value = dateRange.endDate;
                  startDateField.dispatchEvent(
                    new Event("input", { bubbles: true })
                  );
                  endDateField.dispatchEvent(
                    new Event("input", { bubbles: true })
                  );
                  console.log(
                    `元大銀行日期範圍已設定: ${dateRange.startDate} - ${dateRange.endDate}`
                  );
                  
                  setTimeout(() => {
                    // 3. 點擊查詢按鈕
                    const queryButton = frameDoc.querySelector(
                      "#cacdp003\\:linkCommand"
                    );
                    if (queryButton) {
                      queryButton.click();
                      console.log("已點擊元大銀行查詢按鈕");
                      
                      // 等待查詢完成後，重設到步驟6（提取數據）
                      setTimeout(() => {
                        window.czAssistExtension.automation.currentStep = 6;
                        window.czAssistUtils.executeAutomationStep();
                      }, 5000);
                    } else {
                      console.error("找不到元大銀行查詢按鈕");
                      // 如果找不到按鈕，重設到步驟2重新開始
                      setTimeout(() => {
                        window.czAssistExtension.automation.currentStep = 2;
                        window.czAssistUtils.executeAutomationStep();
                      }, 1000);
                    }
                  }, 1000);
                } else {
                  console.error("找不到元大銀行日期輸入框");
                  // 如果找不到日期輸入框，重設到步驟2重新開始
                  setTimeout(() => {
                    window.czAssistExtension.automation.currentStep = 2;
                    window.czAssistUtils.executeAutomationStep();
                  }, 1000);
                }
              }, 1000);
            } else {
              console.error("找不到元大銀行帳戶下拉選單或選項不足");
              // 如果找不到帳戶下拉選單，重設到步驟2重新開始
              setTimeout(() => {
                window.czAssistExtension.automation.currentStep = 2;
                window.czAssistUtils.executeAutomationStep();
              }, 1000);
            }
          } catch (error) {
            console.error("元大銀行重新查詢過程中發生錯誤:", error);
            // 發生錯誤時，重設到步驟2重新開始
            setTimeout(() => {
              window.czAssistExtension.automation.currentStep = 2;
              window.czAssistUtils.executeAutomationStep();
            }, 1000);
          }
        } else if (window.czAssistExtension.selectedBank === "hncb") {
          // 華南商銀：從前往帳務查詢總覽開始重新查詢
          console.log("華南商銀重新查詢：從前往帳務查詢總覽開始");
          
          // 生成新的會話 ID，使舊的等待重試自動失效
          window.czAssistExtension.automation.hncbRetrySessionId =
            Date.now().toString() + "_requery";
          console.log(
            `華南商銀重新查詢：生成新會話 ID (${window.czAssistExtension.automation.hncbRetrySessionId})，舊的等待重試將被取消`
          );
          
          // 重設到步驟0（前往帳務查詢總覽）
          setTimeout(() => {
            window.czAssistExtension.automation.currentStep = 0;
            window.czAssistUtils.executeAutomationStep();
          }, 1000);
        } else if (window.czAssistExtension.selectedBank === "bok") {
          // 高雄銀行：重新查詢流程
          console.log("高雄銀行重新查詢：執行完整查詢流程");
          const frameDoc = window.czAssistUtils.getQueryFrameDocument();
          
          try {
            // 1. 點擊帳戶下拉選單
            const accountComboLabel = frameDoc.querySelector(
              "#formbd\\:accountCombo_label"
            );
            if (accountComboLabel) {
              accountComboLabel.click();
              console.log("已點擊高雄銀行帳戶下拉選單");
              
              setTimeout(() => {
                // 2. 選擇特定帳戶
                const accountOption = frameDoc.querySelector(
                  "li[data-label='612102801100']"
                );
                if (accountOption) {
                  accountOption.click();
                  console.log("已選擇高雄銀行帳戶 612102801100");
                  
                  setTimeout(() => {
                    // 3. 點擊期間類型
                    const periodType = frameDoc.querySelector(
                      "#formbd\\:periodType4"
                    );
                    if (periodType) {
                      periodType.click();
                      console.log("已點擊高雄銀行期間類型");
                      
                      setTimeout(() => {
                        // 4. 設定日期範圍
                        const startDateField = frameDoc.querySelector(
                          "#formbd\\:inputStartDate_input"
                        );
                        const endDateField = frameDoc.querySelector(
                          "#formbd\\:inputEndDate_input"
                        );
                        
                        if (startDateField && endDateField) {
                          const dateRange =
                            window.czAssistUtils.calculateQueryDateRange();
                          startDateField.value = dateRange.startDate;
                          endDateField.value = dateRange.endDate;
                          startDateField.dispatchEvent(
                            new Event("input", { bubbles: true })
                          );
                          endDateField.dispatchEvent(
                            new Event("input", { bubbles: true })
                          );
                          console.log(
                            `高雄銀行日期範圍已設定: ${dateRange.startDate} - ${dateRange.endDate}`
                          );
                          
                          setTimeout(() => {
                            // 5. 點擊查詢按鈕
                            const queryButton =
                              frameDoc.querySelector("#formbd .btnBox a");
                            if (queryButton) {
                              queryButton.click();
                              console.log("已點擊高雄銀行查詢按鈕");
                              
                              // 等待查詢完成後，重設到步驟6（提取數據）
                              setTimeout(() => {
                                window.czAssistExtension.automation.currentStep = 6;
                                window.czAssistUtils.executeAutomationStep();
                              }, 5000);
                            } else {
                              console.error("找不到高雄銀行查詢按鈕");
                              // 如果找不到按鈕，重設到步驟2重新開始
                              setTimeout(() => {
                                window.czAssistExtension.automation.currentStep = 2;
                                window.czAssistUtils.executeAutomationStep();
                              }, 1000);
                            }
                          }, 1000);
                        } else {
                          console.error("找不到高雄銀行日期輸入框");
                          // 如果找不到日期輸入框，重設到步驟2重新開始
                          setTimeout(() => {
                            window.czAssistExtension.automation.currentStep = 2;
                            window.czAssistUtils.executeAutomationStep();
                          }, 1000);
                        }
                      }, 1000);
                    } else {
                      console.error("找不到高雄銀行期間類型選項");
                      // 如果找不到期間類型選項，重設到步驟2重新開始
                      setTimeout(() => {
                        window.czAssistExtension.automation.currentStep = 2;
                        window.czAssistUtils.executeAutomationStep();
                      }, 1000);
                    }
                  }, 1000);
                } else {
                  console.error("找不到高雄銀行帳戶選項");
                  // 如果找不到帳戶選項，重設到步驟2重新開始
                  setTimeout(() => {
                    window.czAssistExtension.automation.currentStep = 2;
                    window.czAssistUtils.executeAutomationStep();
                  }, 1000);
                }
              }, 1000);
            } else {
              console.error("找不到高雄銀行帳戶下拉選單");
              // 如果找不到帳戶下拉選單，重設到步驟2重新開始
              setTimeout(() => {
                window.czAssistExtension.automation.currentStep = 2;
                window.czAssistUtils.executeAutomationStep();
              }, 1000);
            }
          } catch (error) {
            console.error("高雄銀行重新查詢過程中發生錯誤:", error);
            // 發生錯誤時，重設到步驟2重新開始
            setTimeout(() => {
              window.czAssistExtension.automation.currentStep = 2;
              window.czAssistUtils.executeAutomationStep();
            }, 1000);
          }
        } else if (window.czAssistExtension.selectedBank === "megabank") {
          // 兆豐銀行：重新執行查詢流程
          console.log("兆豐銀行重新查詢：執行完整查詢流程");
          const frameDoc = window.czAssistUtils.getQueryFrameDocument();
          
          try {
            const queryDaysBack =
              window.czAssistExtension.settings.queryDaysBack ?? 0;
            
            // 如果需要設定日期
            if (queryDaysBack > 0) {
              const dateRange = window.czAssistUtils.calculateQueryDateRange();
              let startDateField = frameDoc.querySelector("#main\\:startDate");
              if (!startDateField) {
                startDateField = frameDoc.getElementById("main:startDate");
              }
              
              if (startDateField) {
                startDateField.value = dateRange.startDate;
                startDateField.dispatchEvent(
                  new Event("input", { bubbles: true })
                );
                startDateField.dispatchEvent(
                  new Event("change", { bubbles: true })
                );
                console.log(
                  `兆豐銀行起始日期已重新設定: ${dateRange.startDate}`
                );
              }
            }
            
            setTimeout(() => {
              // 點擊查詢按鈕
              const queryButton = frameDoc.querySelector(
                'a[onclick*="main:j_id145"]'
              );
              
              if (queryButton) {
                queryButton.click();
                console.log("已點擊兆豐銀行查詢按鈕");
                
                // 等待查詢完成後，重設到步驟6（提取數據）
                setTimeout(() => {
                  window.czAssistExtension.automation.currentStep = 6;
                  window.czAssistUtils.executeAutomationStep();
                }, 5000);
              } else {
                console.error("找不到兆豐銀行查詢按鈕");
                // 如果找不到按鈕，從步驟0重新開始
                setTimeout(() => {
                  window.czAssistExtension.automation.currentStep = 0;
                  window.czAssistUtils.executeAutomationStep();
                }, 1000);
              }
            }, 1000);
          } catch (error) {
            console.error("兆豐銀行重新查詢過程中發生錯誤:", error);
            // 發生錯誤時，從步驟0重新開始
            setTimeout(() => {
              window.czAssistExtension.automation.currentStep = 0;
              window.czAssistUtils.executeAutomationStep();
            }, 1000);
          }
        } else if (window.czAssistExtension.selectedBank === "chb") {
          // 彰化銀行：重新執行完整查詢流程（包含選擇頁面大小和日期設定）
          console.log("彰化銀行重新查詢：執行完整查詢流程");
          const frameDoc = window.czAssistUtils.getQueryFrameDocument();
          
          try {
            // ... (保留彰化銀行的原有邏輯，這裡只顯示開頭) ...
            // 1. 重新選擇 TWD 帳號
            let accountCombo = frameDoc.querySelector("#form1\\:accountCombo");
            if (!accountCombo) {
              accountCombo = frameDoc.getElementById("form1:accountCombo");
            }
            
            if (accountCombo && accountCombo.options.length >= 2) {
              accountCombo.selectedIndex = 1;
              accountCombo.value = accountCombo.options[1].value;
              accountCombo.dispatchEvent(new Event("input", { bubbles: true }));
              accountCombo.dispatchEvent(
                new Event("change", { bubbles: true })
              );
              console.log(
                "已重新選擇彰化銀行 TWD 帳號:",
                accountCombo.options[1].text
              );
              
              setTimeout(() => {
                // 2. 檢查是否需要設定日期
                const queryDaysBack =
                  window.czAssistExtension.settings.queryDaysBack ?? 0;
                
                if (queryDaysBack > 0) {
                  // 需要設定日期
                  const dateRange =
                    window.czAssistUtils.calculateQueryDateRange();
                  let startDateField =
                    frameDoc.querySelector("#form1\\:startdate");
                  if (!startDateField) {
                    startDateField = frameDoc.getElementById("form1:startdate");
                  }
                  
                  if (startDateField) {
                    startDateField.value = dateRange.startDate;
                    startDateField.dispatchEvent(
                      new Event("input", { bubbles: true })
                    );
                    startDateField.dispatchEvent(
                      new Event("change", { bubbles: true })
                    );
                    console.log(`彰化銀行起日已設定: ${dateRange.startDate}`);
                  }
                }
                
                setTimeout(() => {
                  // 3. 點擊查詢按鈕
                  let queryButton = frameDoc.querySelector("#form1\\:lnkQuery");
                  if (!queryButton) {
                    queryButton = frameDoc.getElementById("form1:lnkQuery");
                  }
                  
                  if (queryButton) {
                    queryButton.click();
                    console.log("已點擊彰化銀行查詢按鈕");
                    
                    setTimeout(() => {
                      // 4. 選擇每頁200筆
                      let pageSizeSelect = frameDoc.getElementById(
                        "cboCurrentPageSize2"
                      );
                      
                      if (pageSizeSelect && pageSizeSelect.value !== "200") {
                        pageSizeSelect.value = "200";
                        pageSizeSelect.dispatchEvent(
                          new Event("change", { bubbles: true })
                        );
                        console.log(
                          "已重新選擇每頁顯示200筆，等待頁面重新載入..."
                        );
                        
                        // 等待頁面重新載入後，重設到步驟6（提取數據）
                        setTimeout(() => {
                          console.log("頁面已重新載入為200筆/頁模式");
                          window.czAssistExtension.automation.currentStep = 6;
                          window.czAssistUtils.executeAutomationStep();
                        }, 5000);
                      } else if (
                        pageSizeSelect &&
                        pageSizeSelect.value === "200"
                      ) {
                        console.log("已經是每頁顯示200筆，直接提取數據");
                        // 已經是200筆，直接提取數據
                        setTimeout(() => {
                          window.czAssistExtension.automation.currentStep = 6;
                          window.czAssistUtils.executeAutomationStep();
                        }, 1000);
                      } else {
                        console.warn("找不到頁面大小選擇框，直接提取數據");
                        // 找不到頁面大小選擇框，直接進入數據提取
                        setTimeout(() => {
                          window.czAssistExtension.automation.currentStep = 6;
                          window.czAssistUtils.executeAutomationStep();
                        }, 1000);
                      }
                    }, 5000);
                  } else {
                    console.error("找不到彰化銀行查詢按鈕");
                    // 如果找不到按鈕，從步驟0重新開始
                    setTimeout(() => {
                      window.czAssistExtension.automation.currentStep = 0;
                      window.czAssistUtils.executeAutomationStep();
                    }, 1000);
                  }
                }, 1000);
              }, 1000);
            } else {
              console.error("找不到彰化銀行帳戶下拉選單或選項不足");
              // 如果找不到帳戶下拉選單，從步驟0重新開始
              setTimeout(() => {
                window.czAssistExtension.automation.currentStep = 0;
                window.czAssistUtils.executeAutomationStep();
              }, 1000);
            }
          } catch (error) {
            console.error("彰化銀行重新查詢過程中發生錯誤:", error);
            // 發生錯誤時，從步驟0重新開始
            setTimeout(() => {
              window.czAssistExtension.automation.currentStep = 0;
              window.czAssistUtils.executeAutomationStep();
            }, 1000);
          }
        } else if (window.czAssistExtension.selectedBank === "ubot") {
          // 聯邦銀行：點擊查詢明細按鈕重新查詢
          console.log("聯邦銀行重新查詢：點擊查詢明細按鈕");
          const bankConfig =
            BANK_CONFIGS[window.czAssistExtension.selectedBank];
          const transactionQueryLink = document.querySelector(
            bankConfig?.selectors.navigation.transactionQueryLink
          );
          
          if (transactionQueryLink) {
            transactionQueryLink.click();
            console.log("已點擊聯邦銀行查詢明細按鈕，重新查詢");
            
            // 等待頁面載入後，重設到步驟2（設定日期範圍）
            // 因為已經點擊了查詢明細按鈕，接下來需要設定日期範圍
            setTimeout(() => {
              window.czAssistExtension.automation.currentStep = 2;
              window.czAssistExtension.automation.queryResults = [];
              window.czAssistUtils.executeAutomationStep();
            }, 3000);
          } else {
            console.error("找不到聯邦銀行查詢明細按鈕");
            // 如果找不到按鈕，從步驟1重新開始
            setTimeout(() => {
              window.czAssistExtension.automation.currentStep = 1;
              window.czAssistExtension.automation.queryResults = [];
              window.czAssistUtils.executeAutomationStep();
            }, 1000);
          }
        } else if (window.czAssistExtension.selectedBank === "tbb") {
          // 臺灣企銀：重新執行完整查詢流程
          console.log("臺灣企銀重新查詢：點擊回上頁按鈕");
          
          try {
            // 1. 點擊「回上頁」按鈕
            const backButton = document.querySelector("#CMBACK");
            if (backButton) {
              backButton.click();
              console.log("已點擊臺灣企銀回上頁按鈕，回到查詢表單");
              
              // 等待頁面回到查詢表單
              // 使用輪詢檢查機制，確保帳號下拉選單已載入
              const waitForAccountSelect = (attempts = 0) => {
                const maxAttempts = 15; // 最多嘗試 15 次（3 秒）
                
                const accountSelect = document.querySelector("#ACN");

                if (
                  accountSelect &&
                  accountSelect.options &&
                  accountSelect.options.length > 0
                ) {
                  // 帳號下拉選單已載入
                  console.log("帳號下拉選單已載入，開始選擇帳號");
                  
                  const targetAccountNumber =
                    window.czAssistUtils.getTbbTargetAccount();
                  
                  const option = Array.from(accountSelect.options).find(
                    (opt) => opt.value === targetAccountNumber
                  );
                  
                  if (option) {
                    console.log(
                      `找到目標帳號 ${targetAccountNumber}，選擇中...`
                    );
                    accountSelect.value = targetAccountNumber;
                    accountSelect.dispatchEvent(
                      new Event("change", { bubbles: true })
                    );
                    
                    // 驗證是否選擇成功
                    if (accountSelect.value === targetAccountNumber) {
                      console.log(`帳號已成功選擇: ${accountSelect.value}`);
                    } else {
                      console.warn(
                        `帳號選擇可能失敗，當前值: ${accountSelect.value}`
                      );
                    }
                    
                    // 等待帳號選擇生效後，進入步驟 2（設定日期範圍）
                    setTimeout(() => {
                      console.log("帳號已選擇，進入日期範圍設定");
                      window.czAssistExtension.automation.currentStep = 2;
                      window.czAssistExtension.automation.queryResults = []; // 清空結果
                      window.czAssistUtils.executeAutomationStep();
                    }, 1000);
                  } else {
                    console.error(
                      `找不到帳號選項 ${targetAccountNumber}，直接進入步驟 2`
                    );
                    const allOptions = Array.from(accountSelect.options).map(
                      (opt) => opt.value
                    );
                    console.error("可用的帳號選項:", allOptions);
                    window.czAssistExtension.automation.currentStep = 2;
                    window.czAssistExtension.automation.queryResults = [];
                    window.czAssistUtils.executeAutomationStep();
                  }
                } else if (attempts < maxAttempts) {
                  // 帳號下拉選單還沒載入，繼續等待
                  console.log(
                    `等待帳號下拉選單載入... (嘗試 ${
                      attempts + 1
                    }/${maxAttempts})`
                  );
                  setTimeout(() => waitForAccountSelect(attempts + 1), 200);
                } else {
                  console.error("帳號下拉選單載入超時，直接進入步驟 2");
                  window.czAssistExtension.automation.currentStep = 2;
                  window.czAssistExtension.automation.queryResults = [];
                  window.czAssistUtils.executeAutomationStep();
                }
              };
              
              // 開始等待帳號下拉選單
              setTimeout(() => waitForAccountSelect(), 500);
              } else {
              console.error("找不到臺灣企銀回上頁按鈕");
              // 如果找不到按鈕，從步驟 2 重新開始（重新設定日期）
                setTimeout(() => {
                window.czAssistExtension.automation.currentStep = 2;
                  window.czAssistUtils.executeAutomationStep();
                }, 1000);
              }
          } catch (error) {
            console.error("臺灣企銀重新查詢過程中發生錯誤:", error);
            setTimeout(() => {
              window.czAssistExtension.automation.currentStep = 2;
              window.czAssistUtils.executeAutomationStep();
            }, 1000);
          }
        } else if (window.czAssistExtension.selectedBank === "taishin") {
          // 台新銀行：重新執行完整查詢流程
          console.log("台新銀行重新查詢：執行完整查詢流程");
          
          // 清空之前的查詢結果
          window.czAssistExtension.automation.queryResults = [];
          
          // 重設到步驟0（點擊存匯授信服務）重新開始
          setTimeout(() => {
            window.czAssistExtension.automation.currentStep = 0;
            window.czAssistUtils.executeAutomationStep();
          }, 1000);
        } else if (window.czAssistExtension.selectedBank === "skbank") {
          // 新光商銀：從選擇帳號開始重新查詢
          console.log("新光商銀重新查詢：從選擇帳號開始");
          
          // 清空之前的查詢結果
          window.czAssistExtension.automation.queryResults = [];
          // 清空已點擊頁碼記錄
          window.czAssistExtension.automation.skbankClickedPages = null;
          // 清除已點擊「下一頁」標記
          window.czAssistExtension.automation.skbankClickedNextPage = false;
          
          // 重設到步驟0（點擊臺/外幣交易明細查詢）
          setTimeout(() => {
            window.czAssistExtension.automation.currentStep = 0;
            window.czAssistUtils.executeAutomationStep();
          }, 1000);
        } else if (window.czAssistExtension.selectedBank === "tcb") {
          // 台中銀行：從點擊交易明細查詢開始重新查詢
          console.log("台中銀行重新查詢：從點擊交易明細查詢開始");
          
          // 標記正在重新查詢，清除所有待執行的計時器
          window.czAssistExtension.automation.isRequerying = true;
          if (window.czAssistExtension.automation.pendingTimers) {
            window.czAssistExtension.automation.pendingTimers.forEach(
              (timerId) => {
              clearTimeout(timerId);
              clearInterval(timerId);
              }
            );
            window.czAssistExtension.automation.pendingTimers = [];
          }
          
          // 清空之前的查詢結果
          window.czAssistExtension.automation.queryResults = [];
          
          // 重設到步驟1（點擊交易明細查詢）
          const timerId = setTimeout(() => {
            window.czAssistExtension.automation.isRequerying = false;
            window.czAssistExtension.automation.currentStep = 1;
            window.czAssistUtils.executeAutomationStep();
          }, 1000);
          
          // 記錄計時器ID
          if (!window.czAssistExtension.automation.pendingTimers) {
            window.czAssistExtension.automation.pendingTimers = [];
          }
          window.czAssistExtension.automation.pendingTimers.push(timerId);
        } else if (window.czAssistExtension.selectedBank === "fubon") {
          // 富邦銀行：先調整查詢時間區間，然後點擊開始查詢按鈕
          console.log(
            "富邦銀行重新查詢：先調整查詢時間區間，然後點擊開始查詢按鈕"
          );
          
          // 清理之前的輪詢計時器（如果有的話）
          if (window.czAssistExtension.fubonQueryPollingTimer) {
            console.log("清理之前的查詢輪詢計時器");
            clearTimeout(window.czAssistExtension.fubonQueryPollingTimer);
            window.czAssistExtension.fubonQueryPollingTimer = null;
          }
          // 標記輪詢為非活動狀態，防止舊的輪詢繼續運行
          window.czAssistExtension.fubonQueryPollingActive = false;
          
          // 清空之前的查詢結果
          window.czAssistExtension.automation.queryResults = [];
          
          // 獲取 txnFrame 的 document
          const frameDoc = window.czAssistUtils.getFubonTxnFrame();
          
          // 計算日期範圍
          const dateRange = window.czAssistUtils.calculateQueryDateRange();
          const startDateFormatted = dateRange.startDate;
          
          console.log(`富邦銀行重新查詢：設定起日為 ${startDateFormatted}`);
          
          // 1. 先調整查詢時間區間
          const startDateInput =
            frameDoc.querySelector(bankConfig?.selectors.query.startDate) ||
            frameDoc.querySelector(bankConfig?.selectors.query.startDateAlt);
          
          if (startDateInput) {
            // 先選擇「自訂查詢」radio button
            const customRadio = frameDoc.querySelector(
              '#form1\\:rdoCustom, input[name="form1:rdoGroup21"][value="2"]'
            );
            if (customRadio) {
              customRadio.checked = true;
              customRadio.dispatchEvent(new Event("change", { bubbles: true }));
              customRadio.dispatchEvent(new Event("click", { bubbles: true }));
              console.log("已選擇「自訂查詢」");
            }
            
            // focus 輸入框來觸發 onfocus 事件
            startDateInput.focus();
            
            // 等待 onfocus 處理完成後設定日期
            setTimeout(() => {
              // 設定起日
              startDateInput.value = startDateFormatted;
              startDateInput.dispatchEvent(
                new Event("input", { bubbles: true })
              );
              startDateInput.dispatchEvent(
                new Event("change", { bubbles: true })
              );
              startDateInput.dispatchEvent(
                new KeyboardEvent("keyup", { bubbles: true })
              );
              startDateInput.blur();
              startDateInput.dispatchEvent(
                new Event("blur", { bubbles: true })
              );
              
              console.log(`起日已設定: ${startDateFormatted}`);
              
              // 確保自訂查詢 radio 仍然被選中
              if (customRadio) {
                customRadio.checked = true;
              }
              
              // 2. 等待一下後點擊開始查詢按鈕
              setTimeout(() => {
                const queryButton =
                  frameDoc.querySelector(
                    bankConfig?.selectors.query.queryButton
                  ) ||
                  frameDoc.querySelector(
                    bankConfig?.selectors.query.queryButtonAlt
                  );
                
                if (queryButton) {
                  console.log("找到開始查詢按鈕，點擊中...");
                  queryButton.click();
                  
                  // 也嘗試觸發 onclick 事件
                  const onclick = queryButton.getAttribute("onclick");
                  if (onclick) {
                    try {
                      eval(onclick);
                    } catch (e) {
                      console.warn("執行 onclick 失敗，使用 click:", e);
                      queryButton.click();
                    }
                  }
                  
                  // 重設到步驟2（執行查詢後等待結果）
                  setTimeout(() => {
                    window.czAssistExtension.automation.currentStep = 2;
                    window.czAssistUtils.executeAutomationStep();
                  }, 4000);
                } else {
                  console.error("找不到開始查詢按鈕");
                  window.czAssistUtils.updateAutomationStatus(
                    "錯誤：找不到開始查詢按鈕"
                  );
                  window.czAssistUtils.stopAutomation();
                }
              }, 3000);
            }, 1000);
          } else {
            console.error("找不到起日輸入框");
            // 如果找不到輸入框，直接嘗試點擊查詢按鈕
            const queryButton =
              frameDoc.querySelector(bankConfig?.selectors.query.queryButton) ||
              frameDoc.querySelector(
                bankConfig?.selectors.query.queryButtonAlt
              );
            
            if (queryButton) {
              console.log("找不到起日輸入框，直接點擊開始查詢按鈕");
              queryButton.click();
              
              const onclick = queryButton.getAttribute("onclick");
              if (onclick) {
                try {
                  eval(onclick);
                } catch (e) {
                  console.warn("執行 onclick 失敗，使用 click:", e);
                  queryButton.click();
                }
              }
              
              setTimeout(() => {
                window.czAssistExtension.automation.currentStep = 2;
                window.czAssistUtils.executeAutomationStep();
              }, 2000);
            } else {
              console.error("找不到起日輸入框和開始查詢按鈕");
              window.czAssistUtils.updateAutomationStatus(
                "錯誤：找不到查詢表單元素"
              );
              window.czAssistUtils.stopAutomation();
            }
          }
        } else if (window.czAssistExtension.selectedBank === "landbank") {
          // 土地銀行：先點擊回功能首頁，然後從點擊帳務總覽查詢開始重新查詢
          console.log(
            "土地銀行重新查詢：先點擊回功能首頁，然後點擊帳務總覽查詢"
          );
          
          // 標記正在重新查詢，清除所有待執行的計時器
          window.czAssistExtension.automation.isRequerying = true;
          if (window.czAssistExtension.automation.pendingTimers) {
            window.czAssistExtension.automation.pendingTimers.forEach(
              (timerId) => {
              clearTimeout(timerId);
              clearInterval(timerId);
              }
            );
            window.czAssistExtension.automation.pendingTimers = [];
          }
          
          // 獲取 main frame 的 document
          const frameDoc = window.czAssistUtils.getLandbankMainFrame();
          
          // 先點擊回功能首頁按鈕
          const homeButton =
            frameDoc.querySelector(
            bankConfig?.selectors.navigation.homeButton
            ) ||
            frameDoc.querySelector(
            bankConfig?.selectors.navigation.homeButtonAlt
          );
          
          if (homeButton) {
            console.log("找到回功能首頁按鈕，點擊中...");
            homeButton.click();
            
            // 也嘗試觸發 onclick 事件
            const onclick = homeButton.getAttribute("onclick");
            if (onclick) {
              try {
                eval(onclick);
              } catch (e) {
                console.warn("執行 onclick 失敗，使用 click:", e);
                homeButton.click();
              }
            }
            
            // 等待頁面載入後，再點擊帳務總覽查詢
            const timerId = setTimeout(() => {
              window.czAssistExtension.automation.isRequerying = false;
              window.czAssistExtension.automation.currentStep = 1; // step2 對應 currentStep = 1
              window.czAssistExtension.automation.queryResults = []; // 清空之前的結果
              window.czAssistUtils.executeAutomationStep();
            }, 3000); // 等待3秒讓頁面載入
            
            // 記錄計時器ID
            if (!window.czAssistExtension.automation.pendingTimers) {
              window.czAssistExtension.automation.pendingTimers = [];
            }
            window.czAssistExtension.automation.pendingTimers.push(timerId);
          } else {
            console.warn("找不到回功能首頁按鈕，直接進入帳務總覽查詢");
            // 如果找不到回功能首頁按鈕，直接進入帳務總覽查詢
            const timerId = setTimeout(() => {
              window.czAssistExtension.automation.isRequerying = false;
              window.czAssistExtension.automation.currentStep = 1;
              window.czAssistExtension.automation.queryResults = [];
              window.czAssistUtils.executeAutomationStep();
            }, 1000);
            
            // 記錄計時器ID
            if (!window.czAssistExtension.automation.pendingTimers) {
              window.czAssistExtension.automation.pendingTimers = [];
            }
            window.czAssistExtension.automation.pendingTimers.push(timerId);
          }
        } else if (window.czAssistExtension.selectedBank === "ctbc") {
          // 中國信託：從模擬點擊存款明細查詢開始重新查詢
          console.log("中國信託重新查詢：從點擊存款明細查詢開始");
          
          // 清空之前的查詢結果
          window.czAssistExtension.automation.queryResults = [];
          
          // 重設到步驟0（點擊查詢連結）
          setTimeout(() => {
            window.czAssistExtension.automation.currentStep = 0;
            window.czAssistUtils.executeAutomationStep();
          }, 1000);
        } else if (window.czAssistExtension.selectedBank === "bot") {
          // 台灣銀行：先點擊「重新查詢」按鈕回到設定頁面，再重新設定日期並查詢
          console.log("台灣銀行重新查詢：點擊重新查詢按鈕");
          
          // 清空之前的查詢結果
          window.czAssistExtension.automation.queryResults = [];
          
          // 點擊「重新查詢」按鈕（ID: form1:linkCommand），按鈕在 MainFrame iframe 中
          const mainFrame = document.getElementById("MainFrame");
          const frameDoc =
            mainFrame?.contentDocument || mainFrame?.contentWindow?.document;
          const reqeuryButton = frameDoc?.getElementById("form1:linkCommand");

          if (reqeuryButton) {
            console.log(
              "找到重新查詢按鈕（在 MainFrame iframe 中），點擊中..."
            );
            reqeuryButton.click();

            // 等待頁面載入後，再進入步驟4（設定日期）
            setTimeout(() => {
              console.log("台灣銀行重新查詢：頁面已載入，進入設定日期步驟");
              window.czAssistExtension.automation.currentStep = 4;
              window.czAssistUtils.executeAutomationStep();
            }, 10000); // 等待 10 秒讓頁面載入
          } else {
            console.warn(
              "找不到重新查詢按鈕（在 MainFrame iframe 中），嘗試直接進入設定日期步驟"
            );
            // 如果找不到按鈕，嘗試直接進入步驟4
          setTimeout(() => {
            window.czAssistExtension.automation.currentStep = 4;
            window.czAssistUtils.executeAutomationStep();
          }, 1000);
          }
        } else {
          // 其他銀行：點擊查詢按鈕重新查詢
        const frameDoc = window.czAssistUtils.getQueryFrameDocument();
          // 對於包含冒號的選擇器（如 form1:linkCommand），需要轉義或使用 getElementById
          let queryButton = null;
          const selector = bankConfig?.selectors?.query?.queryButton;
          if (selector) {
            // 優先使用 getElementById（適用於包含冒號的 ID）
            queryButton = frameDoc.getElementById(selector);
            if (!queryButton) {
              // 如果 getElementById 失敗，嘗試轉義冒號後使用 querySelector
              try {
                const escapedSelector = selector.replace(/:/g, "\\:");
                queryButton = frameDoc.querySelector(`#${escapedSelector}`);
              } catch (e) {
                console.warn("無法使用 querySelector 查找查詢按鈕:", e);
              }
            }
          }
        if (queryButton) {
          // 華南銀行需要特殊處理 CSP 限制
            if (window.czAssistExtension.selectedBank === "hncb") {
            window.czAssistUtils.handleHncbQueryButton(queryButton, frameDoc);
          } else {
            queryButton.click();
          }
        }
        
        // 重設到步驟4（設定日期）
        setTimeout(() => {
          window.czAssistExtension.automation.currentStep = 4;
          window.czAssistUtils.executeAutomationStep();
        }, 5000);
        }
      }
    }, 1000);
    
    window.czAssistExtension.automation.intervalId = countdownInterval;
  },

  // 更新查詢結果顯示
  updateQueryResults: () => {
    const resultsList = document.getElementById("cz-results-list");
    if (!resultsList) return;
    
    const results = window.czAssistExtension.automation.queryResults;
    if (!results || results.length === 0) {
      resultsList.innerHTML = "暫無查詢結果";
      return;
    }
    
    let html = "";
    
    // 檢查第一個元素的格式，判斷是包裝格式還是直接交易記錄格式
    const firstResult = results[0];
    const isWrappedFormat =
      firstResult && firstResult.transactions && firstResult.timestamp;
    
    if (isWrappedFormat) {
      // 包裝格式：{ timestamp, count, transactions }
      results.slice(-5).forEach((result) => {
        if (!result || !result.transactions) return;
        // 只顯示最近5次結果
        html += `
          <div class="cz-result-item">
            <div class="cz-result-time">${result.timestamp || ""}</div>
            <div class="cz-result-summary">找到 ${
              result.count || 0
            } 筆交易記錄</div>
            <div class="cz-result-details">
              ${(result.transactions || [])
                .slice(0, 3)
                .map(
                  (t) =>
                `<div class="cz-transaction">
                  ${t.date} | ${t.account || ""} | $${(
                      t.amount || 0
                    ).toLocaleString()}
                </div>`
                )
                .join("")}
              ${
                (result.transactions || []).length > 3
                  ? `<div class="cz-more">還有 ${
                      result.transactions.length - 3
                    } 筆...</div>`
                  : ""
              }
            </div>
          </div>
        `;
      });
    } else {
      // 直接交易記錄格式：直接是交易記錄數組
      const transactions = results.filter((r) => r && r.date); // 過濾掉非交易記錄的項目
      if (transactions.length > 0) {
        html += `
          <div class="cz-result-item">
            <div class="cz-result-time">${new Date().toLocaleString()}</div>
            <div class="cz-result-summary">找到 ${
              transactions.length
            } 筆交易記錄</div>
            <div class="cz-result-details">
              ${transactions
                .slice(0, 3)
                .map(
                  (t) =>
                `<div class="cz-transaction">
                  ${t.date || ""} | ${t.account || ""} | $${(
                      t.amount || 0
                    ).toLocaleString()}
                </div>`
                )
                .join("")}
              ${
                transactions.length > 3
                  ? `<div class="cz-more">還有 ${
                      transactions.length - 3
                    } 筆...</div>`
                  : ""
              }
            </div>
          </div>
        `;
      }
    }
    
    resultsList.innerHTML = html || "暫無查詢結果";
  },

  // 生成交易記錄的唯一標識符
  generateTransactionId: (transaction) => {
    // 淡水一信：交易時間是動態生成的，使用摘要 + 金額 + 日期（不含時間）來判斷
    if (window.czAssistExtension.selectedBank === "tfcc") {
      // 提取日期部分（不含時間）
      const dateOnly = transaction.date.split(" ")[0]; // 例如: "2025/10/22 14:02:00" -> "2025/10/22"
      // 使用 摘要 + 金額 + 日期 組合作為唯一ID
      return `${transaction.summary || ""}_${transaction.amount}_${dateOnly}`;
    }
    
    // 台中銀行：使用 uniqueId（包含日期、餘額、存入金額）來判斷
    if (window.czAssistExtension.selectedBank === "tcb") {
      if (transaction.uniqueId) {
        return transaction.uniqueId;
      }
      // 如果沒有 uniqueId，fallback 到日期 + 餘額 + 金額
      // 提取日期部分（不含時間）
      const dateOnly = transaction.date.split(" ")[0];
      return `${dateOnly}_${transaction.balance || ""}_${transaction.amount}`;
    }
    
    // 中國信託：使用 uniqueId（包含日期、存入金額、餘額）來判斷
    if (window.czAssistExtension.selectedBank === "ctbc") {
      if (transaction.uniqueId) {
        return transaction.uniqueId;
      }
      // 如果沒有 uniqueId，fallback 到日期 + 金額 + 餘額
      // 提取日期部分（不含時間）
      const dateOnly = transaction.date.split(" ")[0];
      return `${dateOnly}_${transaction.amount}_${transaction.balance || ""}`;
    }
    
    // 其他銀行：使用 日期 + 帳號 + 金額 組合作為唯一ID
    return `${transaction.date}_${transaction.account}_${transaction.amount}`;
  },

  // 將彰化銀行民國年日期轉換為西元年（不處理分秒為60的情況）
  convertChbROCDateToWestern: (rocDateString) => {
    try {
      // 預期格式：114/10/01 10:58:26
      const match = rocDateString.match(
        /^0?(\d{1,3})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/
      );
      
      if (!match) {
        console.warn(`無法解析彰化銀行民國年日期格式: ${rocDateString}`);
        return rocDateString; // 如果格式不符，返回原始字串
      }
      
      const [, rocYear, month, day, hour, minute, second] = match;
      
      // 將民國年轉換為西元年
      const westernYear = parseInt(rocYear) + 1911;
      
      // 格式化為 YYYY/MM/DD HH:MM:SS
      const formattedDate = `${westernYear}/${month}/${day} ${hour}:${minute}:${second}`;
      
      console.log(`彰化銀行日期轉換: ${rocDateString} -> ${formattedDate}`);
      return formattedDate;
    } catch (error) {
      console.error(
        `轉換彰化銀行民國年日期時發生錯誤: ${rocDateString}`,
        error
      );
      return rocDateString; // 發生錯誤時返回原始字串
    }
  },

  // 將民國年日期轉換為西元年，並處理分秒為60的情況（華南銀行專用）
  convertROCDateToWestern: (rocDateString) => {
    try {
      // 預期格式：0114/10/31 22:01:60 或 114/10/31 22:01:60
      const match = rocDateString.match(
        /^0?(\d{1,3})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/
      );
      
      if (!match) {
        console.warn(`無法解析民國年日期格式: ${rocDateString}`);
        return rocDateString; // 如果格式不符，返回原始字串
      }
      
      const [, rocYear, month, day, hour, minute, second] = match;
      
      // 將民國年轉換為西元年
      const westernYear = parseInt(rocYear) + 1911;
      
      // 處理分秒可能為60的情況
      let finalSecond = parseInt(second);
      let finalMinute = parseInt(minute);
      let finalHour = parseInt(hour);
      let finalDay = parseInt(day);
      let finalMonth = parseInt(month);
      let finalYear = westernYear;
      
      // 秒數為60，進位到下一分鐘
      if (finalSecond >= 60) {
        finalSecond = 0;
        finalMinute += 1;
      }
      
      // 分鐘為60，進位到下一小時
      if (finalMinute >= 60) {
        finalMinute = 0;
        finalHour += 1;
      }
      
      // 小時為24，進位到下一天
      if (finalHour >= 24) {
        finalHour = 0;
        finalDay += 1;
        
        // 處理月份天數（簡化版本，使用 Date 物件自動處理）
        const tempDate = new Date(
          finalYear,
          finalMonth - 1,
          finalDay,
          finalHour,
          finalMinute,
          finalSecond
        );
        finalYear = tempDate.getFullYear();
        finalMonth = tempDate.getMonth() + 1;
        finalDay = tempDate.getDate();
        finalHour = tempDate.getHours();
        finalMinute = tempDate.getMinutes();
        finalSecond = tempDate.getSeconds();
      }
      
      // 格式化為 YYYY/MM/DD HH:MM:SS
      const formattedDate = `${finalYear}/${String(finalMonth).padStart(
        2,
        "0"
      )}/${String(finalDay).padStart(2, "0")} ${String(finalHour).padStart(
        2,
        "0"
      )}:${String(finalMinute).padStart(2, "0")}:${String(finalSecond).padStart(
        2,
        "0"
      )}`;
      
      console.log(`日期轉換: ${rocDateString} -> ${formattedDate}`);
      return formattedDate;
    } catch (error) {
      console.error(`轉換民國年日期時發生錯誤: ${rocDateString}`, error);
      return rocDateString; // 發生錯誤時返回原始字串
    }
  },

  // 格式化日期時間為 YYYY/MM/DD HH:MM:SS
  formatDateTime: (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const second = String(date.getSeconds()).padStart(2, "0");
    return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
  },

  // 獲取已發送的交易記錄集合（返回 Map: transactionId -> {sentAt}）
  getSentTransactions: () => {
    try {
      const sentData = localStorage.getItem("cz_sent_transactions");
      if (!sentData) {
        return new Map();
      }
      
      const parsedData = JSON.parse(sentData);
      
      // 兼容舊格式（陣列），轉換為新格式（物件）
      if (Array.isArray(parsedData)) {
        console.log("檢測到舊格式的交易記錄（陣列），正在轉換...");
        const newMap = new Map();
        const now = new Date();
        const nowFormatted = window.czAssistUtils.formatDateTime(now);
        parsedData.forEach((id) => {
          newMap.set(id, { sentAt: nowFormatted });
        });
        // 保存新格式
        const obj = Object.fromEntries(newMap);
        localStorage.setItem("cz_sent_transactions", JSON.stringify(obj));
        return newMap;
      }
      
      // 新格式（物件）- 但可能包含舊的 timestamp，需要轉換
      const entries = Object.entries(parsedData);
      const newMap = new Map();
      let needsUpdate = false;
      
      entries.forEach(([id, data]) => {
        let sentAt = data.sentAt;
        
        // 如果 sentAt 是數字（舊的 timestamp 格式），轉換為日期字串
        if (typeof sentAt === "number") {
          const date = new Date(sentAt);
          sentAt = window.czAssistUtils.formatDateTime(date);
          needsUpdate = true;
          console.log(`轉換舊的 timestamp: ${data.sentAt} -> ${sentAt}`);
        }
        
        newMap.set(id, { sentAt });
      });
      
      // 如果有任何舊格式被轉換，保存更新後的格式
      if (needsUpdate) {
        console.log("檢測到舊的 timestamp 格式，已轉換為日期字串格式");
        const obj = Object.fromEntries(newMap);
        localStorage.setItem("cz_sent_transactions", JSON.stringify(obj));
      }
      
      return newMap;
    } catch (error) {
      console.error("讀取已發送交易記錄失敗:", error);
      return new Map();
    }
  },

  // 標記交易記錄為已發送（包含發送時間）
  markTransactionAsSent: (transactionId) => {
    try {
      const sentTransactions = window.czAssistUtils.getSentTransactions();
      const now = new Date();
      const sentAt = window.czAssistUtils.formatDateTime(now);
      
      sentTransactions.set(transactionId, { sentAt });
      
      // 限制存儲的記錄數量，避免 localStorage 過大
      const maxRecords = 10000;
      if (sentTransactions.size > maxRecords) {
        // 將 Map 轉換為陣列，按時間排序，保留最新的記錄
        const recordsArray = Array.from(sentTransactions.entries());
        recordsArray.sort((a, b) => {
          const dateA = new Date(a[1].sentAt);
          const dateB = new Date(b[1].sentAt);
          return dateB - dateA; // 新的在前
        });
        const recentRecords = recordsArray.slice(0, maxRecords);
        const recentMap = new Map(recentRecords);
        const obj = Object.fromEntries(recentMap);
        localStorage.setItem("cz_sent_transactions", JSON.stringify(obj));
      } else {
        const obj = Object.fromEntries(sentTransactions);
        localStorage.setItem("cz_sent_transactions", JSON.stringify(obj));
      }
    } catch (error) {
      console.error("保存已發送交易記錄失敗:", error);
    }
  },

  // 清理昨天的已發送記錄（每天自動執行一次）
  cleanOldSentTransactions: () => {
    try {
      const sentTransactions = window.czAssistUtils.getSentTransactions();
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      console.log("=== 開始清理昨天的記錄 ===");
      console.log("當前時間:", window.czAssistUtils.formatDateTime(now));
      console.log(
        "今天開始時間:",
        window.czAssistUtils.formatDateTime(todayStart)
      );
      console.log("總記錄數:", sentTransactions.size);
      
      let keptCount = 0;
      let removedCount = 0;
      
      // 過濾掉昨天之前的記錄
      const filteredEntries = Array.from(sentTransactions.entries()).filter(
        ([recordId, data]) => {
        try {
          const sentAt = data.sentAt;
          
          // 檢查發送時間是否有效
          if (!sentAt) {
            console.warn(`無效的發送時間: ${recordId}，將被移除`);
            removedCount++;
            return false;
          }
          
          // 解析發送時間（可能是日期字串或舊的 timestamp）
          let sentDate;
            if (typeof sentAt === "number") {
            // 舊格式：timestamp
            sentDate = new Date(sentAt);
              console.log(
                `舊格式 timestamp: ${sentAt} -> ${window.czAssistUtils.formatDateTime(
                  sentDate
                )}`
              );
          } else {
            // 新格式：日期字串 "YYYY/MM/DD HH:MM:SS"
            sentDate = new Date(sentAt);
          }
          
          // 檢查日期是否有效
          if (isNaN(sentDate.getTime())) {
            console.warn(`無法解析的發送時間: ${sentAt}，將被移除`);
            removedCount++;
            return false;
          }
          
          // 如果發送時間是今天或之後，保留
          if (sentDate >= todayStart) {
              console.log(
                `✓ 保留: sentAt=${sentAt}, sentDate=${window.czAssistUtils.formatDateTime(
                  sentDate
                )}`
              );
            keptCount++;
            return true;
          } else {
            // 昨天或更早的記錄，移除
              console.log(
                `✗ 移除: sentAt=${sentAt}, sentDate=${window.czAssistUtils.formatDateTime(
                  sentDate
                )}`
              );
            removedCount++;
            return false;
          }
        } catch (error) {
          console.warn(`處理記錄時發生錯誤: ${recordId}，將被移除`, error);
          removedCount++;
          return false;
        }
        }
      );
      
      const filteredMap = new Map(filteredEntries);
      const obj = Object.fromEntries(filteredMap);
      localStorage.setItem("cz_sent_transactions", JSON.stringify(obj));
      
      console.log(
        `清理昨天的記錄完成: 保留 ${keptCount} 筆今天的記錄，移除 ${removedCount} 筆昨天的記錄`
      );
      
      // 更新最後清理日期
      const todayStr = now.toISOString().split("T")[0];
      localStorage.setItem("cz_last_cleanup_date", todayStr);
      console.log(`最後清理日期已更新為: ${todayStr}`);
    } catch (error) {
      console.error("清理昨天的記錄失敗:", error);
    }
  },

  // [已棄用] 檢查是否需要清理昨天的記錄（現已改用資料庫 API 管理交易記錄）
  checkAndCleanIfNewDay: () => {
    // 注意：交易記錄現已改用資料庫 API 管理，不再使用 localStorage
    // 此函數保留為空實現，以保持向後兼容
    console.log(
      "checkAndCleanIfNewDay: 交易記錄已改用資料庫 API 管理，跳過本地清理"
    );
  },

  // 批次查詢交易記錄是否已存在（使用資料庫 API）
  checkTransactionsExist: async (transactions, bankId) => {
    try {
      // 準備查詢項目（使用 bank_id 和 balance 作為唯一識別）
      let items = [];
      const isHoliday = window.czAssistUtils.isHoliday();
      if (window.czAssistExtension.selectedBank === "bot" && isHoliday) {
        items = transactions.map((transaction) => ({
        bank_id: parseInt(bankId),
          balance: parseInt(transaction.balance) || 0,
          time: transaction.date,
        }));
      } else {
        items = transactions.map((transaction) => ({
          bank_id: parseInt(bankId),
          balance: parseInt(transaction.balance) || 0,
          carder: transaction.account,
          pay: parseInt(transaction.amount) || 0,
        }));
      }
      
      console.log(`批次查詢 ${items.length} 筆交易記錄是否已存在...`);
      
      const response = await fetch(
        `${TRANSACTION_API_URL}/api/transactions/check`,
        {
          method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
          body: JSON.stringify({ items }),
        }
      );
      
      if (!response.ok) {
        console.warn("批次查詢 API 回應錯誤:", response.status);
        return new Map(); // 回傳空 Map，讓所有交易都被視為新交易
      }
      
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        // 建立 balance -> is_exist 的對應表
        const existMap = new Map();
        result.data.forEach((item) => {
          // 使用 balance 作為 key
          existMap.set(item.balance, item.is_exist);
        });
        console.log(
          `批次查詢完成，已存在記錄數: ${
            result.data.filter((d) => d.is_exist).length
          }`
        );
        return existMap;
      }
      
      return new Map();
    } catch (error) {
      console.error("批次查詢交易記錄失敗:", error);
      return new Map(); // 發生錯誤時回傳空 Map，讓所有交易都被視為新交易
    }
  },

  // 發送交易記錄到 API
  sendTransactionsToAPI: async (transactions) => {
    window.czAssistUtils.updateAutomationStatus("發送交易記錄到 API...");
    
    // 獲取銀行ID（優先使用用戶輸入的值）
    const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
    let bankId = null;
    
    // 優先從 storage 獲取用戶輸入的 bankId
    try {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(["savedBankId", "apiLoginData"], resolve);
      });
      // 優先使用用戶在側邊欄輸入並保存的 bankId
      bankId = result.savedBankId || result.apiLoginData?.bankId;
    } catch (error) {
      console.error("無法從 storage 獲取 bankId:", error);
    }
    
    // 如果 storage 中沒有，才使用設定檔中的預設值
    if (!bankId) {
      bankId = bankConfig?.loginData?.bankId;
    }
    
    if (!bankId) {
      console.error("無法取得銀行代號，停止發送交易記錄");
      window.czAssistUtils.updateAutomationStatus("錯誤：無法取得銀行代號");
      setTimeout(() => {
        window.czAssistExtension.automation.currentStep = 7;
        window.czAssistUtils.executeAutomationStep();
      }, 1000);
      return;
    }
    
    console.log(`使用銀行代號: ${bankId} (${bankConfig?.name})`);
    
    // 使用資料庫 API 批次查詢已存在的交易記錄
    window.czAssistUtils.updateAutomationStatus("檢查已發送的交易記錄...");
    const existMap = await window.czAssistUtils.checkTransactionsExist(
      transactions,
      bankId
    );
    
    // 過濾掉已存在的交易記錄（根據 balance 判斷）
    const newTransactions = transactions.filter((transaction) => {
      const balance = parseInt(transaction.balance) || 0;
      const isExist = existMap.get(balance);
      if (isExist) {
        console.log(`跳過已存在的交易: balance=${balance}`);
      }
      return !isExist;
    });
    
    // 限制最多處理 600 筆新交易記錄
    const limitedTransactions = newTransactions.slice(0, 600);
    const totalCount = transactions.length;
    const newCount = newTransactions.length;
    const processedCount = limitedTransactions.length;
    const skippedCount = totalCount - newCount;
    
    console.log(
      `總交易記錄: ${totalCount} 筆，新交易記錄: ${newCount} 筆，跳過已發送: ${skippedCount} 筆`
    );
    
    if (totalCount > 600) {
      console.log(
        `新交易記錄超過 600 筆，只處理前 ${processedCount} 筆，忽略 ${
          newCount - processedCount
        } 筆`
      );
    }
    
    if (processedCount === 0) {
      // 對於台新銀行，分頁邏輯已經在 step8_extractTaishinTransactionData 中處理
      // 當進入這裡時，表示所有頁面已經提取完成，下一頁按鈕應該已經被 disabled
      // 應該直接進入重新查詢流程，而不是顯示「檢查下一頁」
      if (window.czAssistExtension.selectedBank === "taishin") {
        console.log(
          "台新銀行：沒有新的交易記錄需要發送，所有頁面已提取完成，下一頁按鈕已 disabled"
        );
        window.czAssistUtils.updateAutomationStatus(
          "所有頁面已提取完成，準備重新查詢..."
        );
        
        // 直接進入重新查詢等待，不需要再檢查下一頁
        // 設置 currentStep = 8 進入 step9_waitAndRequery
        window.czAssistExtension.automation.currentStep = 8;
        setTimeout(() => {
          window.czAssistUtils.executeAutomationStep();
        }, 500);
        return;
      } else if (window.czAssistExtension.selectedBank === "landbank") {
        // 土地銀行沒有分頁，資料一次全部載入
        // 當沒有新交易記錄時，直接進入重新查詢流程
        console.log("土地銀行：沒有新的交易記錄需要發送，準備重新查詢");
        window.czAssistUtils.updateAutomationStatus(
          "沒有新的交易記錄，準備重新查詢..."
        );
        
        // 直接進入重新查詢等待
        window.czAssistExtension.automation.currentStep = 7;
        setTimeout(() => {
          window.czAssistUtils.executeAutomationStep();
        }, 500);
        return;
      } else {
        console.log("沒有新的交易記錄需要發送，檢查是否有下一頁");
        window.czAssistUtils.updateAutomationStatus(
          "沒有新的交易記錄需要發送，檢查下一頁..."
        );
      }
      
      // 檢查是否有下一頁（華南銀行、彰化銀行、兆豐銀行、陽信銀行、台灣銀行專用）
      setTimeout(() => {
        if (window.czAssistExtension.selectedBank === "hncb") {
          const hasNextPage = window.czAssistUtils.checkAndClickNextPage();
          if (!hasNextPage) {
            // 沒有下一頁，進入等待步驟
            console.log("沒有下一頁，進入重新查詢等待");
            window.czAssistExtension.automation.currentStep = 7;
            window.czAssistUtils.executeAutomationStep();
          }
          // 如果有下一頁，函數內部已經處理點擊和重新提取
        } else if (window.czAssistExtension.selectedBank === "chb") {
          const hasNextPage = window.czAssistUtils.checkAndClickChbNextPage();
          if (!hasNextPage) {
            // 沒有下一頁，進入等待步驟
            console.log("沒有下一頁，進入重新查詢等待");
            window.czAssistExtension.automation.currentStep = 7;
            window.czAssistUtils.executeAutomationStep();
          }
          // 如果有下一頁，函數內部已經處理點擊和重新提取
        } else if (window.czAssistExtension.selectedBank === "megabank") {
          const hasNextPage =
            window.czAssistUtils.checkAndClickMegabankNextPage();
          if (!hasNextPage) {
            // 沒有下一頁，進入等待步驟
            console.log("沒有下一頁，進入重新查詢等待");
            window.czAssistExtension.automation.currentStep = 7;
            window.czAssistUtils.executeAutomationStep();
          }
          // 如果有下一頁，函數內部已經處理點擊和重新提取
        } else if (window.czAssistExtension.selectedBank === "sunny") {
          const hasNextPage = window.czAssistUtils.checkAndClickSunnyNextPage();
          if (!hasNextPage) {
            // 沒有下一頁，進入重新查詢等待
            console.log("沒有下一頁，進入重新查詢等待");
            window.czAssistExtension.automation.currentStep = 7;
            window.czAssistUtils.executeAutomationStep();
          }
          // 如果有下一頁，函數內部已經處理點擊和重新提取
        } else if (window.czAssistExtension.selectedBank === "bot") {
          const hasNextPage = window.czAssistUtils.checkAndClickBotNextPage();
          if (!hasNextPage) {
            // 沒有下一頁，進入重新查詢等待
            console.log("沒有下一頁，進入重新查詢等待");
            window.czAssistExtension.automation.currentStep = 7;
            window.czAssistUtils.executeAutomationStep();
          }
          // 如果有下一頁，函數內部已經處理點擊和重新提取
        } else if (window.czAssistExtension.selectedBank === "yuanta") {
          console.log("元大銀行（無新交易）：檢查是否有下一頁");
          const hasNextPage =
            window.czAssistUtils.checkAndClickYuantaNextPage();
          if (!hasNextPage) {
            // 沒有下一頁，進入重新查詢等待
            console.log("元大銀行：沒有下一頁，進入重新查詢等待");
            window.czAssistExtension.automation.currentStep = 7;
            window.czAssistUtils.executeAutomationStep();
          }
          // 如果有下一頁，函數內部已經處理點擊和重新提取
        } else {
          // 其他銀行直接進入等待步驟
          window.czAssistExtension.automation.currentStep = 7;
          window.czAssistUtils.executeAutomationStep();
        }
      }, 1000);
      return;
    }
    
    console.log(`開始發送 ${processedCount} 筆新交易記錄到 API`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < limitedTransactions.length; i++) {
      const transaction = limitedTransactions[i];
      
      try {
        // 準備 API 請求數據
        const requestBody = {
          Carder: transaction.account,
          Pay: parseInt(transaction.amount),
          Time: transaction.date,
          BankID: parseInt(bankId),
          Balance: parseInt(transaction.balance) || 0, // 帳戶餘額（聯邦銀行等有此欄位的銀行）
        };

        console.log(
          `發送第 ${i + 1}/${processedCount} 筆交易記錄:`,
          requestBody
        );

        let items = [];
        const isHoliday = window.czAssistUtils.isHoliday();
        console.log(isHoliday, 'isHoliday')
        console.log(window.czAssistExtension.selectedBank, 'window.czAssistExtension.selectedBank')
        if (window.czAssistExtension.selectedBank === "bot" && isHoliday) {
          console.log('1x')
          console.log(transaction.date, 'transactintime')
          items = [{
            bank_id: parseInt(bankId),
            balance: parseInt(transaction.balance) || 0,
            time: transaction.date,
          }];
        } else {
          items = [{
            bank_id: parseInt(bankId),
            balance: parseInt(transaction.balance) || 0,
            carder: transaction.account,
            pay: parseInt(transaction.amount) || 0,
          }];
        }

        // 發送 /order 前，再用 api/transactions/check 檢查一次
        try {
          const checkResponse = await fetch(
            `${TRANSACTION_API_URL}/api/transactions/check`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                items,
              }),
            }
          );

          if (checkResponse.ok) {
            const checkResult = await checkResponse.json();
            if (
              checkResult.success &&
              Array.isArray(checkResult.data) &&
              checkResult.data.length > 0
            ) {
              if (checkResult.data[0].is_exist) {
                console.log(
                  `第 ${i + 1} 筆交易已存在（即時檢查），跳過: balance=${
                    transaction.balance
                  }`
                );
                continue; // 跳過這筆交易
              }
            }
          }
        } catch (checkError) {
          console.warn(`第 ${i + 1} 筆交易即時檢查失敗，繼續發送:`, checkError);
          // 檢查失敗不影響發送流程
        }
        
        // 發送 POST 請求
        const response = await fetch(`${API_URL}/order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });
        
        // 抓取並打印回傳的內容
        let responseBody;
        try {
          responseBody = await response.json();
        } catch (e) {
          responseBody = await response.text();
        }
        
        if (responseBody.Code === 1) {
          successCount++;
          // 交易記錄已通過 /api/transactions 存到資料庫，不需要再標記到 localStorage
          console.log(`第 ${i + 1} 筆交易記錄發送成功`);
          
          // 發送到第二個 API（TRANSACTION_API_URL）存入資料庫
          try {
            const transactionApiBody = {
              aid: responseBody.Aid,
              carder: transaction.account,
              pay: parseInt(transaction.amount) || 0,
              time: transaction.date,
              bank_id: parseInt(bankId),
              balance: parseInt(transaction.balance) || 0,
            };
            
            console.log(`發送交易記錄到 TRANSACTION_API:`, transactionApiBody);
            
            const transactionApiResponse = await fetch(
              `${TRANSACTION_API_URL}/api/transactions`,
              {
                method: "POST",
              headers: {
                  "Content-Type": "application/json",
              },
                body: JSON.stringify(transactionApiBody),
              }
            );
            
            if (transactionApiResponse.ok) {
              console.log(`第 ${i + 1} 筆交易記錄發送到 TRANSACTION_API 成功`);
            } else {
              console.warn(
                `第 ${i + 1} 筆交易記錄發送到 TRANSACTION_API 失敗:`,
                transactionApiResponse.status
              );
            }
          } catch (transactionApiError) {
            console.warn(
              `第 ${i + 1} 筆交易記錄發送到 TRANSACTION_API 時發生錯誤:`,
              transactionApiError
            );
          }
        } else {
          errorCount++;
          console.error(
            `第 ${i + 1} 筆交易記錄發送失敗:`,
            response.status,
            response.statusText
          );
        }
        
        // 更新進度
        const progress = ((i + 1) / processedCount) * 100;
        window.czAssistUtils.updateAutomationStatus(
          `發送交易記錄到 API... (${
            i + 1
          }/${processedCount}) 成功:${successCount} 失敗:${errorCount}`
        );
        window.czAssistUtils.updateProgress(progress);
        
        // 每筆請求間隔 0.5 秒
        if (i < limitedTransactions.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        errorCount++;
        console.error(`第 ${i + 1} 筆交易記錄發送時發生錯誤:`, error);
      }
    }
    
    console.log(
      `API 發送完成: 總計 ${processedCount} 筆，成功 ${successCount} 筆，失敗 ${errorCount} 筆`
    );
    window.czAssistUtils.updateAutomationStatus(
      `API 發送完成: 成功 ${successCount} 筆，失敗 ${errorCount} 筆`
    );
    
    // 發送完成後，檢查是否有下一頁（華南銀行、彰化銀行和兆豐銀行專用）
    // 注意：這裡不檢查 isRunning，因為 API 發送完成後一定要進入下一步驟
    setTimeout(() => {
      console.log("=== 發送完成後檢查下一頁 ===");
      console.log(`當前銀行: ${window.czAssistExtension.selectedBank}`);
      console.log(
        `自動化是否運行中: ${window.czAssistExtension.automation.isRunning}`
      );
      console.log(
        `當前步驟: ${window.czAssistExtension.automation.currentStep}`
      );
      
      if (window.czAssistExtension.selectedBank === "hncb") {
        console.log("華南銀行：檢查是否有下一頁");
        const hasNextPage = window.czAssistUtils.checkAndClickNextPage();
        console.log(`華南銀行：hasNextPage = ${hasNextPage}`);
        if (!hasNextPage) {
          // 沒有下一頁，進入等待步驟
          console.log("華南銀行：沒有下一頁，進入步驟 7（重新查詢等待）");
          window.czAssistExtension.automation.currentStep = 7;
          // 確保自動化是運行狀態
          if (!window.czAssistExtension.automation.isRunning) {
            console.log("華南銀行：自動化已停止，重新啟動以進入步驟 7");
            window.czAssistExtension.automation.isRunning = true;
          }
          window.czAssistUtils.executeAutomationStep();
        }
        // 如果有下一頁，函數內部已經處理點擊和重新提取
      } else if (window.czAssistExtension.selectedBank === "chb") {
        const hasNextPage = window.czAssistUtils.checkAndClickChbNextPage();
        if (!hasNextPage) {
          // 沒有下一頁，進入等待步驟
          window.czAssistExtension.automation.currentStep = 7;
          window.czAssistUtils.executeAutomationStep();
        }
        // 如果有下一頁，函數內部已經處理點擊和重新提取
      } else if (window.czAssistExtension.selectedBank === "megabank") {
        const hasNextPage =
          window.czAssistUtils.checkAndClickMegabankNextPage();
        if (!hasNextPage) {
          // 沒有下一頁，進入等待步驟
          window.czAssistExtension.automation.currentStep = 7;
          window.czAssistUtils.executeAutomationStep();
        }
        // 如果有下一頁，函數內部已經處理點擊和重新提取
      } else if (window.czAssistExtension.selectedBank === "yuanta") {
        console.log("元大銀行：檢查是否有下一頁");
        const hasNextPage = window.czAssistUtils.checkAndClickYuantaNextPage();
        console.log(`元大銀行：hasNextPage = ${hasNextPage}`);
        if (!hasNextPage) {
          // 沒有下一頁，進入等待步驟
          console.log("元大銀行：沒有下一頁，進入步驟 7（重新查詢等待）");
          window.czAssistExtension.automation.currentStep = 7;
          window.czAssistUtils.executeAutomationStep();
        }
        // 如果有下一頁，函數內部已經處理點擊和重新提取
      } else {
        // 其他銀行直接進入等待步驟
        window.czAssistExtension.automation.currentStep = 7;
        window.czAssistUtils.executeAutomationStep();
      }
    }, 1000);
  },

  // =============== 銀行設定檔管理功能 ===============

  // 獲取可用銀行列表
  getAvailableBanks: () => {
    return Object.entries(BANK_CONFIGS).filter(
      ([, config]) => config.enabled !== false
    );
  },

  // 獲取當前銀行設定檔
  getCurrentBankConfig: () => {
    return BANK_CONFIGS[window.czAssistExtension.selectedBank];
  },

  // 驗證銀行設定檔完整性
  validateBankConfig: (bankKey) => {
    const config = BANK_CONFIGS[bankKey];
    if (!config) return { valid: false, errors: ["銀行設定檔不存在"] };

    const errors = [];
    
    // 檢查必要欄位
    if (!config.name) errors.push("缺少銀行名稱");
    if (!config.loginUrl) errors.push("缺少登入網址");
    
    // 檢查選擇器
    if (!config.selectors?.login?.userId) errors.push("缺少使用者帳號選擇器");
    if (!config.selectors?.login?.password) errors.push("缺少密碼選擇器");
    if (!config.selectors?.login?.loginButton)
      errors.push("缺少登入按鈕選擇器");
    
    return { valid: errors.length === 0, errors };
  },

  // 匯出銀行設定檔（供備份或分享）
  exportBankConfig: (bankKey) => {
    const config = BANK_CONFIGS[bankKey];
    if (!config) return null;
    
    return JSON.stringify(
      {
        version: "1.0",
      bankKey,
      config,
        exportDate: new Date().toISOString(),
      },
      null,
      2
    );
  },

  // 測試銀行設定檔（檢查選擇器是否存在）
  testBankConfig: (bankKey = null) => {
    const selectedBank = bankKey || window.czAssistExtension.selectedBank;
    const config = BANK_CONFIGS[selectedBank];
    
    if (!config) {
      console.error("找不到銀行設定檔:", selectedBank);
      window.czAssistUtils.showNotification("找不到銀行設定檔", "error");
      return false;
    }

    console.log(`=== 測試 ${config.name} 設定檔 ===`);
    
    // 驗證設定檔完整性
    const validation = window.czAssistUtils.validateBankConfig(selectedBank);
    if (!validation.valid) {
      console.error("設定檔驗證失敗:", validation.errors);
      window.czAssistUtils.showNotification(
        `設定檔有問題: ${validation.errors.join(", ")}`,
        "error"
      );
      return false;
    }

    // 檢查當前頁面的選擇器
    let testResults = {
      login: {},
      navigation: {},
      query: {},
    };

    // 測試登入選擇器
    if (config.selectors.login) {
      let loginSearchDoc = document;
      
      // 如果需要在 iframe 中查找登入元素
      if (
        config.selectors.login.useIframe &&
        config.selectors.login.iframeName
      ) {
        const iframe = document.getElementById(
          config.selectors.login.iframeName
        );
        if (iframe && iframe.contentDocument) {
          loginSearchDoc = iframe.contentDocument;
          console.log(
            `使用 iframe ${config.selectors.login.iframeName} 進行登入元素測試`
          );
        } else {
          console.warn(`找不到 iframe: ${config.selectors.login.iframeName}`);
        }
      }
      
      Object.entries(config.selectors.login).forEach(([key, selector]) => {
        // 跳過配置項，只測試實際的選擇器
        if (
          key === "useIframe" ||
          key === "iframeName" ||
          key === "captchaLength"
        )
          return;

        const element =
          loginSearchDoc.getElementById(selector) ||
          loginSearchDoc.querySelector(selector);
        testResults.login[key] = !!element;
        console.log(
          `登入選擇器 ${key} (${selector}):`,
          element ? "✓ 找到" : "✗ 未找到"
        );
      });
    }

    // 測試導航選擇器
    if (config.selectors.navigation) {
      Object.entries(config.selectors.navigation).forEach(([key, selector]) => {
        const element =
          document.getElementById(selector) || document.querySelector(selector);
        testResults.navigation[key] = !!element;
        console.log(
          `導航選擇器 ${key} (${selector}):`,
          element ? "✓ 找到" : "✗ 未找到"
        );
      });
    }

    // 測試查詢選擇器
    if (config.selectors.query) {
      const frameDoc = window.czAssistUtils.getQueryFrameDocument();
      Object.entries(config.selectors.query).forEach(([key, selector]) => {
        // 跳過配置項，只測試實際的選擇器
        if (
          key === "useContextFrame" ||
          key === "contextFrameName" ||
          key === "useMainFrame" ||
          key === "mainFrameName"
        )
          return;

        const element = window.czAssistUtils.getElementBySelector(
          selector,
          frameDoc
        );
        testResults.query[key] = !!element;
        console.log(
          `查詢選擇器 ${key} (${selector}):`,
          element ? "✓ 找到" : "✗ 未找到"
        );
      });
    }

    console.log("測試結果:", testResults);
    window.czAssistUtils.showNotification(
      `${config.name} 設定檔測試完成，請查看控制台`,
      "info"
    );
    return testResults;
  },
  
  // 切換側邊欄
  toggleSidebar: () => {
    toggleSidebar();
  },
  
  // 呼叫線上狀態 API
  callOnlineStatusAPI: async () => {
    try {
      // 獲取銀行代號（從側邊欄輸入框）
      let bankId = null;
      // const bankIdField = document.getElementById("cz-bank-id");
      // if (bankIdField) {
      //   bankId = bankIdField.value.trim();
      // }
      
      // 如果輸入框沒有值，嘗試從 storage 獲取
      if (!bankId) {
        const result = await new Promise((resolve) => {
          chrome.storage.local.get(["savedBankId"], resolve);
        });
        bankId = result.savedBankId;
      }
      
      // 如果還是沒有，使用當前選擇銀行的預設值
      if (!bankId) {
        const bankConfig = BANK_CONFIGS[window.czAssistExtension.selectedBank];
        bankId = bankConfig?.loginData?.bankId;
      }
      
      if (!bankId) {
        console.warn("無法取得銀行代號，跳過線上狀態 API 呼叫");
        return;
      }
      
      console.log(`呼叫線上狀態 API，銀行代號: ${bankId}`);
      
      const response = await fetch(`${API_URL}/online`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BankID: bankId,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("線上狀態 API 呼叫成功:", data);
        
        // 儲存上次呼叫時間到 storage（避免頁面刷新後計時器被清掉）
        chrome.storage.local.set({
          lastOnlineStatusCallTime: Date.now(),
        });
      } else {
        console.warn(
          "線上狀態 API 呼叫失敗:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("呼叫線上狀態 API 時發生錯誤:", error);
    }
    // 注意：callOnlineStatusAPI 只負責呼叫 API 更新狀態，不應該觸發自動化步驟
    // 之前這裡有 executeAutomationStep() 的調用，會導致步驟重複執行，已移除
  },
  
  // 啟動線上狀態 API 定時器（每2分鐘呼叫一次）
  startOnlineStatusTimer: async () => {
    const ONLINE_STATUS_INTERVAL = 2 * 60 * 1000; // 2分鐘 = 60000毫秒
    
    // 如果已經有定時器在運行，先清除
    if (window.czAssistExtension.automation.onlineIntervalId) {
      clearInterval(window.czAssistExtension.automation.onlineIntervalId);
    }
    
    // 從 storage 讀取上次呼叫時間，避免頁面刷新後重複呼叫
    const result = await new Promise((resolve) => {
      chrome.storage.local.get(["lastOnlineStatusCallTime"], resolve);
    });
    
    const lastCallTime = result.lastOnlineStatusCallTime || 0;
    const timeSinceLastCall = Date.now() - lastCallTime;
    
    console.log(
      `上次線上狀態 API 呼叫時間: ${
        lastCallTime ? new Date(lastCallTime).toLocaleString() : "從未呼叫"
      }`
    );
    console.log(`距離上次呼叫已過: ${Math.round(timeSinceLastCall / 1000)} 秒`);
    
    // 判斷是否需要立即呼叫
    if (timeSinceLastCall >= ONLINE_STATUS_INTERVAL) {
      // 超過2分鐘，立即呼叫
      console.log("距離上次呼叫已超過2分鐘，立即呼叫線上狀態 API");
      window.czAssistUtils.callOnlineStatusAPI();
    } else {
      // 還沒超過5分鐘，計算剩餘時間後再呼叫
      const remainingTime = ONLINE_STATUS_INTERVAL - timeSinceLastCall;
      console.log(
        `距離上次呼叫還不到2分鐘，將在 ${Math.round(
          remainingTime / 1000
        )} 秒後呼叫`
      );
      
      setTimeout(() => {
        if (window.czAssistExtension.automation.isRunning) {
          window.czAssistUtils.callOnlineStatusAPI();
        }
      }, remainingTime);
    }
    
    // 每5分鐘（300000毫秒）呼叫一次
    window.czAssistExtension.automation.onlineIntervalId = setInterval(() => {
      if (window.czAssistExtension.automation.isRunning) {
        window.czAssistUtils.callOnlineStatusAPI();
      } else {
        // 如果自動化已停止，清除定時器
        if (window.czAssistExtension.automation.onlineIntervalId) {
          clearInterval(window.czAssistExtension.automation.onlineIntervalId);
          window.czAssistExtension.automation.onlineIntervalId = null;
        }
      }
    }, ONLINE_STATUS_INTERVAL);
    
    console.log("線上狀態 API 定時器已啟動（每5分鐘呼叫一次）");
  },
};
