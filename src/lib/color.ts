// 색 대비 도우미: 강조색 위에 올릴 글자색(검정/흰색)을 WCAG 대비가 더 큰 쪽으로 고른다.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
export function inkFor(accent: string): '#000000' | '#ffffff' {
  return contrast(accent, '#000000') >= contrast(accent, '#ffffff') ? '#000000' : '#ffffff';
}
export const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
