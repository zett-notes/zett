import { Searcher } from "fast-fuzzy"
import git, { WORKDIR, TREE } from "isomorphic-git"
import { atom } from "jotai"
import { atomWithMachine } from "jotai-xstate"
import { atomWithStorage, selectAtom } from "jotai/utils"
import { assign, createMachine, fromPromise, setup, sendParent } from "xstate"
import { z } from "zod"
import {
  GitHubRepository,
  GitHubUser,
  Note,
  NoteId,
  Template,
  templateSchema,
} from "./schema"
import { fs, fsWipe } from "./utils/fs"
import {
  REPO_DIR,
  gitAdd,
  gitClone,
  gitCommit,
  gitPull,
  gitPush,
  gitRemove,
  isRepoSynced,
  getRemoteOriginUrl,
} from "./utils/git"
import { parseNote } from "./utils/parse-note"
import { removeTemplateFrontmatter } from "./utils/remove-template-frontmatter"
import { getSampleMarkdownFiles } from "./utils/sample-markdown-files"
import { startTimer } from "./utils/timer"

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const GITHUB_USER_KEY = "github_user"
const MARKDOWN_FILES_KEY = "markdown_files"

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Context = {
  githubUser: GitHubUser | null
  githubRepo: GitHubRepository | null
  markdownFiles: Record<string, string>
  error: Error | null
}

type Event =
  | { type: "SIGN_IN"; githubUser: GitHubUser }
  | { type: "SIGN_OUT" }
  | { type: "SELECT_REPO"; githubRepo: GitHubRepository }
  | { type: "SYNC" }
  | { type: "WRITE_FILES"; markdownFiles: Record<string, string>; commitMessage?: string }
  | { type: "DELETE_FILE"; filepath: string }
  | { type: string; data?: { markdownFiles?: Record<string, string> } }

type CompleteEvent<TData> = { type: "complete"; data: TData }
type ErrorEvent = { type: "error"; data: Error }

type ServiceEvent =
  | CompleteEvent<{ githubUser: GitHubUser }>
  | CompleteEvent<{ githubRepo: GitHubRepository; markdownFiles: Record<string, string> }>
  | CompleteEvent<{ markdownFiles: Record<string, string> }>
  | CompleteEvent<{ isSynced: boolean }>
  | ErrorEvent

type AnyEvent = Event | ServiceEvent

// -----------------------------------------------------------------------------
// Actors
// -----------------------------------------------------------------------------

const resolveUserActor = fromPromise(async () => {
  const githubUser = getGitHubUserFromLocalStorage()
  if (!githubUser) {
    throw new Error("No GitHub user found in local storage")
  }
  return { githubUser }
})

const resolveRepoActor = fromPromise(async () => {
  const url = await getRemoteOriginUrl()
  if (!url) throw new Error("No remote origin URL found")
  
  const match = url.value?.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/)
  if (!match) throw new Error("Invalid GitHub repository URL")
  
  const [, owner, name] = match
  const githubRepo = { owner, name }
  const markdownFiles = await getMarkdownFilesFromFs(REPO_DIR)
  
  return { githubRepo, markdownFiles }
})

const cloneRepoActor = fromPromise(async ({ input }: { input: { githubUser: GitHubUser; githubRepo: GitHubRepository | null } }) => {
  const { githubUser, githubRepo } = input
  
  if (!githubRepo) {
    throw new Error("No repository selected")
  }
  
  await gitClone(githubRepo, githubUser)
  const markdownFiles = await getMarkdownFilesFromFs(REPO_DIR)
  return { markdownFiles }
})

const pullActor = fromPromise(async ({ input }: { input: { githubUser: GitHubUser } }) => {
  const { githubUser } = input
  await gitPull(githubUser)
  const markdownFiles = await getMarkdownFilesFromFs(REPO_DIR)
  return { markdownFiles }
})

const pushActor = fromPromise(async ({ input }: { input: { githubUser: GitHubUser; commitMessage?: string } }) => {
  const { githubUser, commitMessage } = input
  const message = commitMessage ?? "Update notes"
  await gitAdd([REPO_DIR])
  await gitCommit(message)
  await gitPush(githubUser)
})

const writeFilesActor = fromPromise(async ({ input }: { input: { markdownFiles: Record<string, string> } }) => {
  const { markdownFiles } = input
  await Promise.all(
    Object.entries(markdownFiles).map(async ([filepath, content]) => {
      await fs.promises.writeFile(filepath, content)
    })
  )
})

const deleteFileActor = fromPromise(async ({ input }: { input: { filepath: string } }) => {
  const { filepath } = input
  await fs.promises.unlink(filepath)
  await gitRemove(filepath)
})

