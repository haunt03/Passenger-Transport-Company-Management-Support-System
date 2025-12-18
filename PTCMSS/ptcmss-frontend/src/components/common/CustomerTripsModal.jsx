import React from "react";
import { X, Star, MapPin, Clock, CarFront, User, RefreshCw, Phone, Mail, Building2 } from "lucide-react";

/**
 * Modal component to display customer information and their trips
 * Reusable component for CustomerListPage and RatingManagementPage
 */
export default function CustomerTripsModal({ customer, trips, loading, error, onClose }) {
    const formatDateTime = (dateStr) => {
        if (!dateStr) return "—";
        try {
            const date = new Date(dateStr);
            return date.toLocaleString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return "—";
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        try {
            return new Date(dateStr).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });
        } catch {
            return "—";
        }
    };

    const getTripStatusLabel = (status) => {
        const statusMap = {
            PENDING: "Chờ xử lý",
            ASSIGNED: "Đã phân xe",
            IN_PROGRESS: "Đang thực hiện",
            ONGOING: "Đang thực hiện",
            SCHEDULED: "Đã lên lịch",
            COMPLETED: "Hoàn thành",
            CANCELLED: "Đã hủy",
        };
        return statusMap[status] || status || "—";
    };

    const getTripStatusColor = (status) => {
        const colorMap = {
            PENDING: "bg-info-50 text-info-700 border-info-200",
            ASSIGNED: "bg-sky-50 text-sky-700 border-sky-200",
            IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
            ONGOING: "bg-blue-50 text-blue-700 border-blue-200",
            SCHEDULED: "bg-indigo-50 text-indigo-700 border-indigo-200",
            COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
            CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
        };
        return colorMap[status] || "bg-slate-50 text-slate-700 border-slate-200";
    };

    if (!customer) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-[#0079BC] to-sky-600 text-white">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold">
                            {(customer.fullName || customer.customerName || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Danh sách chuyến đi</h2>
                            <p className="text-sm text-white/90 mt-1">
                                {customer.fullName || customer.customerName || "—"} • {trips?.length || 0} chuyến
                            </p>
                            {customer.phone && (
                                <p className="text-xs text-white/80 mt-1 font-mono">
                                    {customer.phone}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Customer Info Section */}
                    <div className="bg-slate-50 rounded-lg p-5 mb-6 border border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Thông tin liên hệ</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3">
                                <User className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="text-xs text-slate-500 uppercase font-medium mb-1">Họ tên</div>
                                    <div className="text-sm font-medium text-slate-900">
                                        {customer.fullName || customer.customerName || "—"}
                                    </div>
                                </div>
                            </div>

                            {customer.phone && (
                                <div className="flex items-start gap-3">
                                    <Phone className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase font-medium mb-1">Số điện thoại</div>
                                        <div className="text-sm font-medium text-slate-900 font-mono">
                                            {customer.phone}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {customer.email && (
                                <div className="flex items-start gap-3">
                                    <Mail className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase font-medium mb-1">Email</div>
                                        <div className="text-sm font-medium text-slate-900">
                                            {customer.email}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {customer.address && (
                                <div className="flex items-start gap-3 md:col-span-2">
                                    <MapPin className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <div className="text-xs text-slate-500 uppercase font-medium mb-1">Địa chỉ</div>
                                        <div className="text-sm font-medium text-slate-900">
                                            {customer.address}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {customer.branchName && (
                                <div className="flex items-start gap-3">
                                    <Building2 className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <div className="text-xs text-slate-500 uppercase font-medium mb-1">Chi nhánh</div>
                                        <div className="text-sm font-medium text-slate-900">
                                            {customer.branchName}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Trips Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Danh sách chuyến đi</h3>
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <RefreshCw className="h-8 w-8 text-slate-400 animate-spin mb-3" />
                                <span className="text-sm text-slate-500">Đang tải danh sách chuyến đi...</span>
                            </div>
                        ) : error ? (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                                {error}
                            </div>
                        ) : !trips || trips.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <CarFront className="h-12 w-12 text-slate-300 mb-3" />
                                <span className="text-sm text-slate-500">Khách hàng chưa có chuyến đi nào</span>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {trips.map((trip, index) => {
                                    const tripId = trip.id || trip.tripId;
                                    const rating = trip.rating;
                                    const hasRating = rating && rating.overallRating;

                                    // Debug: Log trip data to check available fields
                                    if (index === 0) {
                                        console.log('[CustomerTripsModal] First trip data:', trip);
                                    }

                                    // Get start location with multiple fallbacks
                                    const startLocation = trip.startLocation || trip.start_location || trip.pickup || trip.pickupLocation || null;
                                    // Get end location with multiple fallbacks
                                    const endLocation = trip.endLocation || trip.end_location || trip.dropoff || trip.dropoffLocation || null;
                                    // Get times with fallbacks
                                    const startTime = trip.startTime || trip.start_time || trip.pickup_time || trip.pickupTime || null;
                                    const endTime = trip.endTime || trip.end_time || trip.dropoff_eta || trip.dropoffEta || null;
                            const startTimeFormatted = startTime ? formatDateTime(startTime) : null;
                            const endTimeFormatted = endTime ? formatDateTime(endTime) : null;

                                    return (
                                        <div
                                            key={tripId || index}
                                    className="border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-shadow bg-white"
                                        >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg font-bold text-slate-900">
                                                    Chuyến #{tripId || `#${index + 1}`}
                                                </span>
                                                {trip.status && (
                                                    <span
                                                        className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getTripStatusColor(
                                                            trip.status
                                                        )}`}
                                                    >
                                                        {getTripStatusLabel(trip.status)}
                                                    </span>
                                                )}
                                                {hasRating && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                                        {rating.overallRating?.toFixed(1) || "—"}
                                                    </span>
                                                )}
                                            </div>
                                            {trip.bookingCode && (
                                                <p className="text-xs text-slate-500">
                                                    Đơn hàng: {trip.bookingCode}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Timeline block */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="space-y-2 border border-slate-100 rounded-lg p-3 bg-slate-50/60">
                                            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 uppercase">
                                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                                Điểm đón
                                            </div>
                                            <p className="text-sm text-slate-900 font-medium leading-snug">
                                                {startLocation || "—"}
                                            </p>
                                            {startTimeFormatted && (
                                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {startTimeFormatted}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2 border border-slate-100 rounded-lg p-3 bg-slate-50/60">
                                            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 uppercase">
                                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                                Điểm đến
                                            </div>
                                            <p className="text-sm text-slate-900 font-medium leading-snug">
                                                {endLocation || "—"}
                                            </p>
                                            {endTimeFormatted && (
                                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {endTimeFormatted}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                            {/* Driver Info */}
                                            {(trip.driver_name || trip.driverName) && (
                                                <div className="flex items-center gap-2 mb-4 p-2 bg-slate-50 rounded-lg">
                                                    <User className="h-4 w-4 text-slate-400" />
                                                    <span className="text-sm text-slate-700">
                                                        <span className="font-medium">Tài xế:</span>{" "}
                                                        {trip.driver_name || trip.driverName || "—"}
                                                    </span>
                                                    {trip.vehicle_plate && (
                                                        <span className="text-xs text-slate-500">
                                                            • {trip.vehicle_plate}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Rating Section */}
                                            {hasRating ? (
                                                <div className="mt-4 pt-4 border-t border-slate-200">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                                        <span className="text-sm font-semibold text-slate-900">
                                                            Đánh giá tài xế
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                                        {rating.punctualityRating != null && (
                                                            <div>
                                                                <span className="text-slate-500">Đúng giờ:</span>{" "}
                                                                <span className="font-medium text-slate-900">
                                                                    {rating.punctualityRating}/5
                                                                </span>
                                                            </div>
                                                        )}
                                                        {rating.attitudeRating != null && (
                                                            <div>
                                                                <span className="text-slate-500">Thái độ:</span>{" "}
                                                                <span className="font-medium text-slate-900">
                                                                    {rating.attitudeRating}/5
                                                                </span>
                                                            </div>
                                                        )}
                                                        {rating.safetyRating != null && (
                                                            <div>
                                                                <span className="text-slate-500">An toàn:</span>{" "}
                                                                <span className="font-medium text-slate-900">
                                                                    {rating.safetyRating}/5
                                                                </span>
                                                            </div>
                                                        )}
                                                        {rating.complianceRating != null && (
                                                            <div>
                                                                <span className="text-slate-500">Tuân thủ:</span>{" "}
                                                                <span className="font-medium text-slate-900">
                                                                    {rating.complianceRating}/5
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {rating.comment && (
                                                        <div className="mt-3 pt-3 border-t border-slate-200">
                                                            <p className="text-xs text-slate-600 italic">
                                                                "{rating.comment}"
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="mt-4 pt-4 border-t border-slate-200">
                                                    <p className="text-xs text-slate-400 italic">
                                                        Chưa có đánh giá cho chuyến đi này
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

