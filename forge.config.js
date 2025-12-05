const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: {
      unpack: '**/{node_modules/puppeteer,.local-chromium}/**/*'
    },
    extraResource: []
  },
  rebuildConfig: {},
  makers: [
    // Squirrel.Windows - 產生 Windows 安裝檔（Setup.exe）
    // 注意：在 macOS 上打包需要 Mono 和 Wine，建議使用 GitHub Actions
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'cz_software',
        setupExe: 'CZSoftwareSetup.exe'
        // 如果有 icon，可以添加：
        // setupIcon: './assets/icon.ico',
        // iconUrl: 'https://...'
      },
      platforms: ['win32']
    },
    // ZIP - macOS 和 Windows 都可以使用（跨平台打包友好）
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
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
