# TokenOrderMgmt

本地化的 API Token 订单管理系统。使用 React 前端、Spring Boot 后端和 SQLite，
统一管理提供商、采购订单、发票抬头及发票记录。
系统记录采购和开票信息，不负责支付扣款、Token 发放或生成电子发票文件。

## 文档导航

| 文档 | 内容 |
| --- | --- |
| [接口文档](docs/interface.md) | 22 个接口、请求响应、字段约束及后端核验记录 |
| [设计说明](docs/design.md) | 架构、数据模型、页面交互、业务状态及实现边界 |
| [页面原型](docs/prototype/index.html) | 使用模拟数据的可交互页面，下载仓库后可用浏览器打开 |
| [原型使用说明](docs/prototype/README.md) | 离线打开、模拟数据和原型维护方式 |

正式前端位于 `source/frontend`，连接真实后端；原型仅用于设计参考。
原型使用独立浏览器存储，正式前端不读取原型数据，也不在 localStorage 中保存业务记录。
代码托管平台可能只展示 HTML 源码；页面原型需在本地浏览器打开。

## 功能概览

| 页面 | 主要能力 |
| --- | --- |
| 订单 `#/orders` | 添加、修改、详情、编号复制、筛选、单笔/合并开票、移入回收站 |
| 回收站 `#/trash` | 详情、筛选、单条/批量恢复、永久删除 |
| 发票 `#/invoices` | 编号复制、筛选、详情、关联订单查询、作废有效发票 |
| 提供商 `#/providers` | 卡片展示、添加、修改、单条/批量删除、独立网址跳转 |
| 发票抬头 `#/titles` | 卡片展示、添加、修改、单条/批量删除、两行格式一键复制 |

- 顶部导航配合 Hash 路由，支持页面刷新及浏览器前进、后退。
- 全局搜索支持 `Ctrl+K` / `⌘K`，匹配订单编号、发票编号、提供商、抬头，英文忽略大小写。
  搜索包含回收站和作废记录，展示全部匹配结果；跳转清除目标页筛选并高亮 1 秒。
- 搜索与筛选均由前端完成，不提供专用后端查询接口。
  日期范围包含起止日期全天，无更新时间的记录不匹配日期筛选。
- 订单和发票不分页，在列表块内滚动；页面级和列表滚动条隐藏，保留滚轮及键盘滚动。
- 未开票订单的发票类型为“—”，开票时选择抬头。
  企业抬头税号在前端必填，个人选填，填写时为 15～20 位英文字母或数字。
- 已开票订单不可修改或删除；回收站订单不可修改或开票。
  正常订单只移入回收站，回收站支持恢复或永久删除。
- 合并开票仅允许正常且未开票的订单。作废发票后解除订单关联，订单可重新开票。
- 提供商/抬头删除不在前端额外阻止引用关系；后端拒绝时显示实际错误，不虚报删除成功。

“复制抬头”的内容如下；没有税号时保留空的“税号：”行：

```text
名称：xxx
税号：xxxxxx
```

## 技术与目录

| 层次 | 当前技术 |
| --- | --- |
| 前端 | React 19、TypeScript 6、Vite 8，独立 CSS |
| 前端验证 | Oxlint、Vitest、Testing Library、jsdom |
| 后端 | Java 编译目标 17、Spring Boot 4.0.8 |
| 数据访问 | MyBatis-Plus 3.5.17，动态更新配合 XML 映射 |
| 数据库 | SQLite，通过 JDBC 驱动访问，无需独立数据库服务 |
| 构建 | npm 与锁文件；Maven，附带 Maven Wrapper |

具体版本以 [前端依赖](source/frontend/package.json)、
[父 POM](source/backend/TOMParent/pom.xml) 和
[应用 POM](source/backend/TokenOrderMgmt/pom.xml) 为准。

```text
TokenOrderMgmt/
├── README.md                         # 安装、运行、验证与维护入口
├── LICENSE
├── docs/
│   ├── interface.md                  # 接口契约
│   ├── design.md                     # 设计说明
│   └── prototype/                    # 独立交互原型
└── source/
    ├── frontend/
    │   ├── package.json / package-lock.json
    │   ├── .env.example / vite.config.ts
    │   ├── src/
    │   │   ├── App.tsx / pages/       # 页面、Hash路由、业务表单
    │   │   ├── components.tsx        # 公共组件
    │   │   ├── styles.css            # 集中样式
    │   │   ├── api.ts / types.ts     # 接口封装、数据类型
    │   │   └── domain.ts / *.test.*  # 业务规则与测试
    │   └── dist/                     # 前端构建输出
    └── backend/
        ├── TOMParent/pom.xml         # 父依赖与构建配置
        └── TokenOrderMgmt/
            ├── pom.xml / mvnw.cmd
            └── src/
                ├── main/java/       # Controller → Service → Mapper
                ├── main/resources/
                │   ├── application.yml
                │   ├── application-local.yml.example
                │   ├── db/schema.sql
                │   ├── com/shuye/tokenordermgmt/mapper/
                │   └── static/      # 已放入的前端发布资源
                └── test/            # 后端集成测试
```

