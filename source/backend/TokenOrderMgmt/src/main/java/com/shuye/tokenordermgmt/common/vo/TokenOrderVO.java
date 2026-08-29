package com.shuye.tokenordermgmt.common.vo;

import lombok.Data;

@Data
public class TokenOrderVO {

    private String id;
    private String orderNo;
    private Long amountCent;
    private String paymentType;

    private String providerId;
    private String providerName;

    private String invoiceId;
    private String invoiceStatus;
    private String invoiceType;

    private Integer deleted;

}
