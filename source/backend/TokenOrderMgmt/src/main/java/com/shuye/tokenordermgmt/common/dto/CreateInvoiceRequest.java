package com.shuye.tokenordermgmt.common.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateInvoiceRequest {

    @NotNull(message = "发票信息不能为空")
    @Valid
    private InvoiceRequest invoiceRequest;

    @NotNull(message = "订单选择不能为空")
    @Valid
    private BatchIdRequest batchIdRequest;

}
