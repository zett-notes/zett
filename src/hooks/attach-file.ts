import { EditorView } from "@codemirror/view"
import { useAtomCallback } from "jotai/utils"
import React from "react"
import { getFileCache } from "../components/file-preview"
import { githubRepoAtom, githubUserAtom } from "../global-state"
import { fs, writeFile } from "../utils/fs"
import { REPO_DIR, gitAdd, gitCommit } from "../utils/git"

export const UPLOADS_DIR = "/uploads"

export function useAttachFile() {
  const getGitHubUser = useAtomCallback(React.useCallback((get) => get(githubUserAtom), []))
  const getGitHubRepo = useAtomCallback(React.useCallback((get) => get(githubRepoAtom), []))

  const attachFile = React.useCallback(
    async (file: File, view?: EditorView) => {
      // Skip if offline
      if (!navigator.onLine) return

      const githubUser = getGitHubUser()
      const githubRepo = getGitHubRepo()

      // We can't upload a file if we don't know where to upload it
      // or if we don't have a reference to the CodeMirror view
      if (!githubUser || !githubRepo || !view) return

      try {
        const id = Date.now().toString()
        const extension = file.name.split(".").pop()
        const name = file.name.replace(`.${extension}`, "")
        const path = `${UPLOADS_DIR}/${id}.${extension}`
        const arrayBuffer = await file.arrayBuffer()

        // Make sure the uploads directory exists
        try {
          await fs.promises.mkdir(`${REPO_DIR}${UPLOADS_DIR}`)
        } catch (error) {
          // Directory already exists, ignore error
        }

        // Write file to file system
        writeFile({ path: `${REPO_DIR}${path}`, content: arrayBuffer, githubUser, githubRepo })
          // Use `.then()` to avoid blocking the rest of the function
          .then(async () => {
            // Remove the leading slash from the path
            const relativePath = path.replace(/^\//, "")

            // Stage file
            await gitAdd([relativePath])

            // Commit file
            await gitCommit(`Update ${relativePath}`)
          })
          .catch((error) => {
            console.error(error)
          })

        // Cache file
        getFileCache().set(path, { file, url: URL.createObjectURL(file) })

        // Get current selection
        const { selection } = view.state
        const { from = 0, to = 0 } = selection.ranges[selection.mainIndex] ?? {}
        const selectedText = view.state.doc.sliceString(from, to)

        // Compose markdown
        let markdown = `[${selectedText || name}](${path})`

        // Use markdown image syntax if file is an image, video, or audio
        if (
          file.type.startsWith("image/") ||
          file.type.startsWith("video/") ||
          file.type.startsWith("audio/")
        ) {
          markdown = `!${markdown}`
        }

        // Prepare next selection
        let anchor: number | undefined
        let head: number | undefined

        if (selectedText) {
          // If there is a selection, move the cursor to the end of the inserted markdown
          anchor = from + markdown.length
        } else {
          // Otherwise, select the text content of the inserted markdown so it's easy to change
          anchor = from + markdown.indexOf("]")
          head = from + markdown.indexOf("[") + 1
        }

        view?.dispatch({
          // Replace the current selection with the markdown
          changes: [{ from, to, insert: markdown }],
          selection: { anchor, head },
        })

        view.focus()
      } catch (error) {
        console.error(error)
      }
    },
    [getGitHubRepo, getGitHubUser],
  )

  return attachFile
}
