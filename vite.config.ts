/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import { versionInfoUtil } from '../../common/utils/versionInfoUtil'
import pkg from './package.json'
import { VitePWA } from 'vite-plugin-pwa'
import manifest from './manifest.json'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appBuild = JSON.parse(env.VITE_APP_VERSION_CONFIG).buildVersion
  return {
    // A version build (buildVersion vX.Y.Z in VITE_APP_VERSION_CONFIG) is self-contained under /vX.Y.Z/; an empty buildVersion is the root bootstrap.
    base: appBuild ? `/${appBuild}/` : '/',
    build: {
      outDir: appBuild ? `dist/${appBuild}` : 'dist'
    },
    plugins: [
      vue(),
      legacy(),
      VitePWA({
        registerType: "autoUpdate",
        selfDestroying: true,
        manifest: manifest as any,
        devOptions: {
          enabled: true
        }
      })
    ],
    define: {
      'import.meta.env.VITE_APP_VERSION_INFO': JSON.stringify(JSON.stringify(versionInfoUtil.getVersionInfo(pkg.version)))
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@common': path.resolve(__dirname, '../../common')
      },
      dedupe: ['vue', 'pinia', 'vue-router'],
    },
    test: {
      globals: true,
      environment: 'jsdom'
    },
      server: {
      port: 8100
    }
  }
})
