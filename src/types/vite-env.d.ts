/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_USE_MSW?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
