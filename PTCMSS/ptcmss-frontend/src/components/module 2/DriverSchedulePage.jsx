import { getCookie } from '../../utils/cookies';
import React from "react";
import { getDriverProfileByUser, getDriverSchedule } from "../../api/drivers";

export default function DriverSchedulePage() {
    const [driver, setDriver] = React.useState(null);
    const [items, setItems] = React.useState([]);
    const [error, setError] = React.useState("");

    React.useEffect(() => {
        async function load() {
            try {
                const uid = getCookie("userId");
                if (!uid) return;
                const p = await getDriverProfileByUser(uid);
                setDriver(p);
                const list = await getDriverSchedule(p.driverId);
                setItems(list || []);
            } catch {
                setError("Không tải được lịch làm việc");
            }
        }
        load();
    }, []);

    return (
        <div className="p-6">
            <h2 className="text-lg font-semibold">Lịch làm việc</h2>
            {driver && <div className="text-sm text-slate-600">{driver.fullName} {driver.branchName ? `- ${driver.branchName}` : ""}</div>}
            {error && <div className="text-sm text-rose-600 mt-2">{error}</div>}

            <div className="mt-4 space-y-3">
                {items.length === 0 ? (
                    <div className="text-sm text-slate-600">Chưa có lịch làm việc</div>
                ) : (
                    items.map(it => (
                        <div key={it.tripId} className="border rounded p-3 text-sm">
                            <div className="font-medium">Trip #{it.tripId}</div>
                            <div className="text-slate-700">{it.startLocation} ? {it.endLocation}</div>
                            <div className="text-slate-500 text-xs mt-1">B?t d?u: {it.startTime}</div>
                            <div className="text-slate-500 text-xs">Tr?ng th�i: {it.status}</div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
