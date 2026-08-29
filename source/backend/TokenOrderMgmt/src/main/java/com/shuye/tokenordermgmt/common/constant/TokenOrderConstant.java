package com.shuye.tokenordermgmt.common.constant;

import org.springframework.stereotype.Component;

@Component
public class TokenOrderConstant {

    private TokenOrderConstant() {}

    public enum PaymentType {
        UNION_PAY,  // 银联
        MASTERCARD, // 万事达
        VISA,       // Visa
        ALIPAY,     // 支付宝
        WECHAT_PAY, // 微信支付
        MI_PAY,     // 小米支付
        APPLE_PAY,  // 苹果支付
        GOOGLE_PAY  // 谷歌支付
    }

    public enum InvoiceStatus {
        INVOICED,   // 已开票
        UNINVOICED  // 未开票
    }

    public static final Integer DELETED_NO = 0;     // 未删除
    public static final Integer DELETED_YES = 1;    // 已删除

}
