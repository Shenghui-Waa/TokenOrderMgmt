package com.shuye.tokenordermgmt.controller;

import com.shuye.tokenordermgmt.common.dto.BatchIdRequest;
import com.shuye.tokenordermgmt.common.dto.InvoiceTitleRequest;
import com.shuye.tokenordermgmt.common.dto.ProviderRequest;
import com.shuye.tokenordermgmt.common.dto.Result;
import com.shuye.tokenordermgmt.service.InvoiceTitleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/invoice-title")
@RequiredArgsConstructor
public class InvoiceTitleController {

    private final InvoiceTitleService invoiceTitleService;

    @GetMapping
    public Result<?> list(){
        return Result.success(invoiceTitleService.list());
    }

    @GetMapping("/{id}")
    public Result<?> detail(
            @PathVariable String id
    ) {
        return Result.success(invoiceTitleService.detail(id));
    }

    @PostMapping
    public Result<?> add(
            @RequestBody InvoiceTitleRequest request
    ) {
        return Result.success(invoiceTitleService.add(request));
    }

    @PutMapping("/{id}")
    public Result<?> update(
            @PathVariable String id,
            @RequestBody InvoiceTitleRequest request
    ) {
        return Result.success(invoiceTitleService.update(id, request));
    }

    @DeleteMapping
    public Result<?> delete(
            @RequestBody BatchIdRequest request
    ) {
        return Result.success(invoiceTitleService.delete(request));
    }

}
