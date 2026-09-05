package com.shuye.tokenordermgmt.service;

import com.shuye.tokenordermgmt.common.dto.BatchIdRequest;
import com.shuye.tokenordermgmt.common.dto.TokenOrderRequest;
import com.shuye.tokenordermgmt.common.vo.TokenOrderVO;

import java.util.List;

public interface TokenOrderService {

    List<TokenOrderVO> list();

    List<TokenOrderVO> listByInvoiceId(String invoiceId);

    TokenOrderVO detail(String id);

    TokenOrderVO add(TokenOrderRequest request);

    TokenOrderVO update(String id, TokenOrderRequest request);

    Void deleteLogic(BatchIdRequest request);

    Void recover(BatchIdRequest request);

    Void deletePhysical(BatchIdRequest request);

}
