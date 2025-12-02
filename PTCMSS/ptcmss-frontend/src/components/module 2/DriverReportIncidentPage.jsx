import React from "react";
import {
    AlertTriangle, MapPin, Clock, FileText, Send, CheckCircle2,
    XCircle, Loader2, Info, AlertCircle, Shield
} from "lucide-react";
import { getDriverProfileByUser, reportIncident } from "../../api/drivers";

// Các mức độ nghiêm trọng với mô tả chi tiết
const SEVERITIES = [
    {
        value: "MINOR",
        label: "Nhẹ",
        color: "text-blue-700 bg-blue-50 border-blue-200",
        icon: Info,
        description: "Sự cố nhỏ, không ảnh hưởng đến an toàn"
    },
    {
        value: "MAJOR",
        label: "Trung bình",
        color: "text-amber-700 bg-amber-50 border-amber-200",
        icon: AlertCircle,
        description: "Sự cố cần xử lý, có thể ảnh hưởng đến lịch trình"
    },
    {
        value: "CRITICAL",
        label: "Nghiêm trọng",
        color: "text-rose-700 bg-rose-50 border-rose-200",
        icon: AlertTriangle,
        description: "Sự cố nghiêm trọng, cần xử lý khẩn cấp"
    },
];

// Các loại sự cố thường gặp
const INCIDENT_TYPES = [
    { value: "ACCIDENT", label: "Tai nạn giao thông" },
    { value: "VEHICLE_BREAKDOWN", label: "Xe hỏng" },
    { value: "TRAFFIC_JAM", label: "Kẹt xe nghiêm trọng" },
    { value: "WEATHER", label: "Thời tiết xấu" },
    { value: "CUSTOMER_ISSUE", label: "Vấn đề với khách hàng" },
    { value: "ROAD_CONDITION", label: "Đường xấu/ngập nước" },
    { value: "OTHER", label: "Khác" },
];

