import git from "isomorphic-git"
import http from "isomorphic-git/http/web"
import { GitHubRepository, GitHubUser } from "../schema"
import { fs, fsWipe } from "./fs"
import { startTimer } from "./timer"
import type { HttpClient } from 'isomorphic-git'

export const REPO_DIR = "/repo"
const DEFAULT_BRANCH = "main"

type GitAuth = {
  username?: string
  password?: string
  oauth2format?: 'github' | 'gitlab' | 'bitbucket'
  token?: string
}

export async function gitClone(repo: GitHubRepository, user: GitHubUser) {
  const options: Parameters<typeof git.clone>[0] = {
    fs,
    http: httpProxy,
    dir: REPO_DIR,
    // Use official isomorphic-git CORS proxy
    corsProxy: "https://cors.isomorphic-git.org",
    url: `https://api.github.com/repos/${repo.owner}/${repo.name}`,
    ref: DEFAULT_BRANCH,
    singleBranch: true,
    depth: 1,
    onMessage: (message) => console.debug("onMessage", message),
    onProgress: (progress) => console.debug("onProgress", progress),
    onAuth: (): GitAuth => {
      if (user.tokenType === 'oauth2') {
        return {
          // GitHub OAuth2: oauth2 as username, token as password
          username: 'oauth2',
          password: user.token
        }
      }
      // PAT
      return {
        token: user.token
      }
    },
  }

  // Wipe file system
  // TODO: Only remove the repo directory instead of wiping the entire file system
  // Blocked by https://github.com/isomorphic-git/lightning-fs/issues/71
  fsWipe()

  // Clone repo
  let stopTimer = startTimer(`git clone ${options.url} ${options.dir}`)
  await git.clone(options)
  stopTimer()

  // Set user in git config
  stopTimer = startTimer(`git config user.name "${user.name}"`)
  await git.setConfig({ fs, dir: REPO_DIR, path: "user.name", value: user.name })
  stopTimer()

  // Set email in git config
  stopTimer = startTimer(`git config user.email "${user.email}"`)
  await git.setConfig({ fs, dir: REPO_DIR, path: "user.email", value: user.email })
  stopTimer()
}

export async function gitPull(user: GitHubUser, repo: GitHubRepository) {
  const options: Parameters<typeof git.pull>[0] = {
    fs,
    http: httpProxy,
    dir: REPO_DIR,
    // Use official isomorphic-git CORS proxy
    corsProxy: "https://cors.isomorphic-git.org",
    singleBranch: true,
    onMessage: (message) => console.debug("onMessage", message),
    onProgress: (progress) => console.debug("onProgress", progress),
    onAuth: (): GitAuth => {
      if (user.tokenType === 'oauth2') {
        return {
          // GitHub OAuth2: oauth2 as username, token as password
          username: 'oauth2',
          password: user.token
        }
      }
      // PAT
      return {
        token: user.token
      }
    },
  }

  const stopTimer = startTimer("git pull")
  await git.pull(options)
  stopTimer()
}

export async function gitPush(user: GitHubUser, repo: GitHubRepository) {
  const options: Parameters<typeof git.push>[0] = {
    fs,
    http: httpProxy,
    dir: REPO_DIR,
    // Use official isomorphic-git CORS proxy
    corsProxy: "https://cors.isomorphic-git.org",
    onMessage: (message) => console.debug("onMessage", message),
    onProgress: (progress) => console.debug("onProgress", progress),
    onAuth: (): GitAuth => {
      if (user.tokenType === 'oauth2') {
        return {
          // GitHub OAuth2: oauth2 as username, token as password
          username: 'oauth2',
          password: user.token
        }
      }
      // PAT
      return {
        token: user.token
      }
    },
  }

  const stopTimer = startTimer("git push")
  await git.push(options)
  stopTimer()
}

export async function gitAdd(filePaths: string[]) {
  const options: Parameters<typeof git.add>[0] = {
    fs,
    dir: REPO_DIR,
    filepath: filePaths,
  }

  const stopTimer = startTimer(`git add ${filePaths.join(" ")}`)
  await git.add(options)
  stopTimer()
}

export async function gitRemove(filePath: string) {
  const options: Parameters<typeof git.remove>[0] = {
    fs,
    dir: REPO_DIR,
    filepath: filePath,
  }

  const stopTimer = startTimer(`git remove ${filePath}`)
  await git.remove(options)
  stopTimer()
}

export async function gitCommit(message: string) {
  const options: Parameters<typeof git.commit>[0] = {
    fs,
    dir: REPO_DIR,
    message,
  }

  const stopTimer = startTimer(`git commit -m "${message}"`)
  await git.commit(options)
  stopTimer()
}

/** Check if the repo is synced with the remote origin */
export async function isRepoSynced() {
  const latestLocalCommit = await git.resolveRef({
    fs,
    dir: REPO_DIR,
    ref: `refs/heads/${DEFAULT_BRANCH}`,
  })

  const latestRemoteCommit = await git.resolveRef({
    fs,
    dir: REPO_DIR,
    ref: `refs/remotes/origin/${DEFAULT_BRANCH}`,
  })

  const isSynced = latestLocalCommit === latestRemoteCommit

  return isSynced
}

export async function getRemoteOriginUrl() {
  // Check git config for remote origin url
  const remoteOriginUrl = await git.getConfig({
    fs,
    dir: REPO_DIR,
    path: "remote.origin.url",
  })

  return remoteOriginUrl
}
