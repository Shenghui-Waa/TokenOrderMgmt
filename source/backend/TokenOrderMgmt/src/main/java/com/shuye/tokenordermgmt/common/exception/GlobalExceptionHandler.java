package com.shuye.tokenordermgmt.common.exception;

import com.shuye.tokenordermgmt.common.dto.Result;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(value = BusinessException.class)
    public Result<Void> handleException(BusinessException exception) {
        return Result.error(exception.getCode(), exception.getMessage());
    }

}