export default function DriverReportIncidentPage() {
    const [driver, setDriver] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [tripId, setTripId] = React.useState("");
    const [incidentType, setIncidentType] = React.useState("");
    const [severity, setSeverity] = React.useState("MAJOR");
    const [location, setLocation] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);
    const [toast, setToast] = React.useState(null);

    React.useEffect(() => {
        async function load() {
            try {
                const uid = localStorage.getItem("userId");
                if (!uid) {
                    setToast({ type: "error", message: "Không tìm thấy thông tin người dùng" });
                    setLoading(false);
                    return;
                }
                const p = await getDriverProfileByUser(uid);
                setDriver(p);
            } catch (err) {
                console.error("Error loading driver profile:", err);
                setToast({ type: "error", message: "Không tải được thông tin tài xế" });
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    async function onSubmit(e) {
        e.preventDefault();

        // Validation
        if (!tripId.trim()) {
            setToast({ type: "error", message: "Vui lòng nhập mã chuyến đi" });
            return;
        }
        if (!incidentType) {
            setToast({ type: "error", message: "Vui lòng chọn loại sự cố" });
            return;
        }
        if (!description.trim()) {
            setToast({ type: "error", message: "Vui lòng mô tả chi tiết sự cố" });
            return;
        }
        if (description.trim().length < 10) {
            setToast({ type: "error", message: "Mô tả phải có ít nhất 10 ký tự" });
            return;
        }

        setSubmitting(true);
        try {
            if (!driver?.driverId) {
                throw new Error("Không tìm thấy thông tin tài xế");
            }

            const tId = Number(String(tripId).trim());
            if (!tId || isNaN(tId)) {
                throw new Error("Mã chuyến đi không hợp lệ");
            }

            // Tạo mô tả đầy đủ
            const fullDescription = `[${INCIDENT_TYPES.find(t => t.value === incidentType)?.label || incidentType}] ${description.trim()}${location ? `\nĐịa điểm: ${location}` : ''}`;

            await reportIncident({
                driverId: driver.driverId,
                tripId: tId,
                severity,
                description: fullDescription,
            });

            setToast({ type: "success", message: "Đã gửi báo cáo sự cố thành công. Điều phối viên sẽ xử lý sớm nhất." });

            // Reset form
            setTripId("");
            setIncidentType("");
            setSeverity("MAJOR");
            setLocation("");
            setDescription("");

        } catch (e) {
            console.error("Error submitting incident:", e);
            setToast({
                type: "error",
                message: e.message || "Gửi báo cáo thất bại. Vui lòng kiểm tra và thử lại."
            });
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Toast Notification */}
                {toast && (
                    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                    }`}>
                        {toast.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                        <span className="text-sm">{toast.message}</span>
                        <button onClick={() => setToast(null)} className="ml-2">
                            <XCircle className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                            <AlertTriangle className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Báo cáo sự cố</h1>
                            <p className="text-sm text-slate-600">Thông báo sự cố trong chuyến đi để được hỗ trợ kịp thời</p>
                        </div>
                    </div>
                    {driver && (
                        <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                            <Shield className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-blue-700">
                <strong>{driver.fullName}</strong>
                                {driver.branchName && ` - ${driver.branchName}`}
              </span>
                        </div>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="space-y-6">
                        {/* Trip ID */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <FileText className="h-4 w-4 text-slate-400" />
                                Mã chuyến đi <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={tripId}
                                onChange={(e) => setTripId(e.target.value)}
                                placeholder="Nhập mã chuyến đi (Trip ID)"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                required
                            />
                            <p className="text-xs text-slate-500 mt-1">Ví dụ: 123, 456</p>
                        </div>

                        {/* Incident Type */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <AlertCircle className="h-4 w-4 text-slate-400" />
                                Loại sự cố <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={incidentType}
                                onChange={(e) => setIncidentType(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                required
                            >
                                <option value="">-- Chọn loại sự cố --</option>
                                {INCIDENT_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Severity */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <AlertTriangle className="h-4 w-4 text-slate-400" />
                                Mức độ nghiêm trọng <span className="text-rose-500">*</span>
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {SEVERITIES.map(sev => {
                                    const Icon = sev.icon;
                                    const isSelected = severity === sev.value;
                                    return (
                                        <button
                                            key={sev.value}
                                            type="button"
                                            onClick={() => setSeverity(sev.value)}
                                            className={`p-4 border-2 rounded-lg transition-all ${isSelected
                                                ? `${sev.color} border-current shadow-md`
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <Icon className={`h-5 w-5 ${isSelected ? '' : 'text-slate-400'}`} />
                                                <span className={`font-semibold ${isSelected ? '' : 'text-slate-700'}`}>
                          {sev.label}
                        </span>
                                            </div>
                                            <p className={`text-xs ${isSelected ? '' : 'text-slate-500'}`}>
                                                {sev.description}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Location */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                Địa điểm xảy ra sự cố
                            </label>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Ví dụ: Km 15 Quốc lộ 1A, gần cầu Thanh Trì"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                            <p className="text-xs text-slate-500 mt-1">Mô tả vị trí cụ thể để dễ hỗ trợ</p>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <FileText className="h-4 w-4 text-slate-400" />
                                Mô tả chi tiết <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={5}
                                placeholder="Mô tả chi tiết tình huống, thiệt hại (nếu có), và những gì bạn đã làm..."
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                                required
                            />
                            <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-slate-500">Tối thiểu 10 ký tự</p>
                                <p className="text-xs text-slate-400">{description.length} ký tự</p>
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex gap-3">
                                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-700">
                                    <p className="font-medium mb-1">Lưu ý quan trọng:</p>
                                    <ul className="list-disc list-inside space-y-1 text-xs">
                                        <li>Báo cáo sự cố càng sớm càng tốt để được hỗ trợ kịp thời</li>
                                        <li>Cung cấp thông tin chi tiết, chính xác để xử lý hiệu quả</li>
                                        <li>Trong trường hợp khẩn cấp, hãy gọi điện cho điều phối viên</li>
                                        <li>Giữ an toàn cho bản thân và hành khách là ưu tiên hàng đầu</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Đang gửi...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-5 w-5" />
                                        <span>Gửi báo cáo sự cố</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Help Section */}
                <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <p className="font-medium mb-1">Cần hỗ trợ khẩn cấp?</p>
                            <p className="text-xs">
                                Liên hệ ngay với điều phối viên qua hotline: <strong className="text-amber-900">1900-xxxx</strong>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
