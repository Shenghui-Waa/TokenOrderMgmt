import type {
  Action, DataSet, Entity, EntityRecord, Invoice, InvoiceInput, InvoiceTitle,
  Order, Provider, ProviderInput, SaveOrderInput, TitleInput,
} from './types'
import { formatAmountInput, parseAmount } from './domain'

export interface BackendAdapter {
  loadData(): Promise<DataSet>
  getProvider(id: string): Promise<Provider>
  saveProvider(input: ProviderInput): Promise<void>
  deleteProviders(ids: string[]): Promise<void>
  getInvoiceTitle(id: string): Promise<InvoiceTitle>
  saveInvoiceTitle(input: TitleInput): Promise<void>
  deleteInvoiceTitles(ids: string[]): Promise<void>
  getTokenOrder(id: string): Promise<Order>
  getInvoiceOrders(id: string): Promise<Order[]>
  saveTokenOrder(input: SaveOrderInput): Promise<void>
  trashTokenOrders(ids: string[]): Promise<void>
  recoverTokenOrders(ids: string[]): Promise<void>
  deleteTokenOrders(ids: string[]): Promise<void>
  getInvoice(id: string): Promise<Invoice>
  createInvoice(input: InvoiceInput, orderIds: string[]): Promise<void>
  voidInvoice(id: string): Promise<void>
  openExternalURL(url: string): Promise<void>
}

type WailsApp = {
  LoadData(): Promise<DataSet>
  GetProvider(id: string): Promise<Provider>
  SaveProvider(input: ProviderInput): Promise<void>
  DeleteProviders(ids: string[]): Promise<void>
  GetInvoiceTitle(id: string): Promise<InvoiceTitle>
  SaveInvoiceTitle(input: TitleInput): Promise<void>
  DeleteInvoiceTitles(ids: string[]): Promise<void>
  GetTokenOrder(id: string): Promise<Order>
  GetInvoiceOrders(id: string): Promise<Order[]>
  SaveTokenOrder(input: {
    id?: string
    orderNo: string
    amount: string
    paymentType: SaveOrderInput['paymentType']
    providerId: string
  }): Promise<void>
  TrashTokenOrders(ids: string[]): Promise<void>
  RecoverTokenOrders(ids: string[]): Promise<void>
  DeleteTokenOrders(ids: string[]): Promise<void>
  GetInvoice(id: string): Promise<Invoice>
  CreateInvoice(input: InvoiceInput, orderIds: string[]): Promise<void>
  VoidInvoice(id: string): Promise<void>
  OpenExternalURL(url: string): Promise<void>
}

declare global {
  interface Window { go?: { main?: { App?: WailsApp } } }
}

function app(): WailsApp {
  const binding = window.go?.main?.App
  if (!binding) throw new Error('桌面运行时尚未就绪，请重新打开应用')
  return binding
}

const unique = (ids: string[]): string[] => [...new Set(ids)]

export const wailsBackendAdapter: BackendAdapter = {
  loadData: () => app().LoadData(),
  getProvider: id => app().GetProvider(id),
  saveProvider: input => app().SaveProvider(input),
  deleteProviders: ids => app().DeleteProviders(ids),
  getInvoiceTitle: id => app().GetInvoiceTitle(id),
  saveInvoiceTitle: input => app().SaveInvoiceTitle(input),
  deleteInvoiceTitles: ids => app().DeleteInvoiceTitles(ids),
  getTokenOrder: id => app().GetTokenOrder(id),
  getInvoiceOrders: id => app().GetInvoiceOrders(id),
  saveTokenOrder: input => app().SaveTokenOrder({
    id: input.id,
    orderNo: input.orderNo,
    amount: formatAmountInput(input.amountCent),
    paymentType: input.paymentType,
    providerId: input.providerId,
  }),
  trashTokenOrders: ids => app().TrashTokenOrders(ids),
  recoverTokenOrders: ids => app().RecoverTokenOrders(ids),
  deleteTokenOrders: ids => app().DeleteTokenOrders(ids),
  getInvoice: id => app().GetInvoice(id),
  createInvoice: (input, ids) => app().CreateInvoice(input, ids),
  voidInvoice: id => app().VoidInvoice(id),
  openExternalURL: url => app().OpenExternalURL(url),
}

let backend: BackendAdapter = wailsBackendAdapter

export function setBackendAdapter(adapter: BackendAdapter): () => void {
  const previous = backend
  backend = adapter
  return () => { backend = previous }
}

export async function loadData(): Promise<DataSet> {
  const data = await backend.loadData()
  if (![data.providers, data.titles, data.orders, data.invoices].every(Array.isArray)) {
    throw new Error('列表响应格式错误，请重试')
  }
  return data
}

export async function getDetail<E extends Entity>(
  entity: E,
  id: string,
): Promise<EntityRecord<E>> {
  const calls = {
    providers: backend.getProvider,
    titles: backend.getInvoiceTitle,
    orders: backend.getTokenOrder,
    invoices: backend.getInvoice,
  }
  const detail = await calls[entity](id) as EntityRecord<E>
  if (!detail || typeof detail !== 'object' || typeof detail.id !== 'string') {
    throw new Error('详情响应格式错误，请重试')
  }
  return detail
}

export async function getInvoiceOrders(id: string): Promise<Order[]> {
  const orders = await backend.getInvoiceOrders(id)
  if (!Array.isArray(orders)) throw new Error('关联订单响应格式错误，请重试')
  return orders
}

export async function openExternalURL(url: string): Promise<void> {
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('仅允许打开 HTTP 或 HTTPS 网站')
  }
  await backend.openExternalURL(parsed.toString())
}

export async function executeAction(action: Action): Promise<void> {
  switch (action.type) {
    case 'saveProvider':
      await backend.saveProvider({ ...action.value,
        name: action.value.name.trim(), website: action.value.website.trim() })
      return
    case 'saveTitle':
      await backend.saveInvoiceTitle({ ...action.value,
        name: action.value.name.trim(), taxCode: action.value.taxCode.trim() })
      return
    case 'saveOrder':
      parseAmount(formatAmountInput(action.value.amountCent))
      await backend.saveTokenOrder({ ...action.value, orderNo: action.value.orderNo.trim() })
      return
    case 'deleteProviders':
      await backend.deleteProviders(unique(action.ids))
      return
    case 'deleteTitles':
      await backend.deleteInvoiceTitles(unique(action.ids))
      return
    case 'trashOrders':
      await backend.trashTokenOrders(unique(action.ids))
      return
    case 'recoverOrders':
      await backend.recoverTokenOrders(unique(action.ids))
      return
    case 'deleteOrders':
      await backend.deleteTokenOrders(unique(action.ids))
      return
    case 'invoice':
      await backend.createInvoice({ ...action.value,
        invoiceNo: action.value.invoiceNo.trim() }, unique(action.ids))
      return
    case 'voidInvoice':
      await backend.voidInvoice(action.id)
  }
}
