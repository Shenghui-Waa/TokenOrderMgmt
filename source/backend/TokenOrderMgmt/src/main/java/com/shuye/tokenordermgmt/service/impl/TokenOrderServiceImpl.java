package com.shuye.tokenordermgmt.service.impl;

import com.shuye.tokenordermgmt.common.constant.TokenOrderConstant;
import com.shuye.tokenordermgmt.common.dto.BatchIdRequest;
import com.shuye.tokenordermgmt.common.dto.Result;
import com.shuye.tokenordermgmt.common.dto.TokenOrderRequest;
import com.shuye.tokenordermgmt.common.entity.InvoiceEntity;
import com.shuye.tokenordermgmt.common.entity.InvoiceTitleEntity;
import com.shuye.tokenordermgmt.common.entity.TokenOrderEntity;
import com.shuye.tokenordermgmt.common.exception.BusinessException;
import com.shuye.tokenordermgmt.common.util.ToEntity;
import com.shuye.tokenordermgmt.common.util.ToVO;
import com.shuye.tokenordermgmt.common.vo.TokenOrderVO;
import com.shuye.tokenordermgmt.mapper.*;
import com.shuye.tokenordermgmt.service.TokenOrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TokenOrderServiceImpl implements TokenOrderService {

    private final TokenOrderMapper tokenOrderMapper;
    private final ProviderMapper providerMapper;
    private final InvoiceTitleMapper invoiceTitleMapper;
    private final InvoiceMapper invoiceMapper;

    @Override
    public List<TokenOrderVO> list() {

        List<TokenOrderEntity> tokenOrder = tokenOrderMapper.select();
        List<TokenOrderVO> voList = ToVO.toTokenOrderVOList(tokenOrder);
        voList.forEach(vo -> fillProviderAndInvoiceDetail(vo, vo.getProviderId()));

        return voList;
    }

    @Override
    public List<TokenOrderVO> listByInvoiceId(String invoiceId) {

        List<TokenOrderEntity> tokenOrder = tokenOrderMapper.selectByInvoice(invoiceId);
        List<TokenOrderVO> voList = ToVO.toTokenOrderVOList(tokenOrder);
        voList.forEach(vo -> fillProviderAndInvoiceDetail(vo, vo.getProviderId()));

        return voList;
    }

    @Override
    public TokenOrderVO detail(String id) {

        TokenOrderEntity tokenOrder = tokenOrderMapper.selectById(id);
        if (tokenOrder == null)
            throw new BusinessException(Result.Code.NOT_FOUND, "The token order does not exist");
        TokenOrderVO tokenOrderVO = ToVO.toTokenOrderVO(tokenOrder);
        fillProviderAndInvoiceDetail(tokenOrderVO, tokenOrder.getProviderId());

        return tokenOrderVO;
    }

    @Override
    public TokenOrderVO add(TokenOrderRequest request) {

        TokenOrderEntity entity = ToEntity.toTokenOrderEntity(request);
        tokenOrderMapper.insert(entity);

        return ToVO.toTokenOrderVO(tokenOrderMapper.selectById(entity.getId()));
    }

    @Override
    public TokenOrderVO update(String id, TokenOrderRequest request) {

        TokenOrderEntity entity = tokenOrderMapper.selectById(id);
        if (entity == null)
            throw new BusinessException(Result.Code.NOT_FOUND, "The token order does not exist");
        entity.setOrderNo(request.getOrderNo());
        entity.setAmountCent(request.getAmount().multiply(new BigDecimal(100)).longValue());
        entity.setPaymentType(request.getPaymentType());
        entity.setProviderId(request.getProviderId());
        tokenOrderMapper.updateById(entity);

        return ToVO.toTokenOrderVO(tokenOrderMapper.selectById(entity.getId()));
    }

    @Override
    public Void deleteLogic(BatchIdRequest request) {

        List<TokenOrderEntity> tokenOrder = tokenOrderMapper.selectByIdsAndDeleted(request.getIds(), TokenOrderConstant.DELETED_NO);
        tokenOrder.forEach(item -> item.setDeletedAt(LocalDateTime.now()));
        tokenOrderMapper.updateById(tokenOrder);

        return null;
    }

    @Override
    public Void recover(BatchIdRequest request) {

        List<TokenOrderEntity> tokenOrder = tokenOrderMapper.selectByIdsAndDeleted(request.getIds(), TokenOrderConstant.DELETED_YES);
        tokenOrder.forEach(item -> item.setDeletedAt(null));
        tokenOrderMapper.updateById(tokenOrder);

        return null;
    }

    @Override
    public Void deletePhysical(BatchIdRequest request) {

        tokenOrderMapper.deleteByIds(request.getIds());

        return null;
    }


    // ===========
    // #  私有方法
    // ===========

    private void fillProviderAndInvoiceDetail(
            TokenOrderVO tokenOrderVO, String providerId
    ) {
        tokenOrderVO.setProviderName(providerMapper.selectById(providerId).getName());
        if (tokenOrderVO.getInvoiceStatus().equals(TokenOrderConstant.InvoiceStatus.INVOICED.toString())) {
            InvoiceEntity invoiceEntity = invoiceMapper.selectById(tokenOrderVO.getInvoiceId());
            InvoiceTitleEntity invoiceTitleEntity = invoiceTitleMapper.selectById(invoiceEntity.getInvoiceTitleId());
            tokenOrderVO.setInvoiceType(invoiceTitleEntity.getTitleType());
        }
    }

}
