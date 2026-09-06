package com.shuye.tokenordermgmt.common.exception;

import com.shuye.tokenordermgmt.common.dto.Result;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public Result<Void> handleBusinessException(BusinessException exception) {
        return Result.error(exception.getCode(), exception.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<Void> handleValidationException(MethodArgumentNotValidException exception) {
        List<FieldError> errors = exception.getBindingResult()
                .getFieldErrors();

        String message = errors.stream()
                .map(error -> {
                    String detail = error.getDefaultMessage();
                    if (detail == null || detail.isBlank()) {
                        detail = "参数不合法";
                    }
                    return error.getField() + ": " + detail;
                })
                .distinct()
                .sorted()
                .collect(Collectors.joining("; "));

        if (message.isBlank())
            message = "请求参数不合法";

        return Result.error(Result.Code.ERROR, message);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<Void> handleUnreadableBody(HttpMessageNotReadableException exception) {
        return Result.error(Result.Code.ERROR, "请求体缺失、JSON 格式错误或字段类型不正确");
    }
}