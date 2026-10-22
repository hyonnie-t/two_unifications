/* 카드 순서 판정 (logic.js) — 화면과 무관한 순수 함수. verify.mjs가 같은 파일을 불러 시험한다.
 * 카드는 정답 순서의 0부터 시작하는 번호(n)로 부른다. order = 지금 화면에 놓인 카드 번호 배열. */

/* 정답 순서(0,1,2,…)와 한 장도 다르지 않을 때만 true */
function isCorrectOrder(order, count) {
  if (!Array.isArray(order) || order.length !== count) return false;
  for (let i = 0; i < count; i++) {
    if (order[i] !== i) return false;
  }
  return true;
}

/* 0..count-1을 섞는다. 이미 정답 순서가 나오면 다시 섞는다(섞인 채로 시작하게). rnd는 시험용으로 바꿔 끼울 수 있다. */
function shuffledOrder(count, rnd) {
  const r = rnd || Math.random;
  let order;
  let guard = 0;
  do {
    order = [];
    for (let i = 0; i < count; i++) order.push(i);
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = order[i]; order[i] = order[j]; order[j] = t;
    }
    guard++;
  } while (isCorrectOrder(order, count) && guard < 50);
  return order;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { isCorrectOrder, shuffledOrder };
}
