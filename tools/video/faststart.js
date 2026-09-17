// Move an MP4's moov atom in front of mdat (like qt-faststart) so browsers can
// start playing before the whole file has downloaded. Rewrites chunk offsets.
const fs = require("fs");
const [src, dst] = process.argv.slice(2);
const buf = fs.readFileSync(src);

function topBoxes(b) {
  const out = [];
  let p = 0;
  while (p + 8 <= b.length) {
    let size = b.readUInt32BE(p);
    const type = b.toString("latin1", p + 4, p + 8);
    let hdr = 8;
    if (size === 1) { size = Number(b.readBigUInt64BE(p + 8)); hdr = 16; }
    else if (size === 0) size = b.length - p;
    if (size < hdr || p + size > b.length) throw new Error(`bad box ${type} at ${p}`);
    out.push({ type, start: p, size });
    p += size;
  }
  return out;
}

const boxes = topBoxes(buf);
console.log("top-level:", boxes.map((x) => `${x.type}(${x.size})`).join(" "));
const moov = boxes.find((x) => x.type === "moov");
const mdat = boxes.find((x) => x.type === "mdat");
if (!moov || !mdat) throw new Error("missing moov or mdat");
if (moov.start < mdat.start) {
  console.log("already faststart");
  if (dst && dst !== src) fs.copyFileSync(src, dst);
  process.exit(0);
}

const moovBuf = Buffer.from(buf.subarray(moov.start, moov.start + moov.size));
const shift = moov.size;
const CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "stbl", "edts", "dinf", "mvex"]);
let patched = 0;
(function walk(start, end) {
  let p = start;
  while (p + 8 <= end) {
    const size = moovBuf.readUInt32BE(p);
    const type = moovBuf.toString("latin1", p + 4, p + 8);
    if (size < 8 || p + size > end) break;
    if (CONTAINERS.has(type)) walk(p + 8, p + size);
    else if (type === "stco") {
      const n = moovBuf.readUInt32BE(p + 12);
      for (let i = 0; i < n; i++) {
        const o = p + 16 + i * 4;
        const v = moovBuf.readUInt32BE(o) + shift;
        if (v > 0xffffffff) throw new Error("offset overflow: needs co64");
        moovBuf.writeUInt32BE(v, o);
      }
      patched += n;
    } else if (type === "co64") {
      const n = moovBuf.readUInt32BE(p + 12);
      for (let i = 0; i < n; i++) {
        const o = p + 16 + i * 8;
        moovBuf.writeBigUInt64BE(moovBuf.readBigUInt64BE(o) + BigInt(shift), o);
      }
      patched += n;
    }
    p += size;
  }
})(8, moovBuf.length);

// new order: everything before mdat, then moov, then the rest minus the old moov
const parts = [];
for (const x of boxes) {
  if (x.type === "moov") continue;
  if (x === mdat) parts.push(moovBuf);
  parts.push(buf.subarray(x.start, x.start + x.size));
}
fs.writeFileSync(dst || src, Buffer.concat(parts));
console.log(`moved moov (${shift} bytes) before mdat, patched ${patched} chunk offsets`);
