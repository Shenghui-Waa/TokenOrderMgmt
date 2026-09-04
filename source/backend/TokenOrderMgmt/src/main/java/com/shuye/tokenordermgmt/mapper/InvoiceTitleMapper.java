package com.shuye.tokenordermgmt.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.shuye.tokenordermgmt.common.entity.InvoiceTitleEntity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.springframework.stereotype.Repository;

import java.util.List;

@Mapper
@Repository
public interface InvoiceTitleMapper extends BaseMapper<InvoiceTitleEntity> {

    @Select("select * from invoice_title order by updated_at desc")
    List<InvoiceTitleEntity> select();

    @Select("select * from invoice_title where name = #{name}")
    InvoiceTitleEntity selectByName(@Param("name") String name);

}
