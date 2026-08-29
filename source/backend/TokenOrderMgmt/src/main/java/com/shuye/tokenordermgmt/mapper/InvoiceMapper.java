package com.shuye.tokenordermgmt.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.shuye.tokenordermgmt.common.entity.InvoiceEntity;
import org.apache.ibatis.annotations.Mapper;
import org.springframework.stereotype.Repository;

@Mapper
@Repository
public interface InvoiceMapper extends BaseMapper<InvoiceEntity> {
}
