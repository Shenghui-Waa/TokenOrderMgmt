package com.shuye.tokenordermgmt.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.shuye.tokenordermgmt.common.entity.ProviderEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.springframework.stereotype.Repository;

import java.util.List;

@Mapper
@Repository
public interface ProviderMapper extends BaseMapper<ProviderEntity> {

    @Select("select * from provider order by updated_at desc")
    List<ProviderEntity> select();

    @Select("select * from provider where name = #{name}")
    ProviderEntity selectByName(@Param("name") String name);

}
