package com.shuye.tokenordermgmt.common.config;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

import java.io.File;

@Configuration
public class DatabaseDirectoryInitializerConfig {
    @PostConstruct
    public void init() {
        File dir = new File("./data");
        if (!dir.exists()) {
            dir.mkdirs();  // 创建目录（包括父目录）
        }
    }
}
