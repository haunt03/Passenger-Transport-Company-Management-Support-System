package org.example.ptcmssbackend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Auth.LoginRequest;
import org.example.ptcmssbackend.dto.response.Auth.TokenResponse;
import org.example.ptcmssbackend.entity.Users;
import org.example.ptcmssbackend.exception.ForBiddenException;
import org.example.ptcmssbackend.exception.InvalidDataException;
import org.example.ptcmssbackend.repository.UsersRepository;
import org.example.ptcmssbackend.service.AuthenticationService;
import org.example.ptcmssbackend.service.EmailService;
import org.example.ptcmssbackend.service.JwtService;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import jakarta.mail.MessagingException;
import java.io.UnsupportedEncodingException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import static org.example.ptcmssbackend.common.TokenType.EMAIL_VERIFY_TOKEN;
import static org.example.ptcmssbackend.common.TokenType.REFRESH_TOKEN;

@Service
@Slf4j(topic = "AUTHENTICATION_SERVICE")
@RequiredArgsConstructor
public class AuthenticationServiceImpl implements AuthenticationService {

    private final UsersRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    private final EmailService emailService;

    @Override
    public TokenResponse getAccessToken(LoginRequest request) {
        log.info("[LOGIN] Authenticating user: {}", request.getUsername());

        // Kiểm tra user có tồn tại không trước
        Users user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> {
                    log.error("[LOGIN] User not found: {}", request.getUsername());
                    throw new InvalidDataException("Invalid username or password");
                });

        // Kiểm tra user có enabled không
        if (!user.isEnabled()) {
            log.error("[LOGIN] User is disabled: {} (status: {})", request.getUsername(), user.getStatus());
            throw new AccessDeniedException("Account is disabled. Please contact administrator.");
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            log.info("[LOGIN] Authentication successful for user: {}", request.getUsername());
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            log.error("[LOGIN] Bad credentials for user: {} - {}", request.getUsername(), e.getMessage());
            throw new AccessDeniedException("Invalid username or password");
        } catch (Exception e) {
            log.error("[LOGIN] Error authenticating user: {} - {}", request.getUsername(), e.getMessage(), e);
            throw new AccessDeniedException("Invalid username or password");
        }

        // User đã được load ở trên, không cần load lại

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

        return TokenResponse.builder()
                .AccessToken(accessToken)
                .RefreshToken(refreshToken)
                .userId(user.getId())
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

    @Override
    public String forgotPassword(String email) {
        log.info("[FORGOT_PASSWORD] Request password reset for email: {}", email);

        // Tìm user theo email
        Users user = userRepository.findByEmail(email)
                .orElse(null);

        // Luôn trả về message thành công để không tiết lộ thông tin user
        // (Security best practice: không cho attacker biết email có tồn tại hay không)
        if (user == null) {
            log.warn("[FORGOT_PASSWORD] Email not found: {}", email);
            return "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu.";
        }

        // Tạo password reset token
        String passwordResetToken = jwtService.generatePasswordResetToken(user.getUsername());

        // Tạo URL reset password
        String baseUrl = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();

        // Gửi email
        try {
            emailService.sendPasswordResetEmail(
                    user.getEmail(),
                    user.getFullName(),
                    passwordResetToken,
                    baseUrl
            );
            log.info("[FORGOT_PASSWORD] Password reset email sent to: {}", email);
        } catch (MessagingException | UnsupportedEncodingException e) {
            log.error("[FORGOT_PASSWORD] Failed to send email: {}", e.getMessage());
            throw new RuntimeException("Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.");
        }

        return "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu.";
    }
}
