package com.shuye.tokenordermgmt.common.util;

import com.shuye.tokenordermgmt.common.dto.InvoiceTitleRequest;
import com.shuye.tokenordermgmt.common.dto.ProviderRequest;
import com.shuye.tokenordermgmt.common.entity.InvoiceTitleEntity;
import com.shuye.tokenordermgmt.common.entity.ProviderEntity;
import org.springframework.stereotype.Component;

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
}
