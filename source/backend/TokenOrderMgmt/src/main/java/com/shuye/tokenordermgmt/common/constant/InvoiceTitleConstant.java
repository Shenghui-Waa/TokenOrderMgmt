package com.shuye.tokenordermgmt.common.constant;

import org.springframework.stereotype.Component;

@Component
public class InvoiceTitleConstant {

    private InvoiceTitleConstant() {}

    public enum TitleType {
        PERSONAL,   // 个人
        COMPANY     // 企业
    }

}
