#!/usr/bin/env node

/**
 * 生成 electron-updater 需要的更新配置檔
 * 
 * Electron Forge 不會自動生成 latest.yml，
 * 這個腳本會在打包後生成必要的配置檔
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const packageJson = require('../package.json');

// 從 package.json 讀取配置
const version = packageJson.version;
const repository = packageJson.repository?.url || '';
const owner = packageJson.build?.publish?.owner || 'intheblackworld';
const repo = packageJson.build?.publish?.repo || 'cz-software';

const githubBaseUrl = `https://github.com/${owner}/${repo}/releases/download/v${version}`;

/**
 * 計算檔案的 SHA512
 */
function calculateSHA512(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha512');
  hashSum.update(fileBuffer);
  return hashSum.digest('base64');
}

/**
 * 獲取檔案大小
 */
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

/**
 * 生成 Windows 的 latest.yml
 */
function generateWindowsYml() {
  console.log('🔍 尋找 Windows 安裝檔...');
  
  const outDir = path.join(__dirname, '../out/make');
  const possiblePaths = [
    path.join(outDir, 'squirrel.windows/x64'),
    path.join(outDir, 'zip/win32/x64'),
  ];
  
  let targetFile = null;
  
  // 尋找 .nupkg, Setup.exe, 或 .zip
  for (const dir of possiblePaths) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        // 優先順序：.nupkg > Setup.exe > .zip
        if (file.endsWith('.nupkg') && !file.includes('-full')) {
          targetFile = path.join(dir, file);
          break;
        }
        if (file.endsWith('Setup.exe') || file.endsWith('setup.exe')) {
          targetFile = path.join(dir, file);
          break;
        }
        if (file.endsWith('.zip') && file.includes('win32')) {
          targetFile = path.join(dir, file);
          // 繼續找，因為可能有更好的格式
        }
      }
      if (targetFile && !targetFile.endsWith('.zip')) break; // 如果找到非 zip 的就停止
    }
  }
  
  if (!targetFile) {
    console.log('⚠️  警告：找不到 Windows 安裝檔，跳過 latest.yml 生成');
    console.log('   檢查過的路徑：');
    possiblePaths.forEach(p => console.log(`   - ${p}`));
    return;
  }
  
  const fileName = path.basename(targetFile);
  const sha512 = calculateSHA512(targetFile);
  const size = getFileSize(targetFile);
  
  console.log(`✓ 找到檔案: ${fileName}`);
  console.log(`  路徑: ${targetFile}`);
  console.log(`  大小: ${(size / 1024 / 1024).toFixed(2)} MB`);
  
  const yml = `version: ${version}
files:
  - url: ${fileName}
    sha512: ${sha512}
    size: ${size}
path: ${fileName}
sha512: ${sha512}
releaseDate: ${new Date().toISOString()}`;
  
  const ymlPath = path.join(path.dirname(targetFile), 'latest.yml');
  fs.writeFileSync(ymlPath, yml, 'utf8');
  
  console.log(`✅ 已生成: ${ymlPath}`);
  return ymlPath;
}

/**
 * 生成 macOS 的 latest-mac.yml
 */
function generateMacYml() {
  console.log('🔍 尋找 macOS 安裝檔...');
  
  const outDir = path.join(__dirname, '../out/make');
  const possiblePaths = [
    path.join(outDir, 'zip/darwin/x64'),
    path.join(outDir, 'zip/darwin/arm64'),
  ];
  
  let zipFile = null;
  
  // 尋找 .zip
  for (const dir of possiblePaths) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        if (file.endsWith('.zip')) {
          zipFile = path.join(dir, file);
          break;
        }
      }
      if (zipFile) break;
    }
  }
  
  if (!zipFile) {
    console.log('⚠️  警告：找不到 macOS 安裝檔，跳過 latest-mac.yml 生成');
    return;
  }
  
  const fileName = path.basename(zipFile);
  const sha512 = calculateSHA512(zipFile);
  const size = getFileSize(zipFile);
  
  console.log(`✓ 找到檔案: ${fileName}`);
  console.log(`  大小: ${(size / 1024 / 1024).toFixed(2)} MB`);
  
  const yml = `version: ${version}
files:
  - url: ${fileName}
    sha512: ${sha512}
    size: ${size}
path: ${fileName}
sha512: ${sha512}
releaseDate: ${new Date().toISOString()}`;
  
  const ymlPath = path.join(path.dirname(zipFile), 'latest-mac.yml');
  fs.writeFileSync(ymlPath, yml, 'utf8');
  
  console.log(`✅ 已生成: ${ymlPath}`);
  return ymlPath;
}

/**
 * 主函式
 */
function main() {
  console.log('📝 開始生成更新配置檔...');
  console.log(`   版本: ${version}`);
  console.log(`   Repository: ${owner}/${repo}`);
  console.log('');
  
  const results = {
    windows: null,
    mac: null
  };
  
  // 生成 Windows 配置
  try {
    results.windows = generateWindowsYml();
  } catch (error) {
    console.error('❌ Windows 配置生成失敗:', error.message);
  }
  
  console.log('');
  
  // 生成 macOS 配置
  try {
    results.mac = generateMacYml();
  } catch (error) {
    console.error('❌ macOS 配置生成失敗:', error.message);
  }
  
  console.log('');
  console.log('🎉 更新配置檔生成完成！');
  
  if (results.windows || results.mac) {
    console.log('');
    console.log('📦 這些檔案需要一起上傳到 GitHub Releases：');
    if (results.windows) console.log(`   - ${path.basename(results.windows)}`);
    if (results.mac) console.log(`   - ${path.basename(results.mac)}`);
  }
}

// 執行
main();

