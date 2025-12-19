package org.example.ptcmssbackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ptcmssbackend.dto.request.Auth.ForgotPasswordRequest;
import org.example.ptcmssbackend.dto.request.Auth.LoginRequest;
import org.example.ptcmssbackend.dto.response.Auth.TokenResponse;
import org.example.ptcmssbackend.service.AuthenticationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

@Slf4j(topic = "AUTH_CONTROLLER")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
@Tag(name = "Authentication API", description = "Xử lý đăng nhập, refresh token và đăng xuất người dùng")
public class AuthController {

    private final AuthenticationService authService;


    // ---------------- LOGIN ----------------
    @Operation(
            summary = "Đăng nhập",
            description = "Nhập username và password để nhận về Access Token và Refresh Token.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Đăng nhập thành công",
                            content = @Content(mediaType = "application/json",
                                    schema = @Schema(implementation = TokenResponse.class))),
                    @ApiResponse(responseCode = "401", description = "Sai username hoặc password",
                            content = @Content)
            }
    )
    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        log.info("[LOGIN] Request login for username: {}", request.getUsername());
        TokenResponse response = authService.getAccessToken(request);
        log.info("[LOGIN] Login successful for username: {}", request.getUsername());
        return ResponseEntity.ok(response);
    }

    // ---------------- REFRESH TOKEN ----------------
    @Operation(
            summary = "Làm mới token",
            description = "Gửi Refresh Token để nhận Access Token mới khi Access Token cũ hết hạn.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Làm mới thành công",
                            content = @Content(mediaType = "application/json",
                                    schema = @Schema(implementation = TokenResponse.class))),
                    @ApiResponse(responseCode = "403", description = "Token không hợp lệ hoặc hết hạn",
                            content = @Content)
            }
    )
    @PostMapping("/refresh-token")
    public ResponseEntity<TokenResponse> refreshToken(@RequestParam String refreshToken) {
        log.info("[REFRESH] Refresh token request received");
        TokenResponse response = authService.getRefreshToken(refreshToken);
        return ResponseEntity.ok(response);
    }



    // ---------------- VERIFY TOKEN ----------------
    @Operation(
            summary = "Xác thực token từ email",
            description = "Người dùng nhấp vào link trong email, backend xác thực token và chuyển hướng tới trang đặt mật khẩu của frontend.",
            responses = {
                    @ApiResponse(responseCode = "302", description = "Chuyển hướng thành công đến trang frontend"),
                    @ApiResponse(responseCode = "400", description = "Token không hợp lệ hoặc đã hết hạn")
            }
    )
    @GetMapping("/verify")
    public RedirectView verifyAccount(@RequestParam("token") String token) {
        log.info("[VERIFY] Verifying token");
        String frontendUrl = authService.verifyAccount(token);
        log.info("[VERIFY] Redirecting to frontend: {}", frontendUrl);
        return new RedirectView(frontendUrl);
    }

    // ---------------- FORGOT PASSWORD ---------------- 
    @Operation(
            summary = "Quên mật khẩu",
            description = "Gửi email chứa link đặt lại mật khẩu đến địa chỉ email đã đăng ký.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Nếu email tồn tại, link đặt lại mật khẩu đã được gửi"),
                    @ApiResponse(responseCode = "400", description = "Email không hợp lệ")
            }
    )
    @PostMapping("/forgot-password")
    public ResponseEntity<org.example.ptcmssbackend.dto.response.common.ApiResponse<String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        log.info("[FORGOT_PASSWORD] Request received for email: {}", request.getEmail());
        try {
            String message = authService.forgotPassword(request.getEmail());
            return ResponseEntity.ok(org.example.ptcmssbackend.dto.response.common.ApiResponse.<String>builder()
                    .success(true)
                    .message(message)
                    .data("Email đã được gửi thành công")
                    .build());
        } catch (Exception e) {
            log.error("[FORGOT_PASSWORD] Error: {}", e.getMessage(), e);
            return ResponseEntity.ok(org.example.ptcmssbackend.dto.response.common.ApiResponse.<String>builder()
                    .success(false)
                    .message("Không thể gửi email. Vui lòng thử lại sau.")
                    .build());
        }
    }

    // ---------------- SET PASSWORD ----------------
    @Operation(
            summary = "Thiết lập mật khẩu",
            description = "Người dùng thiết lập mật khẩu sau khi xác thực email hoặc đặt lại mật khẩu.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Thiết lập mật khẩu thành công"),
                    @ApiResponse(responseCode = "400", description = "Token không hợp lệ hoặc mật khẩu không khớp")
            }
    )
    @PostMapping("/set-password")
    public ResponseEntity<org.example.ptcmssbackend.dto.response.common.ApiResponse<String>> setPassword(
            @Valid @RequestBody org.example.ptcmssbackend.dto.request.Auth.SetPasswordRequest request) {
        log.info("[SET_PASSWORD] Request received");
        try {
            String message = authService.setPassword(request);
            return ResponseEntity.ok(org.example.ptcmssbackend.dto.response.common.ApiResponse.<String>builder()
                    .success(true)
                    .message(message)
                    .data("Mật khẩu đã được thiết lập thành công")
                    .build());
        } catch (Exception e) {
            log.error("[SET_PASSWORD] Error: {}", e.getMessage(), e);
            return ResponseEntity.ok(org.example.ptcmssbackend.dto.response.common.ApiResponse.<String>builder()
                    .success(false)
                    .message(e.getMessage())
                    .build());
        }
    }

    // ---------------- LOGOUT ----------------
    @Operation(
            summary = "Đăng xuất",
            description = "Đăng xuất người dùng. Frontend sẽ xóa token khỏi localStorage.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Đăng xuất thành công")
            }
    )
    @PostMapping("/logout")
    public ResponseEntity<org.example.ptcmssbackend.dto.response.common.ApiResponse<String>> logout() {
        log.info("[LOGOUT] Logout request received");
        // Logout chỉ cần trả về success, frontend sẽ xóa token
        // Nếu cần invalidate token trên server, có thể thêm logic ở đây
        return ResponseEntity.ok(org.example.ptcmssbackend.dto.response.common.ApiResponse.<String>builder()
                .success(true)
                .message("Đăng xuất thành công")
                .data("Đã đăng xuất")
                .build());
    }
}
