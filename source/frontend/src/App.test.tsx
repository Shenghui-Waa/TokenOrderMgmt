// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { executeAction, getDetail, getInvoiceOrders, loadData } from './api'
import { fixtureData } from './test-fixtures'

vi.mock('./api', () => ({
  loadData: vi.fn(), getDetail: vi.fn(), getInvoiceOrders: vi.fn(), executeAction: vi.fn(),
}))

const load = vi.mocked(loadData)
const execute = vi.mocked(executeAction)
const writeText = vi.fn<(text: string) => Promise<void>>()

beforeEach(() => {
  vi.resetAllMocks()
  writeText.mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true, value: { writeText },
  })
  window.history.replaceState(null, '', '#/orders')
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true, value() { this.setAttribute('open', '') },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true, value() { this.removeAttribute('open') },
  })
  Element.prototype.scrollIntoView = vi.fn()
  load.mockResolvedValue(fixtureData())
  execute.mockResolvedValue(undefined)
  vi.mocked(getDetail).mockImplementation(async (entity, id) => {
    const record = fixtureData()[entity].find(item => item.id === id)
    if (!record) throw new Error('记录不存在')
    return record
  })
  vi.mocked(getInvoiceOrders).mockResolvedValue([fixtureData().orders[1]])
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

async function start() {
  render(<App />)
  await screen.findByRole('button', { name: 'ORDER-OPEN' })
}

function go(name: string) {
  fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name }))
}

async function providerForm() {
  await start()
  go('提供商')
  fireEvent.click(screen.getByRole('button', { name: /添加提供商/ }))
  fireEvent.change(screen.getByLabelText('提供商名称'), { target: { value: '新服务商' } })
  fireEvent.change(screen.getByLabelText('提供商网址'), {
    target: { value: 'https://new.example.com' },
  })
  return screen.getByRole('button', { name: '保存' })
}

