import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const bundle = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const pause = (ms = 25) => new Promise(resolve => setTimeout(resolve, ms));

async function setup() {
  const dom = new JSDOM('<div id="root"></div>', {
    url: 'https://prototype.test', runScripts: 'outside-only', pretendToBeVisual: true
  });
  const { window } = dom;
  window.structuredClone = structuredClone;
  window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  window.HTMLElement.prototype.scrollIntoView = function () {
    this.dataset.scrolled = 'true';
  };
  window.navigator.clipboard = { writeText: async value => { window.copied = value; } };
  window.eval(bundle);
  await pause();
  const doc = window.document;
  const button = (text, scope = doc) => [...scope.querySelectorAll('button')]
    .find(element => element.textContent.trim() === text);
  const click = async (text, scope) => {
    const element = typeof text === 'string' ? button(text, scope) : text;
    assert.ok(element, `找到按钮：${text}`);
    assert.equal(element.disabled, false, `按钮可用：${text}`);
    element.click(); await pause();
  };
  const set = async (selector, value) => {
    const element = doc.querySelector(selector);
    assert.ok(element, `找到输入：${selector}`);
    const prototype = element.tagName === 'SELECT'
      ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
    element.dispatchEvent(new window.Event('change', { bubbles: true }));
    await pause();
  };
  const close = () => click(doc.querySelector('[aria-label="关闭弹窗"]'));
  const submit = async () => {
    doc.querySelector('form').dispatchEvent(new window.Event('submit', {
      bubbles: true, cancelable: true
    }));
    await pause();
  };
  return { dom, window, doc, button, click, set, close, submit };
}

test('React页面、编号复制、详情字段、搜索跳转及1秒高亮', async () => {
  const ui = await setup();
  const { doc, click, set, close } = ui;
  try {
    assert.equal(doc.querySelectorAll('tbody tr').length, 30);
    assert.equal(doc.querySelectorAll('nav button').length, 4);
    await click(doc.querySelector('.copy'));
    assert.equal(ui.window.copied, 'TOK-20260908-0001');
    await click('详情');
    assert.match(doc.querySelector('dialog').textContent, /更新时间/);
    await close();
    await click(doc.querySelector('.search-trigger'));
    await set('.global-search', 'tok-20260902-0033');
    assert.equal(doc.querySelectorAll('.search-result').length, 1);
    await click(doc.querySelector('.search-result'));
    assert.equal(doc.querySelectorAll('tbody tr').length, 3);
    assert.ok(doc.querySelector('#record-o33.highlight'));
    assert.equal(doc.querySelector('#record-o33').dataset.scrolled, 'true');
    await pause(1050);
    assert.equal(doc.querySelectorAll('.highlight').length, 0);
    await click(doc.querySelector('.search-trigger'));
    await set('.global-search', 'OPENAI');
    assert.ok(doc.querySelectorAll('.search-result').length > 5);
    await close();
  } finally { ui.dom.window.close(); }
});

test('订单新增修改、合并开票、发票详情与作废、回收恢复及永久删除', async () => {
  const ui = await setup();
  const { doc, click, set, close, submit } = ui;
  try {
    await click('＋ 添加订单');
    await set('[name="orderNo"]', 'UI-ORDER');
    await set('[name="providerId"]', 'p1');
    await set('[name="amount"]', '12.34');
    await set('[name="paymentType"]', 'ALIPAY');
    await submit();
    let row = [...doc.querySelectorAll('tbody tr')]
      .find(element => element.textContent.includes('UI-ORDER'));
    assert.ok(row);
    await click('修改', row);
    await set('[name="amount"]', '20.25');
    await submit();
    row = [...doc.querySelectorAll('tbody tr')]
      .find(element => element.textContent.includes('UI-ORDER'));
    assert.match(row.textContent, /20.25/);
    await click(row.querySelector('input'));
    await click(doc.querySelector('#record-o7 input'));
    await click('合并开票');
    await set('[name="invoiceNo"]', 'UI-INVOICE');
    await set('[name="invoiceTitleId"]', 't1');
    await submit();
    row = [...doc.querySelectorAll('tbody tr')]
      .find(element => element.textContent.includes('UI-ORDER'));
    assert.match(row.textContent, /已开票/);
    assert.ok(ui.button('修改', row).disabled);
    assert.ok(ui.button('删除', row).disabled);
    await click(row.querySelector('.status-button'));
    assert.match(doc.querySelector('dialog').textContent, /UI-INVOICE/);
    assert.equal(doc.querySelectorAll('.linked-row').length, 2);
    await click('作废发票');
    await click('确认作废发票');
    row = [...doc.querySelectorAll('tbody tr')]
      .find(element => element.textContent.includes('UI-ORDER'));
    assert.match(row.textContent, /未开票/);
    await click('删除', row);
    await click('确认移入回收站');
    await click(doc.querySelectorAll('.segmented button')[1]);
    row = [...doc.querySelectorAll('tbody tr')]
      .find(element => element.textContent.includes('UI-ORDER'));
    assert.ok(row);
    assert.ok(row.querySelector('.status-button').disabled);
    await click('恢复', row);
    await click(doc.querySelectorAll('.segmented button')[0]);
    row = [...doc.querySelectorAll('tbody tr')]
      .find(element => element.textContent.includes('UI-ORDER'));
    await click('删除', row); await click('确认移入回收站');
    await click(doc.querySelectorAll('.segmented button')[1]);
    row = [...doc.querySelectorAll('tbody tr')]
      .find(element => element.textContent.includes('UI-ORDER'));
    await click('永久删除', row); await click('确认永久删除订单');
    assert.ok(!doc.querySelector('tbody').textContent.includes('UI-ORDER'));
    await click('发票', doc.querySelector('nav'));
    assert.match(doc.querySelector('tbody').textContent, /UI-INVOICE/);
    const invoiceRow = [...doc.querySelectorAll('tbody tr')]
      .find(element => element.textContent.includes('UI-INVOICE'));
    assert.match(invoiceRow.textContent, /作废/);
    await click('详情', invoiceRow);
    assert.match(doc.querySelector('dialog').textContent, /关联已解除/);
    await close();
  } finally { ui.dom.window.close(); }
});

