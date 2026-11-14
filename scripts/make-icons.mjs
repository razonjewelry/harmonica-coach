// מייצר אייקוני PNG (מפוחית על רקע כחול כהה) בלי תלויות חיצוניות
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size) {
  const bg = [10, 22, 40], body = [45, 212, 191], hole = [10, 22, 40]
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const bx0 = size * 0.14, bx1 = size * 0.86, by0 = size * 0.34, by1 = size * 0.66
  const n = 10, gap = (bx1 - bx0) / n
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      let c = bg
      if (x >= bx0 && x <= bx1 && y >= by0 && y <= by1) {
        c = body
        const i = Math.floor((x - bx0) / gap), cx = bx0 + (i + 0.5) * gap
        if (Math.abs(x - cx) < gap * 0.26 && y > (by0 + by1) / 2 - size * 0.05 && y < (by0 + by1) / 2 + size * 0.05) c = hole
      }
      const o = y * (size * 4 + 1) + 1 + x * 4
      raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; raw[o + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
mkdirSync('public', { recursive: true })
writeFileSync('public/icon-192.png', png(192))
writeFileSync('public/icon-512.png', png(512))
writeFileSync('public/favicon.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0a1628"/><rect x="9" y="22" width="46" height="20" rx="3" fill="#2dd4bf"/></svg>')
console.log('icons ok')
