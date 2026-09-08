import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { DataSet, Entity, Order, Invoice, Provider, InvoiceTitle, Action } from './types';
import type { Column } from './components';
import { loadData, getDetail, getInvoiceOrders, executeAction } from './api';

import { money, paymentLabels, typeLabels, validateAction } from './domain';
import { searchAll } from './domain';
import { Button, Badge, Modal, Field, Empty, Check, DataTable, CopyButton, Card,
  Feedback } from './components';
import './styles.css';
import { BusinessForm } from './pages/BusinessForm';
import type { FormState } from './pages/BusinessForm';

const pages = { orders: '订单', invoices: '发票', providers: '提供商', titles: '发票抬头' };

const stamp = (value: string | null) => value?.replace('T', ' ').slice(0, 19) || '—';
type RecordValue = Order | Invoice | Provider | InvoiceTitle;
type DetailState = {
  kind: 'detail'; entity: Entity; id: string; value?: RecordValue;
  orders?: Order[]; loading: boolean; error?: string;
};
type ModalState = FormState | DetailState | { kind: 'search' }
  | { kind: 'confirm'; action: Action; heading: string; text: string };
const emptyData: DataSet = { orders: [], invoices: [], providers: [], titles: [] };
const isInvoiced = (row: Order) => row.invoiceStatus === 'INVOICED' || Boolean(row.invoiceId);
const errorText = (error: unknown) => error instanceof Error ? error.message : '请求失败，请重试';
function currentRoute(): { page: Entity; trash: boolean } {
  const key = window.location.hash.replace(/^#\//, '');
  return key === 'trash' ? { page: 'orders', trash: true }
    : { page: Object.hasOwn(pages, key) ? key as Entity : 'orders', trash: false };
}

export default function App() {
  const [data, setData] = useState<DataSet>(emptyData);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const detailRequest = useRef(0);
  const refreshRequest = useRef(0);
  const [page, setPage] = useState<Entity>(() => currentRoute().page);
  const [trash, setTrash] = useState(() => currentRoute().trash);
  const [selected, setSelected] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const provider = (order: Order) => data.providers.find(item => item.id === order.providerId);
  const invoice = (order: Order) => data.invoices.find(item => item.id === order.invoiceId);
  const title = (item: Invoice | undefined) =>
    data.titles.find(entry => entry.id === item?.invoiceTitleId);
  const notify = (message: string) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  };
  const refresh = async (saved = false) => {
    const request = ++refreshRequest.current;
    setLoading(true);
    setLoaded(false);
    setLoadError('');
    try {
      const records = await loadData();
      if (request !== refreshRequest.current) return;
      setData(records);
      setLoaded(true);
    } catch (error) {
      if (request !== refreshRequest.current) return;
      setLoadError(saved
        ? `操作已保存，但列表刷新失败：${errorText(error)}。请重试刷新，不要重复提交。`
        : `加载失败：${errorText(error)}`);
    } finally {
      if (request === refreshRequest.current) setLoading(false);
    }
  };
  useEffect(() => {
    const counters = { refresh: refreshRequest, detail: detailRequest };
    const request = ++counters.refresh.current;
    // 初次加载状态已由useState初始化，只在请求返回后更新页面。
    void loadData().then(records => {
      if (request !== counters.refresh.current) return;
      setData(records); setLoaded(true); setLoading(false);
    }).catch(error => {
      if (request !== counters.refresh.current) return;
      setLoadError(`加载失败：${errorText(error)}`); setLoading(false);
    });
    const invalidateRequests = () => {
      // 请求计数器并非DOM引用，卸载时递增使所有在途响应失效。
      counters.refresh.current++;
      counters.detail.current++;
    };
    const changeRoute = () => {
      const route = currentRoute();
      setPage(route.page); setTrash(route.trash); setSelected([]); setFilters({});
      setFilterOpen(false); setHighlight(null);
      if (!submitting.current) { detailRequest.current++; setModal(null); }
    };
    window.addEventListener('hashchange', changeRoute);
    window.addEventListener('popstate', changeRoute);
    return () => {
      invalidateRequests();
      clearTimeout(toastTimer.current);
      window.removeEventListener('hashchange', changeRoute);
      window.removeEventListener('popstate', changeRoute);
    };
  }, []);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (!submitting.current) { detailRequest.current++; setModal({ kind: 'search' }); }
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, []);
  useEffect(() => {
    if (!highlight) return;
    document.getElementById(`record-${highlight}`)?.scrollIntoView?.({ block: 'center' });
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlight(null), 1000);
    return () => clearTimeout(highlightTimer.current);
  }, [highlight, page, trash]);

  const navigate = (next: Entity, deleted = false) => {
    const hash = `#/${deleted && next === 'orders' ? 'trash' : next}`;
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
    setPage(next); setTrash(deleted); setSelected([]); setFilters({});
    setFilterOpen(false); setHighlight(null);
  };
  const commit = async (action: Action, message: string): Promise<boolean> => {
    if (submitting.current || !loaded) return false;
    submitting.current = true;
    setBusy(true);
    try {
      validateAction(data, action);
      await executeAction(action);
      detailRequest.current++;
      setSelected([]); setModal(null); notify(message);
      await refresh(true);
      return true;
    } catch (error) { notify(errorText(error)); return false; }
    finally { submitting.current = false; setBusy(false); }
  };
  const copyLink = (value: string) => <CopyButton value={value} notify={notify} />;
  const detail = async (entity: Entity, record: { id: string } | undefined) => {
    if (!record || busy) { if (!record) notify('关联记录不存在，请刷新列表'); return; }
    const request = ++detailRequest.current;
    setModal({ kind: 'detail', entity, id: record.id, loading: true });
    try {
      const [value, orders] = await Promise.all([
        getDetail(entity, record.id),
        entity === 'invoices' ? getInvoiceOrders(record.id) : Promise.resolve(undefined),
      ]);
      if (!value) throw new Error('记录不存在');
      if (request === detailRequest.current) {
        setModal({ kind: 'detail', entity, id: record.id, value, orders, loading: false });
      }
    } catch (error) {
      if (request === detailRequest.current) setModal({ kind: 'detail', entity,
        id: record.id, error: errorText(error), loading: false });
    }
  };
  const closeModal = () => { if (!busy) { detailRequest.current++; setModal(null); } };
  const edit = (entity: FormState['entity'], value: FormState['value'] = {}) => {
    if (submitting.current) return;
    detailRequest.current++; setModal({ kind: 'form', entity, value });
  };
  const startInvoice = (ids: string[]) => {
    if (submitting.current) return;
    detailRequest.current++; setModal({ kind: 'form', entity: 'invoice', ids, value: {} });
  };
  const confirm = (action: Action, heading: string, text: string) => {
    if (submitting.current) return;
    detailRequest.current++; setModal({ kind: 'confirm', action, heading, text });
  };
  const removeOrders = (ids: string[]) => {
    const inTrash = data.orders.filter(row => ids.includes(row.id))
      .every(row => row.deleted);
    confirm({ type: inTrash ? 'deleteOrders' : 'trashOrders', ids },
      inTrash ? '永久删除订单' : '移入回收站', inTrash
        ? `将永久删除 ${ids.length} 条订单，此操作无法恢复。`
        : `将 ${ids.length} 条订单移入回收站，之后可以恢复。`);
  };
  const voidInvoice = (item: Invoice | undefined) => {
    if (!item) { notify('关联发票不存在，请刷新列表'); return; }
    confirm({ type: 'voidInvoice', id: item.id }, '作废发票',
      `作废 ${item.invoiceNo} 后，全部关联订单将恢复未开票状态，可重新开票。`);
  };
  const titleLink = (inv: Invoice | undefined) => {
    if (!inv) return <span className="muted">—</span>;
    return <button className="text-button" disabled={busy}
      onClick={() => detail('titles', { id: inv.invoiceTitleId })}>
      {typeLabels[inv.invoiceType]} <span className="muted">↗</span></button>;
  };

  const dateMatches = (row: Order | Invoice) => {
    const date = row.updatedAt?.slice(0, 10);
    if (filters.from && (!date || date < filters.from)) return false;
    if (filters.to && (!date || date > filters.to)) return false;
    return true;
  };
  const byUpdatedAt = (a: Order | Invoice, b: Order | Invoice) =>
    (b.updatedAt || '').localeCompare(a.updatedAt || '');
  const orderRows = data.orders.filter(row => Boolean(row.deleted) === trash
    && dateMatches(row)
    && (!filters.provider || row.providerId === filters.provider)
    && (!filters.payment || row.paymentType === filters.payment)
    && (!filters.type || row.invoiceType === filters.type)
    && (!filters.status || row.invoiceStatus === filters.status))
    .sort(byUpdatedAt);
  const invoiceRows = data.invoices.filter(row => dateMatches(row)
    && (!filters.type || row.invoiceType === filters.type)
    && (!filters.status || row.status === filters.status))
    .sort(byUpdatedAt);
  const rows = page === 'orders' ? orderRows : page === 'invoices' ? invoiceRows : data[page];
  const chosen = data.orders.filter(row => selected.includes(row.id));
  const hasInvoiced = chosen.some(isInvoiced);
  const activeOrders = data.orders.filter(row => !row.deleted);
  const total = activeOrders.reduce((sum, row) => sum + row.amountCent, 0);
  const pending = activeOrders.filter(row => !isInvoiced(row));
  const filterCount = Object.values(filters).filter(Boolean).length;

  const orderActions = (row: Order, showDetail = true) => <div className="actions">
    {showDetail && <button className="text-button" disabled={busy}
      onClick={() => detail('orders', row)}>详情</button>}
    {!row.deleted && <button className="text-button" disabled={busy || isInvoiced(row)}
      title={isInvoiced(row) ? '已开票订单不可修改' : '修改订单'}
      onClick={() => edit('orders', row)}>修改</button>}
    {Boolean(row.deleted) && <button className="text-button" disabled={busy}
      onClick={() => commit({ type: 'recoverOrders', ids: [row.id] }, '订单已恢复')}>恢复</button>}
    <button className="text-button danger" disabled={busy || isInvoiced(row)}
      title={isInvoiced(row) ? '已开票订单不可删除' : ''}
      onClick={() => removeOrders([row.id])}>{row.deleted ? '永久删除' : '删除'}</button>
  </div>;
  const orderColumns: Column<Order>[] = [
    { name: '订单编号', render: row => copyLink(row.orderNo) },
    { name: '提供商', render: row => row.providerName || provider(row)?.name || '提供商已删除' },
    { name: '金额 / 元', render: row => <strong className="amount">{money(row.amountCent)}</strong> },
    { name: '支付方式', render: row => paymentLabels[row.paymentType] },
    { name: '发票状态', render: row => <button className="status-button"
      disabled={!isInvoiced(row) && Boolean(row.deleted)}
      title={row.deleted && !isInvoiced(row) ? '请先恢复订单再开票' : '查看或记录发票'}
      onClick={() => isInvoiced(row) ? detail('invoices', invoice(row)) : startInvoice([row.id])}>
      <Badge tone={isInvoiced(row) ? 'green' : 'amber'}>
        {isInvoiced(row) ? '已开票' : '未开票'}<span> ↗</span>
      </Badge></button> },
    { name: '发票类型', render: row => titleLink(invoice(row)) },
    { name: '操作', render: orderActions }
  ];
  const invoiceColumns: Column<Invoice>[] = [
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
    const select = (key: string, label: string, options: Record<string, string>) => <Field label={label}>
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

  function renderDetail() {
    if (modal?.kind !== 'detail') return null;
    const { entity, value, orders = [] } = modal;
    if (modal.loading) return <Feedback>正在加载详情…</Feedback>;
    if (modal.error) return <Feedback error>
      <p>详情加载失败：{modal.error}</p><Button onClick={() => detail(entity, { id: modal.id })}>
        重试</Button></Feedback>;
    if (!value) return <Empty>记录不存在</Empty>;
    const order = entity === 'orders' ? value as Order : null;
    const inv = entity === 'invoices' ? value as Invoice : null;
    let fields: [string, ReactNode][] = [];
    if (order) fields = [
      ['订单编号', copyLink(order.orderNo)],
      ['提供商', order.providerName || provider(order)?.name || '提供商已删除'],
      ['金额 / 元', money(order.amountCent)], ['支付方式', paymentLabels[order.paymentType]],
      ['发票状态', isInvoiced(order) ? '已开票' : '未开票'],
      ['发票类型', titleLink(invoice(order))], ['更新时间', stamp(order.updatedAt)],
      ['所在位置', order.deleted ? '回收站' : '正常订单'],
    ];
    if (inv) fields = [
      ['发票编号', copyLink(inv.invoiceNo)], ['总金额 / 元', money(inv.totalAmountCent)],
      ['开票日期', inv.invoiceDate], ['发票类型', titleLink(inv)],
      ['抬头名称', inv.invoiceTitleName || title(inv)?.name || '抬头已删除'],
      ['发票状态', inv.status === 'VALID' ? '有效' : '作废'], ['更新时间', stamp(inv.updatedAt)],
    ];
    if (entity === 'titles') {
      const row = value as InvoiceTitle;
      fields = [['抬头类型', typeLabels[row.titleType]],
        ['抬头名称', row.name], ['税号', row.taxCode || '—']];
    }
    return <>
      <dl className="details">{fields.map(([label, value]) => <div key={label}>
        <dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {inv && <section className="linked-orders"><h3>关联订单</h3>
        {orders.map(item =>
          <button key={item.id} className="linked-row" onClick={() => detail('orders', item)}>
            <span>{item.orderNo}</span><strong>{money(item.amountCent)}</strong><span>→</span>
          </button>)}
        {!orders.length && <p className="muted">
          {inv.status === 'INVALID' ? '发票已作废，订单关联已解除。' : '暂无关联订单'}</p>}
      </section>}
      <div className="modal-footer">
        {order && <>
          {orderActions(order, false)}
          {isInvoiced(order) ? <Button tone="danger" disabled={busy}
            onClick={() => voidInvoice(invoice(order))}>
            作废关联发票</Button> : <Button tone="primary" disabled={busy || Boolean(order.deleted)}
            reason={order.deleted ? '请先恢复订单再开票' : ''}
            onClick={() => startInvoice([order.id])}>开票</Button>}
        </>}
        {inv?.status === 'VALID' && <Button tone="danger" disabled={busy}
          onClick={() => voidInvoice(inv)}>作废发票</Button>}
      </div>
    </>;
  }

  return <>
    <header className="topbar"><div className="brand"><span className="brand-icon">◈</span>
      <strong>Token</strong><span className="brand-caption">订单管理</span></div>
      <nav aria-label="主导航">{Object.entries(pages).map(([key, label]) =>
        <button key={key} className={page === key ? 'nav-link active' : 'nav-link'}
          disabled={busy} aria-current={page === key ? 'page' : undefined}
          onClick={() => navigate(key as Entity)}>
          {label}</button>)}</nav>
      <button className="search-trigger" disabled={busy}
        onClick={() => { detailRequest.current++; setModal({ kind: 'search' }); }}>
        <span>⌕</span> 搜索全部记录 <kbd>Ctrl K</kbd></button>
    </header>
    <main>
      <div className="page-heading"><div><div className="eyebrow">YOUR LOCAL WORKSPACE</div>
        <h1>{pages[page]}<span className="heading-dot">.</span></h1>
        <p>{page === 'orders' ? '每一笔投入，都清晰有据。' : page === 'invoices'
          ? '让发票与订单，井然相连。' : page === 'providers'
            ? '管理你的 Token 服务来源。' : '开票信息，一次整理，随时取用。'}</p>
      </div><div className="local-label"><span />本地订单工作空间</div></div>
      {!loaded ? <section className="workspace loading-state" aria-busy={loading}>
        {loading ? <p role="status">正在加载全部记录…</p> : <>
          <p role="alert">{loadError}</p><Button onClick={() => refresh()}>重试刷新</Button>
        </>}
      </section> : <>
      {page === 'orders' && <div className="stats">
        <div><span>订单总金额</span><strong>{money(total)}</strong><small>正常订单合计 / 元</small></div>
        <div><span>待开票金额</span><strong>{money(pending.reduce((sum, row) =>
          sum + row.amountCent, 0))}</strong><small>{pending.length} 笔订单等待开票</small></div>
        <div><span>有效发票</span><strong>{data.invoices.filter(row => row.status === 'VALID').length}
          <em> 张</em></strong><small>已关联采购订单</small></div>
      </div>}
      <section className="workspace">
        <fieldset disabled={busy} className="workspace-controls">
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
        {page === 'orders' ? <DataTable rows={orderRows}
          columns={orderColumns} selected={selected} disabled={busy}
          setSelected={setSelected} highlight={highlight} />
          : page === 'invoices' ? <DataTable rows={invoiceRows}
            columns={invoiceColumns} highlight={highlight} disabled={busy} />
          : <div className="cards-scroll"><div className="card-grid">
            {data[page].map((row, index) => <Card key={row.id} id={row.id}
              highlighted={highlight === row.id}>
              <div className="card-top"><div className={`entity-icon tint-${index % 4}`}>
                {page === 'providers' ? row.name.slice(0, 1).toUpperCase() : '▤'}</div>
                <Check checked={selected.includes(row.id)} label={`选择 ${row.name}`}
                  onChange={() => setSelected(selected.includes(row.id)
                    ? selected.filter(id => id !== row.id) : [...selected, row.id])} /></div>
              {'titleType' in row && <div className="card-type">{typeLabels[row.titleType]}</div>}
              <h3>{row.name}</h3><p className="card-description">{page === 'providers'
                && 'website' in row ? row.website : `税号：${'taxCode' in row ? row.taxCode || '—' : '—'}`}</p>
              <div className="card-footer"><div className="actions">
                <button className="text-button" onClick={() => edit(page, row)}>修改</button>
                <button className="text-button danger" onClick={() => confirm({
                  type: page === 'providers' ? 'deleteProviders' : 'deleteTitles', ids: [row.id]
                }, `删除${pages[page]}`, `将永久删除“${row.name}”，此操作无法恢复。`)}>删除</button>
              </div>{'titleType' in row && <CopyButton label="复制抬头" subject="抬头"
                value={`名称：${row.name}\n税号：${row.taxCode || ''}`} notify={notify} />}
              {'website' in row && /^https?:\/\//i.test(row.website)
                && <a className="visit" href={row.website}
                  target="_blank" rel="noreferrer">访问网站 ↗</a>}</div>
            </Card>)}
          </div>{!rows.length && <Empty />}</div>}
        <div className="list-footer"><span>共 {rows.length} 条记录 · 全部加载</span>
          <span>数据来自本地后端</span></div>
        </fieldset>
      </section>
      </>}
      <footer className="app-footer"><span>Token Order Management</span>
        <button className="text-button" disabled={loading || busy}
          onClick={() => { closeModal(); setSelected([]); void refresh(); }}>
          刷新数据</button></footer>
    </main>
    {modal && <Modal key={modal.kind + ('entity' in modal ? modal.entity : '')
      + (modal.kind === 'form' ? modal.value.id || 'new' : '')} close={closeModal} busy={busy}
      wide={modal.kind === 'search'} title={modal.kind === 'search' ? '搜索全部记录'
        : modal.kind === 'confirm' ? modal.heading
          : modal.kind === 'detail' ? `${pages[modal.entity]}详情`
            : modal.entity === 'invoice' ? '记录发票' : `${modal.value.id ? '修改' : '添加'}${pages[modal.entity]}`}>
      {toast && <p className="dialog-feedback" role="status">{toast}</p>}
      {modal.kind === 'form' && <BusinessForm form={modal} data={data} busy={busy}
        close={closeModal} commit={commit} notify={notify} createdOrder={() => navigate('orders')} />}
      {modal.kind === 'detail' && renderDetail()}
      {modal.kind === 'confirm' && <><p className="confirm-copy">{modal.text}</p>
        <div className="modal-footer"><Button onClick={closeModal} disabled={busy}>取消</Button>
          <Button tone="danger-solid" disabled={busy}
            onClick={() => commit(modal.action, '操作已完成')}>
            {busy ? '正在提交…' : `确认${modal.heading}`}</Button></div></>}
      {modal.kind === 'search' && <><input className="global-search" autoFocus value={query}
        placeholder="搜索订单编号、发票编号、提供商或发票抬头"
        aria-label="全局搜索" onChange={event => setQuery(event.target.value)} />
        <div className="search-results">{!loaded ? <div className="dialog-feedback">
          <p role={loading ? 'status' : 'alert'}>{loading
            ? '正在加载全部记录，完成后即可搜索。' : loadError}</p>
          {!loading && <Button onClick={() => refresh()}>重试刷新</Button>}
        </div> : query.trim() ? <>
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
