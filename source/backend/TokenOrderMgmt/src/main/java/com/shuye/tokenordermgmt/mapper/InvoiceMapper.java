package com.shuye.tokenordermgmt.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.shuye.tokenordermgmt.common.entity.InvoiceEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.springframework.stereotype.Repository;

import java.util.List;

@Mapper
@Repository
public interface InvoiceMapper extends BaseMapper<InvoiceEntity> {

    @Select("select * from invoice order by updated_at desc")
    List<InvoiceEntity> select();

}
