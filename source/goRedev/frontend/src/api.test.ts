import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  executeAction, getDetail, getInvoiceOrders, loadData, openExternalURL,
  setBackendAdapter, type BackendAdapter,
} from './api'
import type { DataSet } from './types'

const emptyData: DataSet = { providers: [], titles: [], orders: [], invoices: [] }
const mock = {
  loadData: vi.fn(async () => emptyData),
  getProvider: vi.fn(), saveProvider: vi.fn(), deleteProviders: vi.fn(),
  getInvoiceTitle: vi.fn(), saveInvoiceTitle: vi.fn(), deleteInvoiceTitles: vi.fn(),
  getTokenOrder: vi.fn(), getInvoiceOrders: vi.fn(), saveTokenOrder: vi.fn(),
  trashTokenOrders: vi.fn(), recoverTokenOrders: vi.fn(), deleteTokenOrders: vi.fn(),
  getInvoice: vi.fn(), createInvoice: vi.fn(), voidInvoice: vi.fn(),
  openExternalURL: vi.fn(),
} satisfies BackendAdapter

let restore: () => void
beforeEach(() => {
  vi.clearAllMocks()
  restore = setBackendAdapter(mock)
})
afterEach(() => restore())

describe('Wails backend adapter', () => {
  it('loads and validates the complete data set', async () => {
    await expect(loadData()).resolves.toEqual(emptyData)
    mock.loadData.mockResolvedValueOnce({ ...emptyData, providers: null as never })
    await expect(loadData()).rejects.toThrow('列表响应格式错误')
  })

  it('dispatches detail and linked-order calls without Wails runtime', async () => {
    mock.getProvider.mockResolvedValueOnce({ id: 'p1', name: 'Acme', website: 'https://example.com' })
    mock.getInvoiceOrders.mockResolvedValueOnce([])
    await expect(getDetail('providers', 'p1')).resolves.toMatchObject({ id: 'p1' })
    await expect(getInvoiceOrders('i1')).resolves.toEqual([])
  })

  it('normalizes save inputs and preserves integer cents', async () => {
    await executeAction({ type: 'saveProvider', value: {
      name: ' Acme ', website: ' https://example.com ',
    } })
    await executeAction({ type: 'saveTitle', value: {
      name: ' Test ', titleType: 'PERSONAL', taxCode: ' 123 ',
    } })
    await executeAction({ type: 'saveOrder', value: {
      orderNo: ' O1 ', amountCent: 1234, paymentType: 'ALIPAY', providerId: 'p1',
    } })
    expect(mock.saveProvider).toHaveBeenCalledWith({ name: 'Acme', website: 'https://example.com' })
    expect(mock.saveInvoiceTitle).toHaveBeenCalledWith({
      name: 'Test', titleType: 'PERSONAL', taxCode: '123',
    })
    expect(mock.saveTokenOrder).toHaveBeenCalledWith({
      orderNo: 'O1', amountCent: 1234, paymentType: 'ALIPAY', providerId: 'p1',
    })
  })

  it('deduplicates batch IDs and dispatches invoice actions', async () => {
    await executeAction({ type: 'trashOrders', ids: ['o1', 'o1'] })
    await executeAction({ type: 'invoice', ids: ['o1', 'o1'], value: {
      invoiceNo: ' I1 ', invoiceDate: '2026-01-01', invoiceTitleId: 't1',
      totalAmountCent: 1234,
    } })
    await executeAction({ type: 'voidInvoice', id: 'i1' })
    expect(mock.trashTokenOrders).toHaveBeenCalledWith(['o1'])
    expect(mock.createInvoice).toHaveBeenCalledWith({
      invoiceNo: 'I1', invoiceDate: '2026-01-01', invoiceTitleId: 't1',
      totalAmountCent: 1234,
    }, ['o1'])
    expect(mock.voidInvoice).toHaveBeenCalledWith('i1')
  })

  it('opens only controlled HTTP and HTTPS external URLs', async () => {
    await openExternalURL('https://example.com/path')
    expect(mock.openExternalURL).toHaveBeenCalledWith('https://example.com/path')
    await expect(openExternalURL('file:///C:/secret')).rejects.toThrow('仅允许')
  })
})
