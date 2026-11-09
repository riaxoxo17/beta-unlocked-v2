import fs from 'node:fs'
import { hashAnswer } from '../src/lib/obscure.js'

const key = JSON.parse(fs.readFileSync(new URL('./answer-key.json', import.meta.url), 'utf8'))
const out = {}
for (const [k, values] of Object.entries(key)) out[k] = values.map((v) => hashAnswer(k, v))

fs.writeFileSync(
  new URL('../src/content/answers.generated.js', import.meta.url),
  `// Generated from scripts/answer-key.json by "npm run gen:answers". Do not edit.\nexport const HASHES = ${JSON.stringify(out, null, 2)}\n`,
)
console.log('answers.generated.js written')
