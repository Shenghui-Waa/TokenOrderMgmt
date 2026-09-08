export type TitleType = 'PERSONAL' | 'COMPANY'
export type PaymentType = 'UNION_PAY' | 'MASTERCARD' | 'VISA' | 'ALIPAY'
  | 'WECHAT_PAY' | 'MI_PAY' | 'APPLE_PAY' | 'GOOGLE_PAY'
export interface Provider { id: string; name: string; website: string }
export interface InvoiceTitle {
  id: string; name: string; titleType: TitleType; taxCode: string | null
}
export interface Order {
  id: string; orderNo: string; amountCent: number; paymentType: PaymentType
  providerId: string; providerName: string | null; invoiceId: string | null
  invoiceStatus: 'UNINVOICED' | 'INVOICED'; invoiceType: TitleType | null
  deleted: number; updatedAt: string | null
}
export interface Invoice {
  id: string; invoiceNo: string; totalAmountCent: number; invoiceDate: string
  invoiceType: TitleType; invoiceTitleId: string; invoiceTitleName: string
  status: 'VALID' | 'INVALID'; updatedAt: string | null
}
export interface DataSet {
  providers: Provider[]; titles: InvoiceTitle[]; orders: Order[]; invoices: Invoice[]
}
export type Entity = keyof DataSet
export type EntityRecord<E extends Entity> = DataSet[E][number]
export type ProviderInput = Omit<Provider, 'id'> & { id?: string }
export type TitleInput = Omit<InvoiceTitle, 'id' | 'taxCode'>
  & { id?: string; taxCode: string }
export type SaveOrderInput = Pick<Order,
  'orderNo' | 'amountCent' | 'paymentType' | 'providerId'> & { id?: string }
export type InvoiceInput = Pick<Invoice,
  'invoiceNo' | 'invoiceDate' | 'invoiceTitleId' | 'totalAmountCent'>
export type Action =
  | { type: 'saveProvider'; value: ProviderInput }
  | { type: 'saveTitle'; value: TitleInput }
  | { type: 'saveOrder'; value: SaveOrderInput }
  | { type: 'deleteProviders' | 'deleteTitles' | 'trashOrders'
      | 'recoverOrders' | 'deleteOrders'; ids: string[] }
  | { type: 'invoice'; ids: string[]; value: InvoiceInput }
  | { type: 'voidInvoice'; id: string }
export interface SearchResult {
  kind: Entity; id: string; title: string; subtitle: string; deleted: number
}
