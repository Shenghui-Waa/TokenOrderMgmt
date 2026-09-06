package com.shuye.tokenordermgmt.common.util;

import com.shuye.tokenordermgmt.common.constant.InvoiceConstant;
import com.shuye.tokenordermgmt.common.dto.*;
import com.shuye.tokenordermgmt.common.entity.InvoiceEntity;
import com.shuye.tokenordermgmt.common.entity.InvoiceTitleEntity;
import com.shuye.tokenordermgmt.common.entity.ProviderEntity;
import com.shuye.tokenordermgmt.common.entity.TokenOrderEntity;
import com.shuye.tokenordermgmt.common.exception.BusinessException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Objects;

@Component
public class ToEntity {

    public static ProviderEntity toProviderEntity(ProviderRequest request) {
        ProviderEntity entity = new ProviderEntity();
        entity.setName(request.getName());
        entity.setWebsite(request.getWebsite());
        return entity;
    }

    public static InvoiceTitleEntity toInvoiceTitleEntity(InvoiceTitleRequest request) {
        InvoiceTitleEntity entity = new InvoiceTitleEntity();
        entity.setTitleType(request.getTitleType());
        entity.setName(request.getName());
        entity.setTaxCode(request.getTaxCode());
        return entity;
    }

    public static TokenOrderEntity toTokenOrderEntity(TokenOrderRequest request) {
        TokenOrderEntity entity = new TokenOrderEntity();
        entity.setOrderNo(request.getOrderNo());

        try {
            Long amountCent = request.getAmount()
                    .movePointRight(2)
                    .longValueExact();
            entity.setAmountCent(amountCent);
        } catch (ArithmeticException e) {
            throw new BusinessException(Result.Code.ERROR, "The amount is invalid.");
        }
        entity.setPaymentType(request.getPaymentType());
        entity.setProviderId(request.getProviderId());
        return entity;
    }

    public static InvoiceEntity toInvoiceEntity(InvoiceRequest request) {
        InvoiceEntity entity = new InvoiceEntity();
        entity.setInvoiceNo(request.getInvoiceNo());
        // total amount cent
        entity.setInvoiceDate(request.getInvoiceDate());
        entity.setInvoiceTitleId(request.getInvoiceTitleId());
        entity.setStatus(InvoiceConstant.Status.VALID.toString());
        return entity;
    }
}
