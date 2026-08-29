package com.shuye.tokenordermgmt.service.impl;

import com.shuye.tokenordermgmt.common.entity.ProviderEntity;
import com.shuye.tokenordermgmt.common.util.ToVO;
import com.shuye.tokenordermgmt.common.vo.ProviderVO;
import com.shuye.tokenordermgmt.mapper.ProviderMapper;
import com.shuye.tokenordermgmt.service.ProviderService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProviderServiceImpl implements ProviderService {

    private final ProviderMapper providerMapper;

    @Override
    public List<ProviderVO> list() {

        List<ProviderEntity> provider = providerMapper.select();
        return ToVO.toProviderVOList(provider);

    }

}
