/**
 * mp4 계열(ISO-BMFF) 오디오의 컨테이너 브랜드를 Whisper가 받아들이는 값으로 맞춥니다.
 *
 * Whisper는 파일명이나 MIME이 아니라 내용으로 포맷을 판별하고, 지원 목록에
 * 3gp 계열이 없습니다. 그래서 AAC 오디오를 담은 정상 파일이라도 ftyp 브랜드가
 * `3gp4`면 확장자가 .m4a여도 "Invalid file format"으로 거부됩니다.
 *
 * 3gp와 m4a는 같은 ISO-BMFF 구조라서 선언된 브랜드만 바꾸면 그대로 읽힙니다.
 * 오디오 데이터는 건드리지 않으므로 재인코딩도, ffmpeg 같은 외부 의존성도
 * 필요하지 않습니다.
 */

/** ftyp 박스가 이보다 크면 신뢰하지 않고 그대로 둡니다. */
const MAX_FTYP_BOX_SIZE = 512;

/** 3gp 계열을 대체할 브랜드. mp42는 Whisper의 지원 목록에 있습니다. */
const TARGET_BRAND = "mp42";

function readAscii(bytes: Uint8Array<ArrayBuffer>, start: number, end: number): string {
  let out = "";
  for (let i = start; i < end; i += 1) out += String.fromCharCode(bytes[i]);
  return out;
}

function writeAscii(bytes: Uint8Array<ArrayBuffer>, offset: number, value: string): void {
  for (let i = 0; i < value.length; i += 1) bytes[offset + i] = value.charCodeAt(i);
}

export type NormalizeResult = {
  bytes: Uint8Array<ArrayBuffer>;
  /** 브랜드를 바꿨다면 원래 브랜드, 바꾸지 않았다면 null */
  rewroteFrom: string | null;
};

export function normalizeAudioContainer(bytes: Uint8Array<ArrayBuffer>): NormalizeResult {
  // ftyp 박스는 [크기 4바이트]["ftyp"][주 브랜드 4바이트][마이너 버전 4바이트][호환 브랜드…]
  if (bytes.byteLength < 16 || readAscii(bytes, 4, 8) !== "ftyp") {
    return { bytes, rewroteFrom: null };
  }

  const boxSize = new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0);
  if (boxSize < 16 || boxSize > MAX_FTYP_BOX_SIZE || boxSize > bytes.byteLength) {
    return { bytes, rewroteFrom: null };
  }

  const majorBrand = readAscii(bytes, 8, 12);
  // 3gp 계열만 손댑니다. 그 밖의 브랜드는 지원되거나, 바꿔도 읽히지 않습니다.
  if (!majorBrand.startsWith("3g")) {
    return { bytes, rewroteFrom: null };
  }

  const patched = bytes.slice();
  for (let offset = 8; offset + 4 <= boxSize; offset += 4) {
    if (offset === 12) continue; // 마이너 버전 필드는 브랜드가 아닙니다
    if (readAscii(patched, offset, offset + 4).startsWith("3g")) {
      writeAscii(patched, offset, TARGET_BRAND);
    }
  }

  return { bytes: patched, rewroteFrom: majorBrand };
}
