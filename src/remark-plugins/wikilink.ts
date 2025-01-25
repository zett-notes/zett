import { Root, Text, PhrasingContent } from "mdast"
import { Extension as FromMarkdownExtension, Token, CompileContext } from "mdast-util-from-markdown"
import { codes } from "micromark-util-symbol/codes"
import {
  Code,
  Extension,
  HtmlExtension,
  State,
  Tokenizer,
  Construct,
} from "micromark-util-types"
import { Plugin } from "unified"
import { Node } from "unist"
import { VFile } from "vfile" // <-- added import for type
// Removed: import { Processor } from "unified"  (unused)

const types = {
  wikilink: "wikilink",
  wikilinkMarker: "wikilinkMarker",
  wikilinkId: "wikilinkId",
  wikilinkSeparator: "wikilinkSeparator",
  wikilinkText: "wikilinkText",
  escape: "escape",
} as const

declare module "micromark-util-types" {
  interface TokenTypeMap {
    wikilink: "wikilink"
    wikilinkMarker: "wikilinkMarker"
    wikilinkId: "wikilinkId"
    wikilinkSeparator: "wikilinkSeparator"
    wikilinkText: "wikilinkText"
    escape: "escape"
  }
}

/** Syntax extension (text -> tokens) */
export function wikilink(): Extension {
  const tokenize: Tokenizer = (effects, ok, nok) => {
    const enter: State = function(code: Code): State | undefined {
      if (code === codes.backslash) {
        effects.enter('escape')
        effects.consume(code)
        return escapeStart
      }
      
      if (isOpeningMarkerChar(code)) {
        effects.enter(types.wikilink)
        effects.enter(types.wikilinkMarker)
        effects.consume(code)
        return exitOpeningMarker
      }
      return nok(code)
    }

    const escapeStart: State = function(code: Code): State | undefined {
      if (code === codes.leftSquareBracket || code === codes.rightSquareBracket || code === codes.verticalBar) {
        effects.consume(code)
        effects.exit('escape')
        return enter
      }
      return nok(code)
    }

    const exitOpeningMarker: State = function(code: Code): State | undefined {
      if (isOpeningMarkerChar(code)) {
        effects.consume(code)
        effects.exit(types.wikilinkMarker)
        return enterId
      }
      return nok(code)
    }

    const enterId: State = function(code: Code): State | undefined {
      if (code === codes.backslash) {
        effects.consume(code)
        return escapeInId
      }
      
      if (isFilenameChar(code)) {
        effects.enter(types.wikilinkId)
        effects.consume(code)
        return continueId
      }
      return nok(code)
    }

    const continueId: State = function(code: Code): State | undefined {
      if (code === codes.backslash) {
        effects.consume(code)
        return escapeInId
      }
      
      if (isSeparatorChar(code)) {
        effects.exit(types.wikilinkId)
        effects.enter(types.wikilinkSeparator)
        effects.consume(code)
        effects.exit(types.wikilinkSeparator)
        return enterText
      } else if (isClosingMarkerChar(code)) {
        effects.exit(types.wikilinkId)
        effects.enter(types.wikilinkMarker)
        effects.consume(code)
        return exitClosingMarker
      } else if (isFilenameChar(code)) {
        effects.consume(code)
        return continueId
      }
      return nok(code)
    }

    const escapeInId: State = function(code: Code): State | undefined {
      if (code === codes.backslash || isFilenameChar(code)) {
        effects.consume(code)
        return continueId
      }
      return continueId(code)
    }

    const enterText: State = function(code: Code): State | undefined {
      if (code === codes.backslash) {
        effects.consume(code)
        return escapeInText
      }
      
      if (isTextChar(code)) {
        effects.enter(types.wikilinkText)
        effects.consume(code)
        return continueText
      }
      return nok(code)
    }

    const continueText: State = function(code: Code): State | undefined {
      if (code === codes.backslash) {
        effects.consume(code)
        return escapeInText
      }
      
      if (isTextChar(code)) {
        effects.consume(code)
        return continueText
      } else if (isClosingMarkerChar(code)) {
        effects.exit(types.wikilinkText)
        effects.enter(types.wikilinkMarker)
        effects.consume(code)
        return exitClosingMarker
      }
      return nok(code)
    }

    const escapeInText: State = function(code: Code): State | undefined {
      if (code === codes.backslash || isTextChar(code)) {
        effects.consume(code)
        return continueText
      }
      return continueText(code)
    }

    const exitClosingMarker: State = function(code: Code): State | undefined {
      if (isClosingMarkerChar(code)) {
        effects.consume(code)
        effects.exit(types.wikilinkMarker)
        effects.exit(types.wikilink)
        return ok(code)
      }
      return nok(code)
    }

    return enter
  }

  const construct: Construct = {
    name: "wikilink",
    tokenize,
    previous: (code) => {
      return (
        code === codes.space ||
        code === codes.carriageReturn ||
        code === codes.lineFeed ||
        code === codes.carriageReturnLineFeed ||
        code === codes.eof
      )
    },
  }

  return {
    text: {
      [codes.leftSquareBracket]: construct,
      [codes.backslash]: construct,
    },
  }
}

/** Returns true if character is a valid opening marker */
function isOpeningMarkerChar(code: Code): boolean {
  return code === codes.leftSquareBracket
}

