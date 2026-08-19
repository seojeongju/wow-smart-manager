import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const files = [
  'sitemap.xml',
  'robots.txt',
  'llms.txt',
  '_routes.json',
  'naver165f9e79465026abd5b02aee545d676c.html',
  '.well-known/assetlinks.json',
]

for (const file of files) {
  const src = resolve(root, 'public', file)
  const dest = resolve(root, 'dist', file)
  if (!existsSync(src)) continue
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(src, dest)
  console.log(`copied ${file} -> dist/${file}`)
}
