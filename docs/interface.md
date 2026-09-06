# TokenOrderMgmt 接口文档

本文依据当前后端源码整理，核验日期：2026-09-06。记录实际接口，不将待修复功能描述为已可用。
项目用于本地记录 API Token 采购订单、提供商和发票，不提供 Token 发放、支付扣款或电子发票生成能力。

## 1. 公共约定

- 默认地址：`http://127.0.0.1:8080`；端口由 `app.server-port` 配置。
- 接口前缀：`/api/v1`，路径使用下文的单数名称。
- 请求及响应：JSON；有请求体时设置 `Content-Type: application/json`。
- 当前没有登录或鉴权要求，无需 Authorization 请求头。
- ID 为服务端生成的字符串，调用方应使用上一次响应中的真实 ID。
- 列表直接返回数组，没有分页、搜索或查询参数；空列表为 `[]`。
- 更新使用 PUT，调用方应提交完整请求对象，不应将其视为 PATCH。
- 批量删除使用 DELETE 加 JSON 请求体；客户端必须保留请求体。
- 日期格式：`yyyy-MM-dd`；时间类型为无时区的 LocalDateTime。
- 订单输入 `amount` 为元，返回 `amountCent` 为分；发票 `totalAmountCent` 为分。

### 1.1 响应封装

