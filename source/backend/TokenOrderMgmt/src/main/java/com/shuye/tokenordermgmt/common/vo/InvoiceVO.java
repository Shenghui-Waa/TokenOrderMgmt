package com.shuye.tokenordermgmt.common.vo;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class InvoiceVO {

    private String id;
    private String invoiceNo;
    private Long totalAmountCent;
    private LocalDate invoiceDate;
    private String invoiceType;

    private String invoiceTitleId;
    private String invoiceTitleName;

    private String status;

    private LocalDateTime updatedAt;

}
