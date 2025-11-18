import React from "react";
import { getDriverProfileByUser, reportIncident } from "../../api/drivers";

const SEVERITIES = ["MINOR", "MAJOR", "CRITICAL"];

export default function DriverReportIncidentPage() {
    const [driver, setDriver] = React.useState(null);
    const [tripId, setTripId] = React.useState("");
    const [severity, setSeverity] = React.useState("MAJOR");
    const [description, setDescription] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);
    const [message, setMessage] = React.useState("");
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        async function load() {
            try {
                const uid = localStorage.getItem("userId");
                if (!uid) return;
                const p = await getDriverProfileByUser(uid);
                setDriver(p);
            } catch {
                setError("Không tải được thông tin tài xế");
            }
        }
        load();
    }, []);

    async function onSubmit() {
        setSubmitting(true);
        setMessage("");
        setError("");
        try {
            if (!driver?.driverId) throw new Error("NO_DRIVER");
            const tId = Number(String(tripId).trim());
            if (!tId) throw new Error("INVALID_TRIP");
            if (!description.trim()) throw new Error("EMPTY_DESC");
            await reportIncident({
                driverId: driver.driverId,
                tripId: tId,
                severity,
                description: description.trim(),
            });
            setMessage("Đã gửi báo cáo sự cố");
            setTripId("");
            setSeverity("MAJOR");
            setDescription("");
        } catch (e) {
            setError("Gửi thất bại. Vui lòng kiểm tra và thử lại.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="p-6">
            <h2 className="text-lg font-semibold">Báo cáo sự cố</h2>
            {driver && (
                <div className="text-sm text-slate-600">{driver.fullName} {driver.branchName ? `- ${driver.branchName}` : ""}</div>
            )}
            {message && <div className="mt-2 text-sm text-emerald-600">{message}</div>}
            {error && <div className="mt-2 text-sm text-rose-600">{error}</div>}

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <label className="text-xs text-slate-500">Trip ID</label>
                    <input className="w-full border rounded px-3 py-2" value={tripId} onChange={e=>setTripId(e.target.value)} placeholder="Nhập Trip ID"/>
                </div>
                <div>
                    <label className="text-xs text-slate-500">Mức độ</label>
                    <select className="w-full border rounded px-3 py-2" value={severity} onChange={e=>setSeverity(e.target.value)}>
                        {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="text-xs text-slate-500">Mô tả</label>
                    <textarea className="w-full border rounded px-3 py-2" rows={4} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Mô tả chi tiết sự cố"/>
                </div>
                <div className="md:col-span-2">
                    <button onClick={onSubmit} disabled={submitting} className="px-4 py-2 border rounded bg-amber-50 text-amber-700">
                        {submitting ? "Đang gửi..." : "Gửi báo cáo"}
                    </button>
                </div>
            </div>
        </div>
    );
}