## 本地开发

以下命令使用 PowerShell 7，路径起点均会单独说明。
启动、重启命令由使用者按需执行，不是安装依赖或测试时的自动动作。

### 1. 环境准备

准备 JDK 17 或更高版本并设置 `JAVA_HOME`，以及 Maven、Node.js 和 npm。
当前 Vite 声明支持 Node.js `^20.19.0 || >=22.12.0`；建议使用 Node.js 22.12 或更高版本。

```powershell
java -version
mvn -version
node --version
npm --version
```

没有系统 Maven 时，可在后端应用目录用 `./mvnw.cmd` 替换下文的 `mvn`。
当前 Wrapper 配置 Maven 3.9.16，首次使用需要联网下载。

### 2. 配置后端

从项目目录 `TokenOrderMgmt` 开始：

```powershell
Set-Location source/backend/TokenOrderMgmt
$localConfig = 'src/main/resources/application-local.yml'
if (-not (Test-Path -LiteralPath $localConfig)) {
    Copy-Item 'src/main/resources/application-local.yml.example' $localConfig
}
New-Item -ItemType Directory -Path data -Force | Out-Null
```

编辑本地配置，SQLite 示例：

```yaml
db:
  driver: org.sqlite.JDBC
  type: sqlite
  url: ./data/token-order-mgmt.db
  username: ""
  password: ""
  init:
    schema-location: classpath:db/schema.sql

app:
  server-port: 8080

server:
  address: 127.0.0.1
```

`application.yml` 强制导入 `application-local.yml`。示例文件中的用户名、密码被注释，
但主配置使用无默认值的占位符，SQLite 也需显式填写空字符串。
`server.address` 为本地使用建议添加的配置，仓库主配置未限制后端监听地址。

数据库路径相对于启动工作目录；固定在应用模块运行，避免误创建另一份数据库。
每次启动执行 `schema.sql`；`CREATE TABLE IF NOT EXISTS` 不会迁移旧表结构。
当前主配置未启用初始化数据脚本。

在同一个终端、同一个应用目录中手动启动：

```powershell
mvn spring-boot:run
```

只读接口检查示例：

```powershell
Invoke-RestMethod 'http://127.0.0.1:8080/api/v1/provider'
```

首次空库正常返回 `data: []`。当前没有独立健康检查或 Swagger UI 配置。

### 3. 配置并启动前端

另开终端，从项目目录 `TokenOrderMgmt` 开始：

```powershell
Set-Location source/frontend
npm ci
if (-not (Test-Path -LiteralPath '.env.local')) {
    Copy-Item '.env.example' '.env.local'
}
npm run dev
```

访问终端显示的本地地址。开发服务器仅监听 `127.0.0.1`；前端不会启动后端。

| 环境变量 | 默认值 | 用途 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api/v1` | 浏览器接口前缀，也可指定完整后端 URL |
| `API_PROXY_TARGET` | `http://127.0.0.1:8080` | 开发服务器对 `/api/v1` 的代理目标 |

修改环境变量后需由使用者重启开发服务。`VITE_API_BASE_URL` 在生产构建时固化到资源。
若使用完整后端 URL，浏览器会直接访问该地址，需要后端允许页面来源的 CORS。
默认同源前缀经开发代理访问后端，不需要在代码中写死具体端口。

## 构建与部署

### 前端产物

在 `source/frontend` 中执行：

```powershell
npm run build
```

产物位于 `source/frontend/dist`。正式前端是构建后的 Web 应用，不应像离线原型一样
双击源目录 `index.html` 使用。
`npm run preview` 可启动本地产物预览，但不包含开发代理，不能代替后端服务。

### 与 Spring Boot 同源部署

当前后端 `src/main/resources/static/` 已有前端资源，可随 JAR 打包。
项目尚未配置 Maven 自动构建前端或自动复制 `dist`；前端更新不会自动同步到 `static/`。

