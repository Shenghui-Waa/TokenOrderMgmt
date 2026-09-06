package com.shuye.tokenordermgmt;

import lombok.RequiredArgsConstructor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

/**
 * 使用真实 MVC、业务层及 Mapper 的集成测试，不监听端口。
 * 不添加测试级事务：必须观察 Service 的真实提交与回滚。
 */
@SpringBootTest(properties = {
        "spring.config.location=optional:classpath:test-isolated.yml",
        "spring.config.import=optional:classpath:test-isolated.yml",
        "spring.datasource.url=jdbc:sqlite::memory:",
        "spring.datasource.driver-class-name=org.sqlite.JDBC",
        "spring.datasource.username=",
        "spring.datasource.password=",
        "spring.datasource.hikari.maximum-pool-size=1",
        "spring.datasource.hikari.minimum-idle=1",
        "spring.datasource.hikari.max-lifetime=0",
        "spring.datasource.hikari.connection-init-sql=PRAGMA foreign_keys = ON",
        "spring.sql.init.mode=always",
        "spring.sql.init.schema-locations=classpath:db/schema.sql",
        // security-test 引入了生产依赖中没有的默认鉴权自动配置。
        "spring.autoconfigure.exclude="
                + "org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration,"
                + "org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration,"
                + "org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration"
})
@AutoConfigureMockMvc
@Execution(ExecutionMode.SAME_THREAD)
@RequiredArgsConstructor(onConstructor_ = @Autowired)
class TokenTokenOrderEntityMgmtApplicationTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String OLD_TIME = "2000-01-01T00:00:00";

    private final MockMvc mvc;
    private final JdbcTemplate jdbc;

    @BeforeEach
    void resetDatabase() {
        jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Void>) connection -> {
            assertEquals("jdbc:sqlite::memory:", connection.getMetaData().getURL());
            return null;
        });
        // 固定表名及触发器名，仅操作本类的内存数据库。
        jdbc.execute("DROP TRIGGER IF EXISTS test_fail_binding");
        jdbc.execute("DROP TRIGGER IF EXISTS test_fail_cancel");
        jdbc.update("DELETE FROM token_order");
        jdbc.update("DELETE FROM invoice");
        jdbc.update("DELETE FROM invoice_title");
        jdbc.update("DELETE FROM provider");
    }

    @ParameterizedTest
    @ValueSource(strings = {"provider", "invoice-title"})
    @DisplayName("提供商及抬头新增、列表、详情、更新和删除")
    void shouldManageReferenceData(String resource) throws Exception {
            String id = addReference(resource, "原名称");
            assertEquals(1, success("GET", "/" + resource, null).size());
            assertEquals(id, success("GET", "/" + resource + "/" + id, null)
                    .path("id").asText());
            JsonNode updated = success("PUT", "/" + resource + "/" + id,
                    referenceBody(resource, "新名称"));
            assertEquals("新名称", updated.path("name").asText());
            success("DELETE", "/" + resource, ids(id));
            assertEquals(0, success("GET", "/" + resource, null).size());
    }

    @ParameterizedTest
    @ValueSource(strings = {"provider", "invoice-title"})
    @DisplayName("保持原名称更新合法，改成其他记录名称应被拒绝")
    void shouldEnforceReferenceNameUniqueness(String resource) throws Exception {
            String first = addReference(resource, "名称一");
            String second = addReference(resource, "名称二");
            success("PUT", "/" + resource + "/" + first,
                    referenceBody(resource, "名称一"));
            businessError("PUT", "/" + resource + "/" + second,
                    referenceBody(resource, "名称一"), 400);
            businessError("POST", "/" + resource,
                    referenceBody(resource, "名称一"), 400);
    }

    @Test
    @DisplayName("混合已开票和未开票订单批量删除时整批不变")
    void shouldRejectMixedBatchAtomically() throws Exception {
        String provider = addReference("provider", "供应商");
        String title = addReference("invoice-title", "个人抬头");
        String available = addOrder(provider, "未开票", "1.00");
        String invoiced = addOrder(provider, "已开票", "2.00");
        success("POST", "/invoice", invoiceBody(title, invoiced));
        businessError("PUT", "/token-order/logic", ids(available, invoiced), 403);
        businessError("DELETE", "/token-order", ids(available, invoiced), 403);
        assertEquals(2, success("GET", "/token-order", null).size());
        assertEquals(0, orderDetail(available).path("deleted").asInt());
        assertEquals(0, orderDetail(invoiced).path("deleted").asInt());
    }

    @Test
    @DisplayName("多笔订单开票、关联查询、作废、重新开票及清理")
    void shouldCompleteInvoiceLifecycle() throws Exception {
        String provider = addReference("provider", "供应商");
        String title = addReference("invoice-title", "个人抬头");
        String first = addOrder(provider, "订单一", "12.34");
        String second = addOrder(provider, "订单二", "56.78");
        assertEquals(2, success("GET", "/token-order", null).size());

        JsonNode invoice = success("POST", "/invoice", invoiceBody(title, first, second));
        String invoiceId = invoice.path("id").asText();
        assertEquals(6912L, invoice.path("totalAmountCent").asLong());
        assertEquals("VALID", invoice.path("status").asText());
        assertEquals(2, success("GET", "/token-order/i/" + invoiceId, null).size());
        assertEquals(1, success("GET", "/invoice", null).size());
        assertEquals(6912L, success("GET", "/invoice/" + invoiceId, null)
                .path("totalAmountCent").asLong());
        assertEquals(invoiceId, orderDetail(first).path("invoiceId").asText());

        businessError("POST", "/invoice", invoiceBody(title, first), 403);
        businessError("DELETE", "/token-order", ids(first), 403);
        businessError("PUT", "/token-order/logic", ids(first), 403);
        businessError("PUT", "/token-order/" + first,
                orderBody(provider, "订单一", "13.00"), 403);
        assertEquals(1L, invoiceCount());

        success("PUT", "/invoice/" + invoiceId, null);
        success("PUT", "/invoice/" + invoiceId, null);
        assertEquals("INVALID", success("GET", "/invoice/" + invoiceId, null)
                .path("status").asText());
        assertTrue(orderDetail(first).path("invoiceId").isNull());
        assertEquals("UNINVOICED", orderDetail(second).path("invoiceStatus").asText());
        assertEquals(0, success("GET", "/token-order/i/" + invoiceId, null).size());

        String next = success("POST", "/invoice", invoiceBody(title, first))
                .path("id").asText();
        assertNotEquals(invoiceId, next);
        success("PUT", "/invoice/" + next, null);
        success("DELETE", "/token-order", ids(first, second));
        assertEquals(0, success("GET", "/token-order", null).size());
    }

    @Test
    @DisplayName("逻辑删除与恢复更新时间，恢复不写入发票关联")
    void shouldRestoreOrderAndRefreshTimestamp() throws Exception {
        String provider = addReference("provider", "供应商");
        String order = addOrder(provider, "订单", "12.34");
        assertNotNull(timestamp("created_at", order));
        assertNotNull(timestamp("updated_at", order));
        success("PUT", "/token-order/logic", ids(order));
        assertEquals(1, orderDetail(order).path("deleted").asInt());
        jdbc.update("UPDATE token_order SET updated_at = ? WHERE id = ?", OLD_TIME, order);
        success("PUT", "/token-order/recover", ids(order));
        assertNull(timestamp("deleted_at", order));
        assertTrue(orderDetail(order).path("invoiceId").isNull());
        assertTrue(timestamp("updated_at", order).isAfter(LocalDateTime.parse(OLD_TIME)));
        assertEquals(0, orderDetail(order).path("deleted").asInt());
    }

    @Test
    @DisplayName("新增和更新金额精确到分，拒绝小数截断及溢出")
    void shouldConvertAmountsExactly() throws Exception {
        String provider = addReference("provider", "供应商");
        String order = addOrder(provider, "订单", "12.34");
        LocalDateTime created = timestamp("created_at", order);
        jdbc.update("UPDATE token_order SET updated_at = ? WHERE id = ?", OLD_TIME, order);
        assertEquals(1234L, success("PUT", "/token-order/" + order,
                orderBody(provider, "订单", "12.34")).path("amountCent").asLong());
        assertEquals(created, timestamp("created_at", order));
        assertTrue(timestamp("updated_at", order).isAfter(LocalDateTime.parse(OLD_TIME)));
        for (String invalid : List.of("1.239", "92233720368547758.08")) {
            businessError("POST", "/token-order", orderBody(provider, "非法", invalid), 400);
            businessError("PUT", "/token-order/" + order,
                    orderBody(provider, "非法", invalid), 400);
        }
        assertEquals(1234L, orderDetail(order).path("amountCent").asLong());
    }

    @Test
    @DisplayName("嵌套校验、日期、支付方式、金额及 JSON 错误返回统一格式")
    void shouldRejectInvalidHttpRequests() throws Exception {
        String provider = addReference("provider", "供应商");
        String title = addReference("invoice-title", "个人抬头");
        String order = addOrder(provider, "订单", "1.00");
        httpError("POST", "/provider", Map.of());
        httpError("POST", "/invoice-title", Map.of());
        httpError("POST", "/invoice", Map.of());
        httpError("POST", "/invoice", invoiceBody(title));
        httpError("POST", "/invoice", invoiceBody(title, " "));
        httpError("POST", "/token-order", orderBody(provider, "订单", "-1"));
        httpError("POST", "/token-order", Map.of(
                "orderNo", "订单", "amount", 1, "providerId", provider,
                "paymentType", "UNKNOWN"));
        httpError("POST", "/invoice", Map.of(
                "invoiceRequest", Map.of("invoiceNo", "未来发票", "totalAmountCent", 1,
                        "invoiceTitleId", title, "invoiceDate", LocalDate.now().plusDays(1).toString()),
                "batchIdRequest", ids(order)));
        JsonNode malformed = exchange("POST", "/provider", "{", 400);
        assertEquals(400, malformed.path("code").asInt());
        assertFalse(malformed.path("message").asText().isBlank());
        assertEquals(0L, invoiceCount());
    }

    @Test
    @DisplayName("不存在资源返回业务404，不产生部分发票")
    void shouldRejectMissingResources() throws Exception {
        for (String resource : List.of("provider", "invoice-title", "token-order", "invoice")) {
            businessError("GET", "/" + resource + "/missing", null, 404);
        }
        businessError("PUT", "/invoice/missing", null, 404);
        String provider = addReference("provider", "供应商");
        String title = addReference("invoice-title", "个人抬头");
        String order = addOrder(provider, "订单", "1.00");
        businessError("POST", "/invoice", invoiceBody("missing", order), 404);
        businessError("POST", "/invoice", invoiceBody(title, order, "missing"), 404);
        success("PUT", "/token-order/logic", ids(order));
        businessError("POST", "/invoice", invoiceBody(title, order), 403);
        assertEquals(0L, invoiceCount());
        assertTrue(orderDetail(order).path("invoiceId").isNull());
    }

    @Test
    @DisplayName("合计long边界正确，超范围失败且不插入发票")
    void shouldGuardTotalOverflow() throws Exception {
        String provider = addReference("provider", "供应商");
        String title = addReference("invoice-title", "个人抬头");
        String first = addOrder(provider, "大额", "1.00");
        String second = addOrder(provider, "一分", "0.01");
        jdbc.update("UPDATE token_order SET amount_cent = ? WHERE id = ?", Long.MAX_VALUE - 1, first);
        JsonNode maximum = success("POST", "/invoice", invoiceBody(title, first, second));
        assertEquals(Long.MAX_VALUE, maximum.path("totalAmountCent").asLong());
        success("PUT", "/invoice/" + maximum.path("id").asText(), null);
        jdbc.update("UPDATE token_order SET amount_cent = ? WHERE id = ?", Long.MAX_VALUE, first);
        businessError("POST", "/invoice", invoiceBody(title, first, second), 403);
        assertEquals(1L, invoiceCount());
        assertTrue(orderDetail(first).path("invoiceId").isNull());
    }

    @Test
    @DisplayName("订单关联写入失败，回滚已插入的发票")
    void shouldRollbackInvoiceWhenBindingFails() throws Exception {
        String provider = addReference("provider", "供应商");
        String title = addReference("invoice-title", "个人抬头");
        String order = addOrder(provider, "订单", "1.00");
        jdbc.execute("CREATE TRIGGER test_fail_binding BEFORE UPDATE OF invoice_id ON token_order "
                + "WHEN NEW.invoice_id IS NOT NULL BEGIN "
                + "SELECT RAISE(ABORT, 'test binding failure'); END");
        assertRequestFails("POST", "/invoice", invoiceBody(title, order), "test binding failure");
        assertEquals(0L, invoiceCount());
        assertTrue(orderDetail(order).path("invoiceId").isNull());
    }

    @Test
    @DisplayName("作废状态写入失败，回滚解绑；正常作废刷新订单时间")
    void shouldRollbackCancellationAndUpdateTime() throws Exception {
        String provider = addReference("provider", "供应商");
        String title = addReference("invoice-title", "个人抬头");
        String order = addOrder(provider, "订单", "1.00");
        String invoice = success("POST", "/invoice", invoiceBody(title, order))
                .path("id").asText();
        jdbc.execute("CREATE TRIGGER test_fail_cancel BEFORE UPDATE OF status ON invoice "
                + "BEGIN SELECT RAISE(ABORT, 'test cancellation failure'); END");
        assertRequestFails("PUT", "/invoice/" + invoice, null, "test cancellation failure");
        assertEquals(invoice, orderDetail(order).path("invoiceId").asText());
        assertEquals("VALID", success("GET", "/invoice/" + invoice, null).path("status").asText());
        jdbc.execute("DROP TRIGGER test_fail_cancel");
        jdbc.update("UPDATE token_order SET updated_at = ? WHERE id = ?", OLD_TIME, order);
        success("PUT", "/invoice/" + invoice, null);
        assertTrue(timestamp("updated_at", order).isAfter(LocalDateTime.parse(OLD_TIME)));
    }

    private String addReference(String resource, String name) throws Exception {
        return success("POST", "/" + resource, referenceBody(resource, name)).path("id").asText();
    }

    private Map<String, Object> referenceBody(String resource, String name) {
        if ("provider".equals(resource)) {
            return Map.of("name", name, "website", "https://example.com");
        }
        return Map.of("titleType", "PERSONAL", "name", name, "taxCode", "");
    }

    private String addOrder(String provider, String number, String amount) throws Exception {
        return success("POST", "/token-order", orderBody(provider, number, amount)).path("id").asText();
    }

    private Map<String, Object> orderBody(String provider, String number, String amount) {
        return Map.of("orderNo", number, "amount", new java.math.BigDecimal(amount),
                "paymentType", "ALIPAY", "providerId", provider);
    }

    private Map<String, Object> invoiceBody(String title, String... orders) {
        return Map.of("invoiceRequest", Map.of(
                        "invoiceNo", "TEST-INVOICE", "totalAmountCent", 1,
                        "invoiceDate", LocalDate.now().toString(), "invoiceTitleId", title),
                "batchIdRequest", ids(orders));
    }

    private Map<String, List<String>> ids(String... values) {
        return Map.of("ids", List.of(values));
    }

    private JsonNode orderDetail(String id) throws Exception {
        return success("GET", "/token-order/" + id, null);
    }

    private long invoiceCount() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM invoice", Long.class);
    }

    private LocalDateTime timestamp(String column, String order) {
        assertTrue(List.of("created_at", "updated_at", "deleted_at").contains(column));
        return jdbc.queryForObject("SELECT " + column + " FROM token_order WHERE id = ?",
                (result, row) -> result.getObject(1, LocalDateTime.class), order);
    }

    private JsonNode success(String method, String path, Object body) throws Exception {
        JsonNode result = exchange(method, path, body, 200);
        assertEquals(200, result.path("code").asInt(), result.toString());
        return result.path("data");
    }

    private void businessError(String method, String path, Object body, int code) throws Exception {
        JsonNode result = exchange(method, path, body, 200);
        assertEquals(code, result.path("code").asInt(), result.toString());
        assertTrue(result.path("data").isNull());
    }

    private void httpError(String method, String path, Object body) throws Exception {
        JsonNode result = exchange(method, path, body, 400);
        assertEquals(400, result.path("code").asInt());
        assertFalse(result.path("message").asText().isBlank());
    }

    private JsonNode exchange(String method, String path, Object body, int status) throws Exception {
        var builder = request(HttpMethod.valueOf(method), "/api/v1" + path);
        if (body != null) {
            builder.contentType("application/json");
            builder.content(body instanceof String raw ? raw : JSON.writeValueAsString(body));
        }
        var response = mvc.perform(builder)
                .andReturn()
                .getResponse();
        String content = response.getContentAsString(StandardCharsets.UTF_8);
        assertEquals(status, response.getStatus(), method + " " + path + ": " + content);
        assertFalse(content.isBlank(), "响应必须包含统一 JSON");
        return JSON.readTree(content);
    }

    private void assertRequestFails(
            String method, String path, Object body, String marker
    ) throws Exception {
        var builder = request(HttpMethod.valueOf(method), "/api/v1" + path);
        if (body != null) {
            builder.contentType("application/json");
            builder.content(JSON.writeValueAsString(body));
        }
        try {
            var result = mvc.perform(builder)
                    .andReturn();
            assertTrue(result.getResponse().getStatus() >= 500, "数据库故障不能返回成功");
            assertCauseContains(result.getResolvedException(), marker);
        } catch (jakarta.servlet.ServletException exception) {
            assertCauseContains(exception, marker);
        }
    }

    private void assertCauseContains(Throwable exception, String marker) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause.getMessage() != null && cause.getMessage().contains(marker)) {
                return;
            }
        }
        fail("必须由预设触发器导致失败: " + marker, exception);
    }
}
