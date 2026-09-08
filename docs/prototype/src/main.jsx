import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { seedData, money, paymentLabels, typeLabels } from './model.js';
import { applyAction, searchAll } from './model.js';
import { Button, Badge, Modal, Field, Empty, Check, DataTable } from './components.jsx';
import './styles.css';

const pages = { orders: '订单', invoices: '发票', providers: '提供商', titles: '发票抬头' };
const storageKey = 'token-order-prototype-v1';
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    + `-${String(date.getDate()).padStart(2, '0')}`;
};
const stamp = value => value?.replace('T', ' ').slice(0, 19) || '—';

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && ['orders', 'invoices', 'providers', 'titles']
      .every(key => Array.isArray(saved[key]))) return saved;
  } catch { /* 存储不可用时以示例数据启动。 */ }
  return seedData();
}

function App() {
  const [data, setData] = useState(loadData);
  const [page, setPage] = useState('orders');
  const [trash, setTrash] = useState(false);
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const highlightTimer = useRef(null);
  const provider = order => data.providers.find(item => item.id === order.providerId);
  const invoice = order => data.invoices.find(item => item.id === order.invoiceId);
  const title = item => data.titles.find(entry => entry.id === item?.invoiceTitleId);
  const notify = message => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  };
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(data)); }
    catch { notify('浏览器未允许保存，当前更改仅在本次打开期间保留'); }
  }, [data]);
  useEffect(() => {
    const handle = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setModal({ kind: 'search' });
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, []);
  useEffect(() => {
    if (!highlight) return;
    document.getElementById(`record-${highlight}`)?.scrollIntoView({ block: 'center' });
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlight(null), 1000);
    return () => clearTimeout(highlightTimer.current);
  }, [highlight, page, trash]);

  const navigate = (next, deleted = false) => {
    setPage(next); setTrash(deleted); setSelected([]); setFilters({});
    setFilterOpen(false); setHighlight(null);
  };
  const commit = (action, message) => {
    try {
      setData(applyAction(data, action));
      setSelected([]); setModal(null); notify(message);
      return true;
    } catch (error) { notify(error.message); return false; }
  };
  const copy = async value => {
    try { await navigator.clipboard.writeText(value); notify('编号已复制'); }
    catch {
      const input = document.createElement('textarea');
      input.value = value; document.body.append(input); input.select();
      const ok = document.execCommand('copy'); input.remove();
      notify(ok ? '编号已复制' : '复制失败，请手动选择编号复制');
    }
  };
  const copyLink = value => <button className="copy" title="点击复制编号"
    onClick={() => copy(value)}>{value}<span aria-hidden="true">⧉</span></button>;
  const detail = (kind, value) => setModal({ kind: 'detail', entity: kind, value });
  const edit = (kind, value = {}) => setModal({ kind: 'form', entity: kind, value });
  const startInvoice = ids => setModal({ kind: 'form', entity: 'invoice', ids, value: {} });
  const confirm = (action, heading, text) => setModal({ kind: 'confirm', action, heading, text });
  const removeOrders = ids => {
    const inTrash = data.orders.filter(row => ids.includes(row.id))
      .every(row => row.deleted);
    confirm({ type: inTrash ? 'deleteOrders' : 'trashOrders', ids },
      inTrash ? '永久删除订单' : '移入回收站', inTrash
        ? `将永久删除 ${ids.length} 条订单，此操作无法恢复。`
        : `将 ${ids.length} 条订单移入回收站，之后可以恢复。`);
  };
  const voidInvoice = item => confirm({ type: 'voidInvoice', id: item.id }, '作废发票',
    `作废 ${item.invoiceNo} 后，全部关联订单将恢复未开票状态，可重新开票。`);
  const titleLink = inv => {
    if (!inv) return <span className="muted">—</span>;
    const record = title(inv);
    return record ? <button className="text-button" onClick={() => detail('titles', record)}>
      {typeLabels[record.titleType]} <span className="muted">↗</span></button>
      : <span className="muted">抬头已删除</span>;
  };

  let rows = [...data[page]];
  if (page === 'orders') rows = rows.filter(row => Boolean(row.deleted) === trash);
  rows = rows.filter(row => {
    const date = row.updatedAt?.slice(0, 10);
    const inv = page === 'orders' ? invoice(row) : row;
    if (filters.from && (!date || date < filters.from)) return false;
    if (filters.to && (!date || date > filters.to)) return false;
    if (filters.provider && row.providerId !== filters.provider) return false;
    if (filters.payment && row.paymentType !== filters.payment) return false;
    if (filters.type && title(inv)?.titleType !== filters.type) return false;
    const status = page === 'orders' ? (row.invoiceId ? 'INVOICED' : 'UNINVOICED') : row.status;
    return !filters.status || status === filters.status;
  });
  rows.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const chosen = data.orders.filter(row => selected.includes(row.id));
  const hasInvoiced = chosen.some(row => row.invoiceId);
  const activeOrders = data.orders.filter(row => !row.deleted);
  const total = activeOrders.reduce((sum, row) => sum + row.amountCent, 0);
  const pending = activeOrders.filter(row => !row.invoiceId);
  const filterCount = Object.values(filters).filter(Boolean).length;

  const orderActions = (row, showDetail = true) => <div className="actions">
    {showDetail && <button className="text-button"
      onClick={() => detail('orders', row)}>详情</button>}
    {!row.deleted && <button className="text-button" disabled={Boolean(row.invoiceId)}
      title={row.invoiceId ? '已开票订单不可修改' : '修改订单'}
      onClick={() => edit('orders', row)}>修改</button>}
    {Boolean(row.deleted) && <button className="text-button"
      onClick={() => commit({ type: 'recoverOrders', ids: [row.id] }, '订单已恢复')}>恢复</button>}
    <button className="text-button danger" disabled={Boolean(row.invoiceId)}
      title={row.invoiceId ? '已开票订单不可删除' : ''}
      onClick={() => removeOrders([row.id])}>{row.deleted ? '永久删除' : '删除'}</button>
  </div>;
  const orderColumns = [
    { name: '订单编号', render: row => copyLink(row.orderNo) },
    { name: '提供商', render: row => provider(row)?.name || '提供商已删除' },
    { name: '金额 / 元', render: row => <strong className="amount">{money(row.amountCent)}</strong> },
    { name: '支付方式', render: row => paymentLabels[row.paymentType] },
    { name: '发票状态', render: row => <button className="status-button"
      disabled={!row.invoiceId && Boolean(row.deleted)}
      title={row.deleted && !row.invoiceId ? '请先恢复订单再开票' : '查看或记录发票'}
      onClick={() => row.invoiceId ? detail('invoices', invoice(row)) : startInvoice([row.id])}>
      <Badge tone={row.invoiceId ? 'green' : 'amber'}>
        {row.invoiceId ? '已开票' : '未开票'}<span> ↗</span>
      </Badge></button> },
    { name: '发票类型', render: row => titleLink(invoice(row)) },
    { name: '操作', render: orderActions }
  ];
  const invoiceColumns = [
    { name: '发票编号', render: row => copyLink(row.invoiceNo) },
    { name: '总金额 / 元', render: row => <strong className="amount">
      {money(row.totalAmountCent)}</strong> },
    { name: '开票日期', render: row => row.invoiceDate },
    { name: '发票类型', render: titleLink },
    { name: '发票状态', render: row => <Badge tone={row.status === 'VALID' ? 'green' : ''}>
      {row.status === 'VALID' ? '有效' : '作废'}</Badge> },
    { name: '操作', render: row => <div className="actions">
      <button className="text-button" onClick={() => detail('invoices', row)}>详情</button>
      {row.status === 'VALID' && <button className="text-button danger"
        onClick={() => voidInvoice(row)}>作废</button>}</div> }
  ];

  function renderFilters() {
    const select = (key, label, options) => <Field label={label}>
      <select value={filters[key] || ''} onChange={event => {
        setFilters({ ...filters, [key]: event.target.value }); setSelected([]);
      }}><option value="">全部</option>{Object.entries(options).map(([key, value]) =>
        <option key={key} value={key}>{value}</option>)}</select></Field>;
    return <div className="filter-panel">
      <Field label="更新起始日期"><input type="date" value={filters.from || ''}
        max={filters.to} onChange={event => {
          setFilters({ ...filters, from: event.target.value }); setSelected([]);
        }} /></Field>
      <Field label="更新结束日期"><input type="date" value={filters.to || ''}
        min={filters.from} onChange={event => {
          setFilters({ ...filters, to: event.target.value }); setSelected([]);
        }} /></Field>
      {page === 'orders' && select('provider', '提供商',
        Object.fromEntries(data.providers.map(item => [item.id, item.name])))}
      {page === 'orders' && select('payment', '支付方式', paymentLabels)}
      {select('status', '发票状态', page === 'orders'
        ? { INVOICED: '已开票', UNINVOICED: '未开票' } : { VALID: '有效', INVALID: '作废' })}
      {select('type', '发票类型', typeLabels)}
      <button className="text-button" onClick={() => { setFilters({}); setSelected([]); }}>
        重置筛选</button>
    </div>;
  }

  function renderForm() {
    const { entity, value, ids } = modal;
    const isOrder = entity === 'orders';
    const isInvoice = entity === 'invoice';
    const isTitle = entity === 'titles';
    const field = (name, label, options = {}) => <Field label={label}>
      <input name={name} defaultValue={value[name] || ''} {...options} /></Field>;
    const select = (name, label, options, initial) => <Field label={label}>
      <select name={name} defaultValue={initial || ''} required>
        <option value="" disabled>请选择</option>{options.map(([id, text]) =>
          <option key={id} value={id}>{text}</option>)}</select></Field>;
    return <form onChange={event => {
      if (event.target.name === 'titleType') {
        setModal({ ...modal, titleType: event.target.value });
      }
    }} onSubmit={event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      if (isOrder) {
        values.amountCent = Math.round(Number(values.amount) * 100);
        delete values.amount;
      }
      const type = isOrder ? 'saveOrder' : isTitle ? 'saveTitle' : 'saveProvider';
      const saved = commit(isInvoice ? { type: 'invoice', ids, value: values }
        : { type, value: { ...value, ...values } }, isInvoice ? '发票已记录，订单已关联' : '已保存');
      if (saved && isOrder && !value.id) navigate('orders');
    }}>
      <div className="form-grid">
        {isOrder && <>
          {field('orderNo', '订单编号', { required: true, maxLength: 100 })}
          {select('providerId', '提供商', data.providers.map(item => [item.id, item.name]),
            value.providerId)}
          <Field label="金额 / 元"><input type="number" name="amount" required min="0.01"
            step="0.01" defaultValue={value.amountCent ? value.amountCent / 100 : ''} /></Field>
          {select('paymentType', '支付方式', Object.entries(paymentLabels), value.paymentType)}
          <p className="form-note">开票时选择发票抬头，未开票订单不设置发票类型。</p>
        </>}
        {isInvoice && <>
          <div className="invoice-total"><span>本次开票 · {ids.length} 条订单</span>
            <strong>{money(data.orders.filter(item => ids.includes(item.id))
              .reduce((sum, item) => sum + item.amountCent, 0))}</strong></div>
          {field('invoiceNo', '发票编号', { required: true, maxLength: 100 })}
          <Field label="开票日期"><input type="date" name="invoiceDate" required
            max={today()} defaultValue={today()} /></Field>
          {select('invoiceTitleId', '发票抬头', data.titles.map(item =>
            [item.id, `${item.name} · ${typeLabels[item.titleType]}`]))}
          <p className="form-note">记录已有发票信息，金额自动合计。不会生成电子发票文件。</p>
        </>}
        {isTitle && <>
          {select('titleType', '抬头类型', Object.entries(typeLabels), value.titleType)}
          {field('name', '抬头名称', { required: true, maxLength: 150 })}
          {field('taxCode', (modal.titleType ?? value.titleType) === 'COMPANY'
            ? '税号（必填）' : '税号（选填）', {
            required: (modal.titleType ?? value.titleType) === 'COMPANY',
            pattern: '[a-zA-Z0-9]{15,20}',
            title: '填写时需为15至20位英文字母或数字', maxLength: 20
          })}
        </>}
        {entity === 'providers' && <>
          {field('name', '提供商名称', { required: true, maxLength: 50 })}
          {field('website', '提供商网址', { required: true, type: 'url',
            pattern: 'https?://.+', placeholder: 'https://example.com', maxLength: 500 })}
        </>}
      </div>
      <div className="modal-footer"><Button type="button" onClick={() => setModal(null)}>
        取消</Button><Button tone="primary" type="submit">{isInvoice ? '确认开票' : '保存'}</Button>
      </div>
    </form>;
  }

  function renderDetail() {
    const { entity, value: row } = modal;
    if (!row) return <Empty>记录不存在</Empty>;
    let fields = [];
    if (entity === 'orders') fields = [
      ['订单编号', copyLink(row.orderNo)], ['提供商', provider(row)?.name || '提供商已删除'],
      ['金额 / 元', money(row.amountCent)], ['支付方式', paymentLabels[row.paymentType]],
      ['发票状态', row.invoiceId ? '已开票' : '未开票'], ['发票类型', titleLink(invoice(row))],
      ['更新时间', stamp(row.updatedAt)], ['所在位置', row.deleted ? '回收站' : '正常订单']
    ];
    if (entity === 'invoices') fields = [
      ['发票编号', copyLink(row.invoiceNo)], ['总金额 / 元', money(row.totalAmountCent)],
      ['开票日期', row.invoiceDate], ['发票类型', titleLink(row)],
      ['抬头名称', title(row)?.name || '抬头已删除'],
      ['发票状态', row.status === 'VALID' ? '有效' : '作废'], ['更新时间', stamp(row.updatedAt)]
    ];
    if (entity === 'titles') fields = [['抬头类型', typeLabels[row.titleType]],
      ['抬头名称', row.name], ['税号', row.taxCode || '—']];
    return <>
      <dl className="details">{fields.map(([label, value]) => <div key={label}>
        <dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {entity === 'invoices' && <section className="linked-orders"><h3>关联订单</h3>
        {data.orders.filter(item => item.invoiceId === row.id).map(item =>
          <button key={item.id} className="linked-row" onClick={() => detail('orders', item)}>
            <span>{item.orderNo}</span><strong>{money(item.amountCent)}</strong><span>→</span>
          </button>)}
        {!data.orders.some(item => item.invoiceId === row.id) && <p className="muted">
          {row.status === 'INVALID' ? '发票已作废，订单关联已解除。' : '暂无关联订单'}</p>}
      </section>}
      <div className="modal-footer">
        {entity === 'orders' && <>
          {orderActions(row, false)}
          {row.invoiceId ? <Button tone="danger" onClick={() => voidInvoice(invoice(row))}>
            作废关联发票</Button> : <Button tone="primary" disabled={Boolean(row.deleted)}
            reason={row.deleted ? '请先恢复订单再开票' : ''}
            onClick={() => startInvoice([row.id])}>开票</Button>}
        </>}
        {entity === 'invoices' && row.status === 'VALID' && <Button tone="danger"
          onClick={() => voidInvoice(row)}>作废发票</Button>}
      </div>
    </>;
  }

  return <>
    <header className="topbar"><div className="brand"><span className="brand-icon">◈</span>
      <strong>Token</strong><span className="brand-caption">订单管理</span></div>
      <nav aria-label="主导航">{Object.entries(pages).map(([key, label]) =>
        <button key={key} className={page === key ? 'nav-link active' : 'nav-link'}
          aria-current={page === key ? 'page' : undefined} onClick={() => navigate(key)}>
          {label}</button>)}</nav>
      <button className="search-trigger" onClick={() => setModal({ kind: 'search' })}>
        <span>⌕</span> 搜索全部记录 <kbd>Ctrl K</kbd></button>
    </header>
    <main>
      <div className="page-heading"><div><div className="eyebrow">YOUR LOCAL WORKSPACE</div>
        <h1>{pages[page]}<span className="heading-dot">.</span></h1>
        <p>{page === 'orders' ? '每一笔投入，都清晰有据。' : page === 'invoices'
          ? '让发票与订单，井然相连。' : page === 'providers'
            ? '管理你的 Token 服务来源。' : '开票信息，一次整理，随时取用。'}</p>
      </div><div className="local-label"><span />本地交互原型 · 模拟数据</div></div>
      {page === 'orders' && <div className="stats">
        <div><span>订单总金额</span><strong>{money(total)}</strong><small>正常订单合计 / 元</small></div>
        <div><span>待开票金额</span><strong>{money(pending.reduce((sum, row) =>
          sum + row.amountCent, 0))}</strong><small>{pending.length} 笔订单等待开票</small></div>
        <div><span>有效发票</span><strong>{data.invoices.filter(row => row.status === 'VALID').length}
          <em> 张</em></strong><small>已关联采购订单</small></div>
      </div>}
      <section className="workspace">
        <div className="toolbar"><div className="toolbar-left">
          {page === 'orders' ? <div className="segmented">
            <button className={!trash ? 'selected' : ''} onClick={() => navigate('orders')}>
              全部订单 <span>{activeOrders.length}</span></button>
            <button className={trash ? 'selected' : ''} onClick={() => navigate('orders', true)}>
              回收站 <span>{data.orders.length - activeOrders.length}</span></button>
          </div> : <h2>{pages[page]}列表 <span className="count">{rows.length}</span></h2>}
        </div><div className="actions">
          {['orders', 'invoices'].includes(page) && <Button
            tone={filterCount ? 'tinted' : ''} onClick={() => setFilterOpen(!filterOpen)}>
            ☷ 筛选{filterCount ? ` · ${filterCount}` : ''}</Button>}
          {page !== 'invoices' && <Button tone="primary" onClick={() => edit(page)}>
            ＋ 添加{pages[page] === '发票抬头' ? '抬头' : pages[page]}</Button>}
        </div></div>
        {filterOpen && renderFilters()}
        {(page === 'orders' || page === 'providers' || page === 'titles') &&
          <div className={`selection-bar ${selected.length ? 'has-selection' : ''}`}>
            <span>{selected.length ? `已选择 ${selected.length} 项` : '选择记录以进行批量操作'}</span>
            <div className="actions">
              {page === 'orders' && !trash && <Button disabled={!selected.length || hasInvoiced}
                reason={hasInvoiced ? '选中订单包含已开票订单' : '选择未开票订单后合并开票'}
                onClick={() => startInvoice(selected)}>合并开票</Button>}
              {page === 'orders' && trash && <Button disabled={!selected.length}
                onClick={() => commit({ type: 'recoverOrders', ids: selected }, '订单已恢复')}>
                批量恢复</Button>}
              <Button tone="danger" disabled={!selected.length || (page === 'orders' && hasInvoiced)}
                reason={hasInvoiced ? '已开票订单不可删除' : '请先选择记录'} onClick={() => {
                  if (page === 'orders') removeOrders(selected);
                  else confirm({ type: page === 'providers' ? 'deleteProviders' : 'deleteTitles',
                    ids: selected }, '批量删除', `将永久删除 ${selected.length} 条记录，无法恢复。`);
                }}>{trash && page === 'orders' ? '批量永久删除' : '批量删除'}</Button>
              {selected.length > 0 && <button className="text-button"
                onClick={() => setSelected([])}>取消选择</button>}
            </div>
          </div>}
        {['orders', 'invoices'].includes(page) ? <DataTable rows={rows}
          columns={page === 'orders' ? orderColumns : invoiceColumns} selected={selected}
          setSelected={page === 'orders' ? setSelected : null} highlight={highlight} />
          : <div className="cards-scroll"><div className="card-grid">
            {rows.map((row, index) => <article key={row.id} id={`record-${row.id}`}
              className={`entity-card ${highlight === row.id ? 'highlight' : ''}`}>
              <div className="card-top"><div className={`entity-icon tint-${index % 4}`}>
                {page === 'providers' ? row.name.slice(0, 1).toUpperCase() : '▤'}</div>
                <Check checked={selected.includes(row.id)} label={`选择 ${row.name}`}
                  onChange={() => setSelected(selected.includes(row.id)
                    ? selected.filter(id => id !== row.id) : [...selected, row.id])} /></div>
              {page === 'titles' && <div className="card-type">{typeLabels[row.titleType]}</div>}
              <h3>{row.name}</h3><p className="card-description">{page === 'providers'
                ? row.website : `税号：${row.taxCode || '—'}`}</p>
              <div className="card-footer"><div className="actions">
                <button className="text-button" onClick={() => edit(page, row)}>修改</button>
                <button className="text-button danger" onClick={() => confirm({
                  type: page === 'providers' ? 'deleteProviders' : 'deleteTitles', ids: [row.id]
                }, `删除${pages[page]}`, `将永久删除“${row.name}”，此操作无法恢复。`)}>删除</button>
              </div>{page === 'providers' && <a className="visit" href={row.website}
                target="_blank" rel="noreferrer">访问网站 ↗</a>}</div>
            </article>)}
          </div>{!rows.length && <Empty />}</div>}
        <div className="list-footer"><span>共 {rows.length} 条记录 · 全部加载</span>
          <span>更改自动保存在此浏览器</span></div>
      </section>
      <footer className="app-footer"><span>Token Order Management</span>
        <button className="text-button" onClick={() => setModal({ kind: 'reset' })}>
          重置示例数据</button></footer>
    </main>
    {modal && <Modal key={modal.kind + (modal.entity || '')} close={() => setModal(null)}
      wide={modal.kind === 'search'} title={modal.kind === 'search' ? '搜索全部记录'
        : modal.kind === 'confirm' ? modal.heading : modal.kind === 'reset' ? '重置示例数据'
          : modal.kind === 'detail' ? `${pages[modal.entity]}详情`
            : modal.entity === 'invoice' ? '记录发票' : `${modal.value.id ? '修改' : '添加'}${pages[modal.entity]}`}>
      {toast && <p className="dialog-feedback" role="status">{toast}</p>}
      {modal.kind === 'form' && renderForm()}
      {modal.kind === 'detail' && renderDetail()}
      {modal.kind === 'confirm' && <><p className="confirm-copy">{modal.text}</p>
        <div className="modal-footer"><Button onClick={() => setModal(null)}>取消</Button>
          <Button tone="danger-solid" onClick={() => commit(modal.action, '操作已完成')}>
            确认{modal.heading}</Button></div></>}
      {modal.kind === 'reset' && <><p className="confirm-copy">清除当前原型更改并恢复示例数据？</p>
        <div className="modal-footer"><Button onClick={() => setModal(null)}>取消</Button>
          <Button tone="danger-solid" onClick={() => {
            setData(seedData()); navigate('orders'); setModal(null); notify('示例数据已重置');
          }}>确认重置</Button></div></>}
      {modal.kind === 'search' && <><input className="global-search" autoFocus value={query}
        placeholder="搜索订单编号、发票编号、提供商或发票抬头"
        aria-label="全局搜索" onChange={event => setQuery(event.target.value)} />
        <div className="search-results">{query.trim() ? <>
          <p className="search-count">找到 {searchAll(data, query).length} 条匹配记录</p>
          {searchAll(data, query).map(result => <button className="search-result"
            key={`${result.kind}-${result.id}`} onClick={() => {
              navigate(result.kind, Boolean(result.deleted)); setModal(null);
              setHighlight(result.id);
            }}><span className="result-icon">{pages[result.kind].slice(0, 1)}</span>
            <span><strong>{result.title}</strong><small>{result.subtitle}</small></span>
            <span className="result-location">{result.deleted ? '回收站' : pages[result.kind]} →</span>
          </button>)}
          {!searchAll(data, query).length && <Empty>没有匹配的记录</Empty>}
        </> : <div className="search-hint">输入关键词，搜索所有页面与回收站。<br />
          支持模糊匹配，英文不区分大小写。</div>}</div></>}
    </Modal>}
    <div className={`toast ${toast ? 'visible' : ''}`} role="status">{toast}</div>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
