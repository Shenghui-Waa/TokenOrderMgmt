import { afterEach, describe, expect, it, vi } from 'vitest'
import { executeAction, getDetail, getInvoiceOrders, loadData, request } from './api'
import type { Action } from './types'

afterEach(() => vi.unstubAllGlobals())
function mockSuccess(data: unknown = null) {
  const fetchMock = vi.fn().mockImplementation(async () =>
    new Response(JSON.stringify({ code: 200, data })))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
describe('API adapter', () => {
  it('rejects HTTP 200 business errors, network errors, HTTP errors and invalid JSON', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{"code":403,"message":"禁止操作"}'))
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(new Response('{"code":200}', { status: 500 }))
      .mockResolvedValueOnce(new Response('<html>error</html>'))
    vi.stubGlobal('fetch', fetchMock)
    await expect(request('/provider')).rejects.toThrow('禁止操作')
    await expect(request('/provider')).rejects.toThrow('网络连接失败')
    await expect(request('/provider')).rejects.toThrow('HTTP 500')
    await expect(request('/provider')).rejects.toThrow('无法解析')
  })
  it('loads all four complete lists and rejects partial failures', async () => {
    const fetchMock = mockSuccess([])
    await expect(loadData()).resolves.toEqual({ providers: [], titles: [], orders: [], invoices: [] })
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/provider', '/api/v1/invoice-title', '/api/v1/token-order', '/api/v1/invoice',
    ])
    fetchMock.mockResolvedValueOnce(new Response('{"code":500,"message":"失败"}'))
    await expect(loadData()).rejects.toThrow('失败')
  })
  it('sets a 15 second deadline and reports uncertain writes on network timeout', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout')
    const fetchMock = vi.fn().mockRejectedValue(new DOMException('Timeout', 'TimeoutError'))
    vi.stubGlobal('fetch', fetchMock)
    await expect(request('/provider', 'POST', { name: 'Test' }))
      .rejects.toThrow('写入结果未确认，请刷新核对')
    expect(timeoutSpy).toHaveBeenCalledWith(15000)
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
    timeoutSpy.mockRestore()
  })
  it('uses every detail route and encodes IDs including invoice-linked orders', async () => {
    const fetchMock = mockSuccess({ id: 'x' })
    for (const entity of ['providers', 'titles', 'orders', 'invoices'] as const) {
      await getDetail(entity, 'a/b')
    }
    fetchMock.mockImplementationOnce(async () =>
      new Response(JSON.stringify({ code: 200, data: [] })))
    await getInvoiceOrders('a/b')
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/provider/a%2Fb', '/api/v1/invoice-title/a%2Fb',
      '/api/v1/token-order/a%2Fb', '/api/v1/invoice/a%2Fb', '/api/v1/token-order/i/a%2Fb',
    ])
  })
  it('rejects malformed successful detail and linked-order responses', async () => {
    mockSuccess(null)
    await expect(getDetail('orders', 'o1')).rejects.toThrow('详情响应格式错误')
    await expect(getInvoiceOrders('i1')).rejects.toThrow('关联订单响应格式错误')
  })
  it('sends complete create and update DTOs, converting order cents into yuan', async () => {
    const fetchMock = mockSuccess()
    const actions: Action[] = [
      { type: 'saveProvider', value: { name: ' Acme ', website: 'https://example.com' } },
      { type: 'saveTitle', value: { name: ' Test ', titleType: 'PERSONAL', taxCode: '' } },
      { type: 'saveOrder', value: {
        orderNo: ' O1 ', amountCent: 1234, paymentType: 'ALIPAY', providerId: 'p1',
      } },
    ]
    for (const action of actions) {
      await executeAction(action)
      if ('value' in action) await executeAction({ ...action, value: { ...action.value, id: 'x' } } as Action)
    }
    expect(fetchMock.mock.calls.map(([, options]) => options.method))
      .toEqual(['POST', 'PUT', 'POST', 'PUT', 'POST', 'PUT'])
    expect(JSON.parse(fetchMock.mock.calls[4][1].body)).toEqual({
      orderNo: 'O1', amount: 12.34, paymentType: 'ALIPAY', providerId: 'p1',
    })
    expect(JSON.parse(fetchMock.mock.calls[3][1].body))
      .toEqual({ name: 'Test', titleType: 'PERSONAL', taxCode: '' })
  })
  it('does not send an order amount that loses cents in numeric JSON', async () => {
    const fetchMock = mockSuccess()
    await expect(executeAction({ type: 'saveOrder', value: {
      orderNo: 'O1', amountCent: Number.MAX_SAFE_INTEGER,
      paymentType: 'ALIPAY', providerId: 'p1',
    } })).rejects.toThrow('无法精确提交')
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('preserves DELETE bodies, recovery/logic endpoints and nested invoice DTO', async () => {
    const fetchMock = mockSuccess()
    for (const type of ['deleteProviders', 'deleteTitles', 'trashOrders',
      'recoverOrders', 'deleteOrders'] as const) {
      await executeAction({ type, ids: ['o1', 'o1'] })
    }
    await executeAction({ type: 'invoice', ids: ['o1'], value: {
      invoiceNo: ' I1 ', invoiceDate: '2026-01-01', invoiceTitleId: 't1', totalAmountCent: 1234,
    } })
    await executeAction({ type: 'voidInvoice', id: 'i1' })
    expect(fetchMock.mock.calls.slice(0, 5).map(([, options]) => options.method))
      .toEqual(['DELETE', 'DELETE', 'PUT', 'PUT', 'DELETE'])
    expect(fetchMock.mock.calls.slice(0, 5).every(([, options]) =>
      options.body === '{"ids":["o1"]}')).toBe(true)
    expect(JSON.parse(fetchMock.mock.calls[5][1].body)).toEqual({
      invoiceRequest: { invoiceNo: 'I1', invoiceDate: '2026-01-01',
        invoiceTitleId: 't1', totalAmountCent: 1234 }, batchIdRequest: { ids: ['o1'] },
    })
    expect(fetchMock.mock.calls[6][1].body).toBeUndefined()
  })
})
