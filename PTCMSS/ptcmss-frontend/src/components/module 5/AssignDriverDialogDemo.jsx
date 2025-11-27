import React from "react";
import AssignDriverDialog from "./AssignDriverDialog.jsx";

/**
 * Demo component để test AssignDriverDialog
 *
 * Cách sử dụng:
 * 1. Import vào AppLayout.jsx hoặc route
 * 2. Truy cập /dispatch/assign-demo
 * 3. Click "Mở popup gán chuyến"
 */
export default function AssignDriverDialogDemo() {
    const [open, setOpen] = React.useState(false);
    const [result, setResult] = React.useState(null);

    // Mock data cho demo
    const mockOrder = {
        tripId: 1, // Thay bằng trip ID thật trong database
        bookingId: 1, // Thay bằng booking ID thật
        pickup_time: new Date().toISOString(),
        vehicle_type: "7 chỗ",
        branch_name: "Chi nhánh HCM",
        route: "Tân Bình -> Quận 1",
    };

    const handleAssigned = (assignResult) => {
        console.log("Gán thành công:", assignResult);
        setResult(assignResult);
        alert("Gán chuyến thành công! Xem console để biết chi tiết.");
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h1 className="text-2xl font-bold text-slate-900 mb-4">
                        Demo: Gán Tài xế & Xe
                    </h1>

                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h2 className="font-semibold text-blue-900 mb-2">
                                Thông tin chuyến (Mock)
                            </h2>
                            <div className="text-sm text-blue-800 space-y-1">
                                <div>Trip ID: {mockOrder.tripId}</div>
                                <div>Booking ID: {mockOrder.bookingId}</div>
                                <div>Thời gian: {new Date(mockOrder.pickup_time).toLocaleString('vi-VN')}</div>
                                <div>Loại xe: {mockOrder.vehicle_type}</div>
                                <div>Chi nhánh: {mockOrder.branch_name}</div>
                                <div>Route: {mockOrder.route}</div>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <h2 className="font-semibold text-amber-900 mb-2">
                                Lưu ý
                            </h2>
                            <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                                <li>Cần có trip ID và booking ID thật trong database</li>
                                <li>Cần đăng nhập với role ADMIN/MANAGER/COORDINATOR</li>
                                <li>Backend phải đang chạy tại localhost:8080</li>
                                <li>Thay đổi tripId và bookingId trong code nếu cần</li>
                            </ul>
                        </div>

                        <button
                            onClick={() => setOpen(true)}
                            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                        >
                            🚗 Mở popup gán chuyến
                        </button>

                        {result && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h2 className="font-semibold text-green-900 mb-2">
                                    Kết quả gán
                                </h2>
                                <pre className="text-xs text-green-800 overflow-auto">
                                    {JSON.stringify(result, null, 2)}
                                </pre>
                            </div>
                        )}

                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                            <h2 className="font-semibold text-slate-900 mb-2">
                                Hướng dẫn test
                            </h2>
                            <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
                                <li>
                                    <strong>Test Auto-assign:</strong>
                                    <ul className="ml-6 mt-1 space-y-1 list-disc list-inside">
                                        <li>Click "Mở popup gán chuyến"</li>
                                        <li>Đợi load gợi ý (xem danh sách suggestions)</li>
                                        <li>Click "Tự động gán (Auto-assign)"</li>
                                        <li>Kiểm tra kết quả trong console</li>
                                    </ul>
                                </li>
                                <li>
                                    <strong>Test Manual assign:</strong>
                                    <ul className="ml-6 mt-1 space-y-1 list-disc list-inside">
                                        <li>Click "Mở popup gán chuyến"</li>
                                        <li>Chọn tài xế từ dropdown</li>
                                        <li>Chọn xe từ dropdown</li>
                                        <li>Click "Xác nhận gán chuyến"</li>
                                        <li>Kiểm tra kết quả</li>
                                    </ul>
                                </li>
                                <li>
                                    <strong>Test suggestions:</strong>
                                    <ul className="ml-6 mt-1 space-y-1 list-disc list-inside">
                                        <li>Xem danh sách gợi ý (top 10 cặp)</li>
                                        <li>Click vào 1 gợi ý để auto-fill dropdown</li>
                                        <li>Kiểm tra reasons (lý do)</li>
                                        <li>Kiểm tra score (điểm công bằng)</li>
                                    </ul>
                                </li>
                            </ol>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                            <h2 className="font-semibold text-slate-900 mb-2">
                                🔍 Debug
                            </h2>
                            <div className="text-sm text-slate-700 space-y-2">
                                <div>
                                    <strong>API Endpoint:</strong>
                                    <code className="ml-2 bg-slate-100 px-2 py-1 rounded text-xs">
                                        GET /api/dispatch/trips/{mockOrder.tripId}/suggestions
                                    </code>
                                </div>
                                <div>
                                    <strong>Assign Endpoint:</strong>
                                    <code className="ml-2 bg-slate-100 px-2 py-1 rounded text-xs">
                                        POST /api/dispatch/assign
                                    </code>
                                </div>
                                <div>
                                    <strong>Console:</strong> Mở DevTools (F12) để xem logs
                                </div>
                                <div>
                                    <strong>Network:</strong> Xem tab Network để debug API calls
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Popup */}
            <AssignDriverDialog
                open={open}
                order={mockOrder}
                onClose={() => setOpen(false)}
                onAssigned={handleAssigned}
            />
        </div>
    );
}
