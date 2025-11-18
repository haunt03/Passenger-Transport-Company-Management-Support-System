import { getCookie } from '../../utils/cookies';
import React from "react";
import { getDriverProfileByUser, updateDriverProfile } from "../../api/drivers";

export default function DriverProfilePage() {
    const [profile, setProfile] = React.useState(null);
    const [phone, setPhone] = React.useState("");
    const [address, setAddress] = React.useState("");
    const [note, setNote] = React.useState("");
    const [healthCheckDate, setHealthCheckDate] = React.useState("");
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState("");
    const [message, setMessage] = React.useState("");

    React.useEffect(() => {
        async function load() {
            try {
                const uid = getCookie("userId");
                if (!uid) return;
                const p = await getDriverProfileByUser(uid);
                setProfile(p);
                setPhone(p.phone || "");
                setAddress(p.address || "");
                setNote(p.note || "");
                setHealthCheckDate(p.healthCheckDate || "");
            } catch (e) {
                setError("Không tải được hồ sơ");
            }
        }
        load();
    }, []);

    async function onSave() {
        if (!profile?.driverId) return;
        setSaving(true);
        setError("");
        setMessage("");
        try {
            await updateDriverProfile(profile.driverId, {
                phone: phone.trim() || null,
                address: address.trim() || null,
                note: note.trim() || null,
                healthCheckDate: healthCheckDate || null,
            });
            setMessage("Lưu thay đổi");
        } catch (e) {
            setError("Luu th?t b?i");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="p-6">
            <h2 className="text-lg font-semibold">Thông tin tài xế</h2>
            {error && <div className="text-sm text-rose-600 mt-2">{error}</div>}
            {message && <div className="text-sm text-emerald-600 mt-2">{message}</div>}

            {!profile ? (
                <div className="mt-4 text-slate-600">Đang tải...</div>
            ) : (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-slate-500">Id tài xế</div>
                        <div className="font-medium">{profile.driverId}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500">Họ tên</div>
                        <div className="font-medium">{profile.fullName}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500">Chi nhánh</div>
                        <div className="font-medium">{profile.branchName}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500">GPLX</div>
                        <div className="font-medium">{profile.licenseClass}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500">GPLX</div>
                        <div className="font-medium">{profile.licenseNumber}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500">Hết hạn GPLX</div>
                        <div className="font-medium">{profile.licenseExpiry}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500">Trạng Thái</div>
                        <div className="font-medium">{profile.status}</div>
                    </div>

                    <div className="md:col-span-2 h-px bg-slate-200 my-2" />

                    <div className="md:col-span-2">
                        <label className="text-xs text-slate-500">Điện thoại</label>
                        <input className="w-full border rounded px-3 py-2" value={phone} onChange={e=>setPhone(e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs text-slate-500">Địa chỉ</label>
                        <input className="w-full border rounded px-3 py-2" value={address} onChange={e=>setAddress(e.target.value)} />
                    </div>
                    <div className="md:col-span-1">
                        <label className="text-xs text-slate-500">Ngày khám sức khỏe</label>
                        <input type="date" className="w-full border rounded px-3 py-2" value={healthCheckDate || ""} onChange={e=>setHealthCheckDate(e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs text-slate-500">Ghi chú</label>
                        <textarea className="w-full border rounded px-3 py-2" rows={3} value={note} onChange={e=>setNote(e.target.value)} />
                    </div>

                    <div className="md:col-span-2">
                        <button onClick={onSave} disabled={saving} className="px-4 py-2 border rounded bg-emerald-50 text-emerald-700">
                            {saving ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
