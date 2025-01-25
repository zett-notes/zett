declare module "micromark-util-types" {
  interface TokenTypeMap {
    embed: "embed"
    embedMarker: "embedMarker"
    embedId: "embedId"
    embedSeparator: "embedSeparator"
    embedText: "embedText"
  }
}

import { Root, Text, PhrasingContent } from "mdast"
import { Extension as FromMarkdownExtension, Handle, Token, CompileContext } from "mdast-util-from-markdown"
import { codes } from "micromark-util-symbol/codes"
import {
  Code,
  Extension,
  HtmlExtension,
  State,
  Tokenizer,
  Previous,
  Construct,
} from "micromark-util-types"
import { Plugin, Processor } from "unified"
import { Node } from "unist"

interface EmbedNode extends Node {
  type: "embed"
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
    embed: EmbedNode
  }
}

declare module "unified" {
  interface Nodes {
    embed: EmbedNode
  }
}

declare module "micromark-util-types" {
  interface TokenTypeMap {
    embed: "embed"
    embedMarker: "embedMarker"
    embedId: "embedId"
    embedSeparator: "embedSeparator"
    embedText: "embedText"
    escape: "escape"
  }
  
  interface Nodes {
    embed: EmbedNode
  }
}

const types = {
  embed: "embed",
  embedMarker: "embedMarker",
  embedId: "embedId",
  embedSeparator: "embedSeparator",
  embedText: "embedText",
} as const

interface Options {}

/** Syntax extension (text -> tokens) */
export function embed(): Extension {
  const tokenize: Tokenizer = (effects, ok, nok) => {
    const enter: State = function(code: Code): State | undefined {
      if (code === codes.backslash) {
        effects.enter('escape')
        effects.consume(code)
        return escapeStart
      }
      
      if (isExclamationMarkChar(code)) {
        effects.enter("embed" as TokenType)
        effects.enter("embedMarker" as TokenType)
        effects.consume(code)
        return enterOpeningMarker(code)
      }
      return nok(code)
    }

    const escapeStart: State = function(code: Code): State | undefined {
      if (code === codes.exclamationMark || code === codes.leftSquareBracket || code === codes.rightSquareBracket || code === codes.verticalBar) {
        effects.consume(code)
        effects.exit('escape')
        return enter
      }
      return nok(code)
    }

    const enterOpeningMarker: State = function(code: Code): State | undefined {
      if (isOpeningMarkerChar(code)) {
        effects.consume(code)
        return exitOpeningMarker(code)
      }
      return nok(code)
    }

    const exitOpeningMarker: State = function(code: Code): State | undefined {
      if (isOpeningMarkerChar(code)) {
        effects.consume(code)
        effects.exit(types.embedMarker)
        return enterId(code)
      }
      return nok(code)
    }

    const enterId: State = function(code: Code): State | undefined {
      if (code === codes.backslash) {
        effects.consume(code)
        return escapeInId
      }
      
      if (isFilenameChar(code)) {
        effects.enter("embedId" as TokenType)
        effects.consume(code)
        return continueId(code)
      }
      return nok(code)
    }

    const continueId: State = function(code: Code): State | undefined {
      if (code === codes.backslash) {
        effects.consume(code)
        return escapeInId
      }
      
      if (isSeparatorChar(code)) {
        effects.exit("embedId" as TokenType)
        effects.enter("embedSeparator" as TokenType)
        effects.consume(code)
        effects.exit(types.embedSeparator)
        return enterText(code)
      } else if (isClosingMarkerChar(code)) {
        effects.exit("embedId" as TokenType)
        effects.enter("embedMarker" as TokenType)
        effects.consume(code)
        return exitClosingMarker(code)
      } else if (isFilenameChar(code)) {
        effects.consume(code)
        return continueId(code)
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
        effects.enter("embedText" as TokenType)
        effects.consume(code)
        return continueText(code)
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
        return continueText(code)
      } else if (isClosingMarkerChar(code)) {
        effects.exit("embedText" as TokenType)
        effects.enter("embedMarker" as TokenType)
        effects.consume(code)
        return exitClosingMarker(code)
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
        effects.exit(types.embedMarker)
        effects.exit(types.embed)
        return ok(code)
      }
      return nok(code)
    }

    return enter
  }

  const previous: Previous = (code) => {
    return (
      code === codes.space ||
      code === codes.carriageReturn ||
      code === codes.lineFeed ||
      code === codes.carriageReturnLineFeed ||
      code === codes.eof
    )
  }

  const construct: Construct = {
    name: "embed",
    tokenize,
    previous,
  }

  return {
    text: {
      [codes.exclamationMark]: construct,
    },
  }
}

/** Returns true if character is an exclamation mark */
function isExclamationMarkChar(code: Code): boolean {
  return code === codes.exclamationMark
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
export function embedHtml(): HtmlExtension {
  return {
    enter: {
      embedId(token) {
        const id = this.sliceSerialize(token)
        this.raw(`<embed id="${id}" text="${id}" />`)
      }
    }
  }
}

/** MDAST extension (tokens -> MDAST) */
export function embedFromMarkdown(): FromMarkdownExtension {
  const enter: Handle = function(this: CompileContext, token: Token) {
    if (token.type === "embed") {
      const node: EmbedNode = {
        type: "embed",
        value: "",
        children: [],
        data: {
          hName: "embed",
          hProperties: {
            id: "",
            text: ""
          }
        }
      }
      // @ts-ignore - we know this is safe because we've declared the type in mdast
      this.enter(node, token)
    } else if (token.type === "embedId" || token.type === "embedText") {
      const textNode: Text = { type: "text", value: "" }
      this.enter(textNode, token)
      this.exit(token)
    }
  }

  const exit: Handle = function(this: CompileContext, token: Token) {
    if (token.type === "embed") {
      this.exit(token)
    } else if (token.type === "embedId" || token.type === "embedText") {
      const node = this.stack[this.stack.length - 1] as PhrasingContent
      if ('type' in node && node.type === "embed") {
        const value = this.sliceSerialize(token)
        const embedNode = node as EmbedNode
        
        if (token.type === "embedId") {
          embedNode.data.hProperties.id = value
          embedNode.value = value // Store ID in value for easy access
        } else {
          embedNode.data.hProperties.text = value
        }
      }
    }
  }

  return {
    enter: {
      embed: enter,
      embedId: enter,
      embedText: enter
    },
    exit: {
      embed: exit,
      embedId: exit,
      embedText: exit
    }
  }
}

/**
 * Remark plugin
 * Safely add micromark and fromMarkdown extensions to this.data().
 */
export function remarkEmbed(): Plugin<[Options?], Root> {
  return function(this: Processor) {
    const add = (field: string, value: unknown) => {
      const data = this.data() as Record<string, unknown[]>
      const list = data[field] ? data[field] : (data[field] = [])
      list.push(value)
    }

    add("micromarkExtensions", embed())
    add("fromMarkdownExtensions", embedFromMarkdown())
    add("toMarkdownExtensions", embedHtml())

    return (tree: Root) => tree
  }
}