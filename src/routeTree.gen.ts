/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as SettingsImport } from './routes/settings'
import { Route as FileImport } from './routes/file'
import { Route as IndexImport } from './routes/index'
import { Route as TagsIndexImport } from './routes/tags.index'
import { Route as NotesIndexImport } from './routes/notes.index'
import { Route as TagsSplatImport } from './routes/tags_.$'
import { Route as NotesSplatImport } from './routes/notes_.$'

// Create/Update Routes

const SettingsRoute = SettingsImport.update({
  id: '/settings',
  path: '/settings',
  getParentRoute: () => rootRoute,
} as any)

const FileRoute = FileImport.update({
  id: '/file',
  path: '/file',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const TagsIndexRoute = TagsIndexImport.update({
  id: '/tags/',
  path: '/tags/',
  getParentRoute: () => rootRoute,
} as any)

const NotesIndexRoute = NotesIndexImport.update({
  id: '/notes/',
  path: '/notes/',
  getParentRoute: () => rootRoute,
} as any)

const TagsSplatRoute = TagsSplatImport.update({
  id: '/tags_/$',
  path: '/tags/$',
  getParentRoute: () => rootRoute,
} as any)

const NotesSplatRoute = NotesSplatImport.update({
  id: '/notes_/$',
  path: '/notes/$',
  getParentRoute: () => rootRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/file': {
      id: '/file'
      path: '/file'
      fullPath: '/file'
      preLoaderRoute: typeof FileImport
      parentRoute: typeof rootRoute
    }
    '/settings': {
      id: '/settings'
      path: '/settings'
      fullPath: '/settings'
      preLoaderRoute: typeof SettingsImport
      parentRoute: typeof rootRoute
    }
    '/notes_/$': {
      id: '/notes_/$'
      path: '/notes/$'
      fullPath: '/notes/$'
      preLoaderRoute: typeof NotesSplatImport
      parentRoute: typeof rootRoute
    }
    '/tags_/$': {
      id: '/tags_/$'
      path: '/tags/$'
      fullPath: '/tags/$'
      preLoaderRoute: typeof TagsSplatImport
      parentRoute: typeof rootRoute
    }
    '/notes/': {
      id: '/notes/'
      path: '/notes'
      fullPath: '/notes'
      preLoaderRoute: typeof NotesIndexImport
      parentRoute: typeof rootRoute
    }
    '/tags/': {
      id: '/tags/'
      path: '/tags'
      fullPath: '/tags'
      preLoaderRoute: typeof TagsIndexImport
      parentRoute: typeof rootRoute
    }
  }
}

// Create and export the route tree

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/file': typeof FileRoute
  '/settings': typeof SettingsRoute
  '/notes/$': typeof NotesSplatRoute
  '/tags/$': typeof TagsSplatRoute
  '/notes': typeof NotesIndexRoute
  '/tags': typeof TagsIndexRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/file': typeof FileRoute
  '/settings': typeof SettingsRoute
  '/notes/$': typeof NotesSplatRoute
  '/tags/$': typeof TagsSplatRoute
  '/notes': typeof NotesIndexRoute
  '/tags': typeof TagsIndexRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/file': typeof FileRoute
  '/settings': typeof SettingsRoute
  '/notes_/$': typeof NotesSplatRoute
  '/tags_/$': typeof TagsSplatRoute
  '/notes/': typeof NotesIndexRoute
  '/tags/': typeof TagsIndexRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/file'
    | '/settings'
    | '/notes/$'
    | '/tags/$'
    | '/notes'
    | '/tags'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/file' | '/settings' | '/notes/$' | '/tags/$' | '/notes' | '/tags'
  id:
    | '__root__'
    | '/'
    | '/file'
    | '/settings'
    | '/notes_/$'
    | '/tags_/$'
    | '/notes/'
    | '/tags/'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  FileRoute: typeof FileRoute
  SettingsRoute: typeof SettingsRoute
  NotesSplatRoute: typeof NotesSplatRoute
  TagsSplatRoute: typeof TagsSplatRoute
  NotesIndexRoute: typeof NotesIndexRoute
  TagsIndexRoute: typeof TagsIndexRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  FileRoute: FileRoute,
  SettingsRoute: SettingsRoute,
  NotesSplatRoute: NotesSplatRoute,
  TagsSplatRoute: TagsSplatRoute,
  NotesIndexRoute: NotesIndexRoute,
  TagsIndexRoute: TagsIndexRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/file",
        "/settings",
        "/notes_/$",
        "/tags_/$",
        "/notes/",
        "/tags/"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/file": {
      "filePath": "file.tsx"
    },
    "/settings": {
      "filePath": "settings.tsx"
    },
    "/notes_/$": {
      "filePath": "notes_.$.tsx"
    },
    "/tags_/$": {
      "filePath": "tags_.$.tsx"
    },
    "/notes/": {
      "filePath": "notes.index.tsx"
    },
    "/tags/": {
      "filePath": "tags.index.tsx"
    }
  }
}
ROUTE_MANIFEST_END */
