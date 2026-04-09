/**
 * iOS Safari/Chrome 호환 스크롤 잠금
 *
 * overflow:hidden 방식은 iOS에서 fixed 자식 요소의 터치 이벤트를 막아버림.
 * 대신 body를 position:fixed + top:-scrollY 로 처리하는 방식 사용.
 */

let savedY = 0;
let lockCount = 0;

export function lockScroll(): void {
  if (typeof window === "undefined") return;
  if (lockCount === 0) {
    savedY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top      = `-${savedY}px`;
    document.body.style.left     = "0";
    document.body.style.right    = "0";
    document.body.style.overflow = "hidden";
  }
  lockCount++;
}

export function unlockScroll(): void {
  if (typeof window === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.position = "";
    document.body.style.top      = "";
    document.body.style.left     = "";
    document.body.style.right    = "";
    document.body.style.overflow = "";
    window.scrollTo(0, savedY);
  }
}
