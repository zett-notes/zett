import LightningFS from "@isomorphic-git/lightning-fs"
import mime from "mime"
import { GitHubRepository, GitHubUser } from "../schema"
import {
  createGitLfsPointer,
  isTrackedWithGitLfs,
  resolveGitLfsPointer,
  uploadToGitLfsServer,
} from "./git-lfs"
import { REPO_DIR } from "./git"

const DB_NAME = "fs"
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

// Helper function to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Initialize filesystem with retry logic
async function initFS(): Promise<LightningFS> {
  let retries = 0
  
  while (retries < MAX_RETRIES) {
    try {
      const fs = new LightningFS(DB_NAME)
      // Test if we can access the filesystem
      await fs.promises.readdir('/')
      return fs
    } catch (error) {
      retries++
      if (retries === MAX_RETRIES) {
        throw new Error(`Failed to initialize filesystem after ${MAX_RETRIES} attempts: ${error}`)
      }
      console.log(`Retrying filesystem initialization (attempt ${retries}/${MAX_RETRIES})...`)
      await wait(RETRY_DELAY)
    }
  }
  
  throw new Error('Failed to initialize filesystem')
}

// Lazy initialization pattern
let _fs: LightningFS | null = null
export const fs = new Proxy({} as LightningFS, {
  get: (target, prop: keyof LightningFS) => {
    if (!_fs) {
      throw new Error('Filesystem not initialized. Call initFS() first.')
    }
    return _fs[prop]
  }
})

// Initialize fs
initFS().then(fs => {
  _fs = fs
  console.log('Filesystem initialized successfully')
}).catch(error => {
  console.error('Failed to initialize filesystem:', error)
})

/** Delete file system database */
export function fsWipe() {
  window.indexedDB.deleteDatabase(DB_NAME)
}

/**
 * The same as fs.promises.readFile(),
 * but it returns a File object instead of string or Uint8Array
 */
export async function readFile(path: string) {
  let content = await fs.promises.readFile(path)

  // If content is a string, convert it to a Uint8Array
  if (typeof content === "string") {
    content = new TextEncoder().encode(content)
  }

  const mimeType = mime.getType(path) ?? ""
  const filename = path.split("/").pop() ?? ""
  return new File([content], filename, { type: mimeType })
}

/** Returns a URL to the given file */
export async function getFileUrl({
  file,
  path,
  githubUser,
  githubRepo,
}: {
  file: File
  path: string
  githubUser: GitHubUser
  githubRepo: GitHubRepository
}) {
  // If file is tracked with Git LFS, resolve the pointer
  if (await isTrackedWithGitLfs(path)) {
    return await resolveGitLfsPointer({ file, githubUser, githubRepo })
  } else {
    return URL.createObjectURL(file)
  }
}

/** Write a file to the file system and handle Git LFS automatically if needed */
export async function writeFile({
  path,
  content,
  githubUser,
  githubRepo,
}: {
  path: string
  content: ArrayBuffer
  githubUser: GitHubUser
  githubRepo: GitHubRepository
}) {
  if (await isTrackedWithGitLfs(path)) {
    await uploadToGitLfsServer({ content, githubUser, githubRepo })

    // Write a Git LFS pointer to the file system
    const pointer = await createGitLfsPointer(content)
    await fs.promises.writeFile(path, pointer)
  } else {
    // TODO: Test this
    await fs.promises.writeFile(path, new Uint8Array(content))
  }
}

/** Log the state of the file system to the console */
export async function fsDebug(fs: LightningFS, dir = REPO_DIR) {
  try {
    // List files and directories at the specified path
    const files = await fs.promises.readdir(dir)

    console.log(`Contents of ${dir}:`, files)

    // Iterate over each file/directory
    for (const file of files) {
      // Ensure there is a slash between the directory and file names
      const filePath = `${dir}/${file}`

      const stats = await fs.promises.stat(filePath)
      if (stats.isDirectory()) {
        // If directory, recursively log its contents
        await fsDebug(fs, `${filePath}/`)
      } else {
        // If file, read and log its contents
        const content = await fs.promises.readFile(filePath, "utf8")
        console.log(`Contents of ${filePath}:`, content)
      }
    }
  } catch (error) {
    console.error("Error logging file system state:", error)
  }
}
