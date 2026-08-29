package com.shuye.tokenordermgmt.common.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Result<T> {

    private Integer code;
    private String message;
    private T data;

    public static class Code{
        public static final Integer SUCCESS = 200;
        public static final Integer ERROR = 400;
        public static final Integer UNAUTHORIZED = 401;
        public static final Integer FORBIDDEN = 403;
        public static final Integer NOT_FOUND = 404;
        public static final Integer FAILURE = 500;
    }

    public static <T> Result<T> success() {
        return new Result<>(Code.SUCCESS, "success", null);
    }

    public static <T> Result<T> success(T data) {
        return new Result<>(Code.SUCCESS, "success", data);
    }

    public static <T> Result<T> success(String message, T data) {
        return new Result<>(Code.SUCCESS, message, data);
    }

    public static Result<Void> error() {
        return new Result<>(Code.FAILURE, "Internal Error", null);
    }

    public static Result<Void> error(String message) {
        return new Result<>(Code.ERROR, message, null);
    }

    public static Result<Void> error(Integer code, String message) {
        return new Result<>(code, message, null);
    }

}
