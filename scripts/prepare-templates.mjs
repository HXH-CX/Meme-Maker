import sharp from 'sharp'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

const RAW_DIR = 'assets/raw'
const OUT_DIR = 'web/public/templates'

const files = (await readdir(RAW_DIR)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
for (const file of files) {
  const name = path.parse(file).name
  await sharp(path.join(RAW_DIR, file))
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(path.join(OUT_DIR, `${name}.png`))
  console.log(`${file} -> ${name}.png (512x512)`)
}