package com.shuye.tokenordermgmt.service.impl;

import com.shuye.tokenordermgmt.common.constant.InvoiceConstant;
import com.shuye.tokenordermgmt.common.dto.BatchIdRequest;
import com.shuye.tokenordermgmt.common.dto.InvoiceRequest;
import com.shuye.tokenordermgmt.common.dto.Result;
import com.shuye.tokenordermgmt.common.entity.InvoiceEntity;
import com.shuye.tokenordermgmt.common.entity.InvoiceTitleEntity;
import com.shuye.tokenordermgmt.common.entity.TokenOrderEntity;
import com.shuye.tokenordermgmt.common.exception.BusinessException;
import com.shuye.tokenordermgmt.common.util.ToEntity;
import com.shuye.tokenordermgmt.common.util.ToVO;
import com.shuye.tokenordermgmt.common.vo.InvoiceTitleVO;
import com.shuye.tokenordermgmt.common.vo.InvoiceVO;
import com.shuye.tokenordermgmt.mapper.InvoiceMapper;
import com.shuye.tokenordermgmt.mapper.InvoiceTitleMapper;
import com.shuye.tokenordermgmt.mapper.TokenOrderMapper;
import com.shuye.tokenordermgmt.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceMapper invoiceMapper;
    private final InvoiceTitleMapper invoiceTitleMapper;
    private final TokenOrderMapper tokenOrderMapper;

    @Override
    public List<InvoiceVO> list() {
        log.info("[RUNNING][InvoiceService.list]: List Invoices...");

        List<InvoiceEntity> invoice = invoiceMapper.select();
        List<InvoiceVO> voList = ToVO.toInvoiceVOList(invoice);
        voList.forEach(item -> {
            fillInvoiceTypeAndInvoiceTitleName(item, item.getInvoiceTitleId());
        });

        log.info("[SUCCESS][InvoiceService.list]: Listed.");
        return voList;
    }

    @Override
    public InvoiceVO detail(String id) {
        log.info("[RUNNING][InvoiceService.detail]: Detail Invoice...");

        InvoiceEntity entity = invoiceMapper.selectById(id);
        if (entity == null)
            throw new BusinessException(Result.Code.NOT_FOUND, "The invoice does not exist");
        InvoiceVO vo = ToVO.toInvoiceVO(entity);
        fillInvoiceTypeAndInvoiceTitleName(vo, entity.getInvoiceTitleId());

        log.info("[SUCCESS][InvoiceService.list]: Detailed.");
        return vo;
    }

    @Override
    public InvoiceVO create(InvoiceRequest invoiceRequest, BatchIdRequest batchIdRequest) {
        log.info("[RUNNING][InvoiceService.create]: Create Invoice...");

        InvoiceEntity invoice = ToEntity.toInvoiceEntity(invoiceRequest);
        List<TokenOrderEntity> tokenOrders = tokenOrderMapper.selectByIds(batchIdRequest.getIds());
        AtomicReference<Long> totalAmount = new AtomicReference<>(0L);
        tokenOrders.forEach(tokenOrder -> {
            totalAmount.updateAndGet(v -> v + tokenOrder.getAmountCent());
        });
        invoice.setTotalAmountCent(totalAmount.get());
        invoiceMapper.insert(invoice);
        InvoiceVO vo = ToVO.toInvoiceVO(invoiceMapper.selectById(invoice.getId()));
        fillInvoiceTypeAndInvoiceTitleName(vo, invoice.getInvoiceTitleId());

        log.info("[SUCCESS][InvoiceService.create]: Created.");
        return vo;
    }

    @Override
    @Transactional
    public Void cancel(String id) {
        log.info("[RUNNING][InvoiceService.cancel]: Cancel Invoices...");

        List<TokenOrderEntity> tokenOrders = tokenOrderMapper.selectByInvoice(id);
        InvoiceEntity invoice = invoiceMapper.selectById(id);
        tokenOrders.forEach(tokenOrder -> {
            tokenOrder.setInvoiceId(null);
        });
        invoice.setStatus(InvoiceConstant.Status.INVALID.toString());
        tokenOrderMapper.updateById(tokenOrders);
        invoiceMapper.updateById(invoice);

        log.info("[SUCCESS][InvoiceService.cancel]: Canceled.");
        return null;
    }

    // ===========
    // #  私有方法
    // ===========

    private void fillInvoiceTypeAndInvoiceTitleName(
            InvoiceVO invoiceVO, String invoiceTitleId
    ) {
        invoiceVO.setInvoiceType(invoiceTitleMapper.selectById(invoiceTitleId).getTitleType());
        invoiceVO.setInvoiceTitleName(invoiceTitleMapper.selectById(invoiceTitleId).getName());
    }


}
