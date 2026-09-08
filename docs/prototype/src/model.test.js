import test from 'node:test';
import assert from 'node:assert/strict';
import { seedData, applyAction, searchAll, money } from './model.js';

const invoiceValue = {
  invoiceNo: 'TEST-001', invoiceDate: '2026-09-08', invoiceTitleId: 't1',
};

test('模拟数据含正常、回收站、有效及作废状态', () => {
  const data = seedData();
  assert.ok(data.orders.filter((row) => !row.deleted).length >= 25);
  assert.equal(data.orders.filter((row) => row.deleted).length, 3);
  for (const invoice of data.invoices.filter((row) => row.status === 'VALID')) {
    const total = data.orders.filter((row) => row.invoiceId === invoice.id)
      .reduce((sum, row) => sum + row.amountCent, 0);
    assert.equal(total, invoice.totalAmountCent);
  }
  assert.equal(money(12345), '123.45');
});

test('合并开票精确合计，作废解绑全部关联订单且不改变原数据', () => {
  const original = seedData();
  const ids = ['o7', 'o8'];
  const next = applyAction(original, { type: 'invoice', ids, value: invoiceValue });
  assert.equal(next.invoices[0].totalAmountCent, 196000);
  assert.equal(original.orders.find((row) => row.id === 'o7').invoiceId, null);
  const invoiceId = next.invoices[0].id;
  const voided = applyAction(next, { type: 'voidInvoice', id: invoiceId });
  assert.equal(voided.invoices[0].status, 'INVALID');
  assert.ok(voided.orders.filter((row) => ids.includes(row.id))
    .every((row) => row.invoiceId === null));
  assert.throws(() => applyAction(voided, { type: 'voidInvoice', id: invoiceId }));
});

test('已开票、已删除订单限制及批量操作原子性', () => {
  const data = seedData();
  const snapshot = structuredClone(data);
  for (const type of ['trashOrders', 'deleteOrders', 'invoice']) {
    assert.throws(() => applyAction(data, {
      type, ids: ['o7', 'o1'], value: invoiceValue,
    }));
  }
  for (const id of ['o1', 'o31']) {
    const value = { ...data.orders.find((row) => row.id === id), amountCent: 1 };
    assert.throws(() => applyAction(data, { type: 'saveOrder', value }));
  }
  assert.throws(() => applyAction(data, {
    type: 'invoice', ids: ['o31'], value: invoiceValue,
  }));
  assert.deepEqual(data, snapshot);
});

test('正常订单逻辑删除、单批恢复、仅回收站物理删除', () => {
  let data = seedData();
  assert.throws(() => applyAction(data, { type: 'deleteOrders', ids: ['o7'] }));
  data = applyAction(data, { type: 'trashOrders', ids: ['o7', 'o8'] });
  assert.ok(data.orders.filter((row) => ['o7', 'o8'].includes(row.id))
    .every((row) => row.deleted === 1));
  data = applyAction(data, { type: 'recoverOrders', ids: ['o7', 'o8'] });
  assert.ok(data.orders.filter((row) => ['o7', 'o8'].includes(row.id))
    .every((row) => row.deleted === 0));
  data = applyAction(data, { type: 'deleteOrders', ids: ['o31', 'o32'] });
  assert.ok(!data.orders.some((row) => ['o31', 'o32'].includes(row.id)));
});

test('提供商抬头允许关联删除，搜索适应已删除关系', () => {
  let data = seedData();
  data = applyAction(data, { type: 'deleteProviders', ids: ['p1'] });
  data = applyAction(data, { type: 'deleteTitles', ids: ['t1'] });
  assert.equal(data.orders.length, 33);
  assert.equal(data.invoices.length, 3);
  assert.ok(searchAll(data, 'TOK-').length === 33);
});

test('搜索忽略大小写、关联提供商及抬头、包含回收站且不截断', () => {
  const data = seedData();
  assert.deepEqual(searchAll(data, 'openai'), searchAll(data, 'OPENAI'));
  assert.ok(searchAll(data, 'openai').some((row) => row.kind === 'providers'));
  assert.ok(searchAll(data, 'openai').some((row) => row.deleted === 1));
  assert.ok(searchAll(data, '星河').some((row) => row.kind === 'orders'));
  assert.ok(searchAll(data, '星河').some((row) => row.kind === 'invoices'));
  assert.equal(searchAll(data, 'TOK-').length, 33);
  assert.deepEqual(searchAll(data, '  '), []);
});

