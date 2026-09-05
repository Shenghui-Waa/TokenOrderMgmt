package com.shuye.tokenordermgmt.common.util;

import com.shuye.tokenordermgmt.common.constant.TokenOrderConstant;
import com.shuye.tokenordermgmt.common.entity.InvoiceEntity;
import com.shuye.tokenordermgmt.common.entity.InvoiceTitleEntity;
import com.shuye.tokenordermgmt.common.entity.ProviderEntity;
import com.shuye.tokenordermgmt.common.entity.TokenOrderEntity;
import com.shuye.tokenordermgmt.common.vo.InvoiceTitleVO;
import com.shuye.tokenordermgmt.common.vo.InvoiceVO;
import com.shuye.tokenordermgmt.common.vo.ProviderVO;
import com.shuye.tokenordermgmt.common.vo.TokenOrderVO;
import com.shuye.tokenordermgmt.mapper.InvoiceMapper;
import com.shuye.tokenordermgmt.mapper.InvoiceTitleMapper;
import com.shuye.tokenordermgmt.mapper.ProviderMapper;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class ToVO {

    public static ProviderVO toProviderVO(
            ProviderEntity provider
    ) {

        ProviderVO vo = new ProviderVO();
        vo.setId(provider.getId());
        vo.setName(provider.getName());
        vo.setWebsite(provider.getWebsite());
        return vo;

    }

    public static InvoiceTitleVO toInvoiceTitleVO(
            InvoiceTitleEntity invoiceTitle
    ) {

        InvoiceTitleVO vo = new InvoiceTitleVO();
        vo.setId(invoiceTitle.getId());
        vo.setTitleType(invoiceTitle.getTitleType());
        vo.setName(invoiceTitle.getName());
        vo.setTaxCode(invoiceTitle.getTaxCode());
        return vo;

    }

    public static TokenOrderVO toTokenOrderVO(
            TokenOrderEntity tokenOrder
    ) {
        TokenOrderVO vo = new TokenOrderVO();

        vo.setId(tokenOrder.getId());
        vo.setOrderNo(tokenOrder.getOrderNo());
        vo.setAmountCent(tokenOrder.getAmountCent());
        vo.setPaymentType(tokenOrder.getPaymentType());
        vo.setProviderId(tokenOrder.getProviderId());
        // provider name
        vo.setInvoiceId(tokenOrder.getInvoiceId());
        vo.setInvoiceStatus(
                tokenOrder.getInvoiceId() == null
                        ? TokenOrderConstant.InvoiceStatus.UNINVOICED.toString()
                        : TokenOrderConstant.InvoiceStatus.INVOICED.toString()
        );
        // invoice type
        vo.setDeleted(
                tokenOrder.getDeletedAt() == null
                        ? TokenOrderConstant.DELETED_NO
                        : TokenOrderConstant.DELETED_YES
        );
        vo.setUpdatedAt(tokenOrder.getUpdatedAt());

        return vo;

    }

    public static InvoiceVO toInvoiceVO(InvoiceEntity item) {

        InvoiceVO vo = new InvoiceVO();
        vo.setId(item.getId());
        vo.setInvoiceNo(item.getInvoiceNo());
        vo.setTotalAmountCent(item.getTotalAmountCent());
        vo.setInvoiceDate(item.getInvoiceDate());
        // invoice type
        vo.setInvoiceTitleId(item.getInvoiceTitleId());
        // invoice title name
        vo.setStatus(item.getStatus());
        vo.setUpdatedAt(item.getUpdatedAt());
        return vo;

    }

    // ==============
    // #   批量操作
    // ==============

    public static List<ProviderVO> toProviderVOList(List<ProviderEntity> provider) {

        List<ProviderVO> voList = new ArrayList<>();
        provider.forEach(item -> {
            voList.add(toProviderVO(item));
        });
        return voList;

    }

    public static List<InvoiceTitleVO> toInvoiceTitleVOList(List<InvoiceTitleEntity> invoiceTitle) {

        List<InvoiceTitleVO> voList = new ArrayList<>();
        invoiceTitle.forEach(item -> {
            voList.add(toInvoiceTitleVO(item));
        });
        return voList;

    }

    public static List<TokenOrderVO> toTokenOrderVOList(List<TokenOrderEntity> tokenOrder) {

        List<TokenOrderVO> voList = new ArrayList<>();
        tokenOrder.forEach(item -> {
            voList.add(toTokenOrderVO(item));
        });
        return voList;

    }

    public static List<InvoiceVO> toInvoiceVOList(List<InvoiceEntity> invoice) {

        List<InvoiceVO> voList = new ArrayList<>();
        invoice.forEach(item -> {
            voList.add(toInvoiceVO(item));
        });
        return voList;

    }
}
