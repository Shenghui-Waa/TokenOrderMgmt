package com.shuye.tokenordermgmt.common.constant;

import org.springframework.stereotype.Component;

@Component
public class InvoiceConstant {

    private InvoiceConstant() {}

    public enum Status {
        VALID,      // 有效
        INVALID     // 无效
    }

}
