package com.shuye.tokenordermgmt.service;

import com.shuye.tokenordermgmt.common.dto.BatchIdRequest;
import com.shuye.tokenordermgmt.common.dto.InvoiceTitleRequest;
import com.shuye.tokenordermgmt.common.vo.InvoiceTitleVO;

import java.util.List;

public interface InvoiceTitleService {

    List<InvoiceTitleVO> list();

    InvoiceTitleVO detail(String id);

    InvoiceTitleVO add(InvoiceTitleRequest request);

    InvoiceTitleVO update(String id, InvoiceTitleRequest request);

    Void delete(BatchIdRequest request);

}
