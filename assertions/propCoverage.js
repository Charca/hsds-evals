const {
  extractGeneratedCode,
  stripComments,
  getJsxOpenTags,
  getPropOccurrences,
} = require('./extract')
const { PASS_THRESHOLD } = require('./thresholds')

function matches(actual, expected) {
  if (expected === true) return actual === true || actual === 'true' || actual === ''
  if (typeof expected === 'boolean') return actual === expected || String(actual) === String(expected)
  return String(actual) === String(expected)
}

module.exports = (output, { test }) => {
  const expected = (test && test.metadata && test.metadata.expectedComponents) || []
  const pairs = []
  for (const entry of expected) {
    if (typeof entry === 'string' || !entry.props) continue
    for (const [prop, value] of Object.entries(entry.props)) {
      pairs.push({ component: entry.name, prop: prop.toLowerCase(), value })
    }
  }
  if (pairs.length === 0) {
    return {
      pass: true,
      score: 1,
      reason: 'No expected props declared for this case',
    }
  }

  const code = stripComments(extractGeneratedCode(output))
  const tags = getJsxOpenTags(code)

  // Key by the full tag name so props on a sub-component (`<FormPage.Header>`)
  // are matched against the matching expectation (`FormPage.Header`) rather
  // than collapsed onto the root.
  const propsByComponent = new Map()
  for (const tag of tags) {
    if (!propsByComponent.has(tag.name)) propsByComponent.set(tag.name, [])
    propsByComponent.get(tag.name).push(getPropOccurrences(tag.propsBlob))
  }

  const missing = []
  let satisfied = 0
  for (const { component, prop, value } of pairs) {
    const instances = propsByComponent.get(component) || []
    const ok = instances.some(p => prop in p && matches(p[prop], value))
    if (ok) satisfied++
    else missing.push(`${component}.${prop}=${JSON.stringify(value)}`)
  }
  const score = satisfied / pairs.length

  return {
    pass: score >= PASS_THRESHOLD,
    score,
    reason:
      missing.length === 0
        ? `All ${pairs.length} expected props matched`
        : `Missing: ${missing.join(', ')} (${satisfied}/${pairs.length} matched)`,
  }
}
