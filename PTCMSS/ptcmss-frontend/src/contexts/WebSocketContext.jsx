import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { getCurrentRole, ROLES } from '../utils/session';

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
    const [initialLoaded, setInitialLoaded] = useState(false);

    // Fetch initial notifications from database on mount
    useEffect(() => {
        if (initialLoaded) return;

        async function loadInitialNotifications() {
            try {
                // Try multiple ways to get userId
                let userId = localStorage.getItem('userId');
                if (!userId) {
                    const cookieMatch = document.cookie.match(/userId=(\d+)/);
                    userId = cookieMatch ? cookieMatch[1] : null;
                }
                if (!userId) {
                    // Try from session utils
                    try {
                        const { getStoredUserId } = await import('../utils/session');
                        userId = getStoredUserId();
                    } catch {}
                }

                console.log('[WebSocket] Loading notifications for userId:', userId);

                if (!userId) {
                    console.warn('[WebSocket] No userId found, skipping notification load');
                    return;
                }

                const { getDriverNotifications } = await import('../api/notifications');
                const response = await getDriverNotifications({ userId: parseInt(userId), page: 1, limit: 20 });
                console.log('[WebSocket] Full API response:', JSON.stringify(response, null, 2));

                // Response structure: { status, message, data: { data: [...], total, page, limit } }
                let data = [];
                if (response?.data?.data) {
                    data = response.data.data;
                } else if (Array.isArray(response?.data)) {
                    data = response.data;
                } else if (Array.isArray(response)) {
                    data = response;
                }

                console.log('[WebSocket] Parsed notifications data:', data);

                if (Array.isArray(data) && data.length > 0) {
                    console.log('[WebSocket] Loaded', data.length, 'notifications from DB');
                    setNotifications(prev => {
                        // Merge with existing (avoid duplicates)
                        const existingIds = new Set(prev.map(n => n.id));
                        const newNotifs = data
                            .filter(n => !existingIds.has(n.id) && !existingIds.has(`db-${n.id}`))
                            .map(n => ({
                                id: `db-${n.id}`,
                                title: n.title,
                                message: n.message || n.title,
                                type: n.type || 'SUCCESS',
                                timestamp: n.createdAt,
                                read: n.isRead === true || n.isRead === 1,
                                showToast: false, // DB notifications: only show in bell, no toast popup
                            }));
                        console.log('[WebSocket] Adding', newNotifs.length, 'new notifications (no toast)');
                        return [...newNotifs, ...prev];
                    });
                } else {
                    console.log('[WebSocket] No notifications found in response');
                }
            } catch (err) {
                console.error('[WebSocket] Failed to load initial notifications:', err);
            } finally {
                setInitialLoaded(true);
            }
        }

        loadInitialNotifications();
    }, [initialLoaded]);

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

                // Get current user role to determine which channels to subscribe
                const currentRole = getCurrentRole();
                const isDriver = currentRole === ROLES.DRIVER;
                console.log('[WebSocket] Current role:', currentRole, 'isDriver:', isDriver);

                // Subscribe to global notifications ONLY for admin/manager/coordinator roles
                // Driver should NOT receive global notifications (they are for admin dashboard)
                let sub1 = null;
                if (!isDriver) {
                    sub1 = client.subscribe('/topic/notifications', (message) => {
                        const notification = JSON.parse(message.body);
                        console.log('[WebSocket] Received GLOBAL notification:', notification);

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
                            // Add showToast: true for realtime notifications (show popup toast)
                            return [{ ...notification, showToast: true }, ...prev];
                        });
                    });
                } else {
                    console.log('[WebSocket] Driver role - skipping global notifications channel');
                }

                // Auto-subscribe to user-specific notifications (for ALL roles including driver)
                let userId = localStorage.getItem('userId');
                if (!userId) {
                    const cookieMatch = document.cookie.match(/userId=(\d+)/);
                    userId = cookieMatch ? cookieMatch[1] : null;
                }

                let userSub = null;
                if (userId) {
                    console.log('[WebSocket] Subscribing to user notifications for userId:', userId, 'role:', currentRole);
                    userSub = client.subscribe(`/topic/notifications/${userId}`, (message) => {
                        const notification = JSON.parse(message.body);
                        console.log('[WebSocket] Received USER notification for userId', userId, ':', notification);
                        setNotifications((prev) => {
                            const exists = prev.some(n =>
                                n.id === notification.id ||
                                (n.timestamp === notification.timestamp && n.message === notification.message)
                            );
                            if (exists) {
                                console.log('[WebSocket] Duplicate user notification ignored');
                                return prev;
                            }
                            // Add showToast: true for realtime notifications (show popup toast)
                            return [{ ...notification, showToast: true }, ...prev];
                        });
                    });
                } else {
                    console.log('[WebSocket] WARNING: No userId found, cannot subscribe to user-specific notifications');
                }

                // Subscribe to booking updates (separate channel for real-time updates)
                // Driver should NOT receive booking updates (they are for admin/coordinator)
                let sub2 = null;
                if (!isDriver) {
                    sub2 = client.subscribe('/topic/bookings', (message) => {
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
                                    data: update,
                                    showToast: true, // Realtime notification - show popup toast
                                },
                                ...prev
                            ];
                        });
                    });
                } else {
                    console.log('[WebSocket] Driver role - skipping booking updates channel');
                }

                // Subscribe to payment updates
                // Driver should NOT receive general payment updates (they get specific notifications via /topic/notifications/{userId})
                let sub3 = null;
                if (!isDriver) {
                    sub3 = client.subscribe('/topic/payments', (message) => {
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
                                data: update,
                                showToast: true, // Realtime notification - show popup toast
                            },
                            ...prev
                        ]);
                    });
                } else {
                    console.log('[WebSocket] Driver role - skipping payment updates channel');
                }

                // Subscribe to dispatch updates
                // Driver should NOT receive general dispatch updates (they get trip assignments via /topic/notifications/{userId})
                let sub4 = null;
                if (!isDriver) {
                    sub4 = client.subscribe('/topic/dispatches', (message) => {
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
                                data: update,
                                showToast: true, // Realtime notification - show popup toast
                            },
                            ...prev
                        ]);
                    });
                } else {
                    console.log('[WebSocket] Driver role - skipping dispatch updates channel');
                }

                // Store subscriptions (filter out null values for driver role)
                subscriptionsRef.current = [sub1, sub2, sub3, sub4].filter(Boolean);
                if (userSub) subscriptionsRef.current.push(userSub);
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

    const clearNotification = async (notificationId) => {
        // Remove from local state first (optimistic update)
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

        // If notification is from DB (id starts with "db-"), also delete from database
        if (typeof notificationId === 'string' && notificationId.startsWith('db-')) {
            try {
                const realId = notificationId.replace('db-', '');
                const { deleteNotification } = await import('../api/notifications');
                await deleteNotification(realId);
                console.log('[WebSocket] Deleted notification from DB:', realId);
            } catch (err) {
                console.error('[WebSocket] Failed to delete notification from DB:', err);
                // Don't restore - user already dismissed it locally
            }
        }
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
