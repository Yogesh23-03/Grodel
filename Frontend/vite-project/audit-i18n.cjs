/* Temporary audit: find t('key') calls whose key is missing from the English
   locale AND which pass no defaultValue — those render the raw key in the UI. */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, 'src')

function flatten(obj, prefix, out) {
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out)
    else out.add(key)
  }
}

const localesSrc = fs.readFileSync(path.join(root, 'i18n', 'locales.js'), 'utf8')
const mod = { exports: {} }
new Function('module', 'exports', `${localesSrc.replace(/^export\s+/gm, '')}\nmodule.exports = { resources }`)(mod, mod.exports)
const en = mod.exports.resources.en.translation
const keys = new Set()
flatten(en, '', keys)

function walk(dir, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, acc)
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) acc.push(full)
  }
  return acc
}

const files = walk(root, [])
const missing = new Map()

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8')
  // t('some.key'   OR   t('some.key', ...)
  const re = /[^A-Za-z0-9_.]t\(\s*['"]([A-Za-z0-9_.]+)['"]\s*(,?)/g
  let m
  while ((m = re.exec(src))) {
    const key = m[1]
    const hasArgAfter = m[2] === ','
    if (key.includes('${')) continue
    if (keys.has(key)) continue
    // a missing key is only harmful when no default is supplied
    if (hasArgAfter) continue
    const rel = path.relative(__dirname, file).replace(/\\/g, '/')
    if (!missing.has(key)) missing.set(key, new Set())
    missing.get(key).add(rel)
  }
}

const rows = [...missing.entries()].sort()
console.log(`English keys defined: ${keys.size}`)
console.log(`Missing keys rendered raw (no default): ${rows.length}\n`)
for (const [key, files] of rows) {
  console.log(`  ${key}  ->  ${[...files].join(', ')}`)
}
