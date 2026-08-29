package com.shuye.tokenordermgmt.common.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class TokenOrderRequest {

    @NotBlank(message = "订单编号不能为空")
    @Size(max = 100, message = "订单编号不能超过 100 个字符")
    private String orderNo;

    @NotNull(message = "订单金额不能为空")
    @DecimalMin(value = "0.01", message = "订单金额必须大于 0")
    private BigDecimal amount;

    @NotBlank(message = "请选择支付方式")
    @Pattern(
            regexp = "UNION_PAY|MASTERCARD|VISA|ALIPAY|WECHAT_PAY|MI_PAY|APPLE_PAY|GOOGLE_PAY",
            message = "支付方式不正确"
    )
    private String paymentType;

    @NotBlank(message = "请选择提供商")
    private String providerId;

}
