package com.shuye.tokenordermgmt.common.util;

import com.shuye.tokenordermgmt.common.constant.TokenOrderConstant;
import com.shuye.tokenordermgmt.common.entity.ProviderEntity;
import com.shuye.tokenordermgmt.common.entity.TokenOrderEntity;
import com.shuye.tokenordermgmt.common.vo.ProviderVO;
import com.shuye.tokenordermgmt.common.vo.TokenOrderVO;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class ToVO {

    public static TokenOrderVO toTokenOrderVO(
            TokenOrderEntity tokenOrder
    ) {
        TokenOrderVO vo = new TokenOrderVO();

        vo.setId(tokenOrder.getId());
        vo.setOrderNo(tokenOrder.getOrderNo());
        vo.setAmountCent(tokenOrder.getAmountCent());
        vo.setPaymentType(tokenOrder.getPaymentType());
        vo.setProviderId(tokenOrder.getProviderId());

        vo.setInvoiceId(tokenOrder.getInvoiceId());
        vo.setInvoiceStatus(
                tokenOrder.getInvoiceId() == null
                        ? TokenOrderConstant.InvoiceStatus.UNINVOICED.toString()
                        : TokenOrderConstant.InvoiceStatus.INVOICED.toString()
        );

        vo.setDeleted(
                tokenOrder.getDeletedAt() == null
                        ? TokenOrderConstant.DELETED_NO
                        : TokenOrderConstant.DELETED_YES
        );

        return vo;

    }

    public static ProviderVO toProviderVO(ProviderEntity provider) {

        ProviderVO vo = new ProviderVO();
        vo.setId(provider.getId());
        vo.setName(provider.getName());
        vo.setWebsite(provider.getWebsite());
        return vo;

    }

    public static List<ProviderVO> toProviderVOList(List<ProviderEntity> provider) {

        List<ProviderVO> voList = new ArrayList<>();
        provider.forEach(item -> {
            voList.add(toProviderVO(item));
        });
        return voList;

    }

}
