import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CopyButton, DataTable, Modal } from './components';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => cleanup());

describe('公共组件', () => {
  it('复制按钮反馈成功和受限剪贴板的回退失败', async () => {
    const notify = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true, value: { writeText },
    });
    render(<CopyButton value="ORDER-123" notify={notify} />);
    fireEvent.click(screen.getByRole('button', { name: 'ORDER-123' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('编号已复制'));
    expect(writeText).toHaveBeenCalledWith('ORDER-123');
    writeText.mockRejectedValue(new Error('denied'));
    Object.defineProperty(document, 'execCommand', {
      configurable: true, value: vi.fn(() => false),
    });
    fireEvent.click(screen.getByRole('button', { name: 'ORDER-123' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('复制失败，请选择编号手动复制'));
    expect(document.querySelector('.clipboard-helper')).toBeNull();
  });

  it('StrictMode弹窗正确重入且提交期间禁止Escape与关闭', () => {
    const close = vi.fn();
    const view = render(<StrictMode><Modal title="测试弹窗" close={close} busy>
      内容
    </Modal></StrictMode>);
    const dialog = screen.getByRole('dialog', { name: '测试弹窗' });
    expect((dialog as HTMLDialogElement).open).toBe(true);
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
    fireEvent.click(screen.getByRole('button', { name: '关闭弹窗' }));
    expect(close).not.toHaveBeenCalled();
    view.rerender(<Modal title="测试弹窗" close={close}>内容</Modal>);
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('表格全选只选择当前结果并支持半选状态', () => {
    const change = vi.fn();
    render(<DataTable rows={[{ id: 'one' }, { id: 'two' }]}
      columns={[{ name: '编号', render: row => row.id }]}
      selected={['one']} setSelected={change} />);
    const all = screen.getByRole('checkbox', { name: '全选当前结果' }) as HTMLInputElement;
    expect(all.indeterminate).toBe(true);
    fireEvent.click(all);
    expect(change).toHaveBeenCalledWith(['one', 'two']);
  });
});
