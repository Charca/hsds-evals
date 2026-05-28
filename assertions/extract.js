const CODE_LANGS = new Set([
  'tsx',
  'jsx',
  'ts',
  'js',
  'typescript',
  'javascript',
])

// Returns every code-fenced file block concatenated, so the metrics aggregate
// across a multi-file answer (component + hooks + types + ...). Falls back to
// the largest fenced block, then the raw output, when nothing is tagged.
function extractGeneratedCode(output) {
  if (typeof output !== 'string') return ''
  const blocks = []
  const re = /```(\w+)?\n([\s\S]*?)```/g
  for (const m of output.matchAll(re)) {
    blocks.push({ lang: (m[1] || '').toLowerCase(), code: m[2] })
  }
  const codeBlocks = blocks.filter(b => CODE_LANGS.has(b.lang))
  if (codeBlocks.length > 0) {
    return codeBlocks.map(b => b.code).join('\n')
  }
  if (blocks.length > 0) {
    return blocks.sort((a, b) => b.code.length - a.code.length)[0].code
  }
  return output
}

function stripComments(src) {
  let out = ''
  let i = 0
  const len = src.length
  while (i < len) {
    const c = src[i]
    const next = src[i + 1]
    if (c === '/' && next === '/') {
      const nl = src.indexOf('\n', i)
      i = nl === -1 ? len : nl
      continue
    }
    if (c === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2)
      i = end === -1 ? len : end + 2
      continue
    }
    if (c === '{' && next === '/' && src[i + 2] === '*') {
      const end = src.indexOf('*/}', i + 3)
      i = end === -1 ? len : end + 3
      continue
    }
    out += c
    i++
  }
  return out
}

function getJsxOpenTags(src) {
  const tags = []
  const re = /<([A-Z][\w.]*)\b([^>]*?)\/?>/g
  for (const m of src.matchAll(re)) {
    tags.push({ name: m[1], propsBlob: m[2] || '' })
  }
  return tags
}

function getPropOccurrences(propsBlob) {
  const props = {}
  for (const m of propsBlob.matchAll(/([a-zA-Z_$][\w$-]*)\s*=\s*"([^"]*)"/g)) {
    props[m[1].toLowerCase()] = m[2]
  }
  for (const m of propsBlob.matchAll(/([a-zA-Z_$][\w$-]*)\s*=\s*'([^']*)'/g)) {
    props[m[1].toLowerCase()] = m[2]
  }
  for (const m of propsBlob.matchAll(/([a-zA-Z_$][\w$-]*)\s*=\s*\{([\s\S]*?)\}/g)) {
    const raw = m[2].trim()
    let value = raw
    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      value = raw.slice(1, -1)
    } else if (raw === 'true' || raw === 'false') {
      value = raw === 'true'
    }
    props[m[1].toLowerCase()] = value
  }
  const consumed = new Set()
  for (const m of propsBlob.matchAll(/([a-zA-Z_$][\w$-]*)\s*=/g)) {
    consumed.add(m[1].toLowerCase())
  }
  for (const m of propsBlob.matchAll(/(?:^|\s)([a-zA-Z_$][\w$-]*)(?=\s|\/|$)/g)) {
    const name = m[1].toLowerCase()
    if (consumed.has(name)) continue
    props[name] = true
  }
  return props
}

module.exports = {
  extractGeneratedCode,
  stripComments,
  getJsxOpenTags,
  getPropOccurrences,
}
