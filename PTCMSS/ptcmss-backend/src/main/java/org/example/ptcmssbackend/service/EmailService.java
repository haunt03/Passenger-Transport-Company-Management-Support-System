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

    public void sendVerificationEmail(String toEmail, String fullName, String token, String baseUrl)
            throws MessagingException, UnsupportedEncodingException {

        String subject = "✨ Chào mừng đến TranspoManager - Xác thực tài khoản của bạn";
        String verifyUrl = baseUrl + "/verify?token=" + token;

        Map<String, Object> variables = new HashMap<>();
        variables.put("fullName", fullName);
        variables.put("verifyUrl", verifyUrl);

        Context context = new Context();
        context.setVariables(variables);
        String htmlContent = templateEngine.process("verify-email", context);

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
        helper.setFrom(fromEmail, "TranspoManager - Hệ thống quản lý vận tải");
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);

        mailSender.send(message);
    }

    public void sendCredentialsEmail(String toEmail, String fullName, String username, String password, String baseUrl)
            throws MessagingException, UnsupportedEncodingException {

        String subject = "🔐 Thông tin đăng nhập TranspoManager - Tài khoản của bạn";

        Map<String, Object> variables = new HashMap<>();
        variables.put("fullName", fullName);
        variables.put("username", username);
        variables.put("password", password);
        variables.put("loginUrl", baseUrl + "/login");

        Context context = new Context();
        context.setVariables(variables);
        String htmlContent = templateEngine.process("credentials-email", context);

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
        helper.setFrom(fromEmail, "TranspoManager - Hệ thống quản lý vận tải");
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);

        mailSender.send(message);
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
}