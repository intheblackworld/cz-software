const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const { execSync } = require('child_process');

module.exports = {
  packagerConfig: {
    asar: {
      unpack: '**/{node_modules/puppeteer,.local-chromium}/**/*'
    },
    extraResource: []
  },
  rebuildConfig: {},
  hooks: {
    postMake: async (forgeConfig, makeResults) => {
      console.log('\n🔧 執行 postMake hook: 生成更新配置檔...\n');
      try {
        execSync('node scripts/generate-update-manifest.js', { 
          stdio: 'inherit',
          cwd: __dirname 
        });
        console.log('\n✅ 更新配置檔生成完成\n');
      } catch (error) {
        console.error('\n⚠️  生成更新配置檔時發生錯誤:', error.message);
        console.error('   這不會影響打包，但自動更新功能可能無法使用\n');
      }
      return makeResults;
    }
  },
  makers: [
    // ZIP - 只產生 Windows 版本
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32'],
    },
    
    // macOS、Linux 已停用
    // 如需打包其他平台，請取消註釋或使用 GitHub Actions
    
    // macOS ZIP
    // {
    //   name: '@electron-forge/maker-zip',
    //   platforms: ['darwin'],
    // },
    
    // Linux
    // {
    //   name: '@electron-forge/maker-deb',
    //   config: {},
    // },
    // {
    //   name: '@electron-forge/maker-rpm',
    //   config: {},
    // },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'intheblackworld',
          name: 'cz-software'
        },
        prerelease: false,
        draft: false
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
