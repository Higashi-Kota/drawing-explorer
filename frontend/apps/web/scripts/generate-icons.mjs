import { mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = dirname(fileURLToPath(import.meta.url))
const sizes = [48, 72, 96, 128, 144, 152, 192, 256, 384, 512]

const inputSvg = resolve(__dirname, "../public/favicon.svg")
const outputDir = resolve(__dirname, "../public/icons")

await mkdir(outputDir, { recursive: true })

console.log("Generating PWA icons from favicon.svg...")

for (const size of sizes) {
  await sharp(inputSvg)
    .resize(size, size)
    .png()
    .toFile(resolve(outputDir, `icon-${size}x${size}.png`))
  console.log(`  ✓ icon-${size}x${size}.png`)
}

console.log("\nDone! Icons generated in public/icons/")
