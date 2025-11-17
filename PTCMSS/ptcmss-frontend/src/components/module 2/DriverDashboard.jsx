import { getCookie } from '../../utils/cookies';
import React from "react";
import { getDriverProfileByUser, getDriverDashboard, startTrip as apiStartTrip, completeTrip as apiCompleteTrip } from "../../api/drivers";

export default function DriverDashboard() {
    const [driver, setDriver] = React.useState(null);
    const [data, setData] = React.useState(null);
    const [phase, setPhase] = React.useState("IDLE");

    React.useEffect(() => {
        async function load() {
            try {
                const uid = getCookie("userId");
                if (!uid) return;
                const profile = await getDriverProfileByUser(uid);
                setDriver(profile);
                const dash = await getDriverDashboard(profile.driverId);
                const current = dash
                    ? {
                        trip_id: dash.tripId,
                        pickup_time: dash.startTime,
                        pickup_address: dash.startLocation,
                        dropoff_address: dash.EndLocation ?? dash.endLocation,
                        customer_name: "",
                        customer_phone: "",
                    }
                    : null;
                setData({ current_trip: current, notifications: [] });
                setPhase(current ? "READY" : "IDLE");
            } catch {
                // ignore
            }
        }
        load();
    }, []);

    const activeTrip = data?.current_trip || null;
    const isCurrent = !!data?.current_trip;

    const apiStart = async () => {
        if (phase !== "READY") return;
        if (!driver?.driverId || !activeTrip?.trip_id) return;
        try {
            await apiStartTrip(driver.driverId, activeTrip.trip_id);
            setPhase("ON_ROUTE");
        } catch {
            // ignore
        }
    };

    const apiFinish = async () => {
        if (phase !== "PICKED") return;
        if (!driver?.driverId || !activeTrip?.trip_id) return;
        try {
            await apiCompleteTrip(driver.driverId, activeTrip.trip_id);
            setPhase("DONE");
        } catch {
            // ignore
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-lg font-semibold">Driver Dashboard</h2>
            <div className="text-sm text-slate-600">{driver?.fullName} {driver?.branchName ? `- ${driver.branchName}` : ""}</div>

            {activeTrip ? (
                <div className="mt-4 border rounded p-3">
                    <div className="font-medium">Trip #{activeTrip.trip_id}</div>
                    <div className="text-sm">{activeTrip.pickup_address} ? {activeTrip.dropoff_address}</div>
                    <div className="mt-2 flex gap-2">
                        <button className="px-3 py-1 border rounded" onClick={apiStart} disabled={phase!=="READY"}>Bắt đầu</button>
                        <button className="px-3 py-1 border rounded" onClick={()=>setPhase("PICKED")} disabled={phase!=="ON_ROUTE"}>Đã đón</button>
                        <button className="px-3 py-1 border rounded" onClick={apiFinish} disabled={phase!=="PICKED"}>Hoàn Thành</button>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Phase: {phase}</div>
                </div>
            ) : (
                <div className="mt-4 text-sm text-slate-600">Không có chuyến</div>
            )}
        </div>
    );
}
