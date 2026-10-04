/**
 * Generates the install icons in public/icons/ from the existing shared
 * artwork public/assets/character-profile.png (384x384 RGBA: a round
 * medallion on black). ProgressPal has no separate logo; reusing this art
 * invents no new identity. Run with `node scripts/generate-pwa-icons.mjs`
 * after the source art changes; the output is deterministic.
 *
 * Nothing is upscaled. The 384 px art is composited unscaled onto a 512 px
 * opaque canvas of its own black background, so every painted pixel stays
 * inside the maskable safe zone (a centred circle of radius 40 % = 204.8 px;
 * the art's content reaches about 154 px). Smaller sizes are area-averaged
 * downscales in linear light. Dependency-free: Node's zlib only.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync, inflateSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SOURCE = `${ROOT}public/assets/character-profile.png`;
const OUTPUT = `${ROOT}public/icons/`;
const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** Decodes an 8-bit, non-interlaced RGBA PNG into straight RGBA bytes. */
function decodeRgbaPng(file) {
  if (!file.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error('Source is not a PNG.');
  }

  let header;
  const data = [];

  for (let offset = 8; offset < file.length; ) {
    const length = file.readUInt32BE(offset);
    const type = file.toString('latin1', offset + 4, offset + 8);
    const body = file.subarray(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      header = {
        width: body.readUInt32BE(0),
        height: body.readUInt32BE(4),
        bitDepth: body[8],
        colorType: body[9],
        interlace: body[12],
      };
    } else if (type === 'IDAT') {
      data.push(body);
    }

    offset += 12 + length;
  }

  if (
    header?.bitDepth !== 8 ||
    header.colorType !== 6 ||
    header.interlace !== 0
  ) {
    throw new Error('Source must be an 8-bit, non-interlaced RGBA PNG.');
  }

  const { width, height } = header;
  const stride = width * 4;
  const raw = inflateSync(Buffer.concat(data));
  const pixels = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = pixels.subarray(y * stride, (y + 1) * stride);
    const previous =
      y === 0 ? Buffer.alloc(stride) : pixels.subarray((y - 1) * stride);

    for (let i = 0; i < stride; i += 1) {
      const left = i >= 4 ? row[i - 4] : 0;
      const up = previous[i];
      const upLeft = i >= 4 ? previous[i - 4] : 0;
      let predictor = 0;

      if (filter === 1) {
        predictor = left;
      } else if (filter === 2) {
        predictor = up;
      } else if (filter === 3) {
        predictor = (left + up) >> 1;
      } else if (filter === 4) {
        const estimate = left + up - upLeft;
        const toLeft = Math.abs(estimate - left);
        const toUp = Math.abs(estimate - up);
        const toUpLeft = Math.abs(estimate - upLeft);
        predictor =
          toLeft <= toUp && toLeft <= toUpLeft
            ? left
            : toUp <= toUpLeft
              ? up
              : upLeft;
      }

      row[i] = (line[i] + predictor) & 255;
    }
  }

  return { width, height, pixels };
}

const toLinear = (value) => {
  const channel = value / 255;
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
};
const toSrgb = (linear) => {
  const channel =
    linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(channel * 255)));
};

/** The source composited over opaque black, centred on a size x size canvas. */
function composeOnBlack(source, size) {
  const offset = (size - source.width) / 2;
  const linear = new Float64Array(size * size * 3);

  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error('The canvas must be at least the source size.');
  }

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const from = (y * source.width + x) * 4;
      const to = ((y + offset) * size + (x + offset)) * 3;
      const alpha = source.pixels[from + 3] / 255;

      for (let channel = 0; channel < 3; channel += 1) {
        linear[to + channel] = toLinear(source.pixels[from + channel]) * alpha;
      }
    }
  }

  return { size, linear };
}

/** Area-averaging (box) downscale in linear light; never upscales. */
function downscale(image, size) {
  if (size > image.size) {
    throw new Error('Icons are never upscaled.');
  }

  const scale = image.size / size;
  const linear = new Float64Array(size * size * 3);

  for (let y = 0; y < size; y += 1) {
    const top = y * scale;
    const bottom = top + scale;

    for (let x = 0; x < size; x += 1) {
      const left = x * scale;
      const right = left + scale;
      const sum = [0, 0, 0];

      for (let sy = Math.floor(top); sy < Math.ceil(bottom); sy += 1) {
        const height = Math.min(bottom, sy + 1) - Math.max(top, sy);

        for (let sx = Math.floor(left); sx < Math.ceil(right); sx += 1) {
          const weight =
            height * (Math.min(right, sx + 1) - Math.max(left, sx));
          const from = (sy * image.size + sx) * 3;

          for (let channel = 0; channel < 3; channel += 1) {
            sum[channel] += image.linear[from + channel] * weight;
          }
        }
      }

      for (let channel = 0; channel < 3; channel += 1) {
        linear[(y * size + x) * 3 + channel] = sum[channel] / (scale * scale);
      }
    }
  }

  return { size, linear };
}

function chunk(type, body) {
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);
  const typed = Buffer.concat([Buffer.from(type, 'latin1'), body]);

  length.writeUInt32BE(body.length);
  checksum.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, checksum]);
}

/** Encodes an opaque 8-bit RGB PNG (filter 0, maximum compression). */
function encodeRgbPng(image) {
  const { size } = image;
  const header = Buffer.alloc(13);
  const raw = Buffer.alloc(size * (size * 3 + 1));

  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB, opaque

  for (let y = 0; y < size; y += 1) {
    for (let i = 0; i < size * 3; i += 1) {
      raw[y * (size * 3 + 1) + 1 + i] = toSrgb(image.linear[y * size * 3 + i]);
    }
  }

  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    // sRGB rendering intent: perceptual.
    chunk('sRGB', Buffer.from([0])),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const source = decodeRgbaPng(readFileSync(SOURCE));

if (source.width !== 384 || source.height !== 384) {
  throw new Error('Expected the 384x384 character-profile artwork.');
}

// Android/desktop (any + maskable): the unscaled art on a 512 canvas.
const installCanvas = composeOnBlack(source, 512);
// iOS masks its own rounded square and wants no transparency: the art fills
// its own 384 frame, downscaled to the 180 px touch-icon size.
const appleCanvas = composeOnBlack(source, 384);

const outputs = {
  'icon-512.png': installCanvas,
  'icon-192.png': downscale(installCanvas, 192),
  'apple-touch-icon.png': downscale(appleCanvas, 180),
};

for (const [name, image] of Object.entries(outputs)) {
  writeFileSync(`${OUTPUT}${name}`, encodeRgbPng(image));
  console.log(`${name}: ${image.size}x${image.size}`);
}
