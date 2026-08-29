package com.shuye.tokenordermgmt.common.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProviderRequest {

    @NotBlank(message = "提供商名称不能为空")
    @Size(max = 50, message = "提供商名称不能超过 50 个字符")
    private String name;

    @NotBlank(message = "官网链接不能为空")
    @Pattern(
            regexp = "https?://.+",
            message = "官网链接必须以 http:// 或 https:// 开头"
    )
    @Size(max = 500, message = "官网链接不能超过 500 个字符")
    private String website;

}
