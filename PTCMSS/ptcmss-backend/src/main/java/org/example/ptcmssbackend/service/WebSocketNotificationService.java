package org.example.ptcmssbackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebSocketNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Send notification to all connected clients
     */
    public void sendGlobalNotification(String title, String message, String type) {
        Map<String, Object> notification = buildNotification(title, message, type, null);
        messagingTemplate.convertAndSend("/topic/notifications", notification);
        log.info("Sent global notification: {}", title);
    }

    /**
     * Send notification to specific user
     */
    public void sendUserNotification(Integer userId, String title, String message, String type) {
        Map<String, Object> notification = buildNotification(title, message, type, userId);
        messagingTemplate.convertAndSend("/topic/notifications/" + userId, notification);
        log.info("Sent notification to user {}: {}", userId, title);
    }

    /**
     * Send booking update notification
     */
    public void sendBookingUpdate(Integer bookingId, String status, String message) {
        Map<String, Object> update = new HashMap<>();
        update.put("type", "BOOKING_UPDATE");
        update.put("bookingId", bookingId);
        update.put("status", status);
        update.put("message", message);
        update.put("timestamp", Instant.now());

        messagingTemplate.convertAndSend("/topic/bookings", update);
        log.info("Sent booking update for booking {}: {}", bookingId, status);
    }

    /**
     * Send payment update notification
     */
    public void sendPaymentUpdate(Integer invoiceId, Integer bookingId, String status, String message) {
        Map<String, Object> update = new HashMap<>();
        update.put("type", "PAYMENT_UPDATE");
        update.put("invoiceId", invoiceId);
        update.put("bookingId", bookingId);
        update.put("status", status);
        update.put("message", message);
        update.put("timestamp", Instant.now());

        messagingTemplate.convertAndSend("/topic/payments", update);
        log.info("Sent payment update for invoice {}: {}", invoiceId, status);
    }

    /**
     * Send dispatch update notification
     */
    public void sendDispatchUpdate(Integer dispatchId, String status, String message) {
        Map<String, Object> update = new HashMap<>();
        update.put("type", "DISPATCH_UPDATE");
        update.put("dispatchId", dispatchId);
        update.put("status", status);
        update.put("message", message);
        update.put("timestamp", Instant.now());

        messagingTemplate.convertAndSend("/topic/dispatches", update);
        log.info("Sent dispatch update for dispatch {}: {}", dispatchId, status);
    }

    private Map<String, Object> buildNotification(String title, String message, String type, Integer userId) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("id", System.currentTimeMillis());
        notification.put("title", title);
        notification.put("message", message);
        notification.put("type", type != null ? type : "INFO");
        notification.put("timestamp", Instant.now());
        notification.put("read", false);
        if (userId != null) {
            notification.put("userId", userId);
        }
        return notification;
    }
}
