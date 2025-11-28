import React from "react";
import { listVehicles, createVehicle, updateVehicle, listVehicleCategories } from "../../api/vehicles";
import { listBranches } from "../../api/branches";
import { getCurrentRole, ROLES } from "../../utils/session";
import {
    CarFront,
    PlusCircle,
    Filter,
    Search,
    Building2,
    Wrench,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    X,
    Calendar,
} from "lucide-react";

/**
 * M3.S5 - Quản lý phương tiện (LIGHT THEME VERSION)
 *
 * - Danh sách xe + filter
 * - Modal thêm xe mới
 * - Modal sửa xe
 *
 * Mock logic giữ nguyên như bản dark, chỉ đổi UI sang style light:
 *  - bg-slate-50
 *  - card trắng border-slate-200
 *  - nét chính sky-600
 */

const cls = (...a) => a.filter(Boolean).join(" ");

/* -------------------------------- */
/* Toast system (light)             */
/* -------------------------------- */
function useToasts() {
    const [toasts, setToasts] = React.useState([]);
    const push = React.useCallback((msg, kind = "info", ttl = 2400) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((arr) => [...arr, { id, msg, kind }]);
        setTimeout(() => {
            setToasts((arr) => arr.filter((t) => t.id !== id));
        }, ttl);
    }, []);
    return { toasts, push };
}

function Toasts({ toasts }) {
    return (
        <div className="fixed top-4 right-4 z-[999] space-y-2 text-[13px]">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={cls(
                        "flex items-start gap-2 rounded-md border px-3 py-2 shadow-sm bg-white text-slate-700",
                        t.kind === "success" &&
                        "border-green-200 text-green-700 bg-green-50",
                        t.kind === "error" &&
                        "border-red-200 text-red-700 bg-red-50"
                    )}
                >
                    {t.kind === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : null}
                    <div className="leading-snug">{t.msg}</div>
                </div>
            ))}
        </div>
    );
}

/* -------------------------------- */
/* Status badge cho trß║íng th├íi xe   */
/* -------------------------------- */
const VEHICLE_STATUS = {
    AVAILABLE: "AVAILABLE",
    ON_TRIP: "ON_TRIP",
    MAINTENANCE: "MAINTENANCE",
};

const STATUS_LABEL = {
    AVAILABLE: "Sẵn sàng",
    ON_TRIP: "Đang chạy",
    MAINTENANCE: "Bảo trì",
};

function VehicleStatusBadge({ status }) {
    // light-style pill
    let clsColor = "";
    let IconEl = null;

    if (status === "AVAILABLE") {
        clsColor =
            "bg-green-50 text-green-700 border-green-200";
        IconEl = (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        );
    } else if (status === "ON_TRIP") {
        clsColor =
            "bg-sky-50 text-sky-700 border-sky-200";
        IconEl = (
            <CarFront className="h-3.5 w-3.5 text-sky-600" />
        );
    } else {
        clsColor =
            "bg-amber-50 text-amber-700 border-amber-200";
        IconEl = (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
        );
    }

    return (
        <span
            className={cls(
                "inline-flex items-center gap-1 rounded-md border px-2 py-[2px] text-[11px] font-medium leading-none",
                clsColor
            )}
        >
            {IconEl}
            <span>{STATUS_LABEL[status] || status}</span>
        </span>
    );
}