test('提供商和抬头卡片增改批删、抬头详情与全部筛选字段', async () => {
  const ui = await setup();
  const { doc, click, set, submit, close } = ui;
  try {
    await click('提供商', doc.querySelector('nav'));
    assert.equal(doc.querySelectorAll('.entity-card').length, 6);
    assert.equal(doc.querySelector('.card-description a'), null);
    assert.equal(doc.querySelector('.visit').getAttribute('target'), '_blank');
    await click('＋ 添加提供商');
    await set('[name="name"]', 'UI Provider');
    await set('[name="website"]', 'https://example.com');
    await submit();
    const card = [...doc.querySelectorAll('.entity-card')]
      .find(element => element.textContent.includes('UI Provider'));
    await click('修改', card);
    await set('[name="name"]', 'Edited Provider');
    await submit();
    await click(card.querySelector('input'));
    await click('批量删除'); await click('确认批量删除');
    assert.equal(doc.querySelectorAll('.entity-card').length, 6);
    await click('发票抬头', doc.querySelector('nav'));
    await click('＋ 添加抬头');
    await set('[name="titleType"]', 'COMPANY');
    assert.equal(doc.querySelector('[name="taxCode"]').required, true);
    assert.equal(doc.querySelector('[name="taxCode"]').checkValidity(), false);
    assert.match(doc.querySelector('form').textContent, /税号（必填）/);
    await set('[name="taxCode"]', '91330106MA28XY1234');
    assert.equal(doc.querySelector('[name="taxCode"]').checkValidity(), true);
    await set('[name="titleType"]', 'PERSONAL');
    await set('[name="taxCode"]', '');
    assert.equal(doc.querySelector('[name="taxCode"]').required, false);
    assert.equal(doc.querySelector('[name="taxCode"]').checkValidity(), true);
    await set('[name="name"]', 'UI Title'); await submit();
    assert.equal(doc.querySelectorAll('.entity-card').length, 5);
    await click('订单', doc.querySelector('nav'));
    await click('☷ 筛选');
    assert.equal(doc.querySelectorAll('.filter-panel .field').length, 6);
    const selects = doc.querySelectorAll('.filter-panel select');
    const setter = Object.getOwnPropertyDescriptor(ui.window.HTMLSelectElement.prototype, 'value');
    setter.set.call(selects[0], 'p1');
    selects[0].dispatchEvent(new ui.window.Event('change', { bubbles: true }));
    await pause();
    assert.equal(doc.querySelectorAll('tbody tr').length, 5);
    await click('重置筛选');
    assert.equal(doc.querySelectorAll('tbody tr').length, 30);
    await click(doc.querySelector('tbody .text-button'));
    assert.match(doc.querySelector('dialog').textContent, /税号/);
    await close();
    await click('发票', doc.querySelector('nav'));
    await click('☷ 筛选');
    assert.equal(doc.querySelectorAll('.filter-panel .field').length, 4);
  } finally { ui.dom.window.close(); }
});
