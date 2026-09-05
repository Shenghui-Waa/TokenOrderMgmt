package com.shuye.tokenordermgmt.mapper;

import com.shuye.tokenordermgmt.common.vo.TokenOrderVO;
import org.apache.ibatis.annotations.Mapper;
import org.springframework.stereotype.Repository;

import java.util.List;

@Mapper
@Repository
public interface MixedMapper {

    List<TokenOrderVO> listTokenOrder();

}
