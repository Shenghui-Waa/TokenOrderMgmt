import { useEffect, useId, useRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: string;
  reason?: string;
}

export function Button({ children, tone = '', reason, type = 'button', ...props }: ButtonProps) {
  return <span title={reason} className="button-wrap">
    <button className={`button ${tone}`} type={type} {...props}>{children}</button>
  </span>;
}

export function Badge({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

interface CopyProps {
  value: string;
  notify: (message: string) => void;
  label?: string;
  subject?: string;
}

export function CopyButton({ value, notify, label, subject = '编号' }: CopyProps) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      notify(`${subject}已复制`);
    } catch {
      const previous = document.activeElement;
      const input = document.createElement('textarea');
      input.className = 'clipboard-helper';
      input.value = value;
      // 留在当前模态弹窗内，避免原生dialog的焦点约束阻止复制回退。
      const parent = document.querySelector('dialog[open]') || document.body;
      parent.append(input);
      input.select();
      let copied = false;
      try { copied = document.execCommand('copy'); }
      catch { copied = false; }
      finally {
        input.remove();
        if (previous instanceof HTMLElement) previous.focus();
      }
      notify(copied ? `${subject}已复制` : `复制失败，请选择${subject}手动复制`);
    }
  }
  return <button className={label ? 'text-button' : 'copy'} type="button"
    title={`点击复制${subject}`} onClick={copy}>
    {label || value}{!label && <span aria-hidden="true">⧉</span>}
  </button>;
}

export function Feedback({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div className={`dialog-feedback ${error ? 'feedback-error' : ''}`}
    role={error ? 'alert' : 'status'}>{children}</div>;
}

export function Card({ id, highlighted, children }: {
  id: string;
  highlighted?: boolean;
  children: ReactNode;
}) {
  return <article id={`record-${id}`}
    className={`entity-card ${highlighted ? 'highlight' : ''}`}>{children}</article>;
}

interface ModalProps {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
  busy?: boolean;
}

export function Modal({ title, children, close, wide = false, busy = false }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return <dialog ref={ref} className={wide ? 'modal wide' : 'modal'}
    aria-labelledby={headingId} aria-busy={busy}
    onCancel={event => {
      event.preventDefault();
      if (!busy) close();
    }} onClick={event => {
      if (event.target === ref.current && !busy) close();
    }}>
    <div className="modal-header">
      <h2 id={headingId}>{title}</h2>
      <Button onClick={close} disabled={busy} aria-label="关闭弹窗">×</Button>
    </div>
    {children}
  </dialog>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

export function Empty({ children = '暂无记录' }: { children?: ReactNode }) {
  return <div className="empty"><span aria-hidden="true">◇</span><h3>{children}</h3>
    <p>试试调整筛选条件，或添加一条新记录。</p></div>;
}

interface CheckProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  mixed?: boolean;
  disabled?: boolean;
}

export function Check({ checked, onChange, label, mixed = false, disabled }: CheckProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = mixed;
  }, [mixed]);
  return <input ref={ref} type="checkbox" checked={checked} disabled={disabled}
    onChange={onChange} aria-label={label} />;
}

export interface Column<T> {
  name: string;
  render: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  selected?: string[];
  setSelected?: ((ids: string[]) => void) | null;
  highlight?: string | null;
  disabled?: boolean;
}

export function DataTable<T extends { id: string; orderNo?: string }>({
  columns, rows, selected = [], setSelected, highlight, disabled = false
}: TableProps<T>) {
  const all = rows.length > 0 && rows.every(row => selected.includes(row.id));
  return <div className="table-scroll" tabIndex={0} aria-label="列表，可滚动">
    <table><thead><tr>
      {setSelected && <th scope="col" className="check-cell"><Check checked={all}
        mixed={!all && rows.some(row => selected.includes(row.id))} label="全选当前结果"
        disabled={disabled}
        onChange={() => setSelected(all ? [] : rows.map(row => row.id))} /></th>}
      {columns.map(col => <th scope="col" key={col.name}>{col.name}</th>)}
    </tr></thead><tbody>
      {rows.map(row => <tr key={row.id} id={`record-${row.id}`}
        className={highlight === row.id ? 'highlight' : ''}>
        {setSelected && <td className="check-cell"><Check disabled={disabled}
          checked={selected.includes(row.id)} label={`选择 ${row.orderNo || row.id}`}
          onChange={() => setSelected(selected.includes(row.id)
            ? selected.filter(id => id !== row.id) : [...selected, row.id])} /></td>}
        {columns.map(col => <td key={col.name}>{col.render(row)}</td>)}
      </tr>)}
    </tbody></table>
    {!rows.length && <Empty />}
  </div>;
}
