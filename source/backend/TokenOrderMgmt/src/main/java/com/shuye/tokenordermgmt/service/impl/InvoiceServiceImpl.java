package com.shuye.tokenordermgmt.service.impl;

import com.shuye.tokenordermgmt.common.constant.InvoiceConstant;
import com.shuye.tokenordermgmt.common.dto.BatchIdRequest;
import com.shuye.tokenordermgmt.common.dto.InvoiceRequest;
import com.shuye.tokenordermgmt.common.dto.Result;
import com.shuye.tokenordermgmt.common.entity.InvoiceEntity;
import com.shuye.tokenordermgmt.common.entity.TokenOrderEntity;
import com.shuye.tokenordermgmt.common.exception.BusinessException;
import com.shuye.tokenordermgmt.common.util.ToEntity;
import com.shuye.tokenordermgmt.common.util.ToVO;
import com.shuye.tokenordermgmt.common.vo.InvoiceVO;
import com.shuye.tokenordermgmt.mapper.InvoiceMapper;
import com.shuye.tokenordermgmt.mapper.InvoiceTitleMapper;
import com.shuye.tokenordermgmt.mapper.TokenOrderMapper;
import com.shuye.tokenordermgmt.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

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
    @Transactional(rollbackFor = BusinessException.class)
    public InvoiceVO create(InvoiceRequest invoiceRequest, BatchIdRequest batchIdRequest) {
        log.info("[RUNNING][InvoiceService.create]: Create Invoice...");

        // 验证抬头存在
        if (invoiceTitleMapper.selectById(invoiceRequest.getInvoiceTitleId()) == null)
            throw new BusinessException(Result.Code.NOT_FOUND, "The invoice title does not exist");

        // 确保 id 非空无重复
        Set<String> idSet = new HashSet<>();
        for (String id : batchIdRequest.getIds()) {
            if (id == null || idSet.contains(id))
                continue;
            idSet.add(id);
        }
        if (idSet.isEmpty())
            throw new BusinessException(Result.Code.FORBIDDEN, "The batch id is empty");
        List<String> tokenOrderIds = idSet.stream().toList();

        // 防止忽略不存在的 id
        List<TokenOrderEntity> tokenOrders = tokenOrderMapper.selectByIds(tokenOrderIds);
        if (tokenOrders.size() != tokenOrderIds.size())
            throw new BusinessException(Result.Code.NOT_FOUND, "Some token orders do not exist");

        // 确认全部订单未删除、未开票
        tokenOrders.forEach(tokenOrder -> {
            if (tokenOrder.getDeletedAt() != null || tokenOrder.getInvoiceId() != null)
                throw new BusinessException(Result.Code.FORBIDDEN, "The token order is disabled");
        });

        InvoiceEntity invoice = ToEntity.toInvoiceEntity(invoiceRequest);
        // 合计金额
        long totalAmountCent = 0L;
        try {
            for (TokenOrderEntity tokenOrder : tokenOrders) {
                Long amountCent = tokenOrder.getAmountCent();
                if (amountCent == null || amountCent <= 0L)
                    throw new BusinessException(Result.Code.FORBIDDEN, "The amount cent is invalid");
                totalAmountCent = Math.addExact(totalAmountCent, amountCent);
            }
        } catch (ArithmeticException e) {
            throw new BusinessException(Result.Code.FORBIDDEN, "The total amount cent is too large");
        }
        invoice.setTotalAmountCent(totalAmountCent);
        invoiceMapper.insert(invoice);
        // 关联发票
        tokenOrders.forEach(tokenOrder -> {
            tokenOrder.setInvoiceId(invoice.getId());
        });
        tokenOrderMapper.updateById(tokenOrders);
        InvoiceVO vo = ToVO.toInvoiceVO(invoiceMapper.selectById(invoice.getId()));
        fillInvoiceTypeAndInvoiceTitleName(vo, invoice.getInvoiceTitleId());

        log.info("[SUCCESS][InvoiceService.create]: Created.");
        return vo;
    }

    @Override
    @Transactional(rollbackFor = BusinessException.class)
    public Void cancel(String id) {
        log.info("[RUNNING][InvoiceService.cancel]: Cancel Invoices...");

        InvoiceEntity invoice = invoiceMapper.selectById(id);
        if (invoice == null)
            throw new BusinessException(Result.Code.NOT_FOUND, "The invoice does not exist");
        tokenOrderMapper.cancelInvoice(id, LocalDateTime.now());
        invoice.setStatus(InvoiceConstant.Status.INVALID.toString());
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
