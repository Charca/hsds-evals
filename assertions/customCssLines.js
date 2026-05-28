const { extractGeneratedCode } = require('./extract')
const { PASS_THRESHOLD } = require('./thresholds')

const STYLED_TEMPLATE = /(?:styled(?:\.[\w$]+|\([^)]+\))|(?<![\w$])css)`([\s\S]*?)`/g
const INLINE_STYLE = /\bstyle\s*=\s*\{/g
const PENALTY_FLOOR = 20

module.exports = (output, _context) => {
  const code = extractGeneratedCode(output)

  let styledLines = 0
  let m
  STYLED_TEMPLATE.lastIndex = 0
  while ((m = STYLED_TEMPLATE.exec(code)) !== null) {
    const body = m[1]
    styledLines += body.split('\n').filter(line => line.trim().length > 0).length
  }

  let inlineCount = 0
  INLINE_STYLE.lastIndex = 0
  while (INLINE_STYLE.exec(code) !== null) inlineCount++

  const total = styledLines + inlineCount
  const score = Math.max(0, 1 - total / PENALTY_FLOOR)

  return {
    pass: score >= PASS_THRESHOLD,
    score,
    reason: `${total} custom CSS lines (${styledLines} from styled/css templates, ${inlineCount} inline style={})`,
  }
}
