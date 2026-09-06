package com.shuye.tokenordermgmt.controller;

import com.shuye.tokenordermgmt.common.dto.BatchIdRequest;
import com.shuye.tokenordermgmt.common.dto.CreateInvoiceRequest;
import com.shuye.tokenordermgmt.common.dto.InvoiceRequest;
import com.shuye.tokenordermgmt.common.dto.Result;
import com.shuye.tokenordermgmt.service.InvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/invoice")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @GetMapping
    public Result<?> list() {
        return Result.success(invoiceService.list());
    }

    @GetMapping("/{id}")
    public Result<?> detail(
            @PathVariable String id
    ) {
        return Result.success(invoiceService.detail(id));
    }

    /**
     *
     * @param request
     *      * invoiceRequest 发票请求体
     *      * batchIdRequest List of id of token order
     */
    @PostMapping
    public Result<?> create(
            @RequestBody @Valid CreateInvoiceRequest request
    ) {
        return Result.success(invoiceService.create(request.getInvoiceRequest(), request.getBatchIdRequest()));
    }

    @PutMapping("/{id}")
    public Result<?> cancel(
            @PathVariable String id
    ) {
        return Result.success(invoiceService.cancel(id));
    }

}
