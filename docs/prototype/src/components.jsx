import React, { useEffect, useRef } from 'react';

export function Button({ children, tone = '', reason, ...props }) {
  return <span title={reason} className="button-wrap">
    <button className={`button ${tone}`} {...props}>{children}</button>
  </span>;
}

export function Badge({ children, tone = '' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Modal({ title, children, close, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => previous?.focus();
  }, []);
  return <dialog ref={ref} className={wide ? 'modal wide' : 'modal'}
    onCancel={close} onClick={event => {
      if (event.target === ref.current) close();
    }}>
    <div className="modal-header">
      <h2>{title}</h2>
      <Button onClick={close} aria-label="关闭弹窗">×</Button>
    </div>
    {children}
  </dialog>;
}

export function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

export function Empty({ children = '暂无记录' }) {
  return <div className="empty"><span>◇</span><h3>{children}</h3>
    <p>试试调整筛选条件，或添加一条新记录。</p></div>;
}

export function Check({ checked, onChange, label, mixed = false }) {
  const ref = useRef(null);
  useEffect(() => { ref.current.indeterminate = mixed; }, [mixed]);
  return <input ref={ref} type="checkbox" checked={checked}
    onChange={onChange} aria-label={label} />;
}

export function DataTable({ columns, rows, selected, setSelected, highlight }) {
  const all = rows.length > 0 && rows.every(row => selected.includes(row.id));
  return <div className="table-scroll" tabIndex={0} aria-label="列表，可滚动">
    <table><thead><tr>
      {setSelected && <th className="check-cell"><Check checked={all}
        mixed={!all && selected.length > 0} label="全选当前结果"
        onChange={() => setSelected(all ? [] : rows.map(row => row.id))} /></th>}
      {columns.map(col => <th key={col.name}>{col.name}</th>)}
    </tr></thead><tbody>
      {rows.map(row => <tr key={row.id} id={`record-${row.id}`}
        className={highlight === row.id ? 'highlight' : ''}>
        {setSelected && <td className="check-cell"><Check
          checked={selected.includes(row.id)} label={`选择 ${row.orderNo || row.id}`}
          onChange={() => setSelected(selected.includes(row.id)
            ? selected.filter(id => id !== row.id) : [...selected, row.id])} /></td>}
        {columns.map(col => <td key={col.name}>{col.render(row)}</td>)}
      </tr>)}
    </tbody></table>
    {!rows.length && <Empty />}
  </div>;
}
