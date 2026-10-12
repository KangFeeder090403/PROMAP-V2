// Self-check tag grouping push per AP — jalankan: npx tsx scripts/check-push-tag.ts
import assert from 'node:assert/strict'
import { pushTag } from '../lib/web-push'

assert.equal(pushTag('/action-plans?open=abc'), 'ap-abc', 'open= → tag AP')
assert.equal(pushTag('/action-plans?id=abc'), 'ap-abc', 'id= → tag AP')
assert.equal(pushTag('/action-plans?x=1&open=a-b'), 'ap-a-b', 'param kedua + id ber-dash')
for (const url of ['/action-plans', '/proposals', '/projects/abc', '/settings/leads', undefined]) {
  assert.equal(pushTag(url), undefined, `${url} → tanpa tag`)
}
console.log('check-push-tag: OK (8 assert)')
