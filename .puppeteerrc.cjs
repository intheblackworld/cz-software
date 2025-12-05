const { join } = require('path');

/**
 * Puppeteer 配置文件
 * 將 Chrome 下載到專案的 .local-chromium 目錄
 * 這樣打包時就能包含 Chrome 瀏覽器
 */
module.exports = {
  cacheDirectory: join(__dirname, '.local-chromium'),
};

