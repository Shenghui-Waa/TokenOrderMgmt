package com.shuye.tokenordermgmt.service.impl;

import com.shuye.tokenordermgmt.common.dto.BatchIdRequest;
import com.shuye.tokenordermgmt.common.dto.ProviderRequest;
import com.shuye.tokenordermgmt.common.dto.Result;
import com.shuye.tokenordermgmt.common.entity.ProviderEntity;
import com.shuye.tokenordermgmt.common.exception.BusinessException;
import com.shuye.tokenordermgmt.common.util.ToEntity;
import com.shuye.tokenordermgmt.common.util.ToVO;
import com.shuye.tokenordermgmt.common.vo.ProviderVO;
import com.shuye.tokenordermgmt.mapper.ProviderMapper;
import com.shuye.tokenordermgmt.service.ProviderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProviderServiceImpl implements ProviderService {

    private final ProviderMapper providerMapper;

    @Override
    public List<ProviderVO> list() {
        log.info("[RUNNING][ProviderService.list]: List Providers...");

        List<ProviderEntity> provider = providerMapper.select();

        log.info("[SUCCESS][ProviderService.list]: List Providers.");
        return ToVO.toProviderVOList(provider);
    }

    @Override
    public ProviderVO detail(String id) {
        log.info("[RUNNING][ProviderService.detail]: Provider detail...");

        ProviderEntity entity = providerMapper.selectById(id);
        if (entity == null)
            throw new BusinessException(Result.Code.NOT_FOUND, "Provider not found");

        log.info("[SUCCESS][ProviderService.detail]: Provider detail.");
        return ToVO.toProviderVO(entity);
    }

    @Override
    public ProviderVO add(ProviderRequest request) {
        log.info("[RUNNING][ProviderService.add]: Provider add...");

        if (providerMapper.selectByName(request.getName()) != null)
            throw new BusinessException("There has been a provider named " + request.getName());
        ProviderEntity entity = ToEntity.toProviderEntity(request);
        providerMapper.insert(entity);

        log.info("[SUCCESS][ProviderService.add]: Add Provider: {}.", request.getName());
        return ToVO.toProviderVO(providerMapper.selectById(entity.getId()));
    }

    @Override
    public ProviderVO update(String id, ProviderRequest request) {
        log.info("[RUNNING][ProviderService.update]: Provider update...");

        ProviderEntity entity = providerMapper.selectById(id);
        if (entity == null)
            throw new BusinessException(Result.Code.NOT_FOUND, "The provider does not exist");
        entity.setName(request.getName());
        entity.setWebsite(request.getWebsite());
        providerMapper.updateById(entity);

        log.info("[SUCCESS][ProviderService.update]: Update Provider: {}.", request.getName());
        return ToVO.toProviderVO(providerMapper.selectById(entity.getId()));
    }

    @Override
    public Void delete(BatchIdRequest request) {
        log.info("[RUNNING][ProviderService.delete]: Delete Providers...");

        providerMapper.deleteByIds(request.getIds());

        log.info("[SUCCESS][ProviderService.delete]: Delete Providers: {}.", request.getIds());
        return null;
    }

}
