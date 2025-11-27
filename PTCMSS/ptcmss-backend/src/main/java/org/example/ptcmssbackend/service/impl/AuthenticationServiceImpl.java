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

import static org.example.ptcmssbackend.enums.TokenType.EMAIL_VERIFY_TOKEN;
import static org.example.ptcmssbackend.enums.TokenType.REFRESH_TOKEN;

@Service
@Slf4j(topic = "AUTHENTICATION_SERVICE")
@RequiredArgsConstructor
public class AuthenticationServiceImpl implements AuthenticationService {

    private final UsersRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Override
    public TokenResponse getAccessToken(LoginRequest request) {
        log.info("[LOGIN] Authenticating user: {}", request.getUsername());

        // Tìm user: thử username trước, nếu không tìm thấy thì thử email
        Users user = userRepository.findByUsername(request.getUsername())
                .orElse(null);

        // Nếu không tìm thấy bằng username, thử tìm bằng email
        if (user == null) {
            log.info("[LOGIN] User not found by username, trying email: {}", request.getUsername());
            user = userRepository.findByEmail(request.getUsername())
                    .orElse(null);
        }

        // Nếu vẫn không tìm thấy, throw exception
        if (user == null) {
            log.error("[LOGIN] User not found by username or email: {}", request.getUsername());
            throw new InvalidDataException("Thông tin đăng nhập không hợp lệ");
        }

        // Lưu username thực tế để dùng cho authentication
        String actualUsername = user.getUsername();

        // Kiểm tra user có enabled không
        if (!user.isEnabled()) {
            log.error("[LOGIN] User is disabled: {} (status: {})", actualUsername, user.getStatus());
            throw new AccessDeniedException("Account is disabled. Please contact administrator.");
        }

        try {
            // Dùng username thực tế của user (không phải email) để authenticate
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            actualUsername,
                            request.getPassword()
                    )
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            log.info("[LOGIN] Authentication successful for user: {} (login with: {})", actualUsername, request.getUsername());
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            log.error("[LOGIN] Bad credentials for user: {} - {}", request.getUsername(), e.getMessage());
            throw new AccessDeniedException("Thông tin đăng nhập không hợp lệ");
        } catch (Exception e) {
            log.error("[LOGIN] Error authenticating user: {} - {}", request.getUsername(), e.getMessage(), e);
            throw new AccessDeniedException("Thông tin đăng nhập không hợp lệ");
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
        final String frontendSetPasswordUrl = "http://localhost:5173/set-password";
        final String frontendErrorUrl = "http://localhost:5173/verification-error";

        if (!org.springframework.util.StringUtils.hasLength(token)) {
            log.error("[VERIFY] Token is blank");
            return frontendErrorUrl + "?message=Token+khong+hop+le";
        }

        try {
            // Tìm user theo verification token
            Users user = userRepository.findByVerificationToken(token)
                    .orElseThrow(() -> new InvalidDataException("Token không hợp lệ hoặc đã hết hạn"));

            // Kiểm tra user đã verify chưa
            if (Boolean.TRUE.equals(user.getEmailVerified())) {
                log.info("[VERIFY] User {} already verified", user.getUsername());
                return frontendSetPasswordUrl + "?token=" + token + "&message=Tai+khoan+da+duoc+xac+thuc";
            }

            // Chỉ xác thực email, KHÔNG tạo password tự động
            user.setEmailVerified(true);
            // Giữ status là INACTIVE cho đến khi user set password
            userRepository.save(user);

            log.info("[VERIFY] Email verified for user {}. Redirecting to set password page.", user.getUsername());
            // Chuyển hướng đến trang set password với token
            return frontendSetPasswordUrl + "?token=" + token;
        } catch (Exception e) {
            log.error("[VERIFY] Verification failed: {}", e.getMessage());
            return frontendErrorUrl + "?message=" + e.getMessage().replace(" ", "+");
        }
    }

    @Override
    public String setPassword(org.example.ptcmssbackend.dto.request.Auth.SetPasswordRequest request) {
        log.info("[SET_PASSWORD] Setting password for token");

        if (!org.springframework.util.StringUtils.hasLength(request.getToken())) {
            throw new InvalidDataException("Token không được để trống");
        }

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new InvalidDataException("Mật khẩu xác nhận không khớp");
        }

        try {
            // Tìm user theo verification token
            Users user = userRepository.findByVerificationToken(request.getToken())
                    .orElseThrow(() -> new InvalidDataException("Token không hợp lệ hoặc đã hết hạn"));

            // Kiểm tra email đã được verify chưa
            if (!Boolean.TRUE.equals(user.getEmailVerified())) {
                throw new InvalidDataException("Email chưa được xác thực");
            }

            // Lưu mật khẩu người dùng nhập vào (KHÔNG phải mật khẩu random)
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            user.setStatus(org.example.ptcmssbackend.enums.UserStatus.ACTIVE);
            user.setVerificationToken(null); // Xóa token sau khi sử dụng
            userRepository.save(user);

            log.info("[SET_PASSWORD] Password set successfully for user {}", user.getUsername());
            return "Mật khẩu đã được thiết lập thành công. Bạn có thể đăng nhập ngay bây giờ.";
        } catch (Exception e) {
            log.error("[SET_PASSWORD] Failed to set password: {}", e.getMessage());
            throw new RuntimeException("Không thể thiết lập mật khẩu: " + e.getMessage());
        }
    }



    @Override
    public String forgotPassword(String email) {
        log.info("[FORGOT_PASSWORD] Request password reset for email: {}", email);

        String normalizedEmail = email == null ? null : email.trim().toLowerCase();
        if (!org.springframework.util.StringUtils.hasText(normalizedEmail)) {
            throw new InvalidDataException("Email không được để trống.");
        }

        // Tìm user theo email
        Users user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> {
                    log.warn("[FORGOT_PASSWORD] Email not found: {}", normalizedEmail);
                    return new InvalidDataException("Email không tồn tại trong hệ thống.");
                });

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
            // Trả về message thành công với thông tin rõ ràng hơn
            return String.format("Chúng tôi đã gửi link đặt lại mật khẩu đến email %s. Vui lòng kiểm tra hộp thư của bạn.", email);
        } catch (MessagingException | UnsupportedEncodingException e) {
            log.error("[FORGOT_PASSWORD] Failed to send email: {}", e.getMessage(), e);
            throw new RuntimeException("Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.");
        }
    }
}
