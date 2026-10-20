# TokenOrderMgmt Desktop

Windows 桌面应用使用 Go 1.25、Wails v2、系统 WebView2 与 SQLite。Go Service 已实现现有 Java 后端的数据库结构与核心业务规则，React 通过强类型 Wails Bindings 调用。

## 安全边界

- WebView 只暴露明确列出的业务方法。
- `OpenExternalURL` 仅接受带主机名的绝对 `http` 或 `https` 地址，并使用系统浏览器打开。
- 不提供任意文件、命令、注册表或 Shell 调用。
- 主窗口禁用缩放手势；生产资源全部嵌入 EXE。

## 数据目录

应用始终使用 EXE 同级目录：

```text
TokenOrderMgmt.exe
data/
  token-order-mgmt.db
```

目录不存在时自动创建。请将 ZIP 解压到用户有写权限的目录，不要放入 `Program Files`。

## 数据与业务兼容

- 数据库结构直接复刻 Java 版四张表，不使用 ORM 自动迁移。
- 金额以十进制字符串传入 Go，并精确转换为整数分，禁止经过 `float64`。
- 发票创建、作废、订单逻辑删除与外键限制均由 Service 和显式事务实现。

## 构建

要求：Go 1.25、Node.js、npm、Wails v2 CLI、WebView2 Runtime、PowerShell 7。

```powershell
pwsh -File scripts/Sync-Frontend.ps1 -Install
wails build -platform windows/amd64 -clean
```

生成 ZIP：

```powershell
pwsh -File scripts/Build-Release.ps1 -Version 0.1.0
```

脚本从 `../frontend` 同步共享页面、组件和样式到本目录 `frontend`，同时保留桌面专用 Wails API 适配文件。发布脚本先构建 React、复制嵌入资源，再让 Wails 跳过内部前端生命周期编译单体 EXE。共享 React 工程不会被修改。

正式发布前必须配置 Windows 代码签名；当前脚本不会伪造或跳过签名状态。
