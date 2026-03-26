/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MODEL_API: string;
  readonly VITE_MODEL_ENDPOINT?: string;
  readonly VITE_MODEL_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
