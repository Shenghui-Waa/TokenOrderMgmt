package com.shuye.tokenordermgmt;

import com.shuye.tokenordermgmt.common.entity.ProviderEntity;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;

@SpringBootTest
class TokenTokenOrderEntityMgmtApplicationTests {


    @Test
    void contextLoads() {
        System.out.println(new BigDecimal("32.3").multiply(new BigDecimal(100)).longValue());
    }

}
