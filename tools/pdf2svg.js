// Minimal PDF -> SVG for flat vector artwork (the QUBE logo files): reads the
// page content stream, replays the path operators through the transform stack
// and flips the y axis. Emits one path with fill="currentColor".
// usage: node pdf2svg.js <in.pdf> <out.svg> [white|black]
const fs = require("fs");
const zlib = require("zlib");

const [inPath, outPath, want = "white"] = process.argv.slice(2);
const buf = fs.readFileSync(inPath);
const raw = buf.toString("latin1");

const mb = raw.match(/\/MediaBox\s*\[([^\]]+)\]/);
const [, , pw, ph] = mb[1].trim().split(/\s+/).map(Number);

// find the content streams and keep the one whose fill colour we want
const streams = [];
for (const m of raw.matchAll(/(\d+)\s+(\d+)\s+obj\b/g)) {
  const start = m.index;
  const end = raw.indexOf("endobj", start);
  const body = raw.slice(start, end);
  const si = body.indexOf("stream");
  if (si < 0) continue;
  let off = si + "stream".length;
  if (body[off] === "\r") off++;
  if (body[off] === "\n") off++;
  const ei = body.indexOf("endstream");
  if (ei < 0) continue;
  try {
    const text = zlib.inflateSync(buf.subarray(start + off, start + ei)).toString("latin1");
    if (/\b(m|c)\b/.test(text)) streams.push({ num: +m[1], text });
  } catch (e) {}
}
const isWhite = (t) => /\b1\s+1\s+1\s+rg\b/.test(t);
const chosen = streams.find((s) => (want === "white" ? isWhite(s.text) : !isWhite(s.text))) || streams[0];
if (!chosen) throw new Error("no vector content stream found");

// replay the content stream
const num = (s) => Math.round(s * 1000) / 1000;
const mul = (m, n) => [
  m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5],
];
let ctm = [1, 0, 0, 1, 0, 0];
const stack = [];
const pt = (x, y) => {
  const X = ctm[0] * x + ctm[2] * y + ctm[4];
  const Y = ctm[1] * x + ctm[3] * y + ctm[5];
  return [num(X), num(ph - Y)]; // PDF origin is bottom-left
};

const tokens = chosen.text.match(/[-+]?[\d.]+|\/[^\s/<>\[\]()]+|[A-Za-z*'"]+|[<>\[\]{}()]/g) || [];
const out = [];
let args = [], cur = null, evenOdd = false, clipping = false;
for (const tk of tokens) {
  if (/^[-+]?[\d.]+$/.test(tk)) { args.push(parseFloat(tk)); continue; }
  if (tk.startsWith("/")) continue;
  switch (tk) {
    case "q": stack.push(ctm.slice()); break;
    case "Q": ctm = stack.pop() || [1, 0, 0, 1, 0, 0]; break;
    case "cm": ctm = mul(args.slice(-6), ctm); break;
    case "m": { const [x, y] = pt(args[0], args[1]); out.push(`M${x} ${y}`); cur = [args[0], args[1]]; break; }
    case "l": { const [x, y] = pt(args[0], args[1]); out.push(`L${x} ${y}`); cur = [args[0], args[1]]; break; }
    case "c": {
      const a = pt(args[0], args[1]), b = pt(args[2], args[3]), c = pt(args[4], args[5]);
      out.push(`C${a[0]} ${a[1]} ${b[0]} ${b[1]} ${c[0]} ${c[1]}`); cur = [args[4], args[5]]; break;
    }
    case "v": { // current point as first control
      const a = pt(cur[0], cur[1]), b = pt(args[0], args[1]), c = pt(args[2], args[3]);
      out.push(`C${a[0]} ${a[1]} ${b[0]} ${b[1]} ${c[0]} ${c[1]}`); cur = [args[2], args[3]]; break;
    }
    case "y": {
      const a = pt(args[0], args[1]), c = pt(args[2], args[3]);
      out.push(`C${a[0]} ${a[1]} ${c[0]} ${c[1]} ${c[0]} ${c[1]}`); cur = [args[2], args[3]]; break;
    }
    case "re": {
      const [x, y, w, h] = args.slice(-4);
      const p1 = pt(x, y), p2 = pt(x + w, y), p3 = pt(x + w, y + h), p4 = pt(x, y + h);
      // the artboard-sized rect is the page clip, not artwork
      const full = Math.abs(Math.abs(w) - pw) < 1 && Math.abs(Math.abs(h) - ph) < 1;
      if (!clipping && !full) out.push(`M${p1[0]} ${p1[1]}L${p2[0]} ${p2[1]}L${p3[0]} ${p3[1]}L${p4[0]} ${p4[1]}Z`);
      break;
    }
    case "h": out.push("Z"); break;
    case "W": clipping = true; break;            // clip path: skip it, the page clip is the whole artboard
    case "n": clipping = false; break;
    case "f": case "F": case "f*": case "b": case "b*": case "B": case "B*":
      if (tk.endsWith("*")) evenOdd = true;
      clipping = false;
      break;
  }
  args = [];
}

const d = out.join("");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(pw)} ${num(ph)}" role="img"><path d="${d}" fill="currentColor"${evenOdd ? ' fill-rule="evenodd"' : ""}/></svg>`;
fs.writeFileSync(outPath, svg);
console.log(`${outPath}: ${(svg.length / 1024).toFixed(1)} KB, viewBox ${num(pw)}x${num(ph)}, from obj ${chosen.num}`);
