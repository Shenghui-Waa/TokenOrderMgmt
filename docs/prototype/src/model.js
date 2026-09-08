export const paymentLabels = {
  UNION_PAY: '银联', MASTERCARD: '万事达', VISA: 'Visa', ALIPAY: '支付宝',
  WECHAT_PAY: '微信支付', MI_PAY: '小米支付', APPLE_PAY: '苹果支付',
  GOOGLE_PAY: '谷歌支付',
};

export const typeLabels = { PERSONAL: '个人', COMPANY: '企业' };
export const money = (cent) => (cent / 100).toLocaleString('zh-CN', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});

export function seedData() {
  const providers = [
    { id: 'p1', name: 'OpenAI', website: 'https://openai.com' },
    { id: 'p2', name: 'Anthropic', website: 'https://anthropic.com' },
    { id: 'p3', name: 'DeepSeek', website: 'https://deepseek.com' },
    { id: 'p4', name: '阿里云 · 百炼', website: 'https://bailian.console.aliyun.com' },
    { id: 'p5', name: 'Google AI', website: 'https://ai.google' },
    { id: 'p6', name: '月之暗面', website: 'https://moonshot.cn' },
  ];
  const titles = [
    { id: 't1', titleType: 'COMPANY', name: '星河数字科技有限公司',
      taxCode: '91330106MA28XY1234' },
    { id: 't2', titleType: 'PERSONAL', name: '林沐', taxCode: '' },
    { id: 't3', titleType: 'COMPANY', name: '云间创意工作室',
      taxCode: '91310115MA1K123456' },
    { id: 't4', titleType: 'PERSONAL', name: '陈予安', taxCode: '' },
  ];
  const payments = Object.keys(paymentLabels);
  const orders = Array.from({ length: 33 }, (_, index) => ({
    id: `o${index + 1}`,
    orderNo: `TOK-202609${String(8 - Math.floor(index / 5)).padStart(2, '0')}`
      + `-${String(index + 1).padStart(4, '0')}`,
    amountCent: [128000, 68000, 20000, 39900, 9900, 25600][index % 6],
    paymentType: payments[index % payments.length],
    providerId: providers[index % providers.length].id,
    invoiceId: index < 4 ? 'i1' : index < 6 ? 'i2' : null,
    deleted: index >= 30 ? 1 : 0,
    updatedAt: `2026-09-${String(8 - Math.floor(index / 5)).padStart(2, '0')}T10:30:00`,
  }));
  const invoices = [
    { id: 'i1', invoiceNo: 'FP-20260908-001', totalAmountCent: 255900,
      invoiceDate: '2026-09-08', invoiceTitleId: 't1', status: 'VALID',
      updatedAt: '2026-09-08T11:00:00' },
    { id: 'i2', invoiceNo: 'FP-20260907-002', totalAmountCent: 35500,
      invoiceDate: '2026-09-07', invoiceTitleId: 't2', status: 'VALID',
      updatedAt: '2026-09-07T14:20:00' },
    { id: 'i3', invoiceNo: 'FP-20260902-003', totalAmountCent: 9900,
      invoiceDate: '2026-09-02', invoiceTitleId: 't3', status: 'INVALID',
      updatedAt: '2026-09-04T09:00:00' },
  ];
  return { providers, titles, orders, invoices };
}

const requireValue = (condition, message) => {
  if (!condition) throw new Error(message);
};

function saveRecord(data, key, value, prefix) {
  const existing = data[key].find((row) => row.id === value.id);
  requireValue(!value.id || existing, '记录已不存在');
  const record = { ...existing, ...value,
    id: existing?.id || `${prefix}-${crypto.randomUUID()}` };
  data[key] = existing
    ? data[key].map((row) => row.id === record.id ? record : row)
    : [record, ...data[key]];
}

function selection(data, key, ids) {
  requireValue(Array.isArray(ids) && ids.length > 0, '请至少选择一条记录');
  const rows = data[key].filter((row) => ids.includes(row.id));
  requireValue(rows.length === new Set(ids).size, '部分记录已不存在');
  return rows;
}

function saveOrder(data, value, now) {
  const existing = data.orders.find((row) => row.id === value.id);
  requireValue(!existing?.invoiceId, '已开票订单不可修改');
  requireValue(!existing?.deleted, '回收站订单不可修改');
  requireValue(value.orderNo?.trim(), '请输入订单编号');
  requireValue(value.orderNo.trim().length <= 100, '订单编号最多100个字符');
  requireValue(!data.orders.some((row) => row.id !== value.id
    && row.orderNo === value.orderNo.trim()), '订单编号已存在');
  requireValue(Number.isSafeInteger(value.amountCent) && value.amountCent > 0,
    '金额必须大于零且最多两位小数');
  requireValue(paymentLabels[value.paymentType], '请选择支付方式');
  requireValue(data.providers.some((row) => row.id === value.providerId), '请选择提供商');
  saveRecord(data, 'orders', { ...value, orderNo: value.orderNo.trim(),
    invoiceId: null, deleted: 0, updatedAt: now }, 'o');
}

