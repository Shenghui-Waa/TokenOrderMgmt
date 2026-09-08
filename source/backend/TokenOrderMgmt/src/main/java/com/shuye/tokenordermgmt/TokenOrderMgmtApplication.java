package com.shuye.tokenordermgmt;

import org.mybatis.spring.annotation.MapperScan;
import org.mybatis.spring.annotation.MapperScans;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.shuye.tokenordermgmt.mapper")
public class TokenOrderMgmtApplication {

    public static void main(String[] args) {
        SpringApplication.run(TokenOrderMgmtApplication.class, args);
    }

}
