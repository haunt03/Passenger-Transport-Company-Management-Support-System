package org.example.ptcmssbackend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.io.UnsupportedEncodingException;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendVerificationEmail(String toEmail, String fullName, String username, String verificationUrl)
            throws MessagingException, UnsupportedEncodingException {

        String subject = "✨ Chào mừng đến TranspoManager - Xác thực tài khoản của bạn";

        Map<String, Object> variables = new HashMap<>();
        variables.put("fullName", fullName);
        variables.put("username", username);
        variables.put("verifyUrl", verificationUrl);

        Context context = new Context();
        context.setVariables(variables);
        
        String htmlContent;
        try {
            htmlContent = templateEngine.process("verify-email", context);
        } catch (Exception e) {
            // Fallback to simple HTML if template not found
            log.warn("Template 'verify-email' not found, using fallback HTML: {}", e.getMessage());
            htmlContent = buildVerificationEmailHtml(fullName, username, verificationUrl);
        }

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
        helper.setFrom(fromEmail, "TranspoManager - Hệ thống quản lý vận tải");
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);

        mailSender.send(message);
        log.info("📧 Verification email sent to: {}", toEmail);
    }

    public void sendPasswordResetEmail(String toEmail, String fullName, String token, String baseUrl)
            throws MessagingException, UnsupportedEncodingException {

        String subject = "Đặt lại mật khẩu";
        String resetUrl = baseUrl + "/set-password?token=" + token;

        Map<String, Object> variables = new HashMap<>();
        variables.put("fullName", fullName);
        variables.put("resetUrl", resetUrl);

        Context context = new Context();
        context.setVariables(variables);
        String htmlContent = templateEngine.process("forgot-password-email", context);

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
        helper.setFrom(fromEmail, "Hệ thống quản lý nhân sự");
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);

        mailSender.send(message);
    }

    /**
     * Gửi invoice qua email
     */
    public void sendInvoiceEmail(String toEmail, String customerName, String invoiceNumber, 
                                 String amount, String dueDate, String invoiceUrl, String note)
            throws MessagingException, UnsupportedEncodingException {
        
        String subject = "Hóa đơn #" + invoiceNumber;
        
        Map<String, Object> variables = new HashMap<>();
        variables.put("customerName", customerName);
        variables.put("invoiceNumber", invoiceNumber);
        variables.put("amount", amount);
        variables.put("dueDate", dueDate);
        variables.put("invoiceUrl", invoiceUrl);
        variables.put("note", note);
        
        Context context = new Context();
        context.setVariables(variables);
        
        // Try to use invoice-email template, fallback to simple text
        String htmlContent;
        try {
            htmlContent = templateEngine.process("invoice-email", context);
        } catch (Exception e) {
            // Fallback to simple HTML if template not found
            htmlContent = buildInvoiceEmailHtml(customerName, invoiceNumber, amount, dueDate, note);
        }
        
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
        helper.setFrom(fromEmail, "PTCMSS - Hệ thống quản lý vận tải");
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);
        
        mailSender.send(message);
    }

    /**
     * Gửi nhắc nợ qua email
     */
    public void sendDebtReminderEmail(String toEmail, String customerName, String invoiceNumber,
                                      String amount, String dueDate, Integer daysOverdue, String message)
            throws MessagingException, UnsupportedEncodingException {
        
        String subject = "Nhắc nhở thanh toán hóa đơn #" + invoiceNumber;
        
        Map<String, Object> variables = new HashMap<>();
        variables.put("customerName", customerName);
        variables.put("invoiceNumber", invoiceNumber);
        variables.put("amount", amount);
        variables.put("dueDate", dueDate);
        variables.put("daysOverdue", daysOverdue);
        variables.put("message", message);
        
        Context context = new Context();
        context.setVariables(variables);
        
        String htmlContent;
        try {
            htmlContent = templateEngine.process("debt-reminder-email", context);
        } catch (Exception e) {
            htmlContent = buildDebtReminderEmailHtml(customerName, invoiceNumber, amount, dueDate, daysOverdue, message);
        }
        
        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "UTF-8");
        helper.setFrom(fromEmail, "PTCMSS - Hệ thống quản lý vận tải");
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);
        
        mailSender.send(mimeMessage);
    }

    /**
     * Gửi SMS nhắc nợ (placeholder - cần tích hợp SMS gateway)
     */
    public void sendDebtReminderSMS(String phoneNumber, String invoiceNumber, String amount) {
        // TODO: Integrate with SMS gateway (Twilio, AWS SNS, etc.)
        log.info("[EmailService] SMS reminder would be sent to {} for invoice {} amount {}", 
                phoneNumber, invoiceNumber, amount);
    }

    /**
     * Gửi email thông tin đăng nhập sau khi user tạo mật khẩu thành công
     */
    public void sendCredentialsEmail(String toEmail, String fullName, String username, String password)
            throws MessagingException, UnsupportedEncodingException {
        
        String subject = "🔐 Thông tin đăng nhập TranspoManager";
        
        Map<String, Object> variables = new HashMap<>();
        variables.put("fullName", fullName);
        variables.put("username", username);
        variables.put("password", password);
        
        Context context = new Context();
        context.setVariables(variables);
        
        String htmlContent;
        try {
            htmlContent = templateEngine.process("credentials-email", context);
        } catch (Exception e) {
            // Fallback to simple HTML if template not found
            htmlContent = buildCredentialsEmailHtml(fullName, username, password);
        }
        
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
        helper.setFrom(fromEmail, "TranspoManager - Hệ thống quản lý vận tải");
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);
        
        mailSender.send(message);
        log.info("📧 Đã gửi thông tin đăng nhập đến email: {}", toEmail);
    }
    
    /**
     * Gửi email đơn giản (HTML)
     */
    public void sendSimpleEmail(String toEmail, String subject, String htmlContent) 
            throws MessagingException, UnsupportedEncodingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
        helper.setFrom(fromEmail, "TranspoManager - Hệ thống quản lý vận tải");
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);
        
        mailSender.send(message);
    }

    // Helper methods for fallback HTML
    private String buildInvoiceEmailHtml(String customerName, String invoiceNumber, 
                                        String amount, String dueDate, String note) {
        return "<html><body>" +
                "<h2>Hóa đơn #" + invoiceNumber + "</h2>" +
                "<p>Kính gửi: " + customerName + "</p>" +
                "<p>Số tiền: " + amount + " VNĐ</p>" +
                "<p>Hạn thanh toán: " + dueDate + "</p>" +
                (note != null ? "<p>Ghi chú: " + note + "</p>" : "") +
                "<p>Trân trọng,<br>PTCMSS</p>" +
                "</body></html>";
    }

    private String buildDebtReminderEmailHtml(String customerName, String invoiceNumber,
                                              String amount, String dueDate, Integer daysOverdue, String message) {
        return "<html><body>" +
                "<h2>Nhắc nhở thanh toán</h2>" +
                "<p>Kính gửi: " + customerName + "</p>" +
                "<p>Hóa đơn #" + invoiceNumber + " đã quá hạn " + daysOverdue + " ngày</p>" +
                "<p>Số tiền: " + amount + " VNĐ</p>" +
                "<p>Hạn thanh toán: " + dueDate + "</p>" +
                (message != null ? "<p>" + message + "</p>" : "") +
                "<p>Vui lòng thanh toán sớm để tránh gián đoạn dịch vụ.</p>" +
                "<p>Trân trọng,<br>PTCMSS</p>" +
                "</body></html>";
    }

    private String buildCredentialsEmailHtml(String fullName, String username, String password) {
        return "<html><body style='font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;'>" +
                "<div style='max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);'>" +
                "<h2 style='color: #0079BC; margin-bottom: 20px;'>🔐 Thông tin đăng nhập TranspoManager</h2>" +
                "<p>Xin chào <strong>" + fullName + "</strong>,</p>" +
                "<p>Mật khẩu của bạn đã được thiết lập thành công! Dưới đây là thông tin đăng nhập của bạn:</p>" +
                "<div style='background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #0079BC;'>" +
                "<p style='margin: 10px 0;'><strong>Tên đăng nhập:</strong> <code style='background: #e9ecef; padding: 3px 8px; border-radius: 4px;'>" + username + "</code></p>" +
                "<p style='margin: 10px 0;'><strong>Mật khẩu:</strong> <code style='background: #e9ecef; padding: 3px 8px; border-radius: 4px;'>" + password + "</code></p>" +
                "</div>" +
                "<p style='color: #dc3545; font-size: 14px;'>⚠️ <strong>Lưu ý bảo mật:</strong> Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu và không chia sẻ thông tin này với bất kỳ ai.</p>" +
                "<hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;'>" +
                "<p style='color: #666; font-size: 12px;'>Trân trọng,<br><strong>TranspoManager - Hệ thống quản lý vận tải</strong></p>" +
                "</div></body></html>";
    }

    private String buildVerificationEmailHtml(String fullName, String username, String verificationUrl) {
        return "<html><body style='font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;'>" +
                "<div style='max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);'>" +
                "<h2 style='color: #0079BC; margin-bottom: 20px; text-align: center;'>✨ Chào mừng đến TranspoManager</h2>" +
                "<p>Xin chào <strong>" + fullName + "</strong>,</p>" +
                "<p>Tài khoản của bạn đã được tạo thành công trong hệ thống quản lý vận tải TranspoManager.</p>" +
                "<div style='background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #0079BC;'>" +
                "<p style='margin: 10px 0;'><strong>Tên đăng nhập:</strong> <code style='background: #e9ecef; padding: 3px 8px; border-radius: 4px;'>" + username + "</code></p>" +
                "</div>" +
                "<p>Để kích hoạt tài khoản và thiết lập mật khẩu, vui lòng nhấp vào nút bên dưới:</p>" +
                "<div style='text-align: center; margin: 20px 0;'>" +
                "<a href='" + verificationUrl + "' style='display: inline-block; padding: 12px 30px; background-color: #0079BC; color: #ffffff; text-decoration: none; border-radius: 5px;'>Xác thực tài khoản</a>" +
                "</div>" +
                "<p style='word-break: break-all; color: #0079BC; font-size: 12px;'>Hoặc copy link: " + verificationUrl + "</p>" +
                "<p style='color: #dc3545; font-size: 14px; margin-top: 20px;'>⚠️ <strong>Lưu ý:</strong> Link xác thực sẽ hết hạn sau 24 giờ. Vui lòng xác thực sớm để kích hoạt tài khoản.</p>" +
                "<p>Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.</p>" +
                "<hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;'>" +
                "<p style='color: #666; font-size: 12px; text-align: center;'>Trân trọng,<br><strong>TranspoManager - Hệ thống quản lý vận tải</strong></p>" +
                "<p style='color: #999; font-size: 11px; text-align: center;'>Email này được gửi tự động, vui lòng không trả lời.</p>" +
                "</div></body></html>";
    }
}
