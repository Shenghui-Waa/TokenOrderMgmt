package com.shuye.tokenordermgmt.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.shuye.tokenordermgmt.common.entity.TokenOrderEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.springframework.stereotype.Repository;

import java.util.List;

@Mapper
@Repository
public interface TokenOrderMapper extends BaseMapper<TokenOrderEntity> {

    @Select("select * from token_order order by updated_at desc")
    List<TokenOrderEntity> select();

    List<TokenOrderEntity> selectByIdsAndDeleted(List<String> ids, Integer deleted);

    @Select("select * from token_order where invoice_id = #{invoiceId} order by updated_at")
    List<TokenOrderEntity> selectByInvoice(@Param("invoiceId") String invoiceId);
}
