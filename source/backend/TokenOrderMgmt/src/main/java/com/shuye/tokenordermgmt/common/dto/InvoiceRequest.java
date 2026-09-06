package com.shuye.tokenordermgmt.common.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;

@Data
public class InvoiceRequest {

    @NotBlank(message = "发票编号不能为空")
    @Size(max = 100, message = "发票编号不能超过 100 个字符")
    private String invoiceNo;

    @NotNull(message = "总订单金额不能为空")
    @DecimalMin(value = "0.01", message = "总订单金额必须大于 0")
    private Long totalAmountCent;

    @NotNull(message = "开票日期不能为空")
    @PastOrPresent(message = "开票日期不能晚于今天")
    private LocalDate invoiceDate;

    @NotNull(message = "请选择发票抬头")
    private String invoiceTitleId;

}
