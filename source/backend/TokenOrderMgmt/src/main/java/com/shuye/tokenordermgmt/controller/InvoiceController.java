package com.shuye.tokenordermgmt.controller;

import com.shuye.tokenordermgmt.common.dto.Result;
import com.shuye.tokenordermgmt.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/invoice")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @GetMapping
    public Result<?> list() {
        return Result.success(invoiceService.list());
    }

}
