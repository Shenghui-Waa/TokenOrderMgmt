import type { Action, DataSet, PaymentType, SearchResult, TitleType } from './types'

export const paymentLabels: Record<PaymentType, string> = {
  UNION_PAY: '银联', MASTERCARD: '万事达', VISA: 'Visa', ALIPAY: '支付宝',
  WECHAT_PAY: '微信支付', MI_PAY: '小米支付', APPLE_PAY: '苹果支付', GOOGLE_PAY: '谷歌支付',
}
export const typeLabels: Record<TitleType, string> = { PERSONAL: '个人', COMPANY: '企业' }
export function formatAmountInput(cent: number): string {
  if (!Number.isSafeInteger(cent)) return ''
  const integer = BigInt(cent)
  const negative = integer < 0n
  const absolute = negative ? -integer : integer
  return `${negative ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`
}
export function money(cent: number): string {
  const decimal = formatAmountInput(cent)
  if (!decimal) return '金额超出安全精度'
  const [whole, fraction] = decimal.split('.')
  const grouped = BigInt(whole).toLocaleString('zh-CN')
  return `${whole === '-0' ? '-' : ''}${grouped}.${fraction}`
}
function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
export function parseAmount(input: string): number {
  const value = input.trim()
  requireValue(/^\d+(\.\d{1,2})?$/.test(value), '金额必须大于零且最多两位小数')
  const [whole, fraction = ''] = value.split('.')
  const exact = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
  const cent = Number(exact)
  requireValue(Number.isSafeInteger(cent) && cent > 0, '金额超出支持范围或不大于零')
  const normalized = `${BigInt(whole)}.${fraction.padEnd(2, '0')}`
  requireValue(formatAmountInput(cent) === normalized, '金额超出支持范围')
  const serialized = JSON.stringify(cent / 100)
  const [serializedWhole, serializedFraction = ''] = serialized.split('.')
  const compatible = /^\d+$/.test(serializedWhole) && /^\d{0,2}$/.test(serializedFraction)
  requireValue(compatible && BigInt(serializedWhole) * 100n
    + BigInt(serializedFraction.padEnd(2, '0')) === exact,
  '金额过大，无法精确提交，请降低金额')
  return cent
}
function selection<T extends { id: string }>(rows: T[], ids: string[]): T[] {
  requireValue(ids.length && ids.every((id) => id.trim()), '请至少选择一条记录')
  const selected = rows.filter((row) => ids.includes(row.id))
  requireValue(selected.length === new Set(ids).size, '部分记录已不存在')
  return selected
}
export function validateAction(data: DataSet, action: Action): void {
  if (action.type === 'saveProvider' || action.type === 'saveTitle') {
    const { value } = action
    const rows = action.type === 'saveProvider' ? data.providers : data.titles
    requireValue(!value.id || rows.some((row) => row.id === value.id), '记录已不存在')
    requireValue(value.name.trim(), '请输入名称')
    requireValue(!rows.some((row) => row.id !== value.id
      && row.name === value.name.trim()), '名称已存在')
    if (action.type === 'saveProvider') {
      const provider = action.value
      requireValue(provider.name.trim().length <= 50, '提供商名称最多50个字符')
      requireValue(provider.website.trim().length <= 500, '提供商网址最多500个字符')
      let valid = false
      try { valid = ['http:', 'https:'].includes(new URL(provider.website.trim()).protocol) }
      catch { valid = false }
      requireValue(valid, '网址必须以 http:// 或 https:// 开头')
    } else {
      const title = action.value
      requireValue(typeLabels[title.titleType], '请选择抬头类型')
      requireValue(title.name.trim().length <= 150, '抬头名称最多150个字符')
      requireValue(title.titleType !== 'COMPANY' || title.taxCode.trim(), '企业抬头必须填写税号')
      requireValue(!title.taxCode.trim() || /^[A-Za-z0-9]{15,20}$/.test(title.taxCode.trim()),
        '税号应为15至20位英文字母或数字')
    }
    return
  }
  if (action.type === 'saveOrder') {
    const { value } = action
    const row = data.orders.find((item) => item.id === value.id)
    requireValue(!value.id || row, '订单已不存在')
    requireValue(!row?.invoiceId && row?.invoiceStatus !== 'INVOICED', '已开票订单不可修改')
    requireValue(!row?.deleted, '回收站订单不可修改')
    requireValue(value.orderNo.trim(), '请输入订单编号')
    requireValue(value.orderNo.trim().length <= 100, '订单编号最多100个字符')
    requireValue(!data.orders.some((item) => item.id !== value.id
      && item.orderNo === value.orderNo.trim()), '订单编号已存在')
    requireValue(Number.isSafeInteger(value.amountCent) && value.amountCent > 0,
      '金额必须大于零且为安全整数分')
    parseAmount(formatAmountInput(value.amountCent))
    requireValue(paymentLabels[value.paymentType], '请选择支付方式')
    requireValue(data.providers.some((item) => item.id === value.providerId), '请选择提供商')
    return
  }
  if (action.type === 'deleteProviders' || action.type === 'deleteTitles') {
    selection<{ id: string }>(
      action.type === 'deleteProviders' ? data.providers : data.titles, action.ids)
    return
  }
  if (action.type === 'voidInvoice') {
    requireValue(data.invoices.some((row) => row.id === action.id && row.status === 'VALID'),
      '仅有效发票可以作废')
    return
  }
  const rows = selection(data.orders, action.ids)
  if (action.type !== 'recoverOrders') {
    requireValue(rows.every((row) => !row.invoiceId && row.invoiceStatus !== 'INVOICED'),
      '已开票订单不可修改或删除')
  }
  if (action.type === 'invoice' || action.type === 'trashOrders') {
    requireValue(rows.every((row) => !row.deleted), '请选择正常状态的订单')
  } else {
    requireValue(rows.every((row) => row.deleted), '请选择回收站中的订单')
  }
  if (action.type !== 'invoice') return
  const { value } = action
  requireValue(value.invoiceNo.trim(), '请输入发票编号')
  requireValue(value.invoiceNo.trim().length <= 100, '发票编号最多100个字符')
  requireValue(!data.invoices.some((row) => row.invoiceNo === value.invoiceNo.trim()),
    '发票编号已存在')
  const parsed = new Date(`${value.invoiceDate}T00:00:00Z`)
  requireValue(/^\d{4}-\d{2}-\d{2}$/.test(value.invoiceDate)
    && !Number.isNaN(parsed.valueOf())
    && parsed.toISOString().slice(0, 10) === value.invoiceDate, '请选择有效开票日期')
  const clock = new Date()
  const today = [clock.getFullYear(), String(clock.getMonth() + 1).padStart(2, '0'),
    String(clock.getDate()).padStart(2, '0')].join('-')
  requireValue(value.invoiceDate <= today, '开票日期不能晚于今天')
  requireValue(data.titles.some((row) => row.id === value.invoiceTitleId), '请选择发票抬头')
  requireValue(rows.every((row) => Number.isSafeInteger(row.amountCent) && row.amountCent > 0),
    '订单金额非法')
  const total = rows.reduce((sum, row) => sum + row.amountCent, 0)
  requireValue(Number.isSafeInteger(total), '总金额超出支持范围')
  requireValue(value.totalAmountCent === total, '订单金额已变化，请重新确认合计')
}

