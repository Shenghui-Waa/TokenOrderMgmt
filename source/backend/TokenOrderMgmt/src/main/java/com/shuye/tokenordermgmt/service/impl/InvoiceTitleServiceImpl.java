package com.shuye.tokenordermgmt.service.impl;

import com.shuye.tokenordermgmt.common.dto.BatchIdRequest;
import com.shuye.tokenordermgmt.common.dto.InvoiceTitleRequest;
import com.shuye.tokenordermgmt.common.dto.Result;
import com.shuye.tokenordermgmt.common.entity.InvoiceEntity;
import com.shuye.tokenordermgmt.common.entity.InvoiceTitleEntity;
import com.shuye.tokenordermgmt.common.exception.BusinessException;
import com.shuye.tokenordermgmt.common.util.ToEntity;
import com.shuye.tokenordermgmt.common.util.ToVO;
import com.shuye.tokenordermgmt.common.vo.InvoiceTitleVO;
import com.shuye.tokenordermgmt.mapper.InvoiceTitleMapper;
import com.shuye.tokenordermgmt.service.InvoiceTitleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceTitleServiceImpl implements InvoiceTitleService {

    private final InvoiceTitleMapper invoiceTitleMapper;

    @Override
    public List<InvoiceTitleVO> list() {
        log.info("[RUNNING][InvoiceTitleService.list]: List Invoice Titles...");

        List<InvoiceTitleEntity> invoiceTitle = invoiceTitleMapper.select();

        log.info("[SUCCESS][InvoiceTitleService.list]: List Invoice Titles.");
        return ToVO.toInvoiceTitleVOList(invoiceTitle);
    }

    @Override
    public InvoiceTitleVO detail(String id) {
        log.info("[RUNNING][InvoiceTitleService.detail]: Invoice Title detail...");

        InvoiceTitleEntity entity = invoiceTitleMapper.selectById(id);
        if (entity == null)
            throw new BusinessException(Result.Code.NOT_FOUND, "Invoice Title not found");

        log.info("[SUCCESS][InvoiceTitleService.detail]: Invoice Title detail.");
        return ToVO.toInvoiceTitleVO(entity);
    }

    @Override
    public InvoiceTitleVO add(InvoiceTitleRequest request) {
        log.info("[RUNNING][InvoiceTitleService.add]: Invoice Title add...");

        if (invoiceTitleMapper.selectByName(request.getName()) != null)
            throw new BusinessException("There has been a invoice title named " + request.getName());
        InvoiceTitleEntity entity = ToEntity.toInvoiceTitleEntity(request);
        invoiceTitleMapper.insert(entity);

        log.info("[SUCCESS][InvoiceTitleService.add]: Add Invoice Title: {}.", entity.getName());
        return ToVO.toInvoiceTitleVO(invoiceTitleMapper.selectById(entity.getId()));
    }

    @Override
    @Transactional(rollbackFor = BusinessException.class)
    public InvoiceTitleVO update(String id, InvoiceTitleRequest request) {
        log.info("[RUNNING][InvoiceTitleService.update]: Invoice Title update...");

        InvoiceTitleEntity entity = invoiceTitleMapper.selectById(id);
        if (entity == null)
            throw new BusinessException(Result.Code.NOT_FOUND, "The invoice title does not exist");
        entity.setTitleType(request.getTitleType());
        if (!request.getName().equals(entity.getName())) {
            InvoiceTitleEntity test = invoiceTitleMapper.selectByName(request.getName());
            if (test != null)
                throw new BusinessException("The invoice title [" + request.getName() + "] already exists");
        }
        entity.setName(request.getName());
        entity.setTaxCode(request.getTaxCode());
        invoiceTitleMapper.updateById(entity);

        log.info("[SUCCESS][InvoiceTitleService.update]: Update Invoice Title: {}.", entity.getName());
        return ToVO.toInvoiceTitleVO(invoiceTitleMapper.selectById(entity.getId()));
    }

    @Override
    public Void delete(BatchIdRequest request) {
        log.info("[RUNNING][InvoiceTitleService.delete]: Delete Invoice Titles...");

        invoiceTitleMapper.deleteByIds(request.getIds());

        log.info("[SUCCESS][InvoiceTitleService.delete]: Delete Invoice Titles: {}.", request.getIds());
        return null;
    }
}
