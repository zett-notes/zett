// Copied from wikilink.ts

import { Root, Literal } from "mdast"
import { Extension as FromMarkdownExtension } from "mdast-util-from-markdown"
import { codes } from "micromark-util-symbol"
import { Code, Construct, Extension, HtmlExtension, State, Tokenizer } from "micromark-util-types"
import { Plugin } from "unified"

// Register embed as an mdast node type
interface Embed extends Literal {
  type: "embed"
  value: string
  data: { id: string; text: string }
}

declare module "micromark-util-types" {
  interface TokenTypeMap {
    embed: "embed"
    embedMarker: "embedMarker"
    embedId: "embedId"
    embedSeparator: "embedSeparator"
    embedText: "embedText"
  }
}

declare module "mdast-util-from-markdown" {
  interface Content {
    embed: Embed
  }
}

declare module "mdast" {
  interface PhrasingContentMap {
    embed: Embed
  }
  interface RootContentMap {
    embed: Embed
  }
}

const types = {
  embed: "embed" as const,
  embedMarker: "embedMarker" as const,
  embedId: "embedId" as const,
  embedSeparator: "embedSeparator" as const,
  embedText: "embedText" as const,
}

/** Syntax extension (text -> tokens) */
export function embed(): Extension {
  const tokenize: Tokenizer = (effects, ok, nok) => {
    return enter

    function enter(code: Code): State | undefined {
      if (isExclamationMarkChar(code)) {
        effects.enter(types.embed)
        effects.enter(types.embedMarker)
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
        effects.exit(types.embedMarker)

        return enterId
      } else {
        return nok(code)
      }
    }

    function enterId(code: Code): State | undefined {
      if (isFilenameChar(code)) {
        effects.enter(types.embedId)
        effects.consume(code)
        return continueId
      } else {
        return nok(code)
      }
    }

    function continueId(code: Code): State | undefined {
      if (isSeparatorChar(code)) {
        effects.exit(types.embedId)
        effects.enter(types.embedSeparator)
        effects.consume(code)
        effects.exit(types.embedSeparator)
        return enterText
      } else if (isClosingMarkerChar(code)) {
        effects.exit(types.embedId)
        effects.enter(types.embedMarker)
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
        effects.enter(types.embedText)
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
        effects.exit(types.embedText)
        effects.enter(types.embedMarker)
        effects.consume(code)
        return exitClosingMarker
      } else {
        return nok(code)
      }
    }

    function exitClosingMarker(code: Code): State | undefined {
      if (isClosingMarkerChar(code)) {
        effects.consume(code)
        effects.exit(types.embedMarker)
        effects.exit(types.embed)
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
  // Initialize state
  let id: string | undefined
  let text: string | undefined

  return {
    enter: {
      [types.embedId](token) {
        id = this.sliceSerialize(token)
      },
      [types.embedText](token) {
        text = this.sliceSerialize(token)
      },
    },
    exit: {
      [types.embed]() {
        this.tag(`<embed id="${id}" text="${text || id}" value="${id}" />`)

        // Reset state
        id = undefined
        text = undefined
      },
    },
  }
}

/** MDAST extension (tokens -> MDAST) */
export function embedFromMarkdown(): FromMarkdownExtension {
  // Initialize state
  let id: string | undefined
  let text: string | undefined

  return {
    enter: {
      [types.embed](token) {
        this.enter({ type: "embed", value: "", data: { id: "", text: "" } }, token)
      },
      [types.embedId](token) {
        id = this.sliceSerialize(token)
      },
      [types.embedText](token) {
        text = this.sliceSerialize(token)
      },
    },
    exit: {
      [types.embed](token) {
        const node = this.stack[this.stack.length - 1]

        if (node.type === "embed") {
          node.data.id = id || ""
          node.data.text = text || id || ""
          node.value = id || ""
        }

        this.exit(token)

        // Reset state
        id = undefined
        text = undefined
      },
    },
  }
}

/**
 * Remark plugin
 * Reference: https://github.com/remarkjs/remark-gfm/blob/main/index.js
 */
export function remarkEmbed(): ReturnType<Plugin<[], Root>> {
  // @ts-ignore I'm not sure how to type `this`
  const data = this.data()

  add("micromarkExtensions", embed())
  add("fromMarkdownExtensions", embedFromMarkdown())

  function add(field: string, value: unknown) {
    const list = data[field] ? data[field] : (data[field] = [])
    list.push(value)
  }
}
