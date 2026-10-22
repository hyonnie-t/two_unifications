// 카드 순서 판정 시험: node verify.mjs  (정답 순서는 통과, 한 장이라도 바꾸면 불통과)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const { isCorrectOrder, shuffledOrder } = require('./logic.js');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('./data.js', 'utf8') + '\n;this.COUNTRIES=COUNTRIES;', ctx);
let fail = 0;
const t = (name, ok) => { console.log((ok ? '통과 ' : '실패 ') + name); if (!ok) fail++; };
for (const key of Object.keys(ctx.COUNTRIES)) {
  const n = ctx.COUNTRIES[key].cards.length;
  const ans = [...Array(n).keys()];
  t(key + ' 카드 ' + n + '장', n === 6);
  t(key + ' 정답 순서는 통과', isCorrectOrder(ans, n) === true);
  let swapOk = true;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const o = ans.slice(); [o[i], o[j]] = [o[j], o[i]];
    if (isCorrectOrder(o, n)) swapOk = false;
  }
  t(key + ' 두 장만 바꿔도 불통과(' + (n * (n - 1) / 2) + '가지 전부)', swapOk);
  t(key + ' 역순은 불통과', !isCorrectOrder(ans.slice().reverse(), n));
  t(key + ' 장 수가 모자라면 불통과', !isCorrectOrder(ans.slice(0, n - 1), n));
  let shuffleOk = true;
  for (let k = 0; k < 500; k++) {
    const s = shuffledOrder(n);
    if (isCorrectOrder(s, n) || s.slice().sort((a, b) => a - b).join() !== ans.join()) shuffleOk = false;
  }
  t(key + ' 섞기 500번: 정답과 같지 않고 카드는 그대로', shuffleOk);
}
process.exit(fail ? 1 : 0);
