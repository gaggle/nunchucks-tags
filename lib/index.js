"use strict";
const isBoolean = require("lodash.isboolean")
const isFunction = require("lodash.isfunction")
const nunjucks = require("nunjucks")
const promisify = require("es6-promisify")
const stripIndent = require("strip-indent")

let placeholder = "\uFFFC";
let rPlaceholder = /(?:<|&lt;)\!--\uFFFC(\d+)--(?:>|&gt;)/g;

class Tag {
  constructor() {
    this.env = new nunjucks.Environment(null, {autoescape: false})
  }
  /**
   * Register custom tag
   *
   * @param {string} name
   * @param {nunjucksCustomTag} fn
   * @param {Object|Boolean} [options]
   * @param {Boolean} [options.async]
   * @param {Boolean} [options.ends]
   */
  register(name, fn, options) {
    if (!name) throw new TypeError("name is required")
    if (!isFunction(fn)) throw new TypeError("fn must be a function")
    if (!options || isBoolean(options)) options = {ends: options}

    let tag

    if (options.async) {
      if (fn.length > 2) fn = promisify(fn)

      tag = options.ends ?
        new NunjucksAsyncBlock(name, fn) :
        new NunjucksAsyncTag(name, fn)
    } else {
      tag = options.ends ?
        new NunjucksBlock(name, fn) :
        new NunjucksTag(name, fn)
    }

    this.env.addExtension(name, tag)
  }

  /**
   * Render string by resolving tags within it
   *
   * @param {string} str
   * @param {Object} [context]
   * @returns {Promise}
   */
  render(str, context) {
    let cache = []

    const escapeContent = (str) => {
      return "<!--" + placeholder + (cache.push(str) - 1) + "-->"
    }

    const env = this.env
    return new Promise((resolve, reject) => {
      str = str.replace(/<pre><code.*>[\s\S]*?<\/code><\/pre>/gm, escapeContent)
      env.renderString(str, context, (err, result) => {
        if (err) return reject(err)
        resolve(result.replace(rPlaceholder, (str, opts) => cache[opts]))
      })
    })
  }
}

class NunjucksTag {
  constructor(name, fn) {
    this.tags = [name]
    this.fn = fn
  }

  parse(parser, nodes, lexer) {
    let node = this._parseArgs(parser, nodes, lexer);

    return new nodes.CallExtension(this, "run", node, []);
  }

  _parseArgs(parser, nodes, lexer) {
    let tag = parser.nextToken()
    let node = new nodes.NodeList(tag.lineno, tag.colno)
    let token

    let argArray = new nodes.Array(tag.lineno, tag.colno)

    let argItem = "";
    while (token = parser.nextToken(true)) {
      if (token.type === lexer.TOKEN_WHITESPACE || token.type === lexer.TOKEN_BLOCK_END) {
        if (argItem !== "") {
          let argNode = new nodes.Literal(tag.lineno, tag.colno, argItem.trim())
          argArray.addChild(argNode)
          argItem = ""
        }

        if (token.type === lexer.TOKEN_BLOCK_END) break
      } else {
        argItem += token.value
      }
    }

    node.addChild(argArray)

    return node
  }

  run(context, args) {
    return this._run(context, args, "")
  }

  _run(context, args, body) {
    return this.fn.call(context.ctx, args, body)
  }
}

class NunjucksBlock extends NunjucksTag {
  parse(parser, nodes, lexer) {
    let node = this._parseArgs(parser, nodes, lexer)
    let body = this._parseBody(parser, nodes, lexer)

    return new nodes.CallExtension(this, "run", node, [body])
  }

  _parseBody(parser, nodes, lexer) {
    let body = parser.parseUntilBlocks("end" + this.tags[0])

    parser.advanceAfterBlockEnd()
    return body
  }

  run(context, args, body) {
    return this._run(context, args, trimBody(body))
  }
}

class NunjucksAsyncTag extends NunjucksTag {
  parse(parser, nodes, lexer) {
    let node = this._parseArgs(parser, nodes, lexer)

    return new nodes.CallExtensionAsync(this, "run", node, [])
  }

  run(context, args, callback) {
    return this._run(context, args, "")
      .then(result => callback(null, result), callback)
  }
}

class NunjucksAsyncBlock extends NunjucksBlock {
  parse(parser, nodes, lexer) {
    let node = this._parseArgs(parser, nodes, lexer)
    let body = this._parseBody(parser, nodes, lexer)

    return new nodes.CallExtensionAsync(this, "run", node, [body])
  }

  run(context, args, body, callback) {
    let self = this;

    body((err, result) => {
      body = () => result

      self._run(context, args, trimBody(body))
        .then(result => callback(err, result));
    });
  }
}

function trimBody(body) {
  return stripIndent(body()).replace(/^\n?|\n?$/g, "");
}

module.exports = Tag;

/**
 * @function nunjucksCustomTag
 * @param {string[]} args
 * @param {string} content
 * @param {function} [callback]
 */
