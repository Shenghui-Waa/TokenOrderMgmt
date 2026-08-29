package com.shuye.tokenordermgmt.common.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class BatchIdRequest {

    @NotEmpty(message = "请选择至少一条记录")
    private List<@NotBlank(message = "记录编号不能为空") String> ids;

}
