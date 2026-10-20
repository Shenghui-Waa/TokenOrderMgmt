import { useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Button, Field } from '../components';
import { formatAmountInput, money, parseAmount, paymentLabels, typeLabels } from '../domain';
import type { Action, DataSet, InvoiceTitle, Order, PaymentType, Provider } from '../types';

export type FormState = {
  kind: 'form';
  entity: 'orders' | 'titles' | 'providers' | 'invoice';
  value: Partial<Order & InvoiceTitle & Provider>;
  ids?: string[];
};

interface Props {
  form: FormState;
  data: DataSet;
  busy: boolean;
  close: () => void;
  commit: (action: Action, message: string) => Promise<boolean>;
  notify: (message: string) => void;
  createdOrder: () => void;
}

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    + `-${String(date.getDate()).padStart(2, '0')}`;
}

export function BusinessForm({ form, data, busy, close, commit, notify, createdOrder }: Props) {
  const { entity, value, ids = [] } = form;
  const [titleType, setTitleType] = useState(value.titleType || '');
  const isOrder = entity === 'orders';
  const isInvoice = entity === 'invoice';
  const total = data.orders.filter(item => ids.includes(item.id))
    .reduce((sum, item) => sum + item.amountCent, 0);
  const field = (name: 'orderNo' | 'name' | 'website' | 'taxCode' | 'invoiceNo',
    label: string, options: InputHTMLAttributes<HTMLInputElement> = {}) =>
    <Field label={label}><input name={name}
      defaultValue={name === 'invoiceNo' ? '' : value[name] || ''} {...options} /></Field>;
  const select = (name: string, label: string, options: [string, string][], initial = '') =>
    <Field label={label}><select name={name} defaultValue={initial} required
      onChange={event => { if (name === 'titleType') setTitleType(event.target.value); }}>
      <option value="" disabled>请选择</option>{options.map(([id, text]) =>
        <option key={id} value={id}>{text}</option>)}
    </select></Field>;

  return <form onSubmit={async event => {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const text = (key: string) => String(fields.get(key) || '').trim();
    try {
      let action: Action;
      if (isOrder) action = { type: 'saveOrder', value: {
        id: value.id, orderNo: text('orderNo'), providerId: text('providerId'),
        amountCent: parseAmount(text('amount')), paymentType: text('paymentType') as PaymentType,
      } };
      else if (isInvoice) action = { type: 'invoice', ids, value: {
        invoiceNo: text('invoiceNo'), invoiceDate: text('invoiceDate'),
        invoiceTitleId: text('invoiceTitleId'), totalAmountCent: total,
      } };
      else if (entity === 'titles') action = { type: 'saveTitle', value: {
        id: value.id, name: text('name'), taxCode: text('taxCode'),
        titleType: text('titleType') as InvoiceTitle['titleType'],
      } };
      else action = { type: 'saveProvider', value: {
        id: value.id, name: text('name'), website: text('website'),
      } };
      const saved = await commit(action, isInvoice ? '发票已记录，订单已关联' : '已保存');
      if (saved && isOrder && !value.id) createdOrder();
    } catch (error) {
      notify(error instanceof Error ? error.message : '表单内容无效');
    }
  }}>
    <fieldset disabled={busy} className="form-fields">
      <div className="form-grid">
        {isOrder && <>
          {field('orderNo', '订单编号', { required: true, maxLength: 100 })}
          {select('providerId', '提供商', data.providers.map(item => [item.id, item.name]),
            value.providerId)}
          <Field label="金额 / 元"><input type="number" name="amount" required min="0.01"
            step="0.01" defaultValue={value.amountCent ? formatAmountInput(value.amountCent) : ''} /></Field>
          {select('paymentType', '支付方式', Object.entries(paymentLabels), value.paymentType)}
          <p className="form-note">开票时选择发票抬头，未开票订单不设置发票类型。</p>
          {!data.providers.length && <p role="status">请先在提供商页面添加提供商。</p>}
        </>}
        {isInvoice && <>
          <div className="invoice-total"><span>本次开票 · {ids.length} 条订单</span>
            <strong>{money(total)}</strong></div>
          {field('invoiceNo', '发票编号', { required: true, maxLength: 100 })}
          <Field label="开票日期"><input type="date" name="invoiceDate" required
            max={today()} defaultValue={today()} /></Field>
          {select('invoiceTitleId', '发票抬头', data.titles.map(item =>
            [item.id, `${item.name} · ${typeLabels[item.titleType]}`]))}
          <p className="form-note">记录已有发票信息，金额自动合计。不会生成电子发票文件。</p>
          {!data.titles.length && <p role="status">请先在发票抬头页面添加抬头。</p>}
        </>}
        {entity === 'titles' && <>
          {select('titleType', '抬头类型', Object.entries(typeLabels), value.titleType)}
          {field('name', '抬头名称', { required: true, maxLength: 150 })}
          {field('taxCode', titleType === 'COMPANY' ? '税号（必填）' : '税号（选填）', {
            required: titleType === 'COMPANY', pattern: '[a-zA-Z0-9]{15,20}',
            title: '填写时需为15至20位英文字母或数字', maxLength: 20,
          })}
        </>}
        {entity === 'providers' && <>
          {field('name', '提供商名称', { required: true, maxLength: 50 })}
          {field('website', '提供商网址', { required: true, type: 'url',
            pattern: 'https?://.+', placeholder: 'https://example.com', maxLength: 500 })}
        </>}
      </div>
    </fieldset>
    <div className="modal-footer"><Button onClick={close} disabled={busy}>取消</Button>
      <Button tone="primary" type="submit" disabled={busy}>
        {busy ? '正在提交…' : isInvoice ? '确认开票' : '保存'}</Button></div>
  </form>;
}
