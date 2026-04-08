import { customAlphabet } from 'nanoid'

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const generateId = customAlphabet(alphabet, 20)

export function generateToken(): string {
  return generateId()
}
