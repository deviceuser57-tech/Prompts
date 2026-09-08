/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_LOGGING?: string;
  readonly VITE_LOG_LEVEL?: string;
  readonly VITE_ENCRYPTION_ENABLED?: string;
  readonly VITE_DATA_EXPIRATION_DAYS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
