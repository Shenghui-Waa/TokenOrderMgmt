package com.shuye.tokenordermgmt.service.impl;

import com.shuye.tokenordermgmt.common.entity.InvoiceEntity;
import com.shuye.tokenordermgmt.common.entity.InvoiceTitleEntity;
import com.shuye.tokenordermgmt.common.util.ToVO;
import com.shuye.tokenordermgmt.common.vo.InvoiceVO;
import com.shuye.tokenordermgmt.mapper.InvoiceMapper;
import com.shuye.tokenordermgmt.mapper.InvoiceTitleMapper;
import com.shuye.tokenordermgmt.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceMapper invoiceMapper;
    private final InvoiceTitleMapper invoiceTitleMapper;

    @Override
    public List<InvoiceVO> list() {

        List<InvoiceEntity> invoice = invoiceMapper.select();
        List<InvoiceVO> voList = ToVO.toInvoiceVOList(invoice);
        voList.forEach(item -> {
            InvoiceTitleEntity invoiceTitleEntity = invoiceTitleMapper.selectById(item.getInvoiceTitleId());
            item.setInvoiceType(invoiceTitleEntity.getTitleType());
            item.setInvoiceTitleName(invoiceTitleEntity.getName());
        });

        return voList;
    }



}
