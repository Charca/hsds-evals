const {
  extractGeneratedCode,
  stripComments,
  getJsxOpenTags,
} = require('./extract')
const { PASS_THRESHOLD } = require('./thresholds')

module.exports = (output, { test }) => {
  const expected = (test && test.metadata && test.metadata.expectedComponents) || []
  if (expected.length === 0) {
    return {
      pass: true,
      score: 1,
      reason: 'No expectedComponents declared for this case',
    }
  }

  const code = stripComments(extractGeneratedCode(output))
  const tags = getJsxOpenTags(code)
  const usedTags = new Set(tags.map(t => t.name))
  const usedRoots = new Set(tags.map(t => t.name.split('.')[0]))

  // A dotted expectation (e.g. `FormPage.Header`) must be used by that exact
  // tag. A bare expectation (e.g. `Table`) is satisfied by the tag itself OR
  // any sub-component of it (`<Table.Body>` proves `Table` is in use).
  const isUsed = name =>
    usedTags.has(name) || (!name.includes('.') && usedRoots.has(name))

  const expectedNames = expected.map(c => (typeof c === 'string' ? c : c.name))
  const missing = expectedNames.filter(name => !isUsed(name))
  const score = (expectedNames.length - missing.length) / expectedNames.length

  return {
    pass: score >= PASS_THRESHOLD,
    score,
    reason:
      missing.length === 0
        ? `All ${expectedNames.length} expected components used`
        : `Missing: ${missing.join(', ')} (${expectedNames.length - missing.length}/${expectedNames.length} used)`,
  }
}
