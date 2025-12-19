package org.example.ptcmssbackend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filter để log CORS headers và đảm bảo PATCH method được allow
 */
@Component
@Order(0) // Chạy trước CorsFilter
@Slf4j
public class CorsResponseFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
        
        String method = request.getMethod();
        String origin = request.getHeader("Origin");
        
        // Log CORS preflight request
        if ("OPTIONS".equalsIgnoreCase(method)) {
            log.info("[CORS] Preflight request: {} {} from origin: {}", method, request.getRequestURI(), origin);
        }
        
        // Continue filter chain
        filterChain.doFilter(request, response);
        
        // Log CORS headers sau khi response được set
        if (origin != null) {
            String allowMethods = response.getHeader("Access-Control-Allow-Methods");
            String allowOrigin = response.getHeader("Access-Control-Allow-Origin");
            String allowHeaders = response.getHeader("Access-Control-Allow-Headers");
            
            log.info("[CORS] Response headers for {} {}: Allow-Methods={}, Allow-Origin={}, Allow-Headers={}", 
                    method, request.getRequestURI(), allowMethods, allowOrigin, allowHeaders);
            
            // QUAN TRỌNG: Đảm bảo PATCH có trong Allow-Methods
            if (allowMethods != null && !allowMethods.contains("PATCH")) {
                log.warn("[CORS] ⚠️ PATCH method NOT found in Access-Control-Allow-Methods! Current: {}", allowMethods);
                // Thêm PATCH vào headers nếu chưa có
                String updatedMethods = allowMethods + ", PATCH";
                response.setHeader("Access-Control-Allow-Methods", updatedMethods);
                log.info("[CORS] ✅ Fixed: Added PATCH to Allow-Methods: {}", updatedMethods);
            } else if (allowMethods != null && allowMethods.contains("PATCH")) {
                log.info("[CORS] ✅ PATCH method is allowed in Access-Control-Allow-Methods");
            }
        }
    }
}

