/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'vue-virtual-scroller'
declare module '@/offline-helper'