const checkStatusActor = fromPromise(async () => {
  const isSynced = await isRepoSynced()
  return { isSynced }
})

function createGlobalStateMachine() {
  return setup({
    types: {
      context: {} as Context,
      events: {} as AnyEvent,
      input: undefined,
      output: undefined,
    },
    actions: {
      setGitHubUser: assign({
        githubUser: ({ event }) => {
          if (event.type === "SIGN_IN") return event.githubUser
          if (event.type === "complete" && "githubUser" in event.data) {
            return event.data.githubUser
          }
          return null
        },
      }),
      setGitHubRepo: assign({
        githubRepo: ({ event }) => {
          if (event.type === "SELECT_REPO") return event.githubRepo
          if (event.type === "complete" && "githubRepo" in event.data) {
            return event.data.githubRepo
          }
          return null
        },
      }),
      setMarkdownFiles: assign({
        markdownFiles: ({ event }: any) => {
          console.debug("setMarkdownFiles event:", event)
          // @ts-ignore - XState types are not up to date
          if (event.output?.markdownFiles) {
            // @ts-ignore - XState types are not up to date
            console.debug("setMarkdownFiles output:", event.output.markdownFiles)
            // @ts-ignore - XState types are not up to date
            return event.output.markdownFiles
          }
          console.debug("setMarkdownFiles returning empty object")
          return {}
        },
      }),
      mergeMarkdownFiles: assign({
        markdownFiles: ({ context, event }) => {
          if (event.type === "WRITE_FILES") {
            return {
              ...context.markdownFiles,
              ...event.markdownFiles,
            }
          }
          return context.markdownFiles
        },
      }),
      deleteMarkdownFile: assign({
        markdownFiles: ({ context, event }) => {
          if (event.type === "DELETE_FILE") {
            const { [event.filepath]: _, ...rest } = context.markdownFiles
            return rest
          }
          return context.markdownFiles
        },
      }),
      clearGitHubUser: assign({ githubUser: () => null }),
      clearGitHubRepo: assign({ githubRepo: () => null }),
      clearMarkdownFiles: assign({ markdownFiles: () => ({}) }),
      setError: assign({
        error: ({ event }) => {
          if (event.type === "error") {
            return event.data
          }
          return null
        },
      }),
      logError: ({ event }) => {
        if (event.type === "error") {
          console.error(event.data)
        }
      },
      clearGitHubUserLocalStorage: () => localStorage.removeItem(GITHUB_USER_KEY),
      clearFileSystem: () => fsWipe(),
      setSampleMarkdownFiles: assign({
        markdownFiles: () => getSampleMarkdownFiles(),
      }),
      setMarkdownFilesLocalStorage: ({ event }) => {
        if (event.type === "complete" && "markdownFiles" in event.data) {
          localStorage.setItem(MARKDOWN_FILES_KEY, JSON.stringify(event.data.markdownFiles))
        }
      },
      mergeMarkdownFilesLocalStorage: ({ context, event }) => {
        if (event.type === "WRITE_FILES") {
          localStorage.setItem(
            MARKDOWN_FILES_KEY,
            JSON.stringify({
              ...context.markdownFiles,
              ...event.markdownFiles,
            }),
          )
        }
      },
      deleteMarkdownFileLocalStorage: ({ context, event }) => {
        if (event.type === "DELETE_FILE") {
          const { [event.filepath]: _, ...rest } = context.markdownFiles
          localStorage.setItem(MARKDOWN_FILES_KEY, JSON.stringify(rest))
        }
      },
      clearMarkdownFilesLocalStorage: () => localStorage.removeItem(MARKDOWN_FILES_KEY),
      syncAction: sendParent({ type: "SYNC" }),
    },
    guards: {
      isOffline: () => !navigator.onLine,
      isSynced: ({ event }) => {
        if (event.type === "complete" && "isSynced" in event.data) {
          return event.data.isSynced
        }
        return false
      },
    },
    actors: {
      resolveUser: resolveUserActor,
      resolveRepo: resolveRepoActor,
      cloneRepo: cloneRepoActor,
      pull: pullActor,
      push: pushActor,
      writeFiles: writeFilesActor,
      deleteFile: deleteFileActor,
      checkStatus: checkStatusActor
    },
  }).createMachine({
    id: "global",
    initial: "resolvingUser",
    context: {
      githubUser: null,
      githubRepo: null,
      markdownFiles: {},
      error: null,
    },
    states: {
      resolvingUser: {
        invoke: {
          src: resolveUserActor,
          onDone: {
            target: "#global.signedIn",
            actions: "setGitHubUser",
          },
          onError: "#global.signedOut",
        },
      },
      signedOut: {
        id: "global.signedOut",
        entry: [
          "clearGitHubUser",
          "clearGitHubUserLocalStorage",
          "clearMarkdownFilesLocalStorage",
          "clearFileSystem",
          "setSampleMarkdownFiles",
        ],
        exit: ["clearMarkdownFiles"],
        on: {
          SIGN_IN: {
            target: "#global.signedIn",
            actions: ["setGitHubUser"],
          },
        },
      },
      signedIn: {
        id: "global.signedIn",
        on: {
          SIGN_OUT: "#global.signedOut",
        },
        initial: "resolvingRepo",
        states: {
          resolvingRepo: {
            invoke: {
              src: resolveRepoActor,
              onDone: {
                target: "cloned",
                actions: ["setGitHubRepo", "setMarkdownFiles", "setMarkdownFilesLocalStorage"],
              },
              onError: "notCloned",
            },
          },
          notCloned: {
            on: {
              SELECT_REPO: "cloningRepo",
            },
          },
          cloningRepo: {
            entry: ["setGitHubRepo", "clearMarkdownFiles", "clearMarkdownFilesLocalStorage"],
            invoke: {
              src: cloneRepoActor,
              input: ({ context, event }) => ({
                githubUser: context.githubUser,
                githubRepo: event.type === "SELECT_REPO" ? event.githubRepo : null,
              }),
              onDone: {
                target: "cloned.sync.success",
                actions: ["setMarkdownFiles", "setMarkdownFilesLocalStorage"],
              },
              onError: {
                target: "notCloned",
                actions: ["clearGitHubRepo", "setError"],
              },
            },
          },
          cloned: {
            on: {
              SELECT_REPO: "cloningRepo",
            },
            type: "parallel",
            states: {
              change: {
                initial: "idle",
                states: {
                  idle: {
                    on: {
                      WRITE_FILES: "writingFiles",
                      DELETE_FILE: "deletingFile",
                    },
                  },
                  writingFiles: {
                    entry: ["mergeMarkdownFiles", "mergeMarkdownFilesLocalStorage"],
                    invoke: {
                      src: writeFilesActor,
                      input: ({ event }) => ({
                        markdownFiles: event.type === "WRITE_FILES" ? event.markdownFiles : {},
                      }),
                      onDone: {
                        target: "idle",
                        actions: "syncAction",
                      },
                      onError: {
                        target: "idle",
                        actions: "setError",
                      },
                    },
                  },
                  deletingFile: {
                    entry: ["deleteMarkdownFile", "deleteMarkdownFileLocalStorage"],
                    invoke: {
                      src: deleteFileActor,
                      input: ({ event }) => ({
                        filepath: event.type === "DELETE_FILE" ? event.filepath : "",
                      }),
                      onDone: {
                        target: "idle",
                        actions: "syncAction",
                      },
                      onError: {
                        target: "idle",
                        actions: "setError",
                      },
                    },
                  },
                },
              },
              sync: {
                initial: "checking",
                states: {
                  checking: {
                    invoke: {
                      src: checkStatusActor,
                      onDone: [
                        {
                          guard: "isSynced",
                          target: "success",
                        },
                        {
                          target: "pulling",
                        },
                      ],
                      onError: {
                        target: "error",
                        actions: "setError",
                      },
                    },
                  },
                  pulling: {
                    invoke: {
                      src: pullActor,
                      input: ({ context }) => ({
                        githubUser: context.githubUser,
                      }),
                      onDone: {
                        target: "pushing",
                        actions: ["setMarkdownFiles", "setMarkdownFilesLocalStorage"],
                      },
                      onError: {
                        target: "error",
                        actions: "setError",
                      },
                    },
                  },
                  pushing: {
                    invoke: {
                      src: pushActor,
                      input: ({ context }) => ({
                        githubUser: context.githubUser,
                      }),
                      onDone: "success",
                      onError: {
                        target: "error",
                        actions: "setError",
                      },
                    },
                  },
                  success: {
                    on: {
                      SYNC: "checking",
                    },
                  },
                  error: {
                    on: {
                      SYNC: "checking",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    on: {
      SIGN_IN: {
        target: "#global.signedIn",
        actions: ["setGitHubUser"],
      },
      SIGN_OUT: {
        target: "#global.signedOut",
      },
    },
  })
}

const globalStateMachine = createGlobalStateMachine()
export const globalStateMachineAtom = atomWithMachine(() => globalStateMachine)

/** Get cached markdown files from local storage */
function getMarkdownFilesFromLocalStorage() {
  const markdownFiles = JSON.parse(localStorage.getItem(MARKDOWN_FILES_KEY) ?? "null")
  if (!markdownFiles) return null
  const parsedMarkdownFiles = z.record(z.string()).safeParse(markdownFiles)
  return parsedMarkdownFiles.success ? parsedMarkdownFiles.data : null
}

/** Walk the file system and return the contents of all markdown files */
async function getMarkdownFilesFromFs(dir: string) {
  const stopTimer = startTimer("getMarkdownFilesFromFs()")
  console.debug("Walking directory:", dir)

  async function walkDir(currentDir: string): Promise<[string, string][]> {
    const entries = await fs.promises.readdir(currentDir)
    console.debug("Directory contents:", currentDir, entries)

    const results: [string, string][] = []

    for (const entry of entries) {
      const fullPath = `${currentDir}/${entry}`

      // Skip .git directory
      if (entry === '.git') continue

      try {
        const stats = await fs.promises.stat(fullPath)
        
        if (stats.isDirectory()) {
          const subResults = await walkDir(fullPath)
          results.push(...subResults)
        } else if (entry.endsWith('.md')) {
          console.debug("Reading markdown file:", fullPath)
          try {
            const buffer = await fs.promises.readFile(fullPath)
            const text = new TextDecoder().decode(buffer)
            console.debug("File content size:", fullPath, text.length)
            results.push([fullPath, text])
          } catch (error) {
            console.error("Error reading file:", fullPath, error)
            results.push([fullPath, '']) // Return empty string if file can't be read
          }
        }
      } catch (error) {
        console.error("Error checking file:", fullPath, error)
      }
    }

    return results
  }

  const entries = await walkDir(dir)
  const markdownFilesMap = Object.fromEntries(entries)
  console.debug("Processed markdown files:", Object.keys(markdownFilesMap))

  stopTimer()
  return markdownFilesMap
}

// -----------------------------------------------------------------------------
// GitHub
// -----------------------------------------------------------------------------

export const githubUserAtom = atomWithStorage<GitHubUser | null>(GITHUB_USER_KEY, null)

export const githubRepoAtom = selectAtom(
  globalStateMachineAtom,
  (state) => state.context.githubRepo,
)

// -----------------------------------------------------------------------------
// Notes
// -----------------------------------------------------------------------------

export const notesAtom = atom((get) => {
  const state = get(globalStateMachineAtom)
  const markdownFiles = state.context.markdownFiles
  console.debug("Current state:", state.value)
  console.debug("Markdown files in context:", Object.keys(markdownFiles), markdownFiles)
  console.debug("Raw markdown files:", markdownFiles)
  
  const notes: Map<NoteId, Note> = new Map()

  // Parse notes
  for (const filepath in markdownFiles) {
    console.debug("Processing file:", filepath)
    // Extract just the filename without path and extension
    const id = filepath.split('/').pop()?.replace(/\.md$/, '') ?? ''
    const content = markdownFiles[filepath]
    console.debug("File content:", content ? content.substring(0, 100) + "..." : "null")
    notes.set(id, parseNote(id, content))
  }

  console.debug("Processed notes:", notes.size)
  return notes
})

export const pinnedNotesAtom = atom((get) => {
  const notes = get(notesAtom)
  return [...notes.values()].filter((note) => note.pinned).reverse()
})

export const sortedNotesAtom = atom((get) => {
  const notes = get(notesAtom)

  // Sort notes by when they were created in descending order
  return [...notes.values()].sort((a, b) => {
    // Favor pinned notes
    if (a.frontmatter.pinned === true && b.frontmatter.pinned !== true) {
      return -1
    } else if (a.frontmatter.pinned !== true && b.frontmatter.pinned === true) {
      return 1
    }

    // Favor numeric IDs
    if (a.id.match(/^\d+$/) && !b.id.match(/^\d+$/)) {
      return -1
    } else if (!a.id.match(/^\d+$/) && b.id.match(/^\d+$/)) {
      return 1
    }

    return b.id.localeCompare(a.id)
  })
})

export const noteSearcherAtom = atom((get) => {
  const sortedNotes = get(sortedNotesAtom)
  return new Searcher(sortedNotes, {
    keySelector: (note) => [
      note.title,
      note.displayName,
      note.content,
      note.id,
      note.linkAlias || "",
    ],
    threshold: 0.8,
  })
})

// -----------------------------------------------------------------------------
// Tags
// -----------------------------------------------------------------------------

export const tagsAtom = atom((get) => {
  const notes = get(notesAtom)
  const tags: Record<string, NoteId[]> = {}

  for (const note of notes.values()) {
    for (const tag of note.tags) {
      // If the tag doesn't exist, create it
      if (!tags[tag]) tags[tag] = []
      // If the note isn't already linked to the tag, link it
      if (!tags[tag].includes(note.id)) tags[tag].push(note.id)
    }
  }

  return tags
})

export const sortedTagEntriesAtom = atom((get) => {
  const tags = get(tagsAtom)
  // Sort tags alphabetically in ascending order
  return Object.entries(tags).sort((a, b) => {
    return a[0].localeCompare(b[0])
  })
})

export const tagSearcherAtom = atom((get) => {
  const sortedTagEntries = get(sortedTagEntriesAtom)
  return new Searcher(sortedTagEntries, {
    keySelector: ([tag]) => tag,
    threshold: 0.8,
  })
})

// -----------------------------------------------------------------------------
// Dates
// -----------------------------------------------------------------------------

export const datesAtom = atom((get) => {
  const notes = get(notesAtom)
  const dates: Record<string, NoteId[]> = {}

  for (const note of notes.values()) {
    for (const date of note.dates) {
      // If the date doesn't exist, create it
      if (!dates[date]) dates[date] = []
      // If the note isn't already linked to the date, link it
      if (!dates[date].includes(note.id)) dates[date].push(note.id)
    }
  }

  return dates
})

// -----------------------------------------------------------------------------
// Templates
// -----------------------------------------------------------------------------

export const templatesAtom = atom((get) => {
  const notes = get(notesAtom)
  const templates: Record<string, Template> = {}

  for (const { id, content, frontmatter } of notes.values()) {
    const template = frontmatter["template"]

    // Skip if note isn't a template
    if (!template) continue

    try {
      const parsedTemplate = templateSchema.omit({ body: true }).parse(template)

      const body = removeTemplateFrontmatter(content)

      templates[id] = { ...parsedTemplate, body }
    } catch (error) {
      // Template frontmatter didn't match the schema
      console.error(error)
    }
  }

  return templates
})

export const dailyTemplateAtom = selectAtom(templatesAtom, (templates) =>
  Object.values(templates).find((t) => t.name.match(/^daily$/i)),
)

export const weeklyTemplateAtom = selectAtom(templatesAtom, (templates) =>
  Object.values(templates).find((t) => t.name.match(/^weekly$/i)),
)

// -----------------------------------------------------------------------------
// Appearance
// -----------------------------------------------------------------------------

export const sidebarAtom = atomWithStorage<"expanded" | "collapsed">("sidebar", "expanded")

export const widthAtom = atomWithStorage<"fixed" | "fill">("width", "fixed")

export const fontAtom = atomWithStorage<"sans" | "serif">("font", "sans")

// Schemas
const githubUserSchema = z.object({
  token: z.string(),
  login: z.string(),
  name: z.string(),
  email: z.string(),
})

/** Get GitHub user from local storage */
function getGitHubUserFromLocalStorage(): GitHubUser | null {
  const githubUser = JSON.parse(localStorage.getItem(GITHUB_USER_KEY) ?? "null")
  if (!githubUser) return null
  const parsedGithubUser = githubUserSchema.safeParse(githubUser)
  return parsedGithubUser.success ? parsedGithubUser.data : null
}

/** Get GitHub repo from filesystem */
async function getGitHubRepoFromFs(): Promise<GitHubRepository | null> {
  try {
    const config = await git.getConfig({ fs, dir: REPO_DIR, path: "remote.origin.url" })
    if (!config) return null
    const url = config.value
    if (!url) return null
    const match = url.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/)
    if (!match) return null
    const [, owner, name] = match
    return { owner, name }
  } catch (error) {
    console.error(error)
    return null
  }
}

export const isSignedOutAtom = atom((get) => {
  const state = get(globalStateMachineAtom)
  return state.matches("signedOut")
})

export const isSignedInAtom = atom((get) => {
  const state = get(globalStateMachineAtom)
  return state.matches("signedIn")
})

export const isLoadingAtom = atom((get) => {
  const state = get(globalStateMachineAtom)
  return state.matches("resolvingUser")
})

export const isRepoClonedAtom = selectAtom(
  globalStateMachineAtom,
  (state) => state.matches({ signedIn: "cloned" })
)

export const isCloningRepoAtom = selectAtom(
  globalStateMachineAtom,
  (state) => state.matches({ signedIn: "cloningRepo" })
)

export const isRepoNotClonedAtom = selectAtom(
  globalStateMachineAtom,
  (state) => state.matches({ signedIn: "notCloned" })
)