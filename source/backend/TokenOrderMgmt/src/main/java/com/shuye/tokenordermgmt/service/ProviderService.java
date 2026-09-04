package com.shuye.tokenordermgmt.service;

import com.shuye.tokenordermgmt.common.dto.BatchIdRequest;
import com.shuye.tokenordermgmt.common.dto.ProviderRequest;
import com.shuye.tokenordermgmt.common.vo.ProviderVO;

import java.util.List;

public interface ProviderService {

    List<ProviderVO> list();

    ProviderVO detail(String id);

    ProviderVO add(ProviderRequest request);

    ProviderVO update(String id, ProviderRequest request);

    Void delete(BatchIdRequest request);

}