test('新增修改校验与非法日期、空批次拒绝', () => {
  const data = seedData();
  const value = { orderNo: 'NEW', amountCent: 100, paymentType: 'ALIPAY',
    providerId: 'p1' };
  const next = applyAction(data, { type: 'saveOrder', value });
  assert.equal(next.orders[0].orderNo, 'NEW');
  assert.equal(next.orders[0].invoiceId, null);
  assert.throws(() => applyAction(next, { type: 'saveOrder', value }));
  assert.throws(() => applyAction(data, {
    type: 'saveOrder', value: { ...value, amountCent: 1.5 },
  }));
  assert.throws(() => applyAction(data, {
    type: 'invoice', ids: ['o7'], value: { ...invoiceValue, invoiceDate: '2026-02-30' },
  }));
  assert.throws(() => applyAction(data, { type: 'trashOrders', ids: [] }));
  assert.throws(() => applyAction(data, {
    type: 'saveProvider', value: { name: 'Bad', website: 'javascript:alert(1)' },
  }));
});

test('接口字段长度、网址必填及未来开票日期校验', () => {
  const data = seedData();
  for (const value of [
    { name: '新提供商', website: '' },
    { name: '名'.repeat(51), website: 'https://example.com' },
    { name: '新提供商', website: `https://example.com/${'a'.repeat(500)}` },
  ]) {
    assert.throws(() => applyAction(data, { type: 'saveProvider', value }));
  }
  assert.throws(() => applyAction(data, { type: 'saveOrder', value: {
    orderNo: 'a'.repeat(101), amountCent: 100, paymentType: 'ALIPAY', providerId: 'p1',
  } }));
  for (const value of [
    { ...invoiceValue, invoiceNo: 'a'.repeat(101) },
    { ...invoiceValue, invoiceDate: '9999-12-31' },
  ]) {
    assert.throws(() => applyAction(data, { type: 'invoice', ids: ['o7'], value }));
  }
});

test('删除后新建提供商与抬头不复用ID或接管旧引用', () => {
  let data = seedData();
  data = applyAction(data, { type: 'deleteProviders', ids: ['p6'] });
  data = applyAction(data, { type: 'saveProvider', value: {
    name: '新提供商', website: 'https://example.com',
  } });
  assert.notEqual(data.providers[0].id, 'p6');
  assert.match(data.providers[0].id, /^p-[0-9a-f-]{36}$/);
  assert.equal(data.orders.find((row) => row.id === 'o6').providerId, 'p6');
  data = applyAction(data, { type: 'deleteTitles', ids: ['t3', 't4'] });
  data = applyAction(data, { type: 'saveTitle', value: {
    name: '新个人', titleType: 'PERSONAL', taxCode: '',
  } });
  assert.notEqual(data.titles[0].id, 't3');
  assert.match(data.titles[0].id, /^t-[0-9a-f-]{36}$/);
  assert.equal(data.invoices.find((row) => row.id === 'i3').invoiceTitleId, 't3');
});

test('更新时间使用本地LocalDateTime格式', () => {
  const before = new Date();
  const data = applyAction(seedData(), { type: 'trashOrders', ids: ['o7'] });
  const value = data.orders.find((row) => row.id === 'o7').updatedAt;
  assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  const timestamp = new Date(value).valueOf();
  assert.ok(timestamp >= before.valueOf() - 1000 && timestamp <= Date.now());
});

test('企业抬头税号必填，个人抬头允许空税号', () => {
  const data = seedData();
  for (const taxCode of ['', '   ', undefined]) {
    assert.throws(() => applyAction(data, {
      type: 'saveTitle', value: { titleType: 'COMPANY', name: '测试企业', taxCode },
    }), /企业抬头必须填写税号/);
  }
  const company = applyAction(data, {
    type: 'saveTitle', value: {
      titleType: 'COMPANY', name: '测试企业', taxCode: '91330106MA28XY1234',
    },
  });
  assert.equal(company.titles[0].taxCode, '91330106MA28XY1234');
  const personal = applyAction(data, {
    type: 'saveTitle', value: { titleType: 'PERSONAL', name: '测试个人', taxCode: '' },
  });
  assert.equal(personal.titles[0].taxCode, '');
});