export function applyAction(source, action) {
  const data = structuredClone(source);
  const clock = new Date();
  const pad = (number) => String(number).padStart(2, '0');
  const today = `${clock.getFullYear()}-${pad(clock.getMonth() + 1)}`
    + `-${pad(clock.getDate())}`;
  const now = `${today}T${pad(clock.getHours())}:${pad(clock.getMinutes())}`
    + `:${pad(clock.getSeconds())}`;
  const { type, ids, value = {} } = action;
  if (type === 'saveProvider' || type === 'saveTitle') {
    const key = type === 'saveProvider' ? 'providers' : 'titles';
    requireValue(value.name?.trim(), '请输入名称');
    requireValue(!data[key].some((row) => row.id !== value.id
      && row.name === value.name.trim()), '名称已存在');
    if (key === 'providers') {
      requireValue(value.name.trim().length <= 50, '提供商名称最多50个字符');
      requireValue(value.website?.trim(), '请输入提供商网址');
      requireValue(value.website.length <= 500, '提供商网址最多500个字符');
      if (value.website) {
        let valid = false;
        try { valid = ['http:', 'https:'].includes(new URL(value.website).protocol); }
        catch { valid = false; }
        requireValue(valid, '网址必须以 http:// 或 https:// 开头');
      }
    } else {
      requireValue(typeLabels[value.titleType], '请选择抬头类型');
      requireValue(value.name.trim().length <= 150, '抬头名称最多150个字符');
      requireValue(value.titleType !== 'COMPANY' || value.taxCode?.trim(),
        '企业抬头必须填写税号');
      requireValue(!value.taxCode || /^[A-Za-z0-9]{15,20}$/.test(value.taxCode),
        '税号应为15至20位英文字母或数字');
    }
    saveRecord(data, key, { ...value, name: value.name.trim() },
      key === 'providers' ? 'p' : 't');
  } else if (type === 'saveOrder') {
    saveOrder(data, value, now);
  } else if (type === 'deleteProviders' || type === 'deleteTitles') {
    const key = type === 'deleteProviders' ? 'providers' : 'titles';
    selection(data, key, ids);
    data[key] = data[key].filter((row) => !ids.includes(row.id));
  } else if (['trashOrders', 'recoverOrders', 'deleteOrders', 'invoice'].includes(type)) {
    const rows = selection(data, 'orders', ids);
    if (type !== 'recoverOrders') {
      requireValue(rows.every((row) => !row.invoiceId), '已开票订单不可修改或删除');
    }
    if (type === 'invoice' || type === 'trashOrders') {
      requireValue(rows.every((row) => !row.deleted), '请选择正常状态的订单');
    }
    if (type === 'deleteOrders' || type === 'recoverOrders') {
      requireValue(rows.every((row) => row.deleted), '请选择回收站中的订单');
    }
    if (type === 'invoice') {
      requireValue(value.invoiceNo?.trim(), '请输入发票编号');
      requireValue(value.invoiceNo.trim().length <= 100, '发票编号最多100个字符');
      requireValue(!data.invoices.some((row) => row.invoiceNo === value.invoiceNo.trim()),
        '发票编号已存在');
      const parsed = new Date(`${value.invoiceDate}T00:00:00Z`);
      requireValue(/^\d{4}-\d{2}-\d{2}$/.test(value.invoiceDate)
        && !Number.isNaN(parsed.valueOf())
        && parsed.toISOString().slice(0, 10) === value.invoiceDate, '请选择有效开票日期');
      requireValue(value.invoiceDate <= today, '开票日期不能晚于今天');
      requireValue(data.titles.some((row) => row.id === value.invoiceTitleId),
        '请选择发票抬头');
      const total = rows.reduce((sum, row) => sum + row.amountCent, 0);
      requireValue(Number.isSafeInteger(total), '总金额超出支持范围');
      saveRecord(data, 'invoices', { ...value, invoiceNo: value.invoiceNo.trim(),
        totalAmountCent: total, status: 'VALID', updatedAt: now }, 'i');
      const invoiceId = data.invoices[0].id;
      data.orders = data.orders.map((row) => ids.includes(row.id)
        ? { ...row, invoiceId, updatedAt: now } : row);
    } else {
      data.orders = type === 'deleteOrders'
        ? data.orders.filter((row) => !ids.includes(row.id))
        : data.orders.map((row) => ids.includes(row.id)
          ? { ...row, deleted: type === 'trashOrders' ? 1 : 0, updatedAt: now } : row);
    }
  } else if (type === 'voidInvoice') {
    const invoice = data.invoices.find((row) => row.id === action.id);
    requireValue(invoice?.status === 'VALID', '仅有效发票可以作废');
    invoice.status = 'INVALID';
    invoice.updatedAt = now;
    data.orders = data.orders.map((row) => row.invoiceId === invoice.id
      ? { ...row, invoiceId: null, updatedAt: now } : row);
  } else {
    throw new Error('未知操作');
  }
  return data;
}

export function searchAll(data, query) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [];
  const matches = (...values) => values.some((value) => String(value || '')
    .toLocaleLowerCase().includes(needle));
  const results = [];
  for (const order of data.orders) {
    const provider = data.providers.find((row) => row.id === order.providerId);
    const invoice = data.invoices.find((row) => row.id === order.invoiceId);
    const title = data.titles.find((row) => row.id === invoice?.invoiceTitleId);
    if (matches(order.orderNo, provider?.name, invoice?.invoiceNo, title?.name)) {
      results.push({ kind: 'orders', id: order.id, title: order.orderNo,
        subtitle: `${provider?.name || '提供商已删除'} · ¥${money(order.amountCent)}`,
        deleted: order.deleted });
    }
  }
  for (const invoice of data.invoices) {
    const title = data.titles.find((row) => row.id === invoice.invoiceTitleId);
    if (matches(invoice.invoiceNo, title?.name)) {
      results.push({ kind: 'invoices', id: invoice.id, title: invoice.invoiceNo,
        subtitle: title?.name || '抬头已删除', deleted: 0 });
    }
  }
  for (const kind of ['providers', 'titles']) {
    for (const row of data[kind]) {
      if (matches(row.name)) results.push({ kind, id: row.id, title: row.name,
        subtitle: kind === 'providers' ? row.website : typeLabels[row.titleType],
        deleted: 0 });
    }
  }
  return results;
}
