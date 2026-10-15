/** 한국어 조사. 이름 끝의 괄호 표기(예: "북문(E2)")는 빼고 받침을 본다. */
function lastHangul(s: string): number | null {
  const base = s.replace(/\s*\([^)]*\)\s*$/, "").trim();
  for (let i = base.length - 1; i >= 0; i--) {
    const c = base.charCodeAt(i);
    if (c >= 0xac00 && c <= 0xd7a3) return c;
  }
  return null;
}
function batchim(s: string): number {
  const c = lastHangul(s);
  if (c === null) return 0;
  return (c - 0xac00) % 28; // 0이면 받침 없음, 8이면 ㄹ
}
export const eunNeun = (s: string) => (batchim(s) ? "은" : "는");
export const iGa = (s: string) => (batchim(s) ? "이" : "가");
export const eulReul = (s: string) => (batchim(s) ? "을" : "를");
export const euro = (s: string) => {
  const b = batchim(s);
  return b === 0 || b === 8 ? "로" : "으로";
};
