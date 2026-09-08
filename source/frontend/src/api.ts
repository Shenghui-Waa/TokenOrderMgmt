import type { Action, DataSet, Entity, EntityRecord, Order } from './types'
import { formatAmountInput, parseAmount } from './domain'

const paths: Record<Entity, string> = {
  providers: '/provider', titles: '/invoice-title',
  orders: '/token-order', invoices: '/invoice',
}
const base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

export async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${base}${path}`, {
      method,
      signal: AbortSignal.timeout(15000),
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error(method === 'GET'
      ? '网络连接失败或请求超时，请检查后端服务后重试'
      : '网络连接失败或请求超时，写入结果未确认，请刷新核对后再操作')
  }
  let result: { code?: number; message?: string; data?: T }
  try {
    result = await response.json()
  } catch {
    const suffix = method === 'GET' ? '' : '，写入结果未确认，请刷新核对后再操作'
    throw new Error(`服务响应无法解析（HTTP ${response.status}）${suffix}`)
  }
  if (!response.ok || result?.code !== 200) {
    throw new Error(result?.message || `请求失败（HTTP ${response.status}）`)
  }
  return result.data as T
}

export async function loadData(): Promise<DataSet> {
  const [providers, titles, orders, invoices] = await Promise.all([
    request<DataSet['providers']>(paths.providers),
    request<DataSet['titles']>(paths.titles),
    request<DataSet['orders']>(paths.orders),
    request<DataSet['invoices']>(paths.invoices),
  ])
  if (![providers, titles, orders, invoices].every(Array.isArray)) {
    throw new Error('列表响应格式错误，请重试')
  }
  return { providers, titles, orders, invoices }
}

export async function getDetail<E extends Entity>(entity: E, id: string): Promise<EntityRecord<E>> {
  const detail = await request<EntityRecord<E>>(`${paths[entity]}/${encodeURIComponent(id)}`)
  if (!detail || typeof detail !== 'object' || typeof detail.id !== 'string') {
    throw new Error('详情响应格式错误，请重试')
  }
  return detail
}

export async function getInvoiceOrders(id: string): Promise<Order[]> {
  const orders = await request<Order[]>(`/token-order/i/${encodeURIComponent(id)}`)
  if (!Array.isArray(orders)) throw new Error('关联订单响应格式错误，请重试')
  return orders
}

export async function executeAction(action: Action): Promise<void> {
  switch (action.type) {
    case 'saveProvider':
    case 'saveTitle':
    case 'saveOrder': {
      if (action.type === 'saveOrder') parseAmount(formatAmountInput(action.value.amountCent))
      const { id, ...value } = action.value
      const path = action.type === 'saveProvider' ? paths.providers
        : action.type === 'saveTitle' ? paths.titles : paths.orders
      const body = action.type === 'saveOrder' ? {
        orderNo: action.value.orderNo.trim(), amount: action.value.amountCent / 100,
        paymentType: action.value.paymentType, providerId: action.value.providerId,
      } : action.type === 'saveTitle' ? {
        name: action.value.name.trim(), titleType: action.value.titleType,
        taxCode: action.value.taxCode.trim(),
      } : { ...value, name: action.value.name.trim(), website: action.value.website.trim() }
      await request(id ? `${path}/${encodeURIComponent(id)}` : path,
        id ? 'PUT' : 'POST', body)
      return
    }
    case 'invoice':
      await request(paths.invoices, 'POST', {
        invoiceRequest: { ...action.value, invoiceNo: action.value.invoiceNo.trim() },
        batchIdRequest: { ids: [...new Set(action.ids)] },
      })
      return
    case 'voidInvoice':
      await request(`${paths.invoices}/${encodeURIComponent(action.id)}`, 'PUT')
      return
    default: {
      const routes = {
        deleteProviders: [paths.providers, 'DELETE'],
        deleteTitles: [paths.titles, 'DELETE'],
        trashOrders: [`${paths.orders}/logic`, 'PUT'],
        recoverOrders: [`${paths.orders}/recover`, 'PUT'],
        deleteOrders: [paths.orders, 'DELETE'],
      } as const
      const [path, method] = routes[action.type]
      await request(path, method, { ids: [...new Set(action.ids)] })
    }
  }
}
