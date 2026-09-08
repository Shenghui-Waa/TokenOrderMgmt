import type { DataSet } from './types'

/** Isolated test data, never imported by the production entry point. */
export function fixtureData(): DataSet {
  return {
    providers: [{ id: 'p1', name: 'Acme Tokens', website: 'https://example.com' }],
    titles: [{ id: 't1', name: '测试企业', titleType: 'COMPANY',
      taxCode: '91310000123456789X' }],
    invoices: [{ id: 'i1', invoiceNo: 'INV-TEST', totalAmountCent: 320,
      invoiceDate: '2026-09-08', invoiceType: 'COMPANY', invoiceTitleId: 't1',
      invoiceTitleName: '测试企业', status: 'VALID', updatedAt: '2026-09-08T23:59:59' }],
    orders: [
      { id: 'o1', orderNo: 'ORDER-OPEN', amountCent: 125, paymentType: 'ALIPAY',
        providerId: 'p1', providerName: 'Acme Tokens', invoiceId: null,
        invoiceStatus: 'UNINVOICED', invoiceType: null, deleted: 0,
        updatedAt: '2026-09-08T23:59:59' },
      { id: 'o2', orderNo: 'ORDER-INVOICED', amountCent: 320, paymentType: 'VISA',
        providerId: 'p1', providerName: 'Acme Tokens', invoiceId: 'i1',
        invoiceStatus: 'INVOICED', invoiceType: 'COMPANY', deleted: 0,
        updatedAt: '2026-09-07T10:00:00' },
      { id: 'o3', orderNo: 'ORDER-TRASH', amountCent: 210, paymentType: 'ALIPAY',
        providerId: 'p1', providerName: 'Acme Tokens', invoiceId: null,
        invoiceStatus: 'UNINVOICED', invoiceType: null, deleted: 1,
        updatedAt: '2026-09-06T10:00:00' },
    ],
  }
}
