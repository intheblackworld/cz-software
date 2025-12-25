// 銀行自動化通用工具函式
// Common Utility Functions for Bank Automation

/**
 * 延遲執行（Promise 版本）
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 計算日期範圍（根據 queryDaysBack 參數）
 * @param {number} daysBack - 往前推算的天數（0 代表當日）
 * @returns {object} { startDate, endDate } - 西元年格式（例如：2025/12/03）
 */
function calculateDateRange(daysBack = 0) {
  const today = new Date();
  const startDate = new Date(today);
  
  // 計算起始日（往前推算）
  if (daysBack > 0) {
    startDate.setDate(today.getDate() - daysBack);
  }
  
  // 格式化為 YYYY/MM/DD（西元年格式）
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(today),
    daysBack: daysBack,
  };
}

/**
 * 民國年轉西元年
 * @param {string} rocDate - 民國年格式（例如：1131203 或 113/12/03）
 * @returns {string} - 西元年格式（例如：2024-12-03）
 */
function rocToWesternDate(rocDate) {
  // 移除可能的分隔符號
  const cleanDate = rocDate.replace(/[\/\-\.]/g, '');
  
  if (cleanDate.length === 7) {
    // 格式：1131203
    const rocYear = parseInt(cleanDate.substring(0, 3));
    const month = cleanDate.substring(3, 5);
    const day = cleanDate.substring(5, 7);
    const westernYear = rocYear + 1911;
    return `${westernYear}-${month}-${day}`;
  }
  
  return rocDate; // 無法轉換，返回原值
}

/**
 * 從文字中提取帳號（支援多種格式）
 * @param {string} text - 包含帳號的文字
 * @returns {string} - 提取出的帳號，或空字串
 */
function extractAccountNumber(text) {
  if (!text) return '';
  
  // 常見帳號格式：10-14 位數字，可能有空格或分隔符
  const patterns = [
    /(\d{3,4}[\s\-]?\d{3,4}[\s\-]?\d{4,7})/,  // 123-456-7890
    /(\d{10,14})/,                             // 1234567890
    /帳號[：:]\s*(\d{10,14})/,                 // 帳號：1234567890
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].replace(/[\s\-]/g, ''); // 移除空格和分隔符
    }
  }
  
  return '';
}

/**
 * 清理金額字串（移除逗號、空格）
 * @param {string} amount - 金額字串（例如："1,234.56"）
 * @returns {number} - 數字格式的金額
 */
function cleanAmount(amount) {
  if (!amount) return 0;
  const cleaned = amount.replace(/,/g, '').replace(/\s/g, '').trim();
  return parseFloat(cleaned) || 0;
}

/**
 * 生成交易紀錄的唯一 ID
 * @param {object} transaction - 交易紀錄
 * @returns {string} - 唯一 ID
 */
function generateUniqueId(transaction) {
  const { date, amount, balance, account } = transaction;
  const str = `${date}_${amount}_${balance}_${account || 'NA'}`;
  return Buffer.from(str).toString('base64');
}

/**
 * 檢查是否為節假日
 * 包含週六日及台灣固定國定假日
 * 注意：農曆節日（春節、清明、端午、中秋）需要額外整合農曆轉換或 API
 */
function isHoliday(date = new Date()) {
  const day = date.getDay();
  const month = date.getMonth() + 1; // JavaScript 月份從 0 開始
  const dateNum = date.getDate();
  
  // 週六日
  if (day === 0 || day === 6) {
    return true;
  }
  
  // 台灣固定國定假日
  const fixedHolidays = [
    { month: 1, date: 1 },   // 元旦
    { month: 2, date: 28 },  // 和平紀念日
    { month: 4, date: 4 },   // 兒童節
    { month: 4, date: 5 },   // 清明節（通常 4/4 或 4/5，這裡列出兩天）
    { month: 10, date: 10 }, // 國慶日
    { month: 12, date: 25 }, // 行憲紀念日
  ];
  
  // 檢查是否為固定國定假日
  return fixedHolidays.some(holiday => 
    holiday.month === month && holiday.date === dateNum
  );
}

/**
 * 格式化當前時間
 */
function getCurrentTimestamp() {
  return new Date().toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

module.exports = {
  sleep,
  calculateDateRange,
  rocToWesternDate,
  extractAccountNumber,
  cleanAmount,
  generateUniqueId,
  isHoliday,
  getCurrentTimestamp,
};