```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| code | integer | 业务码，成功为 200 |
| message | string | 成功提示或业务错误信息 |
| data | object / array / null | 详情对象、列表或空值 |

成功查询和新增、更新均返回 HTTP 200；删除、恢复、作废成功时 `data` 为 null。
`BusinessException` 仅写入响应体，未设置 HTTP 状态码，因此业务失败仍可能是 HTTP 200。
调用方必须同时检查 HTTP 状态和 `code`。

```json
{
  "code": 404,
  "message": "The token order does not exist",
  "data": null
}
```

| 业务码 | 当前含义 |
| --- | --- |
| 200 | 成功 |
| 400 | 业务拒绝，例如新增同名提供商或抬头 |
| 404 | 详情或更新目标不存在 |
| 500 | Result 定义的失败码；未捕获异常不保证使用此封装 |

403 表示当前业务状态禁止操作，例如修改或删除已开票订单、选择已删除订单开票。
401 为预留业务码，当前没有鉴权流程。
参数校验和 JSON 解析错误返回 HTTP 400、业务码 400，使用相同 Result 封装。
数据库异常等未统一处理，不能假定所有系统错误也使用此结构。

### 1.2 校验现状

下文字段表中的“约束”来自 DTO 注解，是调用方应遵守的输入要求。
写入接口使用 `@Valid`，由 `spring-boot-starter-validation` 执行字段校验。
创建发票的两个嵌套对象均使用 `@NotNull @Valid`，缺失对象或内部非法字段均被拒绝。
校验消息按字段名拼接，例如 `batchIdRequest.ids: 请选择至少一条记录`。

### 1.3 批量请求 BatchIdRequest

```json
{
  "ids": ["实际记录ID1", "实际记录ID2"]
}
```

`ids` 为非空字符串数组，每项不得为空白。不存在的 ID 没有统一逐项报错机制；
批量操作返回空值，不提供成功条数或逐项结果。

## 2. 接口总览

以下路径均相对于 `/api/v1`，共 22 个接口。

| 方法 | 路径 | 用途 | 请求体 | 成功 data |
| --- | --- | --- | --- | --- |
| GET | /provider | 提供商列表 | 无 | ProviderVO[] |
| GET | /provider/{id} | 提供商详情 | 无 | ProviderVO |
| POST | /provider | 新增提供商 | ProviderRequest | ProviderVO |
| PUT | /provider/{id} | 更新提供商 | ProviderRequest | ProviderVO |
| DELETE | /provider | 批量物理删除提供商 | BatchIdRequest | null |
| GET | /invoice-title | 抬头列表 | 无 | InvoiceTitleVO[] |
| GET | /invoice-title/{id} | 抬头详情 | 无 | InvoiceTitleVO |
| POST | /invoice-title | 新增抬头 | InvoiceTitleRequest | InvoiceTitleVO |
| PUT | /invoice-title/{id} | 更新抬头 | InvoiceTitleRequest | InvoiceTitleVO |
| DELETE | /invoice-title | 批量物理删除抬头 | BatchIdRequest | null |
| GET | /token-order | 订单列表，包含逻辑删除记录 | 无 | TokenOrderVO[] |
| GET | /token-order/i/{id} | 按发票 ID 查询订单 | 无 | TokenOrderVO[] |
| GET | /token-order/{id} | 订单详情 | 无 | TokenOrderVO |
| POST | /token-order | 新增订单 | TokenOrderRequest | TokenOrderVO |
| PUT | /token-order/{id} | 更新订单 | TokenOrderRequest | TokenOrderVO |
| PUT | /token-order/logic | 批量逻辑删除订单 | BatchIdRequest | null |
| PUT | /token-order/recover | 批量恢复订单 | BatchIdRequest | null |
| DELETE | /token-order | 批量物理删除订单 | BatchIdRequest | null |
| GET | /invoice | 发票列表，包含作废记录 | 无 | InvoiceVO[] |
| GET | /invoice/{id} | 发票详情 | 无 | InvoiceVO |
| POST | /invoice | 创建发票并关联订单 | CreateInvoiceRequest | InvoiceVO |
| PUT | /invoice/{id} | 作废发票 | 无 | null |

## 3. 提供商

### 3.1 ProviderRequest

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| name | string | 必填、非空白，最长 50 字符 |
| website | string | 必填，http:// 或 https:// 开头，最长 500 字符 |

POST `/provider` 和 PUT `/provider/{id}` 使用相同结构：

```json
{
  "name": "示例提供商",
  "website": "https://example.com"
}
```

### 3.2 ProviderVO 与行为

```json
{
  "id": "返回的提供商ID",
  "name": "示例提供商",
  "website": "https://example.com"
}
```

- 列表按数据库 `updated_at DESC` 排序。
- 新增及更新均检查同名；保持原名称更新允许，改成其他记录名称返回业务码 400。数据库尚无名称唯一约束。
- 详情不存在：`Provider not found`；更新不存在：`The provider does not exist`，业务码均为 404。
- DELETE `/provider` 使用 BatchIdRequest，直接物理删除，无业务层引用检查。
  已被订单引用时，行为取决于当前 SQLite 连接是否启用外键约束，不应作为正常清理流程。

## 4. 发票抬头

### 4.1 InvoiceTitleRequest

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| titleType | string | 必填，PERSONAL（个人）或 COMPANY（企业） |
| name | string | 必填、非空白，最长 150 字符 |
| taxCode | string / null | 可省略或空串；非空时为 15～20 位英文字母或数字 |

```json
{
  "titleType": "PERSONAL",
  "name": "示例个人",
  "taxCode": ""
}
```

当前未实现“企业抬头必须填写税号”的条件校验。

### 4.2 InvoiceTitleVO 与行为

返回 `id`、`titleType`、`name`、`taxCode`，类型与请求一致，另增加字符串 ID。

- 列表按 `updated_at DESC` 排序。
- 新增及更新均检查同名，允许保持原名称；数据库尚无名称唯一约束。
- 详情不存在：`Invoice Title not found`；更新不存在：`The invoice title does not exist`，业务码为 404。
- DELETE `/invoice-title` 使用 BatchIdRequest，直接物理删除，无发票引用检查。
- 发票展示实时读取抬头名称和类型，当前没有历史抬头快照。
- 更新税号时，空串可清空；null 受 MyBatis-Plus 默认非空更新策略影响，不保证清除旧值。

## 5. Token 订单

### 5.1 TokenOrderRequest

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| orderNo | string | 必填、非空白，最长 100 字符 |
| amount | number | 必填，单位元，最小 0.01；建议调用方限制为两位小数 |
| paymentType | string | 必填，取值见下表 |
| providerId | string | 必填、非空白，使用已创建提供商的 ID |

| paymentType | 含义 |
| --- | --- |
| UNION_PAY | 银联 |
| MASTERCARD | 万事达 |
| VISA | Visa |
| ALIPAY | 支付宝 |
| WECHAT_PAY | 微信支付 |
| MI_PAY | 小米支付 |
| APPLE_PAY | 苹果支付 |
| GOOGLE_PAY | 谷歌支付 |

```json
{
  "orderNo": "LOCAL-20260906-001",
  "amount": 12.34,
  "paymentType": "ALIPAY",
  "providerId": "实际提供商ID"
}
```

新增和更新均使用 `movePointRight(2).longValueExact()` 将元精确转换为整数分。
不能精确表示为分或超出 long 范围时返回业务码 400，例如 1.239 元会被拒绝，1.230 元可表示为 123 分。
已开票订单禁止更新；当前未在业务层检查订单号唯一性和提供商存在性。

### 5.2 TokenOrderVO

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| id | string | 订单 ID |
| orderNo | string | 订单编号 |
| amountCent | integer | 金额，分；示例 1234 |
| paymentType | string | 支付方式枚举 |
| providerId | string | 提供商 ID |
| providerName | string / null | 提供商名称，仅查询链路补全 |
| invoiceId | string / null | 发票 ID |
| invoiceStatus | string | invoiceId 为空时 UNINVOICED，否则 INVOICED |
| invoiceType | string / null | PERSONAL 或 COMPANY，查询已开票订单时补全 |
| deleted | integer | 0 正常，1 逻辑删除，由 deleted_at 推导 |
| updatedAt | string / null | 更新时间，LocalDateTime 格式；当前写入自动填充，历史空值不会自动回填 |

新增及更新响应没有补全 `providerName`、`invoiceType`，需要再查询详情。
`invoiceStatus` 仅由关联 ID 推导，不检查发票是否已作废。

### 5.3 查询、删除和恢复

- GET `/token-order` 返回全部记录，包括 `deleted=1`，按 `updated_at DESC` 排序。
- GET `/token-order/i/{id}` 中的 ID 是发票 ID，按 `updated_at` 升序；也未排除逻辑删除记录。
  没有关联订单时返回空数组，不单独校验发票是否存在。
- GET `/token-order/{id}` 可读取逻辑删除记录；不存在返回业务码 404。
- PUT `/token-order/{id}` 不存在返回业务码 404；已关联发票时禁止所有更新，返回业务码 403。
  当前未单独禁止更新逻辑删除但未开票的订单。
- PUT `/token-order/logic` 仅选择尚未删除的 ID；若包含已开票订单则整批拒绝，否则写入删除时间。
- PUT `/token-order/recover` 通过专用 SQL 清空删除时间并刷新 `updated_at`，不修改发票关联。
- DELETE `/token-order` 不要求先逻辑删除，但包含已开票订单时整批拒绝。
  应先作废关联发票再删除订单，避免发票总额与有效订单不一致。

## 6. 发票

### 6.1 CreateInvoiceRequest

POST `/invoice` 使用一个 JSON 请求体，包含必填对象 `invoiceRequest` 和 `batchIdRequest`：

```json
{
  "invoiceRequest": {
    "invoiceNo": "INV-20260906-001",
    "totalAmountCent": 1234,
    "invoiceDate": "2026-09-06",
    "invoiceTitleId": "实际抬头ID"
  },
  "batchIdRequest": {
    "ids": ["实际订单ID"]
  }
}
```

| InvoiceRequest 字段 | 类型 | 声明约束 / 行为 |
| --- | --- | --- |
| invoiceNo | string | 非空白，最长 100 字符 |
| totalAmountCent | integer | 非 null、大于 0；Service 实际忽略传入值，按订单金额重新求和 |
| invoiceDate | string | 非 null，yyyy-MM-dd，不晚于今天 |
| invoiceTitleId | string | 非 null，发票抬头 ID |

`batchIdRequest.ids` 表示参与开票的订单 ID，必须非空且每项非空白。
重复 ID 在 Service 中去重，只计费一次；不存在的抬头或订单返回业务码 404。
已删除或已关联发票的订单返回业务码 403，整批拒绝。

Service 使用 `Math.addExact` 累加订单金额。单笔金额非法或合计溢出返回业务码 403。
创建 VALID 发票与回写全部订单 `invoice_id` 在同一事务中，失败整体回滚。
`totalAmountCent` 目前仍是请求必填字段，但实际总额以服务端订单数据为准；客户端不能用它覆盖合计。

### 6.2 InvoiceVO

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| id | string | 发票 ID |
| invoiceNo | string | 发票编号 |
| totalAmountCent | integer | 总金额，分 |
| invoiceDate | string | 开票日期，yyyy-MM-dd |
| invoiceType | string | PERSONAL 或 COMPANY，实时取自抬头 |
| invoiceTitleId | string | 抬头 ID |
| invoiceTitleName | string | 实时抬头名称 |
| status | string | VALID 有效，INVALID 作废 |
| updatedAt | string / null | 更新时间；当前写入自动填充，历史空值不会自动回填 |

### 6.3 查询与作废

- GET `/invoice` 按 `updated_at DESC` 返回所有发票，包含 INVALID。
- GET `/invoice/{id}` 不存在时返回业务码 404，消息 `The invoice does not exist`。
- PUT `/invoice/{id}` 无请求体，在同一事务内将状态设为 INVALID，并通过专用 SQL 清空所有关联订单的 `invoice_id`。
  发票及关联订单更新时间同步刷新；不存在返回业务码 404，重复作废成功。作废后订单可重新开票。
- 当前无发票编辑或物理删除接口。

## 7. 本地调用顺序

使用独立测试数据库按“提供商 → 抬头 → 订单 → 开票 → 关联查询 → 作废”验证完整业务流程。
状态变更后查询详情核对数据；金额和关联结果不能只通过 `code=200` 判断。

以下 PowerShell 7 示例要求用户已手动启动服务；会创建测试数据。

```powershell
$base = 'http://127.0.0.1:8080/api/v1'
$tag = [Guid]::NewGuid().ToString('N')
$providerBody = @{
    name = "测试提供商-$tag"
    website = 'https://example.com'
} | ConvertTo-Json
$provider = Invoke-RestMethod -Method Post -Uri "$base/provider" `
    -ContentType 'application/json; charset=utf-8' -Body $providerBody
if ($provider.code -ne 200) { throw $provider.message }

$titleBody = @{
    titleType = 'PERSONAL'
    name = "测试抬头-$tag"
    taxCode = ''
} | ConvertTo-Json
$title = Invoke-RestMethod -Method Post -Uri "$base/invoice-title" `
    -ContentType 'application/json; charset=utf-8' -Body $titleBody