更新发布资源时，在确认目标为专用静态资源目录后，将新 `dist` 的内容同步至
`source/backend/TokenOrderMgmt/src/main/resources/static/`，核对 `index.html` 引用的资源齐全。
这一步由发布者执行，不修改数据库。随后在后端应用目录构建并手动运行：

```powershell
mvn -DskipTests package
java -jar target/TokenOrderMgmt-0.0.1-SNAPSHOT.jar
```

上面的打包命令跳过测试；正式发布前应先运行下一节检查。
默认同源发布使用 `/api/v1`，运行后访问后端根地址（默认 `http://127.0.0.1:8080/`）。
如独立托管前端，宿主服务器需将 `/api/v1` 转发至后端，或构建前配置完整后端地址。
本轮文档整理未重新同步静态资源、打包 JAR 或执行服务联调。

## 接口与错误处理

统一前缀 `/api/v1`；GET 查询，POST 新增，PUT 更新/恢复/作废，DELETE 批量删除。
响应封装为 `{ code, message, data }`；业务失败可能仍为 HTTP 200，前端同时检查两种状态。
DELETE 请求保留 JSON 请求体。全部 ID 使用服务端返回的字符串。

订单提交金额使用元，返回、存储及合并开票使用整数分；发票总额最终由后端重新计算。
前端精确格式化分金额，拒绝不安全整数或无法通过 JSON 元金额精确往返的输入。
日期为 `yyyy-MM-dd`，更新时间为无时区的 `LocalDateTime`。

四类列表全部加载成功后才呈现业务页面与完整搜索结果；失败时显示重试入口。
请求超时为 15 秒。提交期间阻止重复操作，明确失败保留表单。
网络中断、超时或写入响应无法解析时，结果可能未确认，应先刷新核对。
保存成功但刷新失败时提示“操作已保存”，关闭已提交表单；重试刷新只读列表，不重复写入。
底部“刷新数据”用于同步外部变更，无后台轮询。

## 测试与验证记录

前端：在 `source/frontend` 执行，测试使用隔离数据和模拟接口，不监听端口：

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

后端：在 `source/backend/TokenOrderMgmt` 执行：

```powershell
mvn test
```

后端测试使用真实 Controller、Service、Mapper 和内存 SQLite，单连接且启用外键，
无需本地数据库配置或启动服务。每例清理测试表，不以测试级事务替代业务提交。
测试排除由测试依赖引入的默认安全自动配置，匹配当前无鉴权应用。

| 既有验证记录 | 结果与范围 |
| --- | --- |
| 前端，2026-09-08 | 4 文件 32 项测试通过；类型检查、零警告 Lint 和生产构建通过 |
| 后端，2026-09-06 | 接口文档记录 13 项集成测试通过，覆盖 22 路由的主要业务流程 |
| 本轮文档整理 | 检查文档链接、路径与实现一致性；不将历史测试结果作为本轮复跑 |

前端测试覆盖接口错误、请求体、金额、企业税号、抬头复制、状态与批量限制、重复提交、
失败保留、保存后刷新失败、作废解绑、关联订单请求、日期筛选、搜索高亮及导航。
后端测试覆盖 CRUD、金额精度、恢复与作废事务、非法参数、缺失资源、合计溢出和故障回滚。

以上不等同于真实浏览器视觉、剪贴板权限、网络/CORS、多连接、并发或当前 JAR 的验收。
后端详细测试范围与日期见 [接口核验记录](docs/interface.md#8-自动化验证与当前边界)。

## 维护与排错

- **前端加载失败**：核对后端运行状态、端口、代理目标和响应业务码；不要把失败当空库。
- **本地配置缺失**：确认应用模块下已有 `application-local.yml`，并填写空用户名/密码。
- **数据库路径变化或表结构报错**：检查启动工作目录与实际数据库，旧库需单独迁移。
- **页面未更新**：确认最新 `dist` 已同步到后端 `static/` 并重新打包；构建前端不会自动更新 JAR。
- **删除提供商或抬头失败**：可能受到数据库外键影响；依据错误处理引用，不应仅凭前端按钮推定成功。
- **备份**：手动停止应用后备份实际 SQLite 文件及相关日志文件，再进行迁移或清理。
- **当前限制**：后端仍有引用删除、提供商关联校验、唯一性约束和税号 null 清空规则待完善；
  前端企业税号必填不代表后端已经实现同样的条件校验。
- **本地边界**：当前没有鉴权，后端 CORS 放行所有来源；按需绑定回环地址并限制来源。
  不要提交本地配置中的敏感内容或业务数据库。

## 许可证

本项目使用 [MIT License](LICENSE)。
