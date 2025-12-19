package org.example.ptcmssbackend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();

        // ✅ BẮT BUỘC khi dùng JWT / Cookie
        config.setAllowCredentials(true);

        // ✅ Chỉ cho phép frontend thật
        config.setAllowedOriginPatterns(List.of(
                "https://hethongvantai.site",
                "https://api.hethongvantai.site"
        ));

        // ✅ Cho phép mọi header (Authorization, Content-Type, ...)
        config.setAllowedHeaders(List.of("*"));

        // ✅ Đủ cho REST API
        config.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS"
        ));

        // ✅ Expose để frontend đọc được
        config.setExposedHeaders(List.of("Authorization"));

        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return new CorsFilter(source);
    }
}
