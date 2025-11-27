import React from "react";
import {
    AlertCircle,
    AlertTriangle,
    Info,
    CheckCircle,
    Calendar,
    FileText,
    Car,
    UserX,
    DollarSign,
    X,
} from "lucide-react";

const cls = (...a) => a.filter(Boolean).join(" ");

/**
 * Alerts Panel - System warnings and notifications
 */
export default function AlertsPanel({
                                        alerts = [],
                                        onAcknowledge,
                                        loading = false,
                                        maxHeight = 400,
                                    }) {
    const getAlertIcon = (type, severity) => {
        if (severity === "CRITICAL") return AlertCircle;
        if (severity === "HIGH") return AlertTriangle;
        if (severity === "MEDIUM") return Info;
        return CheckCircle;
    };

    const getAlertColor = (severity) => {
        const colors = {
            CRITICAL: "bg-rose-50 border-rose-300 text-rose-800",
            HIGH: "bg-orange-50 border-orange-300 text-orange-800",
            MEDIUM: "bg-amber-50 border-amber-300 text-amber-800",
            LOW: "bg-sky-50 border-sky-300 text-sky-800",
        };
        return colors[severity] || colors.LOW;
    };

    const getAlertTypeIcon = (alertType) => {
        const icons = {
            VEHICLE_INSPECTION_EXPIRING: Car,
            VEHICLE_INSURANCE_EXPIRING: FileText,
            DRIVER_LICENSE_EXPIRING: UserX,
            INVOICE_OVERDUE: DollarSign,
            APPROVAL_PENDING: Calendar,
        };
        return icons[alertType] || Info;
    };

    const formatAlertMessage = (alert) => {
        switch (alert.alertType) {
            case "VEHICLE_INSPECTION_EXPIRING":
                return `Xe ${alert.licensePlate} sắp hết hạn đăng kiểm (${alert.daysUntilExpiry} ngày)`;
            case "VEHICLE_INSURANCE_EXPIRING":
                return `Bảo hiểm xe ${alert.licensePlate} sắp hết hạn`;
            case "DRIVER_LICENSE_EXPIRING":
                return `Bằng lái của ${alert.driverName} sắp hết hạn (${alert.daysUntilExpiry} ngày)`;
            case "INVOICE_OVERDUE":
                return `Hóa đơn ${alert.invoiceNumber} quá hạn ${alert.daysOverdue} ngày`;
            case "APPROVAL_PENDING":
                return `Yêu cầu ${alert.approvalType} chờ duyệt`;
            default:
                return alert.message || "Cảnh báo hệ thống";
        }
    };

    if (loading) {
        return (
            <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-slate-200 rounded animate-pulse" />
                ))}
            </div>
        );
    }

    if (!alerts || alerts.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500 text-sm">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-amber-500" />
                <div>Không có cảnh báo nào</div>
            </div>
        );
    }

    return (
        <div
            className="space-y-2 overflow-y-auto"
            style={{ maxHeight }}
        >
            {alerts.map((alert, index) => {
                const Icon = getAlertIcon(alert.alertType, alert.severity);
                const TypeIcon = getAlertTypeIcon(alert.alertType);
                const colorClass = getAlertColor(alert.severity);

                return (
                    <div
                        key={alert.alertId || alert.id || index}
                        className={cls(
                            "rounded-lg border p-3 flex items-start gap-3",
                            colorClass
                        )}
                    >
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                            <Icon className="h-5 w-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <TypeIcon className="h-4 w-4" />
                                    <span className="text-sm font-semibold">
                                        {alert.severity === "CRITICAL"
                                            ? "Khẩn cấp"
                                            : alert.severity === "HIGH"
                                                ? "Cao"
                                                : alert.severity === "MEDIUM"
                                                    ? "Trung bình"
                                                    : "Thấp"}
                                    </span>
                                </div>
                                {onAcknowledge && (
                                    <button
                                        onClick={() => onAcknowledge(alert)}
                                        className="flex-shrink-0 hover:bg-black/10 rounded p-1 transition-colors"
                                        title="Đã xem"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            <p className="text-sm">
                                {formatAlertMessage(alert)}
                            </p>
                            {alert.branchName && (
                                <div className="text-xs mt-1 opacity-75">
                                    Chi nhánh: {alert.branchName}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
