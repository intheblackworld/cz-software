// 銀行模組總管理器
// Bank Module Manager

const { config: botConfig, BOTAutomation } = require('./bot');
const { config: cobankConfig, COBANKAutomation } = require('./cobank');
// 未來其他銀行可在此引入：
// const { config: yuantaConfig, YuantaAutomation } = require('./yuanta');
// const { config: hncbConfig, HNCBAutomation } = require('./hncb');

/**
 * 銀行名稱到代號的映射表
 * 用於將 API 回傳的中文銀行名稱轉換為內部使用的代號
 */
const bankNameMap = {
  "臺灣銀行": "bot",
  "台灣銀行": "bot", // 處理別名
  "合作金庫": "cobank",
  "合作金庫銀行": "cobank", // 處理別名
  // 未來擴充其他銀行：
  // "元大銀行": "yuanta",
  // "華南商銀": "hncb",
  // "華南銀行": "hncb",
  // "玉山銀行": "esun",
  // "陽信銀行": "sunny",
  // "京城銀行": "ktb",
  // "第一銀行": "firstbank",
  // "國泰世華": "cathay",
  // "中國信託": "ctbc",
  // "高雄銀行": "bok",
  // "彰化銀行": "chb",
  // "兆豐銀行": "megabank",
  // "臺灣企銀": "tbb",
  // "淡水一信": "tfcc",
  // "聯邦銀行": "ubot",
  // "台新銀行": "taishin",
  // "土地銀行": "landbank",
  // "富邦銀行": "fubon",
  // "新光商銀": "skbank",
  // "台中銀行": "tcb",
};

/**
 * 所有銀行的設定檔集合
 */
const configs = {
  bot: botConfig,
  cobank: cobankConfig,
  // 未來擴充其他銀行：
  // yuanta: yuantaConfig,
  // hncb: hncbConfig,
  // ...
};

/**
 * 銀行自動化類別映射表
 */
const automationClasses = {
  bot: BOTAutomation,
  cobank: COBANKAutomation,
  // 未來擴充其他銀行：
  // yuanta: YuantaAutomation,
  // hncb: HNCBAutomation,
  // ...
};

/**
 * 根據銀行代號獲取設定檔
 * @param {string} bankCode - 銀行代號（例如：'bot'）
 * @returns {object|null} - 銀行設定檔
 */
function getBankConfig(bankCode) {
  return configs[bankCode] || null;
}

/**
 * 根據銀行名稱獲取銀行代號
 * @param {string} bankName - 銀行名稱（例如：'臺灣銀行'）
 * @returns {string|null} - 銀行代號
 */
function getBankCode(bankName) {
  console.log(bankName, 'bankName')
  return bankNameMap[bankName] || null;
}

/**
 * 建立銀行自動化實例
 * @param {string} bankCode - 銀行代號
 * @param {object} page - Puppeteer Page 實例
 * @param {object} utils - 工具函式
 * @param {function} logCallback - 日誌回調函式
 * @param {number} queryDaysBack - 查詢天數
 * @param {number} bankId - 銀行 ID
 * @returns {object|null} - 銀行自動化實例
 */
function createAutomationInstance(bankCode, page, utils, logCallback, queryDaysBack = 0, bankId = null) {
  console.log(`[銀行模組] 建立自動化實例: ${bankCode}`);
  
  const AutomationClass = automationClasses[bankCode];
  if (!AutomationClass) {
    console.error(`找不到銀行 ${bankCode} 的自動化類別`);
    return null;
  }
  
  return new AutomationClass(page, utils, logCallback, queryDaysBack, bankId);
}

/**
 * 檢查銀行是否支援
 * @param {string} bankCode - 銀行代號
 * @returns {boolean}
 */
function isBankSupported(bankCode) {
  return !!configs[bankCode];
}

/**
 * 獲取所有支援的銀行列表
 * @returns {array} - 銀行列表 [{ code, name }, ...]
 */
function getSupportedBanks() {
  return Object.values(configs).map(config => ({
    code: config.code,
    name: config.name,
  }));
}

module.exports = {
  bankNameMap,
  configs,
  getBankConfig,
  getBankCode,
  createAutomationInstance,
  isBankSupported,
  getSupportedBanks,
};

