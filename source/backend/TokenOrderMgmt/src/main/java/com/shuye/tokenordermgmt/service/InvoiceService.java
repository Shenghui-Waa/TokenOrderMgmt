package com.shuye.tokenordermgmt.service;

import com.shuye.tokenordermgmt.common.dto.BatchIdRequest;
import com.shuye.tokenordermgmt.common.dto.InvoiceRequest;
import com.shuye.tokenordermgmt.common.vo.InvoiceVO;

import java.util.List;

public interface InvoiceService {

    List<InvoiceVO> list();

    InvoiceVO detail(String id);

    InvoiceVO create(InvoiceRequest invoiceRequest, BatchIdRequest batchIdRequest);

    Void cancel(String id);

}
