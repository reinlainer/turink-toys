'use strict';

// A zip written on Windows stores names in the system code page and leaves the
// UTF-8 flag clear. macOS then decodes those bytes as UTF-8 and produces
// unreadable names. Recovering the original requires guessing the code page,
// which this module does by scoring candidate decodings.

const CANDIDATES = [
  { id: 'utf-8', label: 'UTF-8' },
  { id: 'euc-kr', label: 'Korean (CP949)' },
  { id: 'shift_jis', label: 'Japanese (Shift_JIS)' },
  { id: 'gbk', label: 'Simplified Chinese (GBK)' },
  { id: 'big5', label: 'Traditional Chinese (Big5)' },
  { id: 'windows-1252', label: 'Western European (CP1252)' },
];

const REPLACEMENT = '�';

function decode(buffer, encoding) {
  try {
    return new TextDecoder(encoding, { fatal: false }).decode(buffer);
  } catch {
    return null;
  }
}

// A decoding that produces replacement characters is wrong outright. Beyond
// that, names made of letters, digits and ordinary punctuation score higher
// than ones full of isolated symbols, which is what a wrong code page yields.
function score(text) {
  if (text === null || text.includes(REPLACEMENT)) return -1;

  let plausible = 0;
  for (const char of text) {
    const code = char.codePointAt(0);
    const isAscii = code >= 0x20 && code < 0x7f;
    const isHangul = code >= 0xac00 && code <= 0xd7a3;
    const isKana = code >= 0x3040 && code <= 0x30ff;
    const isCjk = code >= 0x4e00 && code <= 0x9fff;
    const isFullWidth = code >= 0xff00 && code <= 0xffef;
    if (isAscii || isHangul || isKana || isCjk || isFullWidth) plausible += 1;
  }
  return plausible / [...text].length;
}

// Names are scored together rather than one at a time, because a single short
// name rarely distinguishes two code pages while a whole archive usually does.
function detect(nameBuffers) {
  const joined = Buffer.concat(
    nameBuffers.flatMap((buf, i) => (i === 0 ? [buf] : [Buffer.from('/'), buf]))
  );

  const results = CANDIDATES.map((candidate) => {
    const text = decode(joined, candidate.id);
    return {
      encoding: candidate.id,
      label: candidate.label,
      confidence: Number(score(text).toFixed(3)),
      sample: text === null ? null : text.split('/').slice(0, 3),
    };
  })
    .filter((r) => r.confidence >= 0)
    .sort((a, b) => b.confidence - a.confidence);

  return results;
}

function isAsciiOnly(buffer) {
  return buffer.every((byte) => byte < 0x80);
}

module.exports = { detect, decode, CANDIDATES, isAsciiOnly };
