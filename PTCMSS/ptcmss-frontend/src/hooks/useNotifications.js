import { useWebSocket } from '../contexts/WebSocketContext';
import { useEffect, useCallback } from 'react';

/**
 * Custom hook for managing real-time notifications
 * @returns {Object} Notification state and actions
 */
export const useNotifications = () => {
    const {
        connected,
        notifications,
        unreadCount,
        markAsRead,
        clearNotification,
        clearAllNotifications,
        subscribeToUserNotifications,
        pushNotification,
    } = useWebSocket();

    /**
     * Subscribe to user-specific notifications
     * @param {number} userId - User ID to subscribe to
     */
    const subscribeToUser = useCallback(
        (userId) => {
            if (!userId) {
                console.warn('[useNotifications] userId is required');
                return null;
            }
            return subscribeToUserNotifications(userId);
        },
        [subscribeToUserNotifications]
    );

    /**
     * Get notifications filtered by type
     * @param {string} type - Notification type filter
     * @returns {Array} Filtered notifications
     */
    const getNotificationsByType = useCallback(
        (type) => {
            if (!type) return notifications;
            return notifications.filter((n) => n.type === type);
        },
        [notifications]
    );

    /**
     * Get unread notifications
     * @returns {Array} Unread notifications
     */
    const getUnreadNotifications = useCallback(() => {
        return notifications.filter((n) => !n.read);
    }, [notifications]);

    /**
     * Play notification sound (optional)
     */
    const playNotificationSound = useCallback(() => {
        // You can add audio notification here if needed
        // const audio = new Audio('/notification-sound.mp3');
        // audio.play().catch(err => console.error('Failed to play sound:', err));
    }, []);

    // Auto-play sound on new notification (optional)
    useEffect(() => {
        if (notifications.length > 0 && !notifications[0].read) {
            // playNotificationSound();
        }
    }, [notifications, playNotificationSound]);

    return {
        connected,
        notifications,
        unreadCount,
        markAsRead,
        clearNotification,
        clearAllNotifications,
        subscribeToUser,
        getNotificationsByType,
        getUnreadNotifications,
        pushNotification,
    };
};
