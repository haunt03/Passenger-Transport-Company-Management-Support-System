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
        final String frontendSuccessUrl = "http://localhost:5173/verification-success";
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
                return frontendSuccessUrl + "?message=Tai+khoan+da+duoc+xac+thuc+truoc+do";
            }

            // Tự động tạo password và gửi email
            String generatedPassword = generateRandomPassword();
            log.info("[VERIFY] Generated password for user {}", user.getUsername());

            // Cập nhật user
            user.setEmailVerified(true);
            user.setStatus(org.example.ptcmssbackend.enums.UserStatus.ACTIVE);
            user.setPasswordHash(passwordEncoder.encode(generatedPassword));
            user.setVerificationToken(null);
            userRepository.save(user);

            // Gửi email chứa password
            try {
                sendPasswordEmail(user.getEmail(), user.getFullName(), user.getUsername(), generatedPassword);
                log.info("[VERIFY] Password email sent to: {}", user.getEmail());
            } catch (Exception e) {
                log.error("[VERIFY] Failed to send password email: {}", e.getMessage());
                // Không throw exception - user vẫn được kích hoạt
            }

            log.info("[VERIFY] Account {} verified successfully", user.getUsername());
            return frontendSuccessUrl + "?message=Xac+thuc+thanh+cong";
        } catch (Exception e) {
            log.error("[VERIFY] Verification failed: {}", e.getMessage());
            return frontendErrorUrl + "?message=" + e.getMessage().replace(" ", "+");
        }
    }

    /**
     * Tạo mật khẩu ngẫu nhiên an toàn
     */
    private String generateRandomPassword() {
        String upperCase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        String lowerCase = "abcdefghijklmnopqrstuvwxyz";
        String digits = "0123456789";
        String special = "@#$%";
        String allChars = upperCase + lowerCase + digits + special;

        java.security.SecureRandom random = new java.security.SecureRandom();
        StringBuilder password = new StringBuilder(8);

        password.append(upperCase.charAt(random.nextInt(upperCase.length())));
        password.append(lowerCase.charAt(random.nextInt(lowerCase.length())));
        password.append(digits.charAt(random.nextInt(digits.length())));
        password.append(special.charAt(random.nextInt(special.length())));

        for (int i = 0; i < 4; i++) {
            password.append(allChars.charAt(random.nextInt(allChars.length())));
        }

        char[] passwordArray = password.toString().toCharArray();
        for (int i = passwordArray.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            char temp = passwordArray[i];
            passwordArray[i] = passwordArray[j];
            passwordArray[j] = temp;
        }

        return new String(passwordArray);
    }

    /**
     * Gửi email chứa mật khẩu
     */
    private void sendPasswordEmail(String toEmail, String fullName, String username, String password) {
        try {
            String subject = "Thông tin đăng nhập hệ thống TranspoManager";
            String htmlContent = buildPasswordEmailHtml(fullName, username, password);

            emailService.sendSimpleEmail(toEmail, subject, htmlContent);
        } catch (Exception e) {
            log.error("Failed to send password email", e);
            throw new RuntimeException("Failed to send password email: " + e.getMessage());
        }
    }

    /**
     * Tạo HTML email chứa mật khẩu
     */
    private String buildPasswordEmailHtml(String fullName, String username, String password) {
        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "<meta charset='UTF-8'>" +
                "<meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                "</head>" +
                "<body style='margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif; background-color: #f4f4f4;'>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='background-color: #f4f4f4; padding: 40px 0;'>" +
                "<tr>" +
                "<td align='center'>" +
                "<table width='600' cellpadding='0' cellspacing='0' style='background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);'>" +
                "<tr>" +
                "<td style='background: linear-gradient(135deg, #0079BC 0%, #005a8f 100%); padding: 30px; text-align: center;'>" +
                "<h1 style='margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;'>TranspoManager</h1>" +
                "<p style='margin: 8px 0 0 0; color: #e3f2fd; font-size: 14px;'>Hệ thống quản lý vận tải</p>" +
                "</td>" +
                "</tr>" +
                "<tr>" +
                "<td style='padding: 40px 30px;'>" +
                "<h2 style='margin: 0 0 20px 0; color: #333333; font-size: 20px; font-weight: 600;'>Chào mừng đến với TranspoManager</h2>" +
                "<p style='margin: 0 0 20px 0; color: #666666; font-size: 15px; line-height: 1.6;'>Kính gửi <strong>" + fullName + "</strong>,</p>" +
                "<p style='margin: 0 0 30px 0; color: #666666; font-size: 15px; line-height: 1.6;'>Tài khoản của bạn đã được kích hoạt thành công. Dưới đây là thông tin đăng nhập của bạn:</p>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='background-color: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 30px;'>" +
                "<tr>" +
                "<td style='padding: 25px;'>" +
                "<table width='100%' cellpadding='0' cellspacing='0'>" +
                "<tr>" +
                "<td style='padding-bottom: 15px;'>" +
                "<p style='margin: 0; color: #888888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;'>Tên đăng nhập</p>" +
                "<p style='margin: 5px 0 0 0; color: #333333; font-size: 16px; font-weight: 600;'>" + username + "</p>" +
                "</td>" +
                "</tr>" +
                "<tr>" +
                "<td style='border-top: 1px solid #e0e0e0; padding-top: 15px;'>" +
                "<p style='margin: 0; color: #888888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;'>Mật khẩu</p>" +
                "<p style='margin: 5px 0 0 0; color: #d32f2f; font-size: 20px; font-weight: 700; letter-spacing: 2px; font-family: \"Courier New\", monospace;'>" + password + "</p>" +
                "</td>" +
                "</tr>" +
                "</table>" +
                "</td>" +
                "</tr>" +
                "</table>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='margin-bottom: 30px;'>" +
                "<tr>" +
                "<td align='center'>" +
                "<a href='http://localhost:5173/login' style='display: inline-block; padding: 14px 40px; background-color: #0079BC; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 600;'>Đăng nhập ngay</a>" +
                "</td>" +
                "</tr>" +
                "</table>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin-bottom: 20px;'>" +
                "<tr>" +
                "<td style='padding: 20px;'>" +
                "<p style='margin: 0 0 10px 0; color: #856404; font-size: 14px; font-weight: 600;'>Lưu ý bảo mật</p>" +
                "<ul style='margin: 0; padding-left: 20px; color: #856404; font-size: 14px; line-height: 1.8;'>" +
                "<li>Vui lòng đổi mật khẩu ngay sau khi đăng nhập lần đầu</li>" +
                "<li>Không chia sẻ thông tin đăng nhập với bất kỳ ai</li>" +
                "<li>Lưu mật khẩu ở nơi an toàn</li>" +
                "</ul>" +
                "</td>" +
                "</tr>" +
                "</table>" +
                "<p style='margin: 0; color: #666666; font-size: 14px; line-height: 1.6;'>Nếu bạn cần hỗ trợ, vui lòng liên hệ với quản trị viên hệ thống.</p>" +
                "</td>" +
                "</tr>" +
                "<tr>" +
                "<td style='background-color: #f8f9fa; padding: 25px 30px; border-top: 1px solid #e0e0e0;'>" +
                "<p style='margin: 0 0 5px 0; color: #666666; font-size: 13px;'>Trân trọng,</p>" +
                "<p style='margin: 0; color: #333333; font-size: 14px; font-weight: 600;'>TranspoManager Team</p>" +
                "</td>" +
                "</tr>" +
                "<tr>" +
                "<td style='padding: 20px 30px; text-align: center;'>" +
                "<p style='margin: 0; color: #999999; font-size: 12px;'>&copy; 2025 TranspoManager. All rights reserved.</p>" +
                "</td>" +
                "</tr>" +
                "</table>" +
                "</td>" +
                "</tr>" +
                "</table>" +
                "</body>" +
                "</html>";
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