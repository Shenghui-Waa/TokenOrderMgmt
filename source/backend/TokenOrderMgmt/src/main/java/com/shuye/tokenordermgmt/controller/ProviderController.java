package com.shuye.tokenordermgmt.controller;

import com.shuye.tokenordermgmt.common.dto.BatchIdRequest;
import com.shuye.tokenordermgmt.common.dto.ProviderRequest;
import com.shuye.tokenordermgmt.common.dto.Result;
import com.shuye.tokenordermgmt.service.ProviderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.apache.ibatis.annotations.Delete;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/provider")
@RequiredArgsConstructor
public class ProviderController {

    private final ProviderService providerService;

    @GetMapping
    public Result<?> list() {
        return Result.success(providerService.list());
    }

    @GetMapping("/{id}")
    public Result<?> detail(
            @PathVariable String id
    ) {
        return Result.success(providerService.detail(id));
    }

    @PostMapping
    public Result<?> add(
            @RequestBody @Valid ProviderRequest request
    ) {
        return Result.success(providerService.add(request));
    }

    @PutMapping("/{id}")
    public Result<?> update(
            @PathVariable String id,
            @RequestBody @Valid ProviderRequest request
    ) {
        return Result.success(providerService.update(id, request));
    }

    @DeleteMapping
    public Result<?> delete(
            @RequestBody @Valid BatchIdRequest request
    ) {
        return Result.success(providerService.delete(request));
    }

}
