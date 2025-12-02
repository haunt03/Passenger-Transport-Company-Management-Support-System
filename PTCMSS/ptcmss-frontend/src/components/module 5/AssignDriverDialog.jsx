import React from "react";
import {
    UserRound,
    Car,
    CalendarDays,
    Building2,
    Sparkles,
    BadgeCheck,
    AlertTriangle,
    X,
    Check,
    Loader2,
} from "lucide-react";
import { getAssignmentSuggestions, assignTrips, reassignTrips } from "../../api/dispatch";

/**
 * AssignDriverDialog – M5.S3 (Popup/Subscreen) – LIGHT THEME VERSION
 *
 * Chức năng:
 *  - Mở khi bấm "Gán chuyến" từ M5.S1
 *  - Tóm tắt yêu cầu (thời gian, loại xe, chi nhánh)
 *  - Lấy gợi ý tài xế + xe
 *      GET /api/v1/coordinator/orders/{orderId}/suggestions
 *      -> [{ driver, vehicle, score, reasons[] }]
 *  - Tự động gán
 *      POST /api/v1/coordinator/orders/{orderId}/assign { auto: true }
 *  - Chọn thủ công
 *      POST /api/v1/coordinator/orders/{orderId}/assign { driver_id, vehicle_id }
 *
 * Props:
 *  - open: boolean
 *  - order: { id, code?, pickup_time, vehicle_type?, branch_name? }
 *  - onClose: () => void
 *  - onAssigned?: (payload) => void
 */

// Endpoints đã được chuyển sang sử dụng API functions từ dispatch.js

