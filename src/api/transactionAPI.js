// 交易紀錄 API 通用處理模組
// Transaction API Handler

const API_URL = "https://api.wapi.asia/payer/calls/water";
const TRANSACTION_API_URL = "https://cz-backend.vercel.app";

/**
 * 生成交易記錄的唯一 key（用於判斷是否已存在）
 * @param {Object} transaction - 交易記錄
 * @param {boolean} isHoliday - 是否為假日
 * @param {string} bankCode - 銀行代號
 * @returns {string} - 唯一 key
 */
function generateTransactionKey(transaction, isHoliday, bankCode) {
  if (bankCode === "bot" && isHoliday) {
    // 台灣銀行假日模式：使用 balance + time 作為 key
    return `${transaction.balance}_${transaction.date}`;
  } else {
    // 正常模式：使用 balance + carder + pay 作為 key
    return `${transaction.balance}_${transaction.account}_${transaction.amount}`;
  }
}

/**
 * 批次檢查交易紀錄是否已存在
 * @param {Array} transactions - 交易紀錄陣列
 * @param {number} bankId - 銀行 ID
 * @param {boolean} isHoliday - 是否為假日
 * @param {string} bankCode - 銀行代號（例如：'bot'）
 * @returns {Map} - transactionKey -> is_exist 的映射表
 */
async function checkTransactionsExist(
  transactions,
  bankId,
  isHoliday = false,
  bankCode = ""
) {
  try {
    // 準備查詢項目
    let items = [];

    if (bankCode === "bot" && isHoliday) {
      // 台灣銀行假日模式：只使用 balance 和 time
      items = transactions.map((transaction) => ({
        bank_id: parseInt(bankId),
        balance: parseInt(transaction.balance) || 0,
        time: transaction.date,
      }));
    } else {
      // 正常模式：使用完整資料
      items = transactions.map((transaction) => ({
        bank_id: parseInt(bankId),
        balance: parseInt(transaction.balance) || 0,
        carder: transaction.account,
        pay: parseInt(transaction.amount) || 0,
      }));
    }

    console.log(`[API] 批次查詢 ${items.length} 筆交易記錄是否已存在...`);

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
      console.warn(`[API] 批次查詢 API 回應錯誤: ${response.status}`);
      return new Map();
    }

    const result = await response.json();

    if (result.success && Array.isArray(result.data)) {
      const existMap = new Map();
      // 使用索引對應查詢項目和結果，並使用組合 key
      result.data.forEach((item, index) => {
        if (index < transactions.length) {
          const transaction = transactions[index];
          const key = generateTransactionKey(transaction, isHoliday, bankCode);
          existMap.set(key, item.is_exist);
        }
      });

      const existCount = result.data.filter((d) => d.is_exist).length;
      console.log(
        `[API] 批次查詢完成，已存在記錄數: ${existCount}/${items.length}`
      );

      return existMap;
    }

    return new Map();
  } catch (error) {
    console.error("[API] 批次查詢交易記錄失敗:", error);
    return new Map();
  }
}

/**
 * 發送交易紀錄到後端 API
 * @param {Array} transactions - 交易紀錄陣列
 * @param {number} bankId - 銀行 ID
 * @param {boolean} isHoliday - 是否為假日
 * @param {string} bankCode - 銀行代號
 * @param {function} progressCallback - 進度回調函式 (current, total, success, error)
 * @returns {object} - { successCount, errorCount, totalCount }
 */
