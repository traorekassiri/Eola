import fs from 'node:fs';

/**
 * Validates file magic bytes so spoofed extensions/MIME types are rejected.
 */
export function validateMagicBytes(filePath: string, kind: 'image' | 'audio'): boolean {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(16);
    const bytesRead = fs.readSync(fd, buf, 0, 16, 0);
    if (bytesRead < 4) return false;

    if (kind === 'image') {
      // JPEG: FF D8 FF
      if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
      // PNG: 89 50 4E 47
      if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
      // WEBP: RIFF....WEBP
      if (
        buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buf.subarray(8, 12).toString('ascii') === 'WEBP'
      ) {
        return true;
      }
      return false;
    }

    if (kind === 'audio') {
      // WebM / Matroska: 1A 45 DF A3
      if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return true;
      // OGG: OggS
      if (buf.subarray(0, 4).toString('ascii') === 'OggS') return true;
      // MP3: ID3 or FF FB / FF F3
      if (buf.subarray(0, 3).toString('ascii') === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return true;
      // MP4/M4A: ....ftyp
      if (buf.subarray(4, 8).toString('ascii') === 'ftyp') return true;
      // WAV: RIFF....WAVE
      if (
        buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buf.subarray(8, 12).toString('ascii') === 'WAVE'
      ) {
        return true;
      }
      return false;
    }

    return false;
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Strips EXIF/APP1 GPS & camera metadata segments from JPEG buffers cleanly without extra native binaries.
 */
export function stripJpegExifInPlace(filePath: string): void {
  const data = fs.readFileSync(filePath);
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return;

  const chunks: Buffer[] = [data.subarray(0, 2)];
  let offset = 2;
  while (offset + 3 < data.length) {
    if (data[offset] !== 0xff) {
      chunks.push(data.subarray(offset));
      break;
    }
    const marker = data[offset + 1];
    // SOS (Start of Scan) or EOI -> copy remainder untouched
    if (marker === 0xda || marker === 0xd9) {
      chunks.push(data.subarray(offset));
      break;
    }
    if (offset + 4 > data.length) break;
    const segLen = data.readUInt16BE(offset + 2);
    if (segLen < 2 || offset + 2 + segLen > data.length) {
      chunks.push(data.subarray(offset));
      break;
    }
    // Drop APP1 (EXIF/XMP: 0xE1), APP2 (ICC/Flashpix optional: keep only if not EXIF; safe to strip APP1 & COM 0xFE)
    const isMetadata = marker === 0xe1 || marker === 0xfe;
    if (!isMetadata) {
      chunks.push(data.subarray(offset, offset + 2 + segLen));
    }
    offset += 2 + segLen;
  }

  fs.writeFileSync(filePath, Buffer.concat(chunks));
}
