package com.shuye.tokenordermgmt.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")       // 对所有路径生效
                .allowedOriginPatterns("*") // 允许所有源（注意这里用 allowedOriginPatterns）
                .allowedMethods("*")        // 允许所有 HTTP 方法（GET,POST,PUT,DELETE,OPTIONS...）
                .allowedHeaders("*")        // 允许所有请求头
                .allowCredentials(false)    // 既然允许所有源，就不能设为 true（浏览器限制）
                .maxAge(3600);              // 预检请求缓存 1 小时
    }

}