async function sendTransactionsToAPI(
  transactions,
  bankId,
  isHoliday = false,
  bankCode = "",
  progressCallback = null
) {
  console.log(`[API] 準備發送交易紀錄，總數: ${transactions.length}`);

  // 1. 批次查詢已存在的交易記錄
  const existMap = await checkTransactionsExist(
    transactions,
    bankId,
    isHoliday,
    bankCode
  );

  // 2. 過濾掉已存在的交易記錄
  const newTransactions = transactions.filter((transaction) => {
    const key = generateTransactionKey(transaction, isHoliday, bankCode);
    const isExist = existMap.get(key);
    if (isExist) {
      console.log(`[API] 跳過已存在的交易: key=${key}`);
    }
    return !isExist;
  });

  // 3. 限制最多處理 600 筆
  const limitedTransactions = newTransactions.slice(0, 600);
  const totalCount = transactions.length;
  const newCount = newTransactions.length;
  const processedCount = limitedTransactions.length;
  const skippedCount = totalCount - newCount;

  console.log(
    `[API] 總交易記錄: ${totalCount} 筆，新交易: ${newCount} 筆，跳過已發送: ${skippedCount} 筆`
  );

  if (newCount > 600) {
    console.log(`[API] 新交易超過 600 筆，只處理前 ${processedCount} 筆`);
  }

  // 如果沒有新交易需要發送
  if (processedCount === 0) {
    console.log("[API] 沒有新的交易記錄需要發送");
    return { successCount: 0, errorCount: 0, totalCount: 0, skippedCount };
  }

  // 4. 逐筆發送交易記錄
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < limitedTransactions.length; i++) {
    const transaction = limitedTransactions[i];

    try {
      // 判斷是否為存入交易（只處理存入交易發送 /order API）
      const isIncome = !transaction.type || transaction.type === 'income';
      
      // 準備檢查項目
      let checkItems = [];
      if (bankCode === "bot" && isHoliday) {
        checkItems = [
          {
            bank_id: parseInt(bankId),
            balance: parseInt(transaction.balance) || 0,
            time: transaction.date,
          },
        ];
      } else {
        checkItems = [
          {
            bank_id: parseInt(bankId),
            balance: parseInt(transaction.balance) || 0,
            carder: transaction.account,
            pay: parseInt(transaction.amount) || 0,
          },
        ];
      }

      // 4-1. 發送前即時檢查（避免重複）
      try {
        const checkResponse = await fetch(
          `${TRANSACTION_API_URL}/api/transactions/check`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ items: checkItems }),
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
                `[API] 第 ${i + 1} 筆交易已存在（即時檢查），跳過: balance=${transaction.balance}`
              );
              continue;
            }
          }
        }
      } catch (checkError) {
        console.warn(
          `[API] 第 ${i + 1} 筆交易即時檢查失敗，繼續發送:`,
          checkError
        );
      }

      let orderResponseBody = null;
      let aid = null;

      // 4-2. 如果是存入交易，發送到 /order API
      if (isIncome) {
        // 準備 /order API 請求數據
        const orderRequestBody = {
          Carder: transaction.account,
          Pay: parseInt(transaction.amount),
          Time: transaction.date,
          BankID: parseInt(bankId),
          Balance: parseInt(transaction.balance) || 0,
          Remark: transaction.remark || '',
        };

        console.log(
          `[API] 發送第 ${i + 1}/${processedCount} 筆（存入）:`,
          orderRequestBody
        );

        const isNumericAccount = /^\d+$/.test(orderRequestBody.Carder);
        if (isNumericAccount) {
          // 只有純數字帳號才進行 slice 處理
          orderRequestBody.Carder =
            orderRequestBody.Carder.slice(0, 3) +
            orderRequestBody.Carder.slice(-7);
        }
        console.log(orderRequestBody, "orderRequestBody");
        
        const orderResponse = await fetch(`${API_URL}/order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(orderRequestBody),
        });

        try {
          orderResponseBody = await orderResponse.json();
        } catch (e) {
          orderResponseBody = await orderResponse.text();
        }

        if (orderResponseBody.Code === 1) {
          successCount++;
          aid = orderResponseBody.Aid;
          console.log(
            `[API] 第 ${i + 1} 筆交易記錄發送成功 (Aid: ${aid})`
          );
        } else {
          errorCount++;
          console.error(
            `[API] 第 ${i + 1} 筆交易記錄發送失敗:`,
            orderResponse.status,
            orderResponseBody
          );
          // 如果 /order API 失敗，跳過 /transactions API
          if (progressCallback) {
            progressCallback(i + 1, processedCount, successCount, errorCount);
          }
          if (i < limitedTransactions.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
          continue;
        }
      } else {
        // 轉出交易，不發送 /order API，直接記錄為成功以便發送 /transactions API
        console.log(
          `[API] 第 ${i + 1} 筆為轉出交易，跳過 /order API，直接發送 /transactions API`
        );
      }

      // 4-3. 發送到 /api/transactions API（存入資料庫）- 處理所有交易（存入和轉出）
      try {
        const transactionApiBody = {
          carder: transaction.account,
          pay: parseInt(transaction.amount) || 0,
          time: transaction.date,
          bank_id: parseInt(bankId),
          balance: parseInt(transaction.balance) || 0,
          remark: transaction.remark || '',
          type: transaction.type || 'income', // income 或 expenditure
        };

        // 如果有 aid（來自 /order API），則加入
        if (aid) {
          transactionApiBody.aid = aid;
          transactionApiBody.request_body = JSON.stringify({
            Carder: transaction.account,
            Pay: parseInt(transaction.amount),
            Time: transaction.date,
            BankID: parseInt(bankId),
            Balance: parseInt(transaction.balance) || 0,
            Remark: transaction.remark || '',
          });
        }

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
          console.log(`[API] 第 ${i + 1} 筆交易記錄已存入資料庫`);
          // 如果是轉出交易，此時才計入成功
          if (!isIncome) {
            successCount++;
          }
        } else {
          console.warn(
            `[API] 第 ${i + 1} 筆交易記錄存入資料庫失敗:`,
            transactionApiResponse.status
          );
          // 如果是轉出交易，此時才計入失敗
          if (!isIncome) {
            errorCount++;
          }
        }
      } catch (transactionApiError) {
        console.warn(
          `[API] 第 ${i + 1} 筆交易記錄存入資料庫時發生錯誤:`,
          transactionApiError
        );
        // 如果是轉出交易，此時才計入失敗
        if (!isIncome) {
          errorCount++;
        }
      }

      // 進度回調
      if (progressCallback) {
        progressCallback(i + 1, processedCount, successCount, errorCount);
      }

      // 每筆請求間隔 500ms
      if (i < limitedTransactions.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      errorCount++;
      console.error(`[API] 第 ${i + 1} 筆交易記錄發送時發生錯誤:`, error);
    }
  }

  console.log(
    `[API] 發送完成: 總計 ${processedCount} 筆，成功 ${successCount} 筆，失敗 ${errorCount} 筆`
  );

  return { successCount, errorCount, totalCount: processedCount, skippedCount };
}

/**
 * 呼叫線上狀態 API
 * @param {number} bankId - 銀行 ID
 * @returns {Promise<void>}
 */
async function callOnlineStatusAPI(bankId) {
  try {
    if (!bankId) {
      console.warn("[API] 無法取得銀行代號，跳過線上狀態 API 呼叫");
      return;
    }

    console.log(`[API] 呼叫線上狀態 API，銀行代號: ${bankId}`);

    // 先取得最新 balance
    let balance = null;
    try {
      const balanceResponse = await fetch(
        `${TRANSACTION_API_URL}/api/transactions/last_balance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bank_id: bankId,
          }),
        }
      );

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        if (balanceData.success && balanceData.data) {
          balance = balanceData.data.balance;
          console.log(`[API] 取得最新 balance: ${balance}`);
        }
      } else {
        console.warn(
          "[API] 取得 balance 失敗:",
          balanceResponse.status,
          balanceResponse.statusText
        );
      }
    } catch (error) {
      console.error("[API] 呼叫 last_balance API 時發生錯誤:", error);
    }

    // 準備請求 body
    const requestBody = {
      BankID: bankId,
    };

    // 如果有 balance，加入請求 body
    if (balance !== null) {
      requestBody.balance = balance;
    }

    const response = await fetch(`${API_URL}/online`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("[API] 線上狀態 API 呼叫成功:", data);
    } else {
      console.warn(
        "[API] 線上狀態 API 呼叫失敗:",
        response.status,
        response.statusText
      );
    }
  } catch (error) {
    console.error("[API] 呼叫線上狀態 API 時發生錯誤:", error);
  }
}

