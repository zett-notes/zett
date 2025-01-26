import { useAtomValue } from "jotai"
import React, { useEffect, useState } from "react"
import { useNetworkState } from "react-use"
import { ErrorIcon16, LoadingIcon16, OfflineIcon16 } from "../components/icons"
import { githubRepoAtom, githubUserAtom, isRepoClonedAtom } from "../global-state"
import { getFileUrl, readFile } from "../utils/fs"
import { REPO_DIR } from "../utils/git"

// Types
export type FilePreviewProps = {
  path: string
  className?: string
  alt?: string
}

// Cache
const _fileCache = new Map<string, { file: File; url: string }>()

export function getFileCache() {
  return _fileCache
}

// Component
export function FilePreview({ path, className, alt }: FilePreviewProps) {
  const githubUser = useAtomValue(githubUserAtom)
  const githubRepo = useAtomValue(githubRepoAtom)
  const cachedFile = _fileCache.get(path)
  const [file, setFile] = React.useState<File | null>(cachedFile?.file ?? null)
  const [url, setUrl] = React.useState(cachedFile?.url ?? "")
  const [isLoading, setIsLoading] = React.useState(!cachedFile)
  const { online } = useNetworkState()

  React.useEffect(() => {
    // If file is already cached, don't fetch it again
    if (file) return

    async function loadFile() {
      if (!githubUser || !githubRepo) return

      try {
        setIsLoading(true)

        const file = await readFile(`${REPO_DIR}${path}`)
        const url = await getFileUrl({ file, path, githubUser, githubRepo })

        setFile(file)
        setUrl(url)

        // Cache the file and its URL
        _fileCache.set(path, { file, url })
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    loadFile()
  }, [file, githubUser, githubRepo, path])

  if (!file) {
    return isLoading ? (
      <div className="flex items-center gap-2 leading-4 text-text-secondary">
        <LoadingIcon16 />
        Loading…
      </div>
    ) : !online ? (
      <div className="flex items-center gap-2 leading-4 text-text-secondary">
        <OfflineIcon16 />
        File not available
      </div>
    ) : (
      <div className="flex items-center gap-2 leading-4 text-text-danger">
        <ErrorIcon16 />
        File not found
      </div>
    )
  }

  // Return file preview based on file type
  if (file.type.startsWith("image/")) {
    return <img src={url} alt={alt ?? file.name} className={className} />
  }

  if (file.type.startsWith("video/")) {
    return <video src={url} controls className={className} />
  }

  if (file.type.startsWith("audio/")) {
    return <audio src={url} controls className={className} />
  }

  if (file.type === "application/pdf") {
    return <iframe src={url} className={className} />
  }

  return (
    <div className="flex items-center gap-2 leading-4 text-text-secondary">
      <ErrorIcon16 />
      Preview not available
    </div>
  )
}
