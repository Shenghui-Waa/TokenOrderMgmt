import { describe, expect, it } from 'vitest'
import { formatAmountInput, money, parseAmount, searchAll, validateAction } from './domain'
import type { DataSet, Order } from './types'

const order: Order = {
  id: 'o1', orderNo: 'TOK-1', amountCent: 1234, providerId: 'p1', providerName: 'Acme',
  paymentType: 'ALIPAY', invoiceId: null, invoiceStatus: 'UNINVOICED', invoiceType: null,
  deleted: 0, updatedAt: '2026-01-01T12:00:00',
}
function data(): DataSet {
  return { providers: [{ id: 'p1', name: 'Acme', website: 'https://example.com' }],
    titles: [{ id: 't1', titleType: 'PERSONAL', name: '测试', taxCode: '' }],
    orders: [{ ...order }], invoices: [] }
}
describe('business validation', () => {
  it('parses decimal input exactly and rejects fractions, zero and unsafe cents', () => {
    expect(parseAmount('12.34')).toBe(1234)
    expect(parseAmount('0.29')).toBe(29)
    expect(parseAmount('1.15')).toBe(115)
    expect(parseAmount('12.3')).toBe(1230)
    for (const value of ['0', '-1', '1.234', '1e3', '', '999999999999999999']) {
      expect(() => parseAmount(value)).toThrow()
    }
  })
  it('formats integer cents exactly and refuses lossy numeric-yuan submission', () => {
    expect(formatAmountInput(Number.MAX_SAFE_INTEGER)).toBe('90071992547409.91')
    expect(money(Number.MAX_SAFE_INTEGER)).toBe('90,071,992,547,409.91')
    expect(money(Number.MAX_SAFE_INTEGER + 1)).toBe('金额超出安全精度')
    expect(() => parseAmount('90071992547409.91')).toThrow('无法精确提交')
    expect(() => validateAction(data(), { type: 'saveOrder', value: {
      ...order, amountCent: Number.MAX_SAFE_INTEGER,
    } })).toThrow('无法精确提交')
  })
  it('requires enterprise tax code for create/update but permits personal empty code', () => {
    const value = { name: '企业', titleType: 'COMPANY' as const, taxCode: ' ' }
    expect(() => validateAction(data(), { type: 'saveTitle', value })).toThrow('税号')
    expect(() => validateAction(data(), { type: 'saveTitle',
      value: { ...value, id: 't1' } })).toThrow('税号')
    expect(() => validateAction(data(), { type: 'saveTitle',
      value: { ...value, titleType: 'PERSONAL', taxCode: '' } })).not.toThrow()
  })
  it('rejects mixed invoiced batches, deleted edits and wrong deletion destinations', () => {
    const source = data()
    source.orders.push({ ...order, id: 'o2', invoiceId: 'i1', invoiceStatus: 'INVOICED' })
    expect(() => validateAction(source, { type: 'trashOrders', ids: ['o1', 'o2'] })).toThrow('已开票')
    expect(() => validateAction(source, { type: 'deleteOrders', ids: ['o1'] })).toThrow('回收站')
    source.orders[0].deleted = 1
    expect(() => validateAction(source, { type: 'saveOrder', value: source.orders[0] })).toThrow('回收站')
    expect(() => validateAction(source, { type: 'recoverOrders', ids: ['o1'] })).not.toThrow()
  })
  it('validates invoice date, selected state and integer total', () => {
    const source = data()
    const action = { type: 'invoice' as const, ids: ['o1'], value: {
      invoiceNo: 'I1', invoiceDate: '2026-01-01', invoiceTitleId: 't1', totalAmountCent: 1234,
    } }
    expect(() => validateAction(source, action)).not.toThrow()
    expect(() => validateAction(source, { ...action, value: {
      ...action.value, invoiceDate: '2026-02-30',
    } })).toThrow('日期')
    expect(() => validateAction(source, { ...action, value: {
      ...action.value, totalAmountCent: 1,
    } })).toThrow('合计')
    source.orders[0].deleted = 1
    expect(() => validateAction(source, action)).toThrow('正常')
  })
  it('searches all matches case insensitively including trash and void invoices', () => {
    const source = data()
    source.orders[0].deleted = 1
    source.invoices.push({ id: 'i1', invoiceNo: 'ACME-I1', invoiceType: 'PERSONAL',
      invoiceTitleId: 't1', invoiceTitleName: '测试', totalAmountCent: 1234,
      invoiceDate: '2026-01-01', status: 'INVALID', updatedAt: null })
    expect(searchAll(source, 'acMe').map((row) => row.kind))
      .toEqual(['orders', 'invoices', 'providers'])
    expect(searchAll(source, 'acMe')[0].deleted).toBe(1)
    expect(searchAll(source, '')).toEqual([])
  })
})