/**
 * 啟動線上狀態 API 定時器（每2分鐘呼叫一次）
 * @param {number} bankId - 銀行 ID
 * @returns {NodeJS.Timeout} - 定時器 ID
 */
function startOnlineStatusTimer(bankId) {
  const ONLINE_STATUS_INTERVAL = 2 * 60 * 1000; // 2分鐘 = 120000毫秒

  console.log("[API] 啟動線上狀態 API 定時器（每2分鐘呼叫一次）");

  // 立即呼叫一次
  callOnlineStatusAPI(bankId);

  // 設置定時器，每2分鐘呼叫一次
  const intervalId = setInterval(() => {
    callOnlineStatusAPI(bankId);
  }, ONLINE_STATUS_INTERVAL);

  return intervalId;
}

/**
 * 停止線上狀態 API 定時器
 * @param {NodeJS.Timeout} intervalId - 定時器 ID
 */
function stopOnlineStatusTimer(intervalId) {
  if (intervalId) {
    clearInterval(intervalId);
    console.log("[API] 線上狀態 API 定時器已停止");
  }
}

module.exports = {
  checkTransactionsExist,
  sendTransactionsToAPI,
  callOnlineStatusAPI,
  startOnlineStatusTimer,
  stopOnlineStatusTimer,
  generateTransactionKey,
  API_URL,
  TRANSACTION_API_URL,
};