if ($title.code -ne 200) { throw $title.message }

$orderBody = @{
    orderNo = "LOCAL-$tag"
    amount = 12.34
    paymentType = 'ALIPAY'
    providerId = $provider.data.id
} | ConvertTo-Json
$order = Invoke-RestMethod -Method Post -Uri "$base/token-order" `
    -ContentType 'application/json; charset=utf-8' -Body $orderBody
if ($order.code -ne 200) { throw $order.message }

$orderId = $order.data.id
$detail = Invoke-RestMethod -Uri "$base/token-order/$orderId"
if ($detail.code -ne 200) { throw $detail.message }
if ($detail.data.amountCent -ne 1234) { throw '金额转换不符' }
if ($detail.data.providerName -ne $provider.data.name) {
    throw '提供商关联不符'
}

$invoiceBody = @{
    invoiceRequest = @{
        invoiceNo = "INV-$tag"
        totalAmountCent = $detail.data.amountCent
        invoiceDate = (Get-Date).ToString('yyyy-MM-dd')
        invoiceTitleId = $title.data.id
    }
    batchIdRequest = @{ ids = @($orderId) }
} | ConvertTo-Json -Depth 5
$invoice = Invoke-RestMethod -Method Post -Uri "$base/invoice" `
    -ContentType 'application/json; charset=utf-8' -Body $invoiceBody
if ($invoice.code -ne 200) { throw $invoice.message }
$invoiceId = $invoice.data.id
$linked = Invoke-RestMethod -Uri "$base/token-order/i/$invoiceId"
if ($linked.code -ne 200) { throw $linked.message }
if (@($linked.data).Count -ne 1) { throw '订单关联不符' }
if ($invoice.data.totalAmountCent -ne 1234) { throw '发票金额不符' }

$cancel = Invoke-RestMethod -Method Put -Uri "$base/invoice/$invoiceId"
if ($cancel.code -ne 200) { throw $cancel.message }
$restored = Invoke-RestMethod -Uri "$base/token-order/$orderId"
if ($restored.code -ne 200) { throw $restored.message }
if ($null -ne $restored.data.invoiceId) { throw '作废后未解除关联' }
```

清理时仅删除本轮创建的数据，先作废发票，再删除订单和提供商。
作废发票仍保留抬头引用，不能把其抬头视为无引用记录；当前无发票物理删除接口。
三个 DELETE 接口均传入 `{"ids":["本轮真实ID"]}`，避免对业务数据执行试验。

## 8. 自动化验证与当前边界

### 8.1 最新结果

2026-09-06 15:31:34，使用 Maven 3.9.12、JDK 25.0.2 运行
`TokenTokenOrderEntityMgmtApplicationTests`，结果为 **BUILD SUCCESS**：

```text
Tests run: 13, Failures: 0, Errors: 0, Skipped: 0
```

测试源码位于
[`TokenTokenOrderEntityMgmtApplicationTests.java`](../source/backend/TokenOrderMgmt/src/test/java/com/shuye/tokenordermgmt/TokenTokenOrderEntityMgmtApplicationTests.java)。
13 个用例包含参数化展开，覆盖全部 22 个路由的主要流程；这不是所有输入组合或生产运行场景的穷尽证明。

| 测试范围 | 核验内容 |
| --- | --- |
| 提供商、抬头 | CRUD、保持原名更新、重名拒绝 |
| 订单 | 精确元转分、更新、列表详情、已开票更新及删除拒绝 |
| 逻辑删除与恢复 | 删除状态、清空删除时间、更新时间、不误改发票关联 |
| 开票闭环 | 多订单合计、绑定、按发票查询、作废、重复作废、重新开票 |
| 参数错误 | 嵌套 DTO、空 IDs、空白 ID、未来日期、非法支付方式、负金额、JSON 格式及统一响应 |
| 资源缺失 | 缺失详情、发票、抬头和订单的业务错误，不产生部分发票 |
| 金额边界 | 分精度、单笔转换溢出、合计 long 上限及溢出拒绝 |
| 批量原子性 | 混合已开票和未开票订单删除时整批不变 |
| 事务回滚 | 触发器制造绑定/作废写入失败，检查发票与订单状态完整回滚 |
| 时间填充 | 新增时间、更新刷新、恢复和作废 SQL 更新时间 |

### 8.2 运行方式和隔离

在应用模块 `source/backend/TokenOrderMgmt` 中执行：

```powershell
mvn -Dtest=TokenTokenOrderEntityMgmtApplicationTests test
```

也可以使用 `./mvnw.cmd` 代替 `mvn`。测试结果位于模块 `target/surefire-reports/`。
测试类已内置隔离配置，无需准备 `application-local.yml` 或额外传入数据库参数。

- 使用 Spring Boot MockMvc 和真实 Controller、Service、Mapper，不监听端口。
- 使用单连接 `jdbc:sqlite::memory:`，每例前检查连接 URL 并清理测试表。
- 测试连接显式启用外键，每例清理故障触发器，不访问业务数据库。
- 不加测试级事务，让断言观察 Service 的真实提交和回滚。
- 仅在测试中排除 `security-test` 引入的默认鉴权自动配置，匹配当前应用无鉴权的运行依赖。

早期临时脚本的失败记录已由当前正式自动化结果取代，不再作为现有接口行为说明。
本轮执行的是 Maven test，不代表已执行打包、服务启动、网络或浏览器验收。

### 8.3 当前边界

| 范围 | 当前行为及后续注意事项 |
| --- | --- |
| 引用删除 | 提供商/抬头删除尚无业务引用检查，可能产生未统一处理的数据库错误；先确认无引用 |
| 外键连接 | 默认建表脚本执行 PRAGMA，测试显式对连接启用外键；测试通过不证明应用所有池连接都启用 |
| 唯一性 | 名称在业务层查重；数据库尚无名称唯一约束，订单号/发票号也没有唯一性兜底 |
| 关联存在性 | 订单写入尚无提供商存在性业务检查，关联数据异常可能影响详情查询 |
| 抬头历史 | 发票实时读取抬头名称和类型，没有历史快照；税号 null 不等同于清空 |
| 金额输入 | 开票请求 totalAmountCent 必填但由服务端重算，暂不能省略 |
| 历史时间 | 自动填充作用于当前写操作，不会批量修复历史空时间 |
| 访问边界 | 默认配置未强制回环监听，CORS 放行所有来源；纯本地使用见 README 的配置建议 |
| 未覆盖环境 | 未验证真实网络、浏览器 CORS、多连接外键、并发性能及所有故障组合 |
