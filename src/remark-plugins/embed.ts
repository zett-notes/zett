declare module "micromark-util-types" {
  interface TokenTypeMap {
    embed: "embed"
    embedMarker: "embedMarker"
    embedId: "embedId"
    embedSeparator: "embedSeparator"
    embedText: "embedText"
  }
}

import { Root } from "mdast"
import { Extension as FromMarkdownExtension, Token } from "mdast-util-from-markdown"
import { codes } from "micromark-util-symbol/codes"
import {
  Code,
  Construct,
  Extension,
  HtmlExtension,
  State,
  Tokenizer,
  TokenType,
} from "micromark-util-types"
import { Plugin } from "unified"
import { Node } from "unist" // Removed import { VFile } from "vfile"
// Removed unused interface Options

/** Syntax extension (text -> tokens) */
export function embed(): Extension {
  const tokenize: Tokenizer = (effects, ok, nok) => {
    return enter

    function enter(code: Code): State | undefined {
      if (isExclamationMarkChar(code)) {
        effects.enter("embed" as TokenType)
        effects.enter("embedMarker" as TokenType)
        effects.consume(code)
        return enterOpeningMarker
      } else {
        return nok(code)
      }
    }

    function enterOpeningMarker(code: Code): State | undefined {
      if (isOpeningMarkerChar(code)) {
        effects.consume(code)
        return exitOpeningMarker
      } else {
        return nok(code)
      }
    }

    function exitOpeningMarker(code: Code): State | undefined {
      if (isOpeningMarkerChar(code)) {
        effects.consume(code)
        effects.exit("embedMarker" as TokenType)
        return enterId
      } else {
        return nok(code)
      }
    }

    function enterId(code: Code): State | undefined {
      if (isFilenameChar(code)) {
        effects.enter("embedId" as TokenType)
        effects.consume(code)
        return continueId
      } else {
        return nok(code)
      }
    }

    function continueId(code: Code): State | undefined {
      if (isSeparatorChar(code)) {
        effects.exit("embedId" as TokenType)
        effects.enter("embedSeparator" as TokenType)
        effects.consume(code)
        effects.exit("embedSeparator" as TokenType)
        return enterText
      } else if (isClosingMarkerChar(code)) {
        effects.exit("embedId" as TokenType)
        effects.enter("embedMarker" as TokenType)
        effects.consume(code)
        return exitClosingMarker
      } else if (isFilenameChar(code)) {
        effects.consume(code)
        return continueId
      } else {
        return nok(code)
      }
    }

    function enterText(code: Code): State | undefined {
      if (isTextChar(code)) {
        effects.enter("embedText" as TokenType)
        effects.consume(code)
        return continueText
      } else {
        return nok(code)
      }
    }

    function continueText(code: Code): State | undefined {
      if (isTextChar(code)) {
        effects.consume(code)
        return continueText
      } else if (isClosingMarkerChar(code)) {
        effects.exit("embedText" as TokenType)
        effects.enter("embedMarker" as TokenType)
        effects.consume(code)
        return exitClosingMarker
      } else {
        return nok(code)
      }
    }

    function exitClosingMarker(code: Code): State | undefined {
      if (isClosingMarkerChar(code)) {
        effects.consume(code)
        effects.exit("embedMarker" as TokenType)
        effects.exit("embed" as TokenType)
        return ok
      } else {
        return nok(code)
      }
    }
  }

  const construct: Construct = {
    name: "embed",
    tokenize,
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
  let id: string | undefined
  let text: string | undefined

  return {
    enter: {
      embedId(token: Token) {
        id = this.sliceSerialize(token)
      },
      embedText(token: Token) {
        text = this.sliceSerialize(token)
      },
    },
    exit: {
      embed() {
        this.tag(`<embed id="${id}" text="${text || id}" />`)
        id = undefined
        text = undefined
      },
    },
  }
}

// Register embed as an mdast node type
interface Embed extends Node {
  type: "embed"
  data: { id: string; text: string }
}

declare module "mdast" {
  interface StaticPhrasingContentMap {
    embed: Embed
  }
}

/** MDAST extension (tokens -> MDAST) */
export function embedFromMarkdown(): FromMarkdownExtension {
  let id: string | undefined
  let text: string | undefined

  return {
    enter: {
      embed(token: Token) {
        const node = { type: "embed", data: { id: "", text: "" } } as Embed
        // @ts-ignore - we know this is safe because we've defined the Embed type
        this.enter(node, token)
      },
      embedId(token: Token) {
        id = this.sliceSerialize(token)
      },
      embedText(token: Token) {
        text = this.sliceSerialize(token)
      },
    },
    exit: {
      embed(token: Token) {
        const node = this.stack[this.stack.length - 1] as unknown as Embed
        node.data.id = id || ""
        node.data.text = text || id || ""
        this.exit(token)
        id = undefined
        text = undefined
      },
    },
  }
}

/**
 * Remark plugin
 * Safely add micromark and fromMarkdown extensions to this.data().
 */
export function remarkEmbed(): ReturnType<Plugin<[], Root>> {
  // @ts-ignore - we know this will be bound to the processor instance
  const data = this.data()

  add("micromarkExtensions", embed())
  add("fromMarkdownExtensions", embedFromMarkdown())

  function add(field: string, value: unknown) {
    const list = data[field] ? data[field] : (data[field] = [])
    list.push(value)
  }
}