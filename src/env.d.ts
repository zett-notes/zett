/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly GITHUB_PAT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
