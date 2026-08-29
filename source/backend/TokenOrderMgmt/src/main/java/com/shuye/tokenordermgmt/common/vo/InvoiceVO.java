package com.shuye.tokenordermgmt.common.vo;

import lombok.Data;

@Data
public class InvoiceVO {

    private String id;
    private String invoiceNo;
    private Long totalAmountCent;
    private String invoiceDate;
    private String invoiceType;

    private String providerId;
    private String providerName;

    private String invoiceTitleId;
    private String invoiceTitleName;

    private String status;

}
