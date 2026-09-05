package com.shuye.tokenordermgmt.controller;

import com.shuye.tokenordermgmt.common.dto.BatchIdRequest;
import com.shuye.tokenordermgmt.common.dto.Result;
import com.shuye.tokenordermgmt.common.dto.TokenOrderRequest;
import com.shuye.tokenordermgmt.service.TokenOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/token-order")
@RequiredArgsConstructor
public class TokenOrderController {

    private final TokenOrderService tokenOrderService;

    @GetMapping
    public Result<?> list() {
        return Result.success(tokenOrderService.list());
    }

    @GetMapping("/i/{id}")
    public Result<?> listByInvoiceId(
            @PathVariable String id
    ) {
        return Result.success(tokenOrderService.listByInvoiceId(id));
    }

    @GetMapping("/{id}")
    public Result<?> detail(
            @PathVariable String id
    ) {
        return Result.success(tokenOrderService.detail(id));
    }

    @PostMapping
    public Result<?> add(
            @RequestBody TokenOrderRequest request
    ) {
        return Result.success(tokenOrderService.add(request));
    }

    @PutMapping("/{id}")
    public Result<?> update(
            @PathVariable String id,
            @RequestBody TokenOrderRequest request
    ) {
        return Result.success(tokenOrderService.update(id, request));
    }

    @PutMapping("/logic")
    public Result<?> deleteLogic(
            @RequestBody BatchIdRequest request
    ) {
        return Result.success(tokenOrderService.deleteLogic(request));
    }

    @PutMapping("/recover")
    public Result<?> recover(
            @RequestBody BatchIdRequest request
    ) {
        return Result.success(tokenOrderService.recover(request));
    }

    @DeleteMapping
    public Result<?> deletePhysical(
            @RequestBody BatchIdRequest request
    ) {
        return Result.success(tokenOrderService.deletePhysical(request));
    }

}