export function searchAll(data: DataSet, query: string): SearchResult[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return []
  const matches = (...values: (string | null | undefined)[]) => values.some((value) =>
    (value || '').toLocaleLowerCase().includes(needle))
  const results: SearchResult[] = []
  for (const order of data.orders) {
    const provider = data.providers.find((row) => row.id === order.providerId)
    const invoice = data.invoices.find((row) => row.id === order.invoiceId)
    const title = data.titles.find((row) => row.id === invoice?.invoiceTitleId)
    const providerName = order.providerName || provider?.name
    if (matches(order.orderNo, providerName, invoice?.invoiceNo, title?.name,
      invoice?.invoiceTitleName)) {
      results.push({ kind: 'orders', id: order.id, title: order.orderNo,
        subtitle: `${providerName || '提供商已删除'} · ¥${money(order.amountCent)}`,
        deleted: order.deleted })
    }
  }
  for (const invoice of data.invoices) {
    const title = data.titles.find((row) => row.id === invoice.invoiceTitleId)
    const titleName = invoice.invoiceTitleName || title?.name
    if (matches(invoice.invoiceNo, titleName)) {
      results.push({ kind: 'invoices', id: invoice.id, title: invoice.invoiceNo,
        subtitle: titleName || '抬头已删除', deleted: 0 })
    }
  }
  for (const row of data.providers) {
    if (matches(row.name)) results.push({ kind: 'providers', id: row.id,
      title: row.name, subtitle: row.website, deleted: 0 })
  }
  for (const row of data.titles) {
    if (matches(row.name)) results.push({ kind: 'titles', id: row.id,
      title: row.name, subtitle: typeLabels[row.titleType], deleted: 0 })
  }
  return results
}