export default function AssignDriverDialog({
                                               open,
                                               order,
                                               onClose,
                                               onAssigned,
                                           }) {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [suggestions, setSuggestions] = React.useState([]); // [{driver, vehicle, score, reasons[]}]
    const [driverCandidates, setDriverCandidates] = React.useState([]);
    const [vehicleCandidates, setVehicleCandidates] = React.useState([]);
    const [summary, setSummary] = React.useState(null);
    const [driverId, setDriverId] = React.useState("");
    const [vehicleId, setVehicleId] = React.useState("");

    const [posting, setPosting] = React.useState(false);
    const [autoPosting, setAutoPosting] =
        React.useState(false);

    const tripId = order?.tripId || order?.id;
    const bookingId = order?.bookingId;

    // Fetch gợi ý khi popup mở
    React.useEffect(() => {
        let cancelled = false;
        async function run() {
            if (!open || !tripId) return;
            setLoading(true);
            setError("");
            setDriverId("");
            setVehicleId("");
            try {
                const data = await getAssignmentSuggestions(tripId);

                if (!cancelled) {
                    setSummary(data?.summary || null);
                    setSuggestions(
                        Array.isArray(data?.suggestions)
                            ? data.suggestions
                            : []
                    );
                    setDriverCandidates(
                        Array.isArray(data?.drivers)
                            ? data.drivers
                            : []
                    );
                    setVehicleCandidates(
                        Array.isArray(data?.vehicles)
                            ? data.vehicles
                            : []
                    );

                    // Auto-select recommended
                    if (data?.recommendedDriverId) {
                        setDriverId(String(data.recommendedDriverId));
                    }
                    if (data?.recommendedVehicleId) {
                        setVehicleId(String(data.recommendedVehicleId));
                    }
                }
            } catch (err) {
                if (cancelled) return;
                console.error("Failed to load suggestions:", err);
                setError(
                    "Không thể tải gợi ý tài xế/xe: " + (err.message || "Lỗi không xác định")
                );
                setSuggestions([]);
                setDriverCandidates([]);
                setVehicleCandidates([]);
            } finally {
                if (!cancelled)
                    setLoading(false);
            }
        }
        run();
        return () => {
            cancelled = true;
        };
    }, [open, tripId, order]);

    // danh sách tài xế (chỉ eligible)
    const driverOptions = React.useMemo(() => {
        return driverCandidates.filter(d => d.eligible);
    }, [driverCandidates]);

    // danh sách xe (chỉ eligible)
    const vehicleOptions = React.useMemo(() => {
        return vehicleCandidates.filter(v => v.eligible);
    }, [vehicleCandidates]);

    // khi click 1 dòng gợi ý => fill vào dropdown
    const handlePickSuggestion = (s) => {
        setDriverId(
            String(s?.driver?.id || "")
        );
        setVehicleId(
            String(s?.vehicle?.id || "")
        );
    };

    const canConfirm =
        driverId && vehicleId && !posting;

    // Gán thủ công
    const doAssignManual = async () => {
        if (
            !bookingId ||
            !driverId ||
            !vehicleId
        )
            return;
        setPosting(true);
        try {
            // Check if trip already has assignment (reassign) or new assignment
            const isReassign = order?.driverId || order?.vehicleId;

            if (isReassign && tripId) {
                // Use reassign API
                const result = await reassignTrips({
                    tripId: Number(tripId),
                    driverId: Number(driverId),
                    vehicleId: Number(vehicleId),
                    note: "Reassign từ dialog",
                });

                onAssigned?.({
                    type: "reassign",
                    tripId,
                    bookingId,
                    driverId: Number(driverId),
                    vehicleId: Number(vehicleId),
                    response: result,
                });
            } else {
                // Use assign API
                const result = await assignTrips({
                    bookingId: Number(bookingId),
                    tripIds: tripId ? [Number(tripId)] : undefined,
                    driverId: Number(driverId),
                    vehicleId: Number(vehicleId),
                    autoAssign: false,
                });

                onAssigned?.({
                    type: "manual",
                    tripId,
                    bookingId,
                    driverId: Number(driverId),
                    vehicleId: Number(vehicleId),
                    response: result,
                });
            }
            onClose?.();
        } catch (e) {
            console.error(e);
            alert(
                "Gán chuyến thất bại. Vui lòng thử lại."
            );
        } finally {
            setPosting(false);
        }
    };

    // Gán tự động
    const doAssignAuto = async () => {
        if (!bookingId) return;
        setAutoPosting(true);
        try {
            const result = await assignTrips({
                bookingId: Number(bookingId),
                tripIds: tripId ? [Number(tripId)] : undefined,
                autoAssign: true,
            });

            onAssigned?.({
                type: "auto",
                tripId,
                bookingId,
                response: result,
            });
            onClose?.();
        } catch (e) {
            console.error(e);
            alert(
                "Tự động gán thất bại. Vui lòng thử lại."
            );
        } finally {
            setAutoPosting(false);
        }
    };

    if (!open) return null;

    /* ================= UI (LIGHT THEME) ================= */
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-3xl rounded-2xl bg-white border border-slate-200 text-slate-900 shadow-2xl"
                onClick={(e) =>
                    e.stopPropagation()
                }
            >
                {/* Header */}
                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200">
                    <Sparkles className="h-5 w-5 text-amber-600" />
                    <div className="font-semibold text-slate-900 text-sm">
                        Gán chuyến (Assign
                        Driver)
                    </div>

                    <button
                        onClick={onClose}
                        className="ml-auto rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[12px] text-slate-600 hover:bg-slate-100 flex items-center gap-1"
                    >
                        <X className="h-4 w-4" />
                        Đóng
                    </button>
                </div>

                {/* Summary */}
                <div className="px-5 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px]">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-slate-500" />
                            <span className="text-slate-500">
                                Thời gian:
                            </span>
                            <span className="font-mono text-slate-900 font-medium">
                                {fmtDateTime(
                                    order?.pickup_time
                                )}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-slate-500" />
                            <span className="text-slate-500">
                                Loại xe:
                            </span>
                            <span className="text-slate-900 font-medium">
                                {order?.vehicle_type ||
                                    "—"}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-500" />
                            <span className="text-slate-500">
                                Chi nhánh:
                            </span>
                            <span className="text-slate-900 font-medium">
                                {order?.branch_name ||
                                    "—"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5">
                    {/* Suggestions block */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                        <div className="px-3 py-2 text-[11px] text-slate-500 border-b border-slate-200 bg-slate-50 font-medium uppercase tracking-wide">
                            Gợi ý hệ thống
                        </div>

                        {error && (
                            <div className="px-3 py-2 text-[12px] text-amber-700 border-b border-amber-200 bg-amber-50 flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                <span>
                                    {error}
                                </span>
                            </div>
                        )}

                        {loading ? (
                            <div className="px-3 py-6 text-[13px] text-slate-500 flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                Đang tải gợi ý…
                            </div>
                        ) : suggestions.length ===
                        0 ? (
                            <div className="px-3 py-6 text-[13px] text-slate-500 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <span>
                                    Không có
                                    gợi ý phù
                                    hợp.
                                </span>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-200 max-h-56 overflow-y-auto">
                                {suggestions.map(
                                    (
                                        s,
                                        idx
                                    ) => (
                                        <li
                                            key={
                                                s.id ??
                                                `${s?.driver?.id}-${s?.vehicle?.id}-${idx}`
                                            }
                                            className="p-3 hover:bg-slate-50 cursor-pointer"
                                            onClick={() =>
                                                handlePickSuggestion(
                                                    s
                                                )
                                            }
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="flex-1 min-w-0">
                                                    {/* row top */}
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                        {/* driver */}
                                                        <div className="flex items-center gap-1.5 text-[13px] text-slate-900 font-medium min-w-0">
                                                            <UserRound className="h-4 w-4 text-amber-600" />
                                                            <span
                                                                className="truncate"
                                                                title={
                                                                    s
                                                                        ?.driver
                                                                        ?.name
                                                                }
                                                            >
                                                                {s
                                                                        ?.driver
                                                                        ?.name ||
                                                                    "—"}
                                                            </span>
                                                            {s
                                                                ?.driver
                                                                ?.id && (
                                                                <span className="text-[11px] text-slate-500 font-normal">
                                                                        #
                                                                    {
                                                                        s
                                                                            .driver
                                                                            .id
                                                                    }
                                                                    </span>
                                                            )}
                                                        </div>

                                                        {/* vehicle */}
                                                        <div className="flex items-center gap-1.5 text-[13px] text-slate-900 font-medium min-w-0">
                                                            <Car className="h-4 w-4 text-sky-600" />
                                                            <span
                                                                className="truncate"
                                                                title={
                                                                    s
                                                                        ?.vehicle
                                                                        ?.plate
                                                                }
                                                            >
                                                                {s
                                                                        ?.vehicle
                                                                        ?.plate ||
                                                                    "—"}
                                                            </span>
                                                            {s
                                                                ?.vehicle
                                                                ?.type && (
                                                                <span className="text-[11px] text-slate-500 font-normal">
                                                                        ·{" "}
                                                                    {
                                                                        s
                                                                            .vehicle
                                                                            .type
                                                                    }
                                                                    </span>
                                                            )}
                                                        </div>

                                                        {/* score */}
                                                        {typeof s?.score ===
                                                            "number" && (
                                                                <div className="ml-auto flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                                                                    <BadgeCheck className="h-4 w-4 text-amber-600" />
                                                                    <span>
                                                                        Score:{" "}
                                                                        {
                                                                            s.score
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )}
                                                    </div>

                                                    {/* reasons */}
                                                    {Array.isArray(
                                                            s?.reasons
                                                        ) &&
                                                        s
                                                            .reasons
                                                            .length >
                                                        0 && (
                                                            <div className="mt-1 text-[12px] text-slate-500 leading-relaxed line-clamp-2">
                                                                {s.reasons.join(
                                                                    " · "
                                                                )}
                                                            </div>
                                                        )}
                                                </div>
                                            </div>
                                        </li>
                                    )
                                )}
                            </ul>
                        )}
                    </div>

                    {/* Manual pick */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                        <div className="px-3 py-2 text-[11px] text-slate-500 border-b border-slate-200 bg-slate-50 font-medium uppercase tracking-wide">
                            Chọn thủ công
                        </div>

                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
                            {/* Driver select */}
                            <div>
                                <div className="mb-1 text-[13px] text-slate-700 font-medium">
                                    Tài xế (chỉ
                                    hiện rảnh &
                                    phù hợp)
                                </div>
                                <select
                                    value={
                                        driverId
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setDriverId(
                                            e
                                                .target
                                                .value
                                        )
                                    }
                                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                >
                                    <option value="">
                                        -- Chọn
                                        tài xế
                                        --
                                    </option>
                                    {driverOptions.map(
                                        (
                                            d
                                        ) => (
                                            <option
                                                key={
                                                    d.id
                                                }
                                                value={
                                                    d.id
                                                }
                                            >
                                                {d.name}{" "}
                                                {d.tripsToday != null
                                                    ? `(${d.tripsToday} chuyến hôm nay)`
                                                    : ""}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            {/* Vehicle select */}
                            <div>
                                <div className="mb-1 text-[13px] text-slate-700 font-medium">
                                    Xe (chỉ
                                    hiện rảnh
                                    & phù hợp)
                                </div>
                                <select
                                    value={
                                        vehicleId
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setVehicleId(
                                            e
                                                .target
                                                .value
                                        )
                                    }
                                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                >
                                    <option value="">
                                        -- Chọn
                                        xe --
                                    </option>
                                    {vehicleOptions.map(
                                        (
                                            v
                                        ) => (
                                            <option
                                                key={
                                                    v.id
                                                }
                                                value={
                                                    v.id
                                                }
                                            >
                                                {v.plate}{" "}
                                                {v.model
                                                    ? `· ${v.model}`
                                                    : ""}{" "}
                                                {v.status
                                                    ? `(${v.status})`
                                                    : ""}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer actions */}
                <div className="px-5 py-4 border-t border-slate-200 flex flex-wrap items-center gap-2 justify-end text-[13px]">
                    {/* Auto-assign */}
                    <button
                        disabled={
                            autoPosting
                        }
                        onClick={
                            doAssignAuto
                        }
                        className={`
                            rounded-md px-3 py-2 border text-[13px] font-medium flex items-center gap-1
                            ${autoPosting
                            ? "opacity-60 cursor-not-allowed border-amber-300 text-amber-400 bg-white"
                            : "border-sky-500 text-sky-700 bg-white hover:bg-sky-50"
                        }
                        `}
                    >
                        {autoPosting ? (
                            <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                        ) : (
                            <Sparkles className="h-4 w-4 text-amber-600" />
                        )}
                        <span>
                            Tự động gán
                            (Auto-assign)
                        </span>
                    </button>

                    {/* Manual confirm */}
                    <button
                        disabled={
                            !canConfirm
                        }
                        onClick={
                            doAssignManual
                        }
                        className={`
                            rounded-md px-3 py-2 border text-[13px] font-medium flex items-center gap-1
                            ${canConfirm
                            ? "border-sky-600 text-sky-700 bg-white hover:bg-sky-50"
                            : "opacity-60 cursor-not-allowed border-slate-300 text-slate-400 bg-white"
                        }
                        `}
                    >
                        <Check className="h-4 w-4 text-sky-600" />
                        <span>
                            Xác nhận gán
                            chuyến
                        </span>
                    </button>

                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="rounded-md px-3 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-[13px] text-slate-600 font-medium flex items-center gap-1"
                    >
                        <X className="h-4 w-4 text-slate-500" />
                        <span>Đóng</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ============ Helpers ============ */

function pad2(n) {
    return String(n).padStart(2, "0");
}
function fmtDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    const hh = pad2(d.getHours());
    const mm = pad2(d.getMinutes());
    return `${day}/${m}/${y} ${hh}:${mm}`;
}

