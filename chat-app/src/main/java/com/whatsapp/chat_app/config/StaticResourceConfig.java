package com.whatsapp.chat_app.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serves anything saved by FileUploadController at http://<host>:8080/uploads/<file>
        // "file:uploads/" is relative to the directory the Spring Boot app runs from.
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:uploads/");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/uploads/**")
                .allowedOrigins("http://localhost:5173", "http://127.0.0.1:5173", "http://3.111.225.244:5173", "https://involved-novel-absolute-behalf.trycloudflare.com")
                .allowedMethods("GET");
    }
}