/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly defaultProjectId?: string
  readonly VITE_ENABLE_ANALYTICS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

