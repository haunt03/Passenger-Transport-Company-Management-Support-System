package org.example.ptcmssbackend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.io.UnsupportedEncodingException;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendVerificationEmail(String toEmail, String fullName, String token, String baseUrl)
            throws MessagingException, UnsupportedEncodingException {

        String subject = "Xác thực tài khoản nhân viên";
        String verifyUrl = baseUrl + "/verify?token=" + token;

        Map<String, Object> variables = new HashMap<>();
        variables.put("fullName", fullName);
        variables.put("verifyUrl", verifyUrl);

        Context context = new Context();
        context.setVariables(variables);
        String htmlContent = templateEngine.process("verify-email", context);

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
        helper.setFrom(fromEmail, "Hệ thống quản lý nhân sự");
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);

        mailSender.send(message);
    }
}