describe('正式前端用户交互', () => {
  it('企业抬头卡片复制名称和税号两行完整文本', async () => {
    await start()
    go('发票抬头')
    fireEvent.click(screen.getByRole('button', { name: '复制抬头' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledExactlyOnceWith(
      '名称：测试企业\n税号：91310000123456789X',
    ))
  })

  it('个人抬头无税号时复制文本保留空税号行', async () => {
    const records = fixtureData()
    records.titles = [{ id: 'personal', name: '张三', titleType: 'PERSONAL', taxCode: null }]
    load.mockResolvedValue(records)
    await start()
    go('发票抬头')
    fireEvent.click(screen.getByRole('button', { name: '复制抬头' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledExactlyOnceWith('名称：张三\n税号：'))
  })

  it('提供商卡片不显示复制抬头操作', async () => {
    await start()
    go('提供商')
    expect(screen.getByRole('heading', { name: 'Acme Tokens' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '复制抬头' })).toBeNull()
    expect(writeText).not.toHaveBeenCalled()
  })

  it('完整列表加载失败不误报为空，重试恢复记录', async () => {
    load.mockRejectedValueOnce(new Error('提供商列表读取失败'))
    render(<App />)
    await screen.findByText(/提供商列表读取失败/)
    expect(screen.queryByText('暂无记录')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /重试/ }))
    await screen.findByRole('button', { name: 'ORDER-OPEN' })
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('提交期间重复点击只写入一次', async () => {
    let resolve!: () => void
    execute.mockReturnValueOnce(new Promise<void>(done => { resolve = done }))
    const save = await providerForm()
    fireEvent.click(save)
    fireEvent.click(save)
    expect(execute).toHaveBeenCalledTimes(1)
    await act(async () => { resolve() })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('写入失败保留填写内容，允许修正重试', async () => {
    execute.mockRejectedValueOnce(new Error('名称已存在'))
    const save = await providerForm()
    fireEvent.click(save)
    await screen.findAllByText('名称已存在')
    expect((screen.getByLabelText('提供商名称') as HTMLInputElement).value).toBe('新服务商')
    fireEvent.change(screen.getByLabelText('提供商名称'), { target: { value: '新名称' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(2))
    expect(execute.mock.calls[1][0]).toMatchObject({
      type: 'saveProvider', value: { name: '新名称' },
    })
  })

  it('企业税号必填，切回个人后允许留空', async () => {
    await start()
    go('发票抬头')
    fireEvent.click(screen.getByRole('button', { name: /添加抬头/ }))
    fireEvent.change(screen.getByLabelText('抬头类型'), { target: { value: 'COMPANY' } })
    fireEvent.change(screen.getByLabelText('抬头名称'), { target: { value: '新增企业' } })
    const tax = screen.getByLabelText(/税号/) as HTMLInputElement
    expect(tax.required).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(execute).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('抬头类型'), { target: { value: 'PERSONAL' } })
    expect((screen.getByLabelText(/税号/) as HTMLInputElement).required).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1))
  })

  it('添加订单把元金额转换为精确整数分', async () => {
    await start()
    fireEvent.click(screen.getByRole('button', { name: /添加订单/ }))
    fireEvent.change(screen.getByLabelText('订单编号'), { target: { value: 'ORDER-NEW' } })
    fireEvent.change(screen.getByLabelText('提供商'), { target: { value: 'p1' } })
    fireEvent.change(screen.getByLabelText('金额 / 元'), { target: { value: '1.15' } })
    fireEvent.change(screen.getByLabelText('支付方式'), { target: { value: 'ALIPAY' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1))
    expect(execute).toHaveBeenCalledWith({ type: 'saveOrder', value: {
      id: undefined, orderNo: 'ORDER-NEW', amountCent: 115,
      paymentType: 'ALIPAY', providerId: 'p1',
    } })
  })

  it('选中已开票订单禁止合并开票和批量删除', async () => {
    await start()
    fireEvent.click(screen.getByLabelText('选择 ORDER-OPEN'))
    expect((screen.getByRole('button', { name: '合并开票' }) as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(screen.getByLabelText('选择 ORDER-INVOICED'))
    expect((screen.getByRole('button', { name: '合并开票' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '批量删除' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('写入成功但刷新失败时关闭表单，只重新读取而不重复写入', async () => {
    const save = await providerForm()
    load.mockRejectedValueOnce(new Error('暂时无法读取列表'))
    fireEvent.click(save)
    await screen.findByText(/操作已保存，但列表刷新失败/)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(execute).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: /重试/ }))
    await screen.findByText('Acme Tokens')
    expect(execute).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledTimes(3)
  })

  it('作废发票后重新加载订单，恢复未开票交互', async () => {
    await start()
    go('发票')
    fireEvent.click(screen.getByRole('button', { name: '作废' }))
    const updated = fixtureData()
    updated.invoices[0].status = 'INVALID'
    updated.orders[1].invoiceId = null
    updated.orders[1].invoiceStatus = 'UNINVOICED'
    updated.orders[1].invoiceType = null
    load.mockResolvedValue(updated)
    fireEvent.click(screen.getByRole('button', { name: '确认作废发票' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(execute).toHaveBeenCalledWith({ type: 'voidInvoice', id: 'i1' })
    go('订单')
    const row = screen.getByRole('button', { name: 'ORDER-INVOICED' }).closest('tr')!
    expect(within(row).getByRole('button', { name: /未开票/ })).toBeTruthy()
    expect((within(row).getByRole('button', { name: '修改' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('发票详情从关联订单接口读取数据', async () => {
    await start()
    go('发票')
    fireEvent.click(screen.getByRole('button', { name: '详情' }))
    await waitFor(() => expect(getInvoiceOrders).toHaveBeenCalledWith('i1'))
    await within(screen.getByRole('dialog')).findByText('ORDER-INVOICED')
  })

  it('日期筛选包含结束日期全天，搜索跳转清除筛选并高亮一秒', async () => {
    await start()
    fireEvent.click(screen.getByRole('button', { name: /筛选/ }))
    fireEvent.change(screen.getByLabelText('更新起始日期'), { target: { value: '2026-09-08' } })
    fireEvent.change(screen.getByLabelText('更新结束日期'), { target: { value: '2026-09-08' } })
    expect(screen.getByRole('button', { name: 'ORDER-OPEN' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'ORDER-INVOICED' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /搜索全部记录/ }))
    fireEvent.change(screen.getByLabelText('全局搜索'), { target: { value: 'order-invoiced' } })
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: /ORDER-INVOICED.*→/ }))
    const target = document.getElementById('record-o2')!
    expect(target.classList.contains('highlight')).toBe(true)
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(999) })
    expect(target.classList.contains('highlight')).toBe(true)
    act(() => { vi.advanceTimersByTime(1) })
    expect(target.classList.contains('highlight')).toBe(false)
  })

  it('Hash变化响应浏览器导航，支持回收站地址', async () => {
    await start()
    go('提供商')
    expect(window.location.hash).toContain('providers')
    await act(async () => {
      window.location.hash = '#/trash'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    await screen.findByRole('button', { name: 'ORDER-TRASH' })
    expect(screen.queryByRole('button', { name: 'ORDER-OPEN' })).toBeNull()
    await act(async () => {
      window.location.hash = '#/invoices'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    await screen.findByRole('button', { name: 'INV-TEST' })
  })

  it('浏览器后退前进恢复相应页面', async () => {
    await start()
    go('提供商')
    go('发票抬头')
    act(() => { window.history.back() })
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent)
      .toContain('提供商'))
    act(() => { window.history.forward() })
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent)
      .toContain('发票抬头'))
  })
})
