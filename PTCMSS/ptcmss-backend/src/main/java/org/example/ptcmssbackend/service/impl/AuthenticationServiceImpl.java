package org.example.ptcmssbackend.service.impl;

import io.micrometer.common.util.StringUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Auth.LoginRequest;
import org.example.ptcmssbackend.dto.response.TokenResponse;
import org.example.ptcmssbackend.entity.Token;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.exception.ForBiddenException;
import org.example.ptcmssbackend.exception.InvalidDataException;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.service.AuthenticationService;
import org.example.ptcmssbackend.service.JwtService;
import org.example.ptcmssbackend.service.TokenService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import static org.example.ptcmssbackend.common.TokenType.ACCESS_TOKEN;
import static org.example.ptcmssbackend.common.TokenType.EMAIL_VERIFY_TOKEN;
import static org.example.ptcmssbackend.common.TokenType.REFRESH_TOKEN;

@Service
@Slf4j(topic = "AUTHENTICATION_SERVICE")
@RequiredArgsConstructor
public class AuthenticationServiceImpl implements AuthenticationService {

    private final UsersRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final TokenService tokenService;

    @Override
    public TokenResponse getAccessToken(LoginRequest request) {
        log.info("Authenticating user: {}", request.getUsername());

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (Exception e) {
            log.error("Error authenticating user: {}", e.getMessage());
            throw new AccessDeniedException("Invalid username or password");
        }

        Users user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new InvalidDataException("User not found"));

        // Tạo JWT token
        String accessToken = jwtService.generateAccessToken(
                user.getId(),
                user.getUsername(),
                user.getAuthorities()
        );
        String refreshToken = jwtService.generateRefreshToken(
                user.getId(),
                user.getUsername(),
                user.getAuthorities()
        );

        // Lưu token vào DB
        tokenService.save(
                Token.builder()
                        .username(user.getUsername())
                        .accessToken(accessToken)
                        .refreshToken(refreshToken)
                        .build()
        );

        return TokenResponse.builder()
                .AccessToken(accessToken)
                .RefreshToken(refreshToken)
                .username(user.getUsername())
                .roleName(user.getRole().getRoleName())
                .build();
    }

    @Override
    public TokenResponse getRefreshToken(String refreshToken) {
        log.info("Refreshing token");

        if (!org.springframework.util.StringUtils.hasLength(refreshToken)) {
            throw new InvalidDataException("Token must not be blank");
        }

        try {
            String userName = jwtService.extractUsername(refreshToken, REFRESH_TOKEN);
            Users user = userRepository.findByUsername(userName)
                    .orElseThrow(() -> new InvalidDataException("User not found"));

            String accessToken = jwtService.generateAccessToken(
                    user.getId(),
                    user.getUsername(),
                    user.getAuthorities()
            );

            return TokenResponse.builder()
                    .AccessToken(accessToken)
                    .RefreshToken(refreshToken)
                    .build();
        } catch (Exception e) {
            log.error("Access denied! errorMessage: {}", e.getMessage());
            throw new ForBiddenException(e.getMessage());
        }
    }

    @Override
    public String removeToken(HttpServletRequest request) {
        log.info("---------- removeToken ----------");

        final String token = request.getHeader("Authorization");
        if (StringUtils.isBlank(token)) {
            throw new InvalidDataException("Token must not be blank");
        }

        final String jwt = token.replace("Bearer ", "");
        final String userName = jwtService.extractUsername(jwt, ACCESS_TOKEN);
        tokenService.delete(userName);
        return "Removed!";
    }

    @Override
    public String verifyAccount(String token) {
        final String frontendSetPasswordUrl = "http://localhost:5173/set-password?token=";

        if (!org.springframework.util.StringUtils.hasLength(token)) {
            throw new InvalidDataException("Verification token must not be blank");
        }

        try {
            // 1. Xác thực token và lấy username
            String username = jwtService.extractUsername(token, EMAIL_VERIFY_TOKEN);

            // 2. (Quan trọng) Tạo một token mới, ngắn hạn, chỉ dành cho việc đặt mật khẩu
            // Điều này ngăn người dùng sử dụng lại link xác thực email để đặt lại mật khẩu nhiều lần.
            String passwordResetToken = jwtService.generatePasswordResetToken(username);

            // 3. Trả về URL của frontend kèm theo token mới
            return frontendSetPasswordUrl + passwordResetToken;
        } catch (Exception e) {
            throw new ForBiddenException("Invalid or expired verification token. " + e.getMessage());
        }
    }
}
