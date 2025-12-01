import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { getCurrentRole, ROLES } from '../../utils/session';

/**
 * Toast notification component that displays WebSocket notifications
 * Auto-dismisses after 5 seconds
 */
export default function NotificationToast() {
    const { notifications, clearNotification } = useNotifications();
    const [visibleNotifications, setVisibleNotifications] = useState([]);
    const role = getCurrentRole();
    const isDriver = role === ROLES.DRIVER;

    useEffect(() => {
        // Only show unread notifications that should show toast (not from DB load)
        // showToast === false means loaded from DB (should only appear in bell, not as popup)
        let unread = notifications
            .filter(n => !n.read && n.showToast !== false);

        // For Driver role, filter to only show driver-relevant notifications
        if (isDriver) {
            const driverNotificationTypes = [
                'TRIP_ASSIGNED', 'TRIP_ASSIGNMENT', 'ASSIGN_TRIP', // Chuyến mới được nhận
                'EXPENSE_APPROVED', 'EXPENSE_REJECTED', 'EXPENSE_REQUEST_APPROVED', 'EXPENSE_REQUEST_REJECTED', // Duyệt chi phí
                'PAYMENT_APPROVED', 'PAYMENT_REJECTED', 'PAYMENT_REQUEST_APPROVED', 'PAYMENT_REQUEST_REJECTED', // Duyệt thanh toán
                'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_APPROVAL', 'DRIVER_DAY_OFF_APPROVED', 'DRIVER_DAY_OFF_REJECTED', // Duyệt nghỉ phép
            ];

            unread = unread.filter(n => {
                // Nếu có type, kiểm tra type
                if (n.type) {
                    return driverNotificationTypes.some(t => n.type.includes(t) || t.includes(n.type));
                }
                // Nếu không có type nhưng có message, kiểm tra message
                if (n.message) {
                    const msg = n.message.toLowerCase();
                    return msg.includes('chuyến') ||
                        msg.includes('chi phí') ||
                        msg.includes('thanh toán') ||
                        msg.includes('nghỉ phép') ||
                        msg.includes('duyệt') ||
                        msg.includes('trip') ||
                        msg.includes('expense') ||
                        msg.includes('payment') ||
                        msg.includes('leave');
                }
                // Nếu không có type và message không rõ, chỉ hiển thị nếu từ user-specific channel
                return true; // Hiển thị tất cả từ /topic/notifications/{userId}
            });
        }

        setVisibleNotifications(unread.slice(0, 3)); // Max 3 toasts
    }, [notifications, isDriver]);

    const handleDismiss = (notificationId) => {
        clearNotification(notificationId);
    };

    if (visibleNotifications.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
            {visibleNotifications.map((notification) => (
                <ToastItem
                    key={notification.id}
                    notification={notification}
                    onDismiss={handleDismiss}
                />
            ))}
        </div>
    );
}

function ToastItem({ notification, onDismiss }) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        // Animate in
        const showTimer = setTimeout(() => setIsVisible(true), 10);

        // Auto-dismiss after 5 seconds
        const dismissTimer = setTimeout(() => {
            setIsLeaving(true);
            setTimeout(() => onDismiss(notification.id), 300);
        }, 5000);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(dismissTimer);
        };
    }, [notification.id, onDismiss]);

    const handleManualDismiss = () => {
        setIsLeaving(true);
        setTimeout(() => onDismiss(notification.id), 300);
    };

    const getIcon = () => {
        switch (notification.type) {
            case 'SUCCESS':
                return <CheckCircle className="h-5 w-5 text-emerald-600" />;
            case 'ERROR':
                return <AlertCircle className="h-5 w-5 text-red-600" />;
            case 'WARNING':
                return <AlertTriangle className="h-5 w-5 text-amber-600" />;
            case 'BOOKING_UPDATE':
                return <Info className="h-5 w-5 text-blue-600" />;
            case 'PAYMENT_UPDATE':
                return <CheckCircle className="h-5 w-5 text-emerald-600" />;
            case 'DISPATCH_UPDATE':
                return <Info className="h-5 w-5 text-purple-600" />;
            default:
                return <Info className="h-5 w-5 text-sky-600" />;
        }
    };

    const getColorClasses = () => {
        switch (notification.type) {
            case 'SUCCESS':
            case 'PAYMENT_UPDATE':
                return 'border-emerald-200 bg-emerald-50';
            case 'ERROR':
                return 'border-red-200 bg-red-50';
            case 'WARNING':
                return 'border-amber-200 bg-amber-50';
            case 'BOOKING_UPDATE':
                return 'border-blue-200 bg-blue-50';
            case 'DISPATCH_UPDATE':
                return 'border-purple-200 bg-purple-50';
            default:
                return 'border-sky-200 bg-sky-50';
        }
    };

    return (
        <div
            className={`
        pointer-events-auto
        min-w-[320px] max-w-md
        rounded-lg border-2 shadow-lg
        p-4
        transition-all duration-300 ease-out
        ${getColorClasses()}
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
        >
            <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                    {getIcon()}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="text-slate-900 font-semibold text-sm leading-tight">
                        {notification.title}
                    </div>
                    <div className="text-slate-700 text-sm leading-snug mt-1">
                        {notification.message}
                    </div>
                </div>

                <button
                    onClick={handleManualDismiss}
                    className="shrink-0 rounded-md p-1 hover:bg-slate-200/50 transition-colors"
                    aria-label="Đóng thông báo"
                >
                    <X className="h-4 w-4 text-slate-600" />
                </button>
            </div>

            {/* Progress bar for auto-dismiss */}
            <div className="mt-3 h-1 bg-slate-200/50 rounded-full overflow-hidden">
                <div
                    className="h-full bg-slate-400 rounded-full animate-shrink"
                    style={{ animationDuration: '5s' }}
                />
            </div>
        </div>
    );
}
