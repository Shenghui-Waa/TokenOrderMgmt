package com.shuye.tokenordermgmt.common.exception;

import com.shuye.tokenordermgmt.common.dto.Result;
import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {

    private final Integer code;

    public BusinessException(String message) {
        this(Result.Code.ERROR, message);
    }

    public BusinessException(Integer code, String message) {
        super(message);
        this.code = code;
    }
}
