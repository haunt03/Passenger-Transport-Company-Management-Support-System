import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within WebSocketProvider');
    }
    return context;
};

export const WebSocketProvider = ({ children }) => {
    const [connected, setConnected] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const clientRef = useRef(null);
    const subscriptionsRef = useRef([]);

    useEffect(() => {
        // Create STOMP client with SockJS
        const client = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
            debug: (str) => {
                console.log('[WebSocket Debug]', str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                console.log('[WebSocket] Connected');
                setConnected(true);

                // Subscribe to global notifications (includes all types)
                const sub1 = client.subscribe('/topic/notifications', (message) => {
                    const notification = JSON.parse(message.body);
                    console.log('[WebSocket] Received notification:', notification);

                    // Check if notification already exists to prevent duplicates
                    setNotifications((prev) => {
                        const exists = prev.some(n =>
                            n.id === notification.id ||
                            (n.timestamp === notification.timestamp && n.message === notification.message)
                        );
                        if (exists) {
                            console.log('[WebSocket] Duplicate notification ignored');
                            return prev;
                        }
                        return [notification, ...prev];
                    });
                });

                // Subscribe to booking updates (separate channel for real-time updates)
                const sub2 = client.subscribe('/topic/bookings', (message) => {
                    const update = JSON.parse(message.body);
                    console.log('[WebSocket] Received booking update:', update);

                    // Only add if not already in notifications
                    setNotifications((prev) => {
                        const exists = prev.some(n =>
                            n.data?.bookingId === update.bookingId &&
                            n.timestamp === update.timestamp
                        );
                        if (exists) {
                            console.log('[WebSocket] Duplicate booking notification ignored');
                            return prev;
                        }
                        return [
                            {
                                id: Date.now(),
                                title: 'Cập nhật đơn hàng',
                                message: update.message,
                                type: 'BOOKING_UPDATE',
                                timestamp: update.timestamp,
                                read: false,
                                data: update
                            },
                            ...prev
                        ];
                    });
                });

                // Subscribe to payment updates
                const sub3 = client.subscribe('/topic/payments', (message) => {
                    const update = JSON.parse(message.body);
                    console.log('[WebSocket] Received payment update:', update);
                    setNotifications((prev) => [
                        {
                            id: Date.now(),
                            title: 'Cập nhật thanh toán',
                            message: update.message,
                            type: 'PAYMENT_UPDATE',
                            timestamp: update.timestamp,
                            read: false,
                            data: update
                        },
                        ...prev
                    ]);
                });

                // Subscribe to dispatch updates
                const sub4 = client.subscribe('/topic/dispatches', (message) => {
                    const update = JSON.parse(message.body);
                    console.log('[WebSocket] Received dispatch update:', update);
                    setNotifications((prev) => [
                        {
                            id: Date.now(),
                            title: 'Cập nhật điều phối',
                            message: update.message,
                            type: 'DISPATCH_UPDATE',
                            timestamp: update.timestamp,
                            read: false,
                            data: update
                        },
                        ...prev
                    ]);
                });

                subscriptionsRef.current = [sub1, sub2, sub3, sub4];
            },
            onDisconnect: () => {
                console.log('[WebSocket] Disconnected');
                setConnected(false);
            },
            onStompError: (frame) => {
                console.error('[WebSocket] STOMP error:', frame);
                setConnected(false);
            },
        });

        clientRef.current = client;
        client.activate();

        // Cleanup on unmount
        return () => {
            subscriptionsRef.current.forEach(sub => sub.unsubscribe());
            client.deactivate();
        };
    }, []);

    const markAsRead = (notificationId) => {
        setNotifications((prev) =>
            prev.map((n) =>
                n.id === notificationId ? { ...n, read: true } : n
            )
        );
    };

    const clearNotification = (notificationId) => {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    };

    const clearAllNotifications = () => {
        setNotifications([]);
    };

    const subscribeToUserNotifications = (userId) => {
        if (!clientRef.current || !connected) {
            console.warn('[WebSocket] Cannot subscribe: not connected');
            return null;
        }

        const subscription = clientRef.current.subscribe(
            `/topic/notifications/${userId}`,
            (message) => {
                const notification = JSON.parse(message.body);
                console.log('[WebSocket] Received user notification:', notification);
                setNotifications((prev) => [notification, ...prev]);
            }
        );

        return subscription;
    };

    const pushNotification = (notification) => {
        if (!notification) return;
        const payload = {
            id: Date.now(),
            title: notification.title || 'Thông báo',
            message: notification.message || '',
            type: notification.type || 'INFO',
            timestamp: notification.timestamp || new Date().toISOString(),
            read: false,
            ...notification,
        };
        setNotifications((prev) => [payload, ...prev]);
    };

    const value = {
        connected,
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
        markAsRead,
        clearNotification,
        clearAllNotifications,
        subscribeToUserNotifications,
        pushNotification,
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};
