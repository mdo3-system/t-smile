const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const srcDir = 'C:/Users/user/.gemini/antigravity-ide/brain/414b531b-ed86-4379-8ec8-968a76c5e635/.user_uploaded';
const destDir = 'e:/Dropbox/■住ま居る/■住ま居る共有/ﾒﾀﾊﾞｰｽ展示場/Antigravity/public/images/kaitai';

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function getJpegDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xFF) break;
    const marker = buffer[offset + 1];
    if (marker === 0xC0 || marker === 0xC2) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height };
    }
    const len = buffer.readUInt16BE(offset + 2);
    offset += 2 + len;
  }
  return { width: 0, height: 0 };
}

const files = fs.readdirSync(srcDir);
const seen = new Map();

files.forEach(f => {
  const p = path.join(srcDir, f);
  const buf = fs.readFileSync(p);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  const dims = getJpegDimensions(p);
  if (!seen.has(hash)) {
    seen.set(hash, { origFile: f, size: buf.length, width: dims.width, height: dims.height, path: p });
  }
});

console.log(`Found ${seen.size} unique images.`);
let count = 1;
for (const [hash, info] of seen.entries()) {
  const targetName = `user_sketch_${count}_${info.width}x${info.height}.jpg`;
  fs.copyFileSync(info.path, path.join(destDir, targetName));
  console.log(`[${count}] ${info.origFile} -> ${targetName} (${info.width}x${info.height}, ${(info.width/info.height).toFixed(2)})`);
  count++;
}
