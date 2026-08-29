package com.shuye.tokenordermgmt.controller;

import com.shuye.tokenordermgmt.common.dto.Result;
import com.shuye.tokenordermgmt.service.ProviderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/provider")
@RequiredArgsConstructor
public class ProviderController {

    private final ProviderService providerService;

    @GetMapping
    public Result<?> list() {
        return Result.success(providerService.list());
    }

}
