import { HASHES } from '../content/answers.generated.js'
import { hashAnswer } from './obscure.js'

export const check = (key, input) => (HASHES[key] || []).includes(hashAnswer(key, input))