/** Returns true if character is a valid closing marker */
function isClosingMarkerChar(code: Code): boolean {
  return code === codes.rightSquareBracket
}

/** Returns true if character is a valid filename character */
function isFilenameChar(code: Code): boolean {
  if (code === null) return false
  return (
    (code >= codes.digit0 && code <= codes.digit9) ||
    (code >= codes.uppercaseA && code <= codes.uppercaseZ) ||
    (code >= codes.lowercaseA && code <= codes.lowercaseZ) ||
    code === codes.dash ||
    code === codes.underscore ||
    code === codes.dot ||
    code === codes.tilde ||
    code === codes.exclamationMark ||
    code === codes.dollarSign ||
    code === codes.ampersand ||
    code === codes.apostrophe ||
    code === codes.leftParenthesis ||
    code === codes.rightParenthesis ||
    code === codes.asterisk ||
    code === codes.plusSign ||
    code === codes.comma ||
    code === codes.semicolon ||
    code === codes.atSign ||
    code === codes.leftCurlyBrace ||
    code === codes.rightCurlyBrace ||
    code === codes.space
  )
}

/** Returns true if character is a valid separator character */
function isSeparatorChar(code: Code): boolean {
  return code === codes.verticalBar
}

/** Returns true if character is a valid text character */
function isTextChar(code: Code): boolean {
  return (
    code !== codes.eof &&
    code !== codes.carriageReturn &&
    code !== codes.lineFeed &&
    code !== codes.carriageReturnLineFeed &&
    code !== codes.rightSquareBracket
  )
}

/**
 * HTML extension (tokens -> HTML)
 * This is only used for unit testing
 */
export function wikilinkHtml(): HtmlExtension {
  return {
    enter: {
      wikilinkId(token) {
        const id = this.sliceSerialize(token)
        this.raw(`<wikilink id="${id}" text="${id}" />`)
      }
    }
  }
}

interface WikilinkNode extends Node {
  type: "wikilink"
  value: string
  children: []
  data: {
    hName: string
    hProperties: {
      id: string
      text: string
    }
  }
}

declare module "mdast" {
  interface PhrasingContentMap {
    wikilink: WikilinkNode
  }
}

declare module "unified" {
  interface Nodes {
    wikilink: WikilinkNode
  }
}

declare module "micromark-util-types" {
  interface TokenTypeMap {
    wikilink: "wikilink"
    wikilinkMarker: "wikilinkMarker"
    wikilinkId: "wikilinkId"
    wikilinkSeparator: "wikilinkSeparator"
    wikilinkText: "wikilinkText"
    escape: "escape"
  }
  
  interface Nodes {
    wikilink: WikilinkNode
  }
}

/** MDAST extension (tokens -> MDAST) */
export function wikilinkFromMarkdown(): FromMarkdownExtension {
  const enter = function(this: CompileContext, token: Token) {
    if (token.type === "wikilink") {
      const node: WikilinkNode = {
        type: "wikilink",
        value: "",
        children: [],
        data: {
          hName: "wikilink",
          hProperties: {
            id: "",
            text: ""
          }
        }
      }
      // @ts-ignore - we know this is safe because we've declared the type in mdast
      this.enter(node, token)
    } else if (token.type === "wikilinkId" || token.type === "wikilinkText") {
      const textNode: Text = { 
        type: "text", 
        value: "",
        data: {}
      }
      this.enter(textNode, token)
      this.exit(token)
    }
  }

  const exit = function(this: CompileContext, token: Token) {
    if (token.type === "wikilink") {
      this.exit(token)
    } else if (token.type === "wikilinkId" || token.type === "wikilinkText") {
      const node = this.stack[this.stack.length - 1] as PhrasingContent
      if ('type' in node && node.type === "wikilink") {
        const value = this.sliceSerialize(token)
        const wikilinkNode = node as WikilinkNode
        
        if (token.type === "wikilinkId") {
          wikilinkNode.data.hProperties.id = value
          wikilinkNode.value = value // Store ID in value for easy access
        } else {
          wikilinkNode.data.hProperties.text = value
        }
      }
    }
  }

  return {
    enter: {
      wikilink: enter,
      wikilinkId: enter,
      wikilinkText: enter
    },
    exit: {
      wikilink: exit,
      wikilinkId: exit,
      wikilinkText: exit
    }
  }
}

/**
 * Remark plugin factory to handle wikilinks.
 *
 * @param options { enableToMarkdownExtension?: boolean }
 *        When true, adds an HTML extension (for testing/serialization).
 */
export function remarkWikilink(
  options: { enableToMarkdownExtension?: boolean } = {},
): Plugin<[], Root> {
  return function () {
    return (tree: Root, file: VFile): Root => {
      const data = file.data || (file.data = {})
      
      const add = (field: string, value: unknown) => {
        const store = data as Record<string, unknown[]>
        store[field] = store[field] || []
        store[field].push(value)
      }

      add("micromarkExtensions", wikilink())
      add("fromMarkdownExtensions", wikilinkFromMarkdown())

      if (options.enableToMarkdownExtension) {
        // Only add the HTML extension when explicitly requested
        add("toMarkdownExtensions", wikilinkHtml())
      }

      return tree
    }
  }
}