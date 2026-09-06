# TokenOrderMgmt

纯本地的 API Token 订单管理系统，使用 Spring Boot 和 SQLite 保存提供商、采购订单、
发票抬头及发票记录。当前仓库包含后端工程，尚无前端工程。

系统用于记录订单与开票信息，不负责支付扣款、Token 发放或生成电子发票文件。

## 当前状态

后端提供 22 个接口，覆盖提供商、发票抬头、订单及发票管理。
当前支持订单开票关联、作废解绑、逻辑删除与恢复、金额精确转换和请求参数校验。
详细契约、调用示例和核验结果见 [接口文档](docs/interface.md)。

项目已建立真实 MVC → Service → Mapper → SQLite 的集成测试，参数化展开后共 13 个用例。
2026-09-06 15:31:34 本轮 Maven 复跑确认 BUILD SUCCESS：13 个用例通过，失败、错误、跳过均为 0。
测试不监听网络端口，不等同于浏览器或实际服务端口联调。

## 技术与目录

| 项目 | 当前配置 |
| --- | --- |
| Java | 编译目标 17 |
| Spring Boot | 4.0.8 |
| MyBatis-Plus | 3.5.17，Boot 4 starter |
| 数据库 | SQLite，sqlite-jdbc 版本由父依赖管理 |
| 构建 | Maven；工程附带 Maven Wrapper |
| 默认端口 | 8080 |

```text
TokenOrderMgmt/
├── README.md
├── LICENSE
├── docs/
│   └── interface.md
└── source/backend/
    ├── TOMParent/pom.xml            # 父依赖及插件配置
    └── TokenOrderMgmt/              # 可运行应用模块
        ├── pom.xml
        ├── mvnw / mvnw.cmd
        └── src/
            ├── main/java/com/shuye/tokenordermgmt/
            │   ├── controller/     # HTTP 入口
            │   ├── service/        # 业务接口和实现
            │   ├── mapper/         # MyBatis 数据访问
            │   └── common/         # DTO、VO、实体、配置和异常
            ├── main/resources/
            │   ├── application.yml
            │   ├── application-local.yml.example
            │   ├── db/schema.sql
            │   └── com/shuye/tokenordermgmt/mapper/
            └── test/               # 全链路集成测试
```

调用分层为 `Controller → Service → Mapper → SQLite`，通过 DTO 接收请求，VO 返回数据。
表关系为 `provider ← token_order → invoice → invoice_title`。
订单和发票金额在数据库中以整数分保存，订单接口输入金额使用元。

## 本地准备

在 PowerShell 7 中，从包含本 README 的 `TokenOrderMgmt` 目录进入应用模块：

```powershell
Set-Location source/backend/TokenOrderMgmt
java -version
mvn -version
```

准备可编译 Java 17 的 JDK 和 Maven，确保 `JAVA_HOME` 指向 JDK。
没有系统 Maven 时，可将下文 `mvn` 替换为 `./mvnw.cmd`；
Wrapper 当前配置下载 Maven 3.9.16，首次使用需访问 Maven Central。
构建依赖均以两个 POM 为准，不需要单独安装数据库服务。

### 配置数据库

`application.yml` 强制导入 `classpath:application-local.yml`。
首次配置时复制示例，已有本地配置时不要覆盖：

```powershell
$localConfig = 'src/main/resources/application-local.yml'
if (-not (Test-Path -LiteralPath $localConfig)) {
    Copy-Item 'src/main/resources/application-local.yml.example' $localConfig
}
New-Item -ItemType Directory -Path data -Force | Out-Null
```

SQLite 本地配置示例：

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

示例文件中的用户名、密码原本被注释，而主配置使用了无默认值的占位符，
本地 SQLite 配置建议显式写空字符串。`server.address` 为纯本地运行建议添加的配置，
仓库默认配置尚未限制监听地址。

数据库路径相对于**启动时工作目录**，不是源码目录。
请固定在应用模块目录运行，否则可能创建另一份数据库。
使用自定义路径时先建立其父目录。
每次启动执行 `schema.sql`，其中 `CREATE TABLE IF NOT EXISTS` 只保证建表，不能迁移已有表结构。
当前未启用初始化数据脚本。

### 构建与运行

```powershell
mvn -DskipTests package
java -jar target/TokenOrderMgmt-0.0.1-SNAPSHOT.jar
```

也可手动执行 `mvn spring-boot:run` 启动开发服务。上述启动命令由使用者决定何时执行。
访问示例：

```powershell
Invoke-RestMethod 'http://127.0.0.1:8080/api/v1/provider'
```

首次空库正常响应的 `data` 为 `[]`。
根路径没有前端页面；当前也没有专用健康检查或 Swagger UI 配置。

## 接口使用

接口采用 GET 查询、POST 新增、PUT 更新/恢复/作废、DELETE 批量删除。
标准响应为 `code`、`message`、`data`；业务失败可能仍返回 HTTP 200，因此必须检查 `code`。
完整路径、字段类型、金额单位、状态枚举和 PowerShell 示例见 [接口文档](docs/interface.md)。

基础流程为创建提供商、创建抬头、录入订单、开票、查询关联订单、作废发票。
已开票订单禁止更新和删除；作废后解除关联，可再次开票。

## 验证与维护

在应用模块目录执行：

```powershell
mvn test
```

测试类 `TokenTokenOrderEntityMgmtApplicationTests` 已内置独立配置，**无需准备
application-local.yml，也无需启动服务**。测试使用内存 SQLite、单连接池及外键约束，
每个用例清理测试表；不使用测试级事务，以观察 Service 的真实提交与回滚。

参数化展开后共 13 个用例，覆盖基础数据 CRUD 与名称查重、订单金额精度、
逻辑删除与恢复、开票与作废闭环、批量删除保护、非法参数与缺失资源、
总额溢出，以及利用测试触发器验证开票绑定失败和作废失败的事务回滚。

父 POM 的 `spring-boot-starter-security-test` 引入了生产运行依赖中没有的默认安全配置。
测试仅排除这些安全自动配置，使无鉴权测试环境与当前应用一致；没有替换业务层或 Mapper。

这些测试不覆盖真实端口、浏览器 CORS、多连接或并发行为。
测试连接显式启用外键，不能据此推定应用默认连接池的每个连接都已启用外键。
当前仍需完善引用中的提供商／抬头删除处理、订单提供商存在性检查、数据库唯一约束，
以及可选税号传 null 时的清空规则。发票请求的 `totalAmountCent` 仍要求传入正数，
但最终金额由服务端按订单重新计算。

最新结果见 [接口核验记录](docs/interface.md#8-自动化验证与当前边界)。

- 备份前手动停止应用，保存数据库及相关 SQLite 文件，再进行迁移或清理。
- 逻辑删除订单仍会出现在列表中，调用方按 `deleted` 区分。
- 物理删除不可通过恢复接口找回，应先确认引用关系并做好备份。
- 当前没有鉴权，CORS 允许所有来源；绑定回环地址并限制浏览器来源后再作为本地工具使用。
- 不要将本地数据库或含敏感内容的配置提交到版本库。

## 许可证

本项目使用 [MIT License](LICENSE)。