/* -------------------------------- */
/* Modal: Thêm xe mới (light)        */
/* -------------------------------- */
function CreateVehicleModal({
                                open,
                                onClose,
                                onCreate,
                                branches,
                                categories,
                            }) {
    const [licensePlate, setLicensePlate] = React.useState("");
    const [brand, setBrand] = React.useState("");
    const [model, setModel] = React.useState("");
    const [year, setYear] = React.useState("");
    const [odometer, setOdometer] = React.useState("");
    const [categoryId, setCategoryId] = React.useState("");
    const [branchId, setBranchId] = React.useState("");
    const [status, setStatus] = React.useState("AVAILABLE");
    const [regDueDate, setRegDueDate] = React.useState("");
    const [insDueDate, setInsDueDate] = React.useState("");
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        if (open) {
            setLicensePlate("");
            setBrand("");
            setModel("");
            setYear("");
            setOdometer("");
            setCategoryId("");
            setBranchId("");
            setStatus("AVAILABLE");
            setRegDueDate("");
            setInsDueDate("");
            setError("");
        }
    }, [open]);

    if (!open) return null;

    const numericOnly = (s) => s.replace(/[^0-9]/g, "");

    // Validation biển số xe theo chuẩn Việt Nam
    const isPlateValid = (plate) => {
        const cleanPlate = plate.trim().toUpperCase();
        // Xe ô tô: 29A-12345, 29A-123.45, 29AB-12345
        const carPlateRegex = /^\d{2}[A-Z]{1,2}[-\s]?\d{3,5}(\.\d{2})?$/;
        // Xe ngoại giao: NG-001, NN-123
        const diplomaticPlateRegex = /^(NG|NN)[-\s]?\d{3,4}$/;
        // Xe quân đội: QĐ-12345
        const militaryPlateRegex = /^Q[ĐD][-\s]?\d{4,5}$/;

        return carPlateRegex.test(cleanPlate) ||
            diplomaticPlateRegex.test(cleanPlate) ||
            militaryPlateRegex.test(cleanPlate);
    };

    const valid =
        isPlateValid(licensePlate) &&
        categoryId !== "" &&
        branchId !== "" &&
        year.trim() !== "" &&
        odometer.trim() !== "";

    const handleSubmit = () => {
        if (!valid) {
            setError("Vui lòng điền đủ thông tin bắt buộc.");
            return;
        }

        const payload = {
            license_plate: licensePlate.trim(),
            brand: brand.trim(),
            model: model.trim(),
            year: Number(year),
            odometer: Number(odometer),
            category_id: categoryId,
            branch_id: branchId,
            status,
            reg_due_date: regDueDate || null,
            ins_due_date: insDueDate || null,
        };

        onCreate(payload);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-xl rounded-xl bg-white border border-slate-200 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-start gap-2">
                    <div className="h-10 w-10 rounded-md border border-sky-200 bg-sky-50 text-sky-600 flex items-center justify-center shadow-sm">
                        <CarFront className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col leading-tight min-w-0">
                        <div className="font-semibold text-slate-900 text-[14px]">
                            Thêm xe mới
                        </div>
                        <div className="text-[11px] text-slate-500">
                            Khai báo thông tin xe, trạng thái và chi nhánh sở hữu.
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title="─É├│ng"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* body */}
                <div className="p-5 space-y-4 text-[13px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Biển số xe */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1">
                                Biển số xe{" "}
                                <span className="text-red-500">*</span>
                            </div>
                            <input
                                value={licensePlate}
                                onChange={(e) =>
                                    setLicensePlate(
                                        e.target.value.toUpperCase()
                                    )
                                }
                                className={cls(
                                    "w-full rounded-md border px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none",
                                    "border-slate-300 bg-white shadow-sm",
                                    "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20",
                                    !isPlateValid(licensePlate) && licensePlate.trim() !== "" && "border-red-300"
                                )}
                                placeholder="29A-12345 hoặc 51H-123.45"
                            />
                            {!isPlateValid(licensePlate) && licensePlate.trim() !== "" && (
                                <div className="text-[11px] text-red-600 mt-1">
                                    Biển số không đúng định dạng VN
                                </div>
                            )}
                        </div>

                        {/* Hãng SX */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1">
                                Hãng xe
                            </div>
                            <input
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                                className={cls(
                                    "w-full rounded-md border px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none",
                                    "border-slate-300 bg-white shadow-sm",
                                    "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                )}
                                placeholder="Toyota / Ford / Hyundai..."
                            />
                        </div>

                        {/* Model */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1">
                                Model
                            </div>
                            <input
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className={cls(
                                    "w-full rounded-md border px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none",
                                    "border-slate-300 bg-white shadow-sm",
                                    "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                )}
                                placeholder="Vios / Fortuner / Solati..."
                            />
                        </div>

                        {/* Năm sản xuất */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1">
                                Năm sản xuất{" "}
                                <span className="text-red-500">*</span>
                            </div>
                            <input
                                value={year}
                                onChange={(e) =>
                                    setYear(numericOnly(e.target.value))
                                }
                                inputMode="numeric"
                                className={cls(
                                    "w-full rounded-md border px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none",
                                    "border-slate-300 bg-white shadow-sm",
                                    "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                )}
                                placeholder="2022"
                            />
                        </div>

                        {/* Odo */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1">
                                Odometer hiện tại (km){" "}
                                <span className="text-red-500">*</span>
                            </div>
                            <input
                                value={odometer}
                                onChange={(e) =>
                                    setOdometer(numericOnly(e.target.value))
                                }
                                inputMode="numeric"
                                className={cls(
                                    "w-full rounded-md border px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none",
                                    "border-slate-300 bg-white shadow-sm",
                                    "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                )}
                                placeholder="50000"
                            />
                        </div>

                        {/* Trạng thái */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1">
                                Trạng thái
                            </div>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className={cls(
                                    "w-full rounded-md border px-3 py-2 text-[13px] text-slate-700 outline-none",
                                    "border-slate-300 bg-white shadow-sm",
                                    "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                )}
                            >
                                <option value="AVAILABLE">Sẵn sàng</option>
                                <option value="ON_TRIP">Đang chạy</option>
                                <option value="MAINTENANCE">Bảo trì</option>
                            </select>
                        </div>

                        {/* Danh mục xe */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1">
                                Danh mục xe{" "}
                                <span className="text-red-500">*</span>
                            </div>
                            <select
                                value={categoryId}
                                onChange={(e) =>
                                    setCategoryId(e.target.value)
                                }
                                className={cls(
                                    "w-full rounded-md border px-3 py-2 text-[13px] text-slate-700 outline-none",
                                    "border-slate-300 bg-white shadow-sm",
                                    "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                )}
                            >
                                <option value="">-- Chọn danh mục --</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} ({c.seats} chỗ)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Chi nhánh */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1">
                                Chi nhánh quản lý{" "}
                                <span className="text-red-500">*</span>
                            </div>
                            <select
                                value={branchId}
                                onChange={(e) =>
                                    setBranchId(e.target.value)
                                }
                                className={cls(
                                    "w-full rounded-md border px-3 py-2 text-[13px] text-slate-700 outline-none",
                                    "border-slate-300 bg-white shadow-sm",
                                    "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                )}
                            >
                                <option value="">-- Chọn chi nhánh --</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Ngày Đăng kiểm tiếp theo */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <span>Ngày Đăng kiểm tiếp theo</span>
                            </div>
                            <input
                                type="date"
                                value={regDueDate}
                                onChange={(e) =>
                                    setRegDueDate(e.target.value)
                                }
                                className={cls(
                                    "w-full rounded-md border px-3 py-2 text-[13px] text-slate-700 outline-none",
                                    "border-slate-300 bg-white shadow-sm",
                                    "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                )}
                            />
                        </div>

                        {/* Ngày hết hạn bảo hiểm TNDS */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <span>Hạn hết hạn bảo hiểm TNDS</span>
                            </div>
                            <input
                                type="date"
                                value={insDueDate}
                                onChange={(e) =>
                                    setInsDueDate(e.target.value)
                                }
                                className={cls(
                                    "w-full rounded-md border px-3 py-2 text-[13px] text-slate-700 outline-none",
                                    "border-slate-300 bg-white shadow-sm",
                                    "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                )}
                            />
                        </div>
                    </div>

                    {error ? (
                        <div className="text-red-600 text-[12px]">
                            {error}
                        </div>
                    ) : null}
                </div>

                {/* footer */}
                <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap justify-end gap-2 text-[13px]">
                    <button
                        onClick={onClose}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-100 shadow-sm"
                    >
                        Đóng
                    </button>
                    <button
                        onClick={handleSubmit}
                        className={cls(
                            "inline-flex items-center gap-2 rounded-md px-3 py-2 font-medium text-white shadow-sm",
                            "bg-sky-600 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        )}
                    >
                        <PlusCircle className="h-4 w-4" />
                        Lưu xe mới
                    </button>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------- */
/* Modal: Sß╗¡a xe (light)            */
/* -------------------------------- */
function EditVehicleModal({
                              open,
                              onClose,
                              onSave,
                              vehicle,
                              branches,
                              categories,
                          }) {
    const [status, setStatus] = React.useState("");
    const [regDueDate, setRegDueDate] = React.useState("");
    const [insDueDate, setInsDueDate] = React.useState("");
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        if (open && vehicle) {
            setStatus(vehicle.status || "AVAILABLE");
            setRegDueDate(vehicle.reg_due_date || "");
            setInsDueDate(vehicle.ins_due_date || "");
            setError("");
        }
    }, [open, vehicle]);

    if (!open || !vehicle) return null;

    const valid = status !== "";

    const handleSubmit = () => {
        if (!valid) {
            setError("Thiếu thông tin bắt buộc.");
            return;
        }

        // Validation: không cho phép cập nhật ngày đăng kiểm, bảo hiểm về quá khứ
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (regDueDate) {
            const regDate = new Date(regDueDate);
            if (regDate < today) {
                setError("Ngày đăng kiểm không được là ngày trong quá khứ");
                return;
            }
        }

        if (insDueDate) {
            const insDate = new Date(insDueDate);
            if (insDate < today) {
                setError("Ngày hết hạn bảo hiểm không được là ngày trong quá khứ");
                return;
            }
        }

        // Validation: Xe đang "Đang chạy" (ON_TRIP) không cho phép đổi trạng thái
        if (vehicle.status === "ON_TRIP" && status !== "ON_TRIP") {
            setError("Không thể thay đổi trạng thái khi xe đang trong chuyến đi");
            return;
        }

        // Validation: Không cho phép đổi sang "Đang chạy" thủ công
        if (vehicle.status !== "ON_TRIP" && status === "ON_TRIP") {
            setError("Trạng thái 'Đang chạy' chỉ được cập nhật tự động khi xe trong chuyến");
            return;
        }

        const payload = {
            branchId: Number(vehicle.branch_id), // Không cho sửa, giữ nguyên
            categoryId: Number(vehicle.category_id), // Không cho sửa, giữ nguyên
            status,
            model: vehicle.model || null, // Không cho sửa, giữ nguyên
            productionYear: vehicle.year || null, // Không cho sửa, giữ nguyên
            inspectionExpiry: regDueDate || null,
            insuranceExpiry: insDueDate || null,
        };

        onSave(vehicle.id, payload);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-xl rounded-xl bg-white border border-slate-200 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-start gap-2">
                    <div className="h-10 w-10 rounded-md border border-sky-200 bg-sky-50 text-sky-600 flex items-center justify-center shadow-sm">
                        <Wrench className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col leading-tight min-w-0">
                        <div className="font-semibold text-slate-900 text-[14px]">
                            Chi tiết / Sửa xe {vehicle.license_plate}
                        </div>
                        <div className="text-[11px] text-slate-500">
                            Cập nhật trạng thái, phân chi nhánh, hạn đăng kiểm.
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title="Đóng"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* body */}
                <div className="p-5 space-y-4 text-[13px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Biển số xe readonly */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1">
                                Biển số xe
                            </div>
                            <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 font-medium shadow-inner">
                                {vehicle.license_plate}
                            </div>
                        </div>

                        <div>
                            <div className="text-[12px] text-slate-600 mb-1">
                                Trạng thái xe mới{" "}
                                <span className="text-red-500">*</span>
                            </div>
                            <select
                                value={status}
                                onChange={(e) =>
                                    setStatus(e.target.value)
                                }
                                className={cls(
                                    "w-full rounded-md border px-3 py-2 text-[13px] text-slate-700 outline-none",
                                    "border-slate-300 bg-white shadow-sm",
                                    "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                )}
                            >
                                <option value="AVAILABLE">Sẵn sàng</option>
                                <option value="ON_TRIP">Đang chạy</option>
                                <option value="MAINTENANCE">Bảo trì</option>
                            </select>
                        </div>

                        {/* model - READONLY */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1">
                                Model xe
                            </div>
                            <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 font-medium shadow-inner">
                                {vehicle.model || "—"}
                            </div>
                        </div>

                        {/* year - READONLY */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1">
                                Năm sản xuất
                            </div>
                            <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 font-medium shadow-inner">
                                {vehicle.year || "—"}
                            </div>
                        </div>

                        {/* category - READONLY */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1">
                                Danh mục xe
                            </div>
                            <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 font-medium shadow-inner">
                                {vehicle.category_name || "—"}
                            </div>
                        </div>

                        {/* branch - READONLY (yêu cầu mới: KHÔNG cho chuyển chi nhánh) */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1">
                                Chi nhánh
                            </div>
                            <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 font-medium shadow-inner">
                                {vehicle.branch_name || "—"}
                            </div>
                        </div>

                        {/* Ngày đăng kiểm tiếp theo */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <span>Ngày đăng kiểm tiếp theo</span>
                            </div>
                            <input
                                type="date"
                                value={regDueDate || ""}
                                onChange={(e) =>
                                    setRegDueDate(e.target.value)
                                }
                                className={cls(
                                    "w-full rounded-md border px-3 py-2 text-[13px] text-slate-700 outline-none",
                                    "border-slate-300 bg-white shadow-sm",
                                    "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                )}
                            />
                        </div>

                        {/* Ngày hết hạn bảo hiểm */}
                        <div>
                            <div className="text-[12px] text-slate-600 mb-1 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <span>Hết hạn bảo hiểm xe TNDS</span>
                            </div>
                            <input
                                type="date"
                                value={insDueDate || ""}
                                onChange={(e) =>
                                    setInsDueDate(e.target.value)
                                }
                                className={cls(
                                    "w-full rounded-md border px-3 py-2 text-[13px] text-slate-700 outline-none",
                                    "border-slate-300 bg-white shadow-sm",
                                    "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                )}
                            />
                        </div>
                    </div>

                    {error ? (
                        <div className="text-red-600 text-[12px]">
                            {error}
                        </div>
                    ) : null}
                </div>

                {/* footer */}
                <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap justify-end gap-2 text-[13px]">
                    <button
                        onClick={onClose}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-100 shadow-sm"
                    >
                        Đóng
                    </button>
                    <button
                        onClick={handleSubmit}
                        className={cls(
                            "inline-flex items-center gap-2 rounded-md px-3 py-2 font-medium text-white shadow-sm",
                            "bg-sky-600 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        )}
                    >
                        <Wrench className="h-4 w-4" />
                        Lưu Thay Đổi
                    </button>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------- */
/* Thanh filter (light)             */
/* -------------------------------- */
function FilterBar({
                       branchFilter,
                       setBranchFilter,
                       categoryFilter,
                       setCategoryFilter,
                       statusFilter,
                       setStatusFilter,
                       searchPlate,
                       setSearchPlate,
                       branches,
                       categories,
                       onClickCreate,
                       loadingRefresh,
                       onRefresh,
                       showBranchFilter = true, // Add prop to control branch filter visibility
                       showCreateButton = true, // Add prop to control create button visibility
                       createButtonPosition = "left", // "left" or "right"
                   }) {
    return (
        <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3 text-[13px] text-slate-700">
            {/* Nút thêm xe - left position */}
            {showCreateButton && createButtonPosition === "left" && (
                <div className="flex items-center gap-2">
                    <button
                        className={cls(
                            "inline-flex items-center gap-2 rounded-md px-3 py-2 font-medium text-white shadow-sm",
                            "bg-sky-600 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-[13px]"
                        )}
                        onClick={onClickCreate}
                    >
                        <PlusCircle className="h-4 w-4" />
                        <span>Thêm xe</span>
                    </button>
                </div>
            )}

            {/* Bộ lọc sang phải trên màn lớn */}
            <div className="flex-1" />

            {/* filter controls */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-center">
                {/* Chi nhánh - Hidden for Manager */}
                {showBranchFilter && (
                    <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white shadow-sm px-3 py-2 min-w-[180px]">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <select
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            className="bg-transparent outline-none text-[13px] text-slate-700 flex-1"
                        >
                            <option value="">Tất cả chi nhánh</option>
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Danh mục xe */}
                <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white shadow-sm px-3 py-2 min-w-[160px]">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-transparent outline-none text-[13px] text-slate-700 flex-1"
                    >
                        <option value="">Tất cả loại xe</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name} ({c.seats} chỗ)
                            </option>
                        ))}
                    </select>
                </div>

                {/* Trß║íng th├íi */}
                <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white shadow-sm px-3 py-2 min-w-[150px]">
                    <Wrench className="h-4 w-4 text-slate-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-transparent outline-none text-[13px] text-slate-700 flex-1"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="AVAILABLE">Sẵn sàng</option>
                        <option value="ON_TRIP">Đang chạy</option>
                        <option value="MAINTENANCE">Bảo trì</option>
                    </select>
                </div>

                {/* Search biß╗ân sß╗æ */}
                <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white shadow-sm px-3 py-2 min-w-[200px]">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                        value={searchPlate}
                        onChange={(e) => setSearchPlate(e.target.value)}
                        placeholder="Tìm biển số xe..."
                        className="bg-transparent outline-none text-[13px] placeholder:text-slate-400 text-slate-700 flex-1"
                    />
                </div>

                {/* Làm mới */}
                <button
                    onClick={onRefresh}
                    className="rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-[13px] text-slate-700 px-3 py-2 flex items-center gap-2 min-w-[110px] justify-center shadow-sm"
                >
                    {loadingRefresh ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : (
                        <Wrench className="h-4 w-4 text-slate-400" />
                    )}
                    <span>Làm mới</span>
                </button>

                {/* Nút thêm xe - right position */}
                {showCreateButton && createButtonPosition === "right" && (
                    <button
                        className={cls(
                            "inline-flex items-center gap-2 rounded-md px-3 py-2 font-medium text-white shadow-sm",
                            "bg-sky-600 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-[13px]"
                        )}
                        onClick={onClickCreate}
                    >
                        <PlusCircle className="h-4 w-4" />
                        <span>Thêm xe</span>
                    </button>
                )}
            </div>
        </div>
    );
}

/* -------------------------------- */
/* helper định dạng ngày            */
/* -------------------------------- */
const fmtDate = (iso) => {
    if (!iso) return "—";
    const [y, m, d] = String(iso).split("-");
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
};

/* -------------------------------- */
/* Bảng danh sách xe (light)        */
/* -------------------------------- */
function VehicleTable({
                          items,
                          page,
                          setPage,
                          pageSize,
                          setPageSize,
                          sortKey,
                          setSortKey,
                          sortDir,
                          setSortDir,
                          totalPages,
                          onClickDetail,
                      }) {
    const headerCell = (key, label) => (
        <th
            className="px-3 py-2 font-medium cursor-pointer select-none text-slate-500"
            onClick={() => {
                if (sortKey === key) {
                    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                } else {
                    setSortKey(key);
                    setSortDir("asc");
                }
            }}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                {sortKey === key ? (
                    sortDir === "asc" ? (
                        <ChevronUp className="h-3 w-3 text-slate-400" />
                    ) : (
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                    )
                ) : null}
            </span>
        </th>
    );

    const start = (page - 1) * pageSize;
    const current = items.slice(start, start + pageSize);

    return (
        <div className="overflow-x-auto text-[13px] text-slate-700">
            <table className="w-full text-left">
                <thead className="bg-slate-100/60 border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                    {headerCell("license_plate", "Biển số")}
                    {headerCell("category_name", "Loại xe")}
                    {headerCell("branch_name", "Chi nhánh")}
                    {headerCell("status", "Trạng thái")}
                    {headerCell("reg_due_date", "Hạn đăng kiểm")}
                    {headerCell("ins_due_date", "Hạn bảo hiểm")}
                    <th className="px-3 py-2 font-medium text-slate-500">
                        Hành động
                    </th>
                </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                {current.map((v) => (
                    <tr
                        key={v.id}
                        className="hover:bg-slate-50"
                    >
                        {/* Biß╗ân sß╗æ */}
                        <td className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap">
                            {v.license_plate}
                        </td>

                        {/* Loß║íi xe */}
                        <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                            {v.category_name}
                            <div className="text-[11px] text-slate-500">
                                {v.model} - {v.year}
                            </div>
                        </td>

                        {/* Chi nhánh */}
                        <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                            {v.branch_name}
                        </td>

                        {/* Trạng thái */}
                        <td className="px-3 py-2 whitespace-nowrap">
                            <VehicleStatusBadge status={v.status} />
                        </td>

                        {/* Hạn đăng kiểm */}
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap text-[12px]">
                            {fmtDate(v.reg_due_date)}
                        </td>

                        {/* Hạn bảo hiểm */}
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap text-[12px]">
                            {fmtDate(v.ins_due_date)}
                        </td>

                        {/* Action */}
                        <td className="px-3 py-2 whitespace-nowrap">
                            <button
                                type="button"
                                onClick={() =>
                                    onClickDetail && onClickDetail(v)
                                }
                                className={cls(
                                    "inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[12px] font-medium shadow-sm",
                                    "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                                )}
                            >
                                <Wrench className="h-3.5 w-3.5 text-sky-600" />
                                <span>Chi tiết / Sửa</span>
                            </button>
                        </td>
                    </tr>
                ))}

                {current.length === 0 && (
                    <tr>
                        <td
                            colSpan={7}
                            className="px-3 py-6 text-center text-slate-400 text-[13px]"
                        >
                            không có dữ liệu.
                        </td>
                    </tr>
                )}
                </tbody>
            </table>

            {/* Footer ph├ón trang */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 py-3 border-t border-slate-200 bg-slate-50 text-[13px] text-slate-700">
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage(Math.max(1, page - 1))}
                        className={cls(
                            "rounded-md border border-slate-300 bg-white px-2 py-1.5 shadow-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-slate-700"
                        )}
                    >
                        <ChevronLeft className="h-4 w-4 text-slate-500" />
                    </button>

                    <div className="text-slate-700">
                        Trang{" "}
                        <span className="font-medium">{page}</span>/
                        <span className="font-medium">{totalPages}</span>
                    </div>

                    <button
                        disabled={page >= totalPages}
                        onClick={() =>
                            setPage(Math.min(totalPages, page + 1))
                        }
                        className={cls(
                            "rounded-md border border-slate-300 bg-white px-2 py-1.5 shadow-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-slate-700"
                        )}
                    >
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                    </button>

                    <select
                        value={pageSize}
                        onChange={(e) => {
                            const n = Number(e.target.value) || 10;
                            setPageSize(n);
                            setPage(1);
                        }}
                        className={cls(
                            "rounded-md border border-slate-300 bg-white px-2 py-1 text-[12px] text-slate-700 shadow-sm outline-none",
                            "focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                        )}
                    >
                        {[10, 20, 50].map((n) => (
                            <option key={n} value={n}>
                                {n}/trang
                            </option>
                        ))}
                    </select>
                </div>

                <div className="text-[11px] text-slate-500">
                    Tổng xe hiện tại: {items.length}
                </div>
            </div>
        </div>
    );
}

/* -------------------------------- */
/* MOCK DATA DEMO                   */
/* -------------------------------- */
const MOCK_BRANCHES = [
    { id: "HN", name: "Hà Nội" },
    { id: "HP", name: "Hải Phòng" },
    { id: "DN", name: "Đà Nẵng" },
    { id: "HCM", name: "TP.HCM" },
];

const MOCK_CATEGORIES = [
    { id: "SEDAN4", name: "Sedan", seats: 4 },
    { id: "SUV7", name: "SUV", seats: 7 },
    { id: "BUS16", name: "Minibus", seats: 16 },
];

const MOCK_VEHICLES = [
    {
        id: 1,
        license_plate: "29A-123.45",
        category_id: "SEDAN4",
        category_name: "Sedan",
        seats: 4,
        branch_id: "HN",
        branch_name: "Hà Nội",
        status: VEHICLE_STATUS.AVAILABLE,
        reg_due_date: "2025-12-01",
        ins_due_date: "2025-12-31",
        model: "Vios",
        year: 2020,
    },
    {
        id: 2,
        license_plate: "15B-678.90",
        category_id: "BUS16",
        category_name: "Minibus",
        seats: 16,
        branch_id: "HP",
        branch_name: "Hải Phòng",
        status: VEHICLE_STATUS.ON_TRIP,
        reg_due_date: "2025-11-20",
        ins_due_date: "2025-11-30",
        model: "Solati",
        year: 2022,
    },
    {
        id: 3,
        license_plate: "43C-222.88",
        category_id: "SUV7",
        category_name: "SUV",
        seats: 7,
        branch_id: "DN",
        branch_name: "Đà Nẵng",
        status: VEHICLE_STATUS.MAINTENANCE,
        reg_due_date: "2025-10-30",
        ins_due_date: "2025-11-15",
        model: "Fortuner",
        year: 2021,
    },
    {
        id: 4,
        license_plate: "51H-999.01",
        category_id: "SUV7",
        category_name: "SUV",
        seats: 7,
        branch_id: "HCM",
        branch_name: "TP.HCM",
        status: VEHICLE_STATUS.AVAILABLE,
        reg_due_date: "2026-01-10",
        ins_due_date: "2026-02-01",
        model: "Fortuner",
        year: 2023,
    },
    {
        id: 5,
        license_plate: "30G-445.66",
        category_id: "SEDAN4",
        category_name: "Sedan",
        seats: 4,
        branch_id: "HN",
        branch_name: "Hà Nội",
        status: VEHICLE_STATUS.ON_TRIP,
        reg_due_date: "2025-10-05",
        ins_due_date: "2025-10-20",
        model: "City",
        year: 2019,
    },
];

/* -------------------------------- */
/* MAIN PAGE                        */
/* -------------------------------- */
export default function VehicleListPage() {
    const { toasts, push } = useToasts();

    // Check current user role
    const currentRole = React.useMemo(() => getCurrentRole(), []);
    const isManager = currentRole === ROLES.MANAGER;

    // filter state
    const [branchFilter, setBranchFilter] = React.useState("");
    const [categoryFilter, setCategoryFilter] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("");
    const [searchPlate, setSearchPlate] = React.useState("");

    // refresh state
    const [loadingRefresh, setLoadingRefresh] = React.useState(false);

    // sort / paging
    const [sortKey, setSortKey] = React.useState("license_plate");
    const [sortDir, setSortDir] = React.useState("asc");
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(10);

    // data state
    const [vehicles, setVehicles] = React.useState([]);
    const [branches, setBranches] = React.useState([]);
    const [categories, setCategories] = React.useState([]);

    // helper map backend -> UI
    const mapVehicle = React.useCallback((v) => ({
        id: v.id,
        license_plate: v.licensePlate,
        category_id: v.categoryId,
        category_name: v.categoryName,
        branch_id: v.branchId,
        branch_name: v.branchName,
        status: v.status,
        reg_due_date: v.inspectionExpiry || "",
        ins_due_date: v.insuranceExpiry || "",
        model: v.model,
        year: v.productionYear,
    }), []);

    // initial load
    React.useEffect(() => {
        (async () => {
            try {
                const [brData, catData, vehData] = await Promise.all([
                    listBranches({ size: 1000 }).catch(() => ({ content: [] })),
                    listVehicleCategories().catch(() => []),
                    listVehicles().catch(() => []),
                ]);
                const brs = Array.isArray(brData) ? brData : (brData?.items || brData?.content || []);
                setBranches(brs.map(b => ({ id: b.id, name: b.branchName || b.name || b.branch_name })));
                setCategories((catData || []).map(c => ({ id: c.id, name: c.categoryName || c.name })));
                setVehicles((vehData || []).map(mapVehicle));
            } catch { }
        })();
    }, [mapVehicle]);

    // modal state
    const [createOpen, setCreateOpen] = React.useState(false);
    const [editOpen, setEditOpen] = React.useState(false);
    const [editingVehicle, setEditingVehicle] = React.useState(null);

    // filter + sort data
    const filteredSorted = React.useMemo(() => {
        const q = searchPlate.trim().toLowerCase();
        const bf = branchFilter ? String(branchFilter) : "";
        const cf = categoryFilter ? String(categoryFilter) : "";

        const afterFilter = vehicles.filter((v) => {
            if (bf && String(v.branch_id) !== bf) return false;
            if (cf && String(v.category_id) !== cf) return false;
            if (statusFilter && v.status !== statusFilter) return false;
            if (q && !String(v.license_plate).toLowerCase().includes(q)) return false;
            return true;
        });

        const arr = [...afterFilter];
        arr.sort((a, b) => {
            let A, B;
            if (sortKey === "license_plate") {
                A = a.license_plate;
                B = b.license_plate;
            } else if (sortKey === "category_name") {
                A = a.category_name;
                B = b.category_name;
            } else if (sortKey === "branch_name") {
                A = a.branch_name;
                B = b.branch_name;
            } else if (sortKey === "status") {
                A = a.status;
                B = b.status;
            } else if (sortKey === "reg_due_date") {
                A = a.reg_due_date;
                B = b.reg_due_date;
            } else {
                A = a.license_plate;
                B = b.license_plate;
            }

            if (A < B) return sortDir === "asc" ? -1 : 1;
            if (A > B) return sortDir === "asc" ? 1 : -1;
            return 0;
        });

        return arr;
    }, [
        vehicles,
        branchFilter,
        categoryFilter,
        statusFilter,
        searchPlate,
        sortKey,
        sortDir,
    ]);

    // total pages
    const totalPages = Math.max(
        1,
        Math.ceil(filteredSorted.length / pageSize)
    );

    // ensure page valid
    React.useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    /* ---------- handlers ---------- */

    // "Thêm xe mới"
    const handleCreateNew = () => {
        setCreateOpen(true);
    };

    // "Thêm xe mới"
    const handleCreateSubmit = async (payload) => {
        try {
            const created = await createVehicle(payload);
            setVehicles((prev) => [mapVehicle(created), ...prev]);
            push("Thêm xe mới thành công:   " + (payload.license_plate || payload.licensePlate), "success");
        } catch (e) {
            push("Thêm xe mới thất bại", "error");
        }
    };

    // "Chi tiết xe"
    const handleClickDetail = (vehicle) => {
        setEditingVehicle(vehicle);
        setEditOpen(true);
    };

    // "Lưu thay đổi" từ edit modal
    const handleEditSave = async (id, payload) => {
        try {
            const updated = await updateVehicle(id, payload);
            setVehicles((prev) => prev.map(v => v.id === id ? mapVehicle(updated) : v));
            push("Lưu thay đổi cho xe " + id, "success");
        } catch (e) {
            push("Cập nhật xe thất bại", "error");
        }
    };

    // Làm mới danh sách
    const handleRefresh = async () => {
        setLoadingRefresh(true);
        try {
            const vehData = await listVehicles({
                licensePlate: searchPlate || undefined,
                categoryId: categoryFilter ? Number(categoryFilter) : undefined,
                branchId: branchFilter ? Number(branchFilter) : undefined,
                status: statusFilter || undefined,
            });
            setVehicles((vehData || []).map(mapVehicle));
            push("Đã làm mới danh sách xe", "info");
        } catch (e) {
            push("Làm mới danh sách thất bại", "error");
        } finally {
            setLoadingRefresh(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-slate-50 text-slate-900 p-6">
            <Toasts toasts={toasts} />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start gap-4 mb-6">
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                    <div className="flex flex-wrap items-start gap-3">
                        <div className="flex items-start gap-3">
                            <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                                <CarFront className="h-6 w-6 text-sky-600" />
                            </div>

                            <div className="flex flex-col leading-tight">
                                <div className="text-[16px] font-semibold text-slate-900">
                                    Quản lý phương tiện
                                </div>
                                <div className="text-[12px] text-slate-500 leading-snug max-w-xl">
                                    Theo dõi tình trạng xe, hiện đang kiểm, và
                                    phân bổ theo chi nhánh.
                                </div>
                            </div>
                        </div>

                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 text-[11px] px-2 py-[2px] text-slate-600 font-medium leading-none">
                            Danh sách xe
                        </span>
                    </div>
                </div>
            </div>

            {/* Filter card */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 mb-5">
                <FilterBar
                    branchFilter={branchFilter}
                    setBranchFilter={setBranchFilter}
                    categoryFilter={categoryFilter}
                    setCategoryFilter={setCategoryFilter}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    searchPlate={searchPlate}
                    setSearchPlate={setSearchPlate}
                    branches={branches}
                    categories={categories}
                    onClickCreate={handleCreateNew}
                    loadingRefresh={loadingRefresh}
                    onRefresh={handleRefresh}
                    showBranchFilter={!isManager}
                    showCreateButton={true}
                    createButtonPosition={isManager ? "right" : "left"}
                />
            </div>

            {/* Table card */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* header row of table card */}
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 text-[13px] text-slate-600 flex items-center gap-2">
                    <CarFront className="h-4 w-4 text-sky-600" />
                    <div className="font-medium text-slate-800">
                        Danh sách xe
                    </div>
                    <div className="text-[11px] text-slate-500">
                        ({filteredSorted.length} xe)
                    </div>
                </div>

                <VehicleTable
                    items={filteredSorted}
                    page={page}
                    setPage={setPage}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    sortKey={sortKey}
                    setSortKey={setSortKey}
                    sortDir={sortDir}
                    setSortDir={setSortDir}
                    totalPages={totalPages}
                    onClickDetail={handleClickDetail}
                />
            </div>

            {/* MODALS */}
            <CreateVehicleModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreate={handleCreateSubmit}
                branches={branches}
                categories={categories}
            />

            <EditVehicleModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                onSave={handleEditSave}
                vehicle={editingVehicle}
                branches={branches}
                categories={categories}
            />
        </div>
    );
}