package org.example.ptcmssbackend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.common.TokenType;
import org.example.ptcmssbackend.service.JwtService;
import org.example.ptcmssbackend.service.UserServiceDetail;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Slf4j(topic = "CUSTOMIZE_REQUEST_FILTER")
@RequiredArgsConstructor
public class CustomizeRequestFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserServiceDetail userServiceDetail;

    private static final String[] PUBLIC_ENDPOINTS = {
            "/swagger-ui",
            "/v3/api-docs",
            "/api/auth/",

            "/api/test/",          // test endpoints (generate hash, test password)
            "/verify",
            "/set-password"
    };

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();
        log.info("{} {}", request.getMethod(), uri);

        // Bỏ qua các endpoint công khai
        if (isPublicEndpoint(uri)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Try Authorization header first; fallback to cookie "access_token"
        String token = null;
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else if (request.getCookies() != null) {
            for (var c : request.getCookies()) {
                if ("access_token".equals(c.getName()) && c.getValue() != null && !c.getValue().isEmpty()) {
                    token = c.getValue();
                    break;
                }
            }
        }
        if (token == null || token.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }
        try {
            String username = jwtService.extractUsername(token, TokenType.ACCESS_TOKEN);
            if (username != null) {
                UserDetails userDetails = userServiceDetail.loadUserByUsername(username);

                log.debug("[Filter] Setting authentication for user: {} with authorities: {}",
                        username, userDetails.getAuthorities());

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContext context = SecurityContextHolder.createEmptyContext();
                context.setAuthentication(authentication);
                SecurityContextHolder.setContext(context);

                log.debug("[Filter] Authentication set successfully for user: {}", username);
            }
        } catch (Exception e) {
            log.error("JWT validation error: {}", e.getMessage(), e);
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired token");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isPublicEndpoint(String uri) {
        for (String path : PUBLIC_ENDPOINTS) {
            if (uri.startsWith(path)) return true;
        }
        return false;
    }
}

