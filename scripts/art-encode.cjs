// Lossless source preservation + web delivery encoding, without changing composition.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.ART_SHARP || 'sharp');
const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw new Error('Usage: node scripts/art-encode.cjs source.png destination.webp');
fs.mkdirSync(path.dirname(destination), { recursive: true });
sharp(source).webp({ quality: 86, alphaQuality: 100 }).toFile(destination).then(info => console.log(JSON.stringify({ destination, ...info }))).catch(error => { console.error(error); process.exitCode = 1; });
