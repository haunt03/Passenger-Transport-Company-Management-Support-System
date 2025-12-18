import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  Shield,
  XCircle,
  Filter,
  Ambulance,
  Phone,
  Truck,
  UserCheck,
  Ban,
  FileText,
  Calendar,
  User,
} from "lucide-react";
import { listIncidentsByDriver } from "../../api/incidents";
import { getDriverProfileByUser } from "../../api/drivers";
import { getStoredUserId } from "../../utils/session";

const RESOLUTION_ACTIONS = {
  SEND_EMERGENCY_SUPPORT: {
    label: "Gửi hỗ trợ khẩn cấp",
    icon: Ambulance,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  CONTACT_DRIVER: {
    label: "Liên hệ với tài xế",
    icon: Phone,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  SEND_REPLACEMENT_VEHICLE: {
    label: "Gửi xe thay thế",
    icon: Truck,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  REASSIGN_TRIP: {
    label: "Chuyển chuyến đi",
    icon: UserCheck,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  CANCEL_TRIP: {
    label: "Hủy chuyến đi",
    icon: Ban,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  OTHER: {
    label: "Giải pháp khác",
    icon: FileText,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
  },
};

const SEVERITY_COLORS = {
  MINOR: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  NORMAL: { color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200" },
  MAJOR: { color: "text-info-700", bg: "bg-info-50", border: "border-info-200" },
  CRITICAL: { color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
};

export default function DriverIncidentListPage() {
  const userId = useMemo(() => getStoredUserId(), []);
  const [driver, setDriver] = useState(null);
  const [driverLoading, setDriverLoading] = useState(true);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // "all", "resolved", "pending"

  // Load driver profile
  useEffect(() => {
    if (!userId) {
      setDriverLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setDriverLoading(true);
        const data = await getDriverProfileByUser(Number(userId));
        if (cancelled) return;
        setDriver(data);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load driver:", err);
      } finally {
        if (!cancelled) setDriverLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Load incidents
  useEffect(() => {
    if (driverLoading || !driver?.driverId) return;
    fetchIncidents();
  }, [driver, driverLoading, filter]);

  const fetchIncidents = async () => {
    if (!driver?.driverId) return;
    try {
      setLoading(true);
      setError("");
      const resolved = filter === "all" ? null : filter === "resolved";
      const data = await listIncidentsByDriver(driver.driverId, resolved);
      const list = Array.isArray(data) ? data : data?.data || [];
      setIncidents(list);
    } catch (err) {
      setError(err?.message || "Không tải được danh sách sự cố");
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity) => {
    const config = SEVERITY_COLORS[severity] || SEVERITY_COLORS.NORMAL;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md ${config.bg} ${config.color} border ${config.border}`}>
        {severity || "NORMAL"}
      </span>
    );
  };

  const getResolutionBadge = (incident) => {
    if (!incident.resolved) {
      return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-info-100 text-info-700 border border-info-200">
          <Clock className="h-3.5 w-3.5" /> Chờ xử lý
        </span>
      );
    }

    const resolution = RESOLUTION_ACTIONS[incident.resolutionAction] || RESOLUTION_ACTIONS.OTHER;
    const ResolutionIcon = resolution.icon;

    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" /> Đã xử lý
      </span>
    );
  };

  const filteredIncidents = incidents;
  const resolvedCount = incidents.filter((i) => i.resolved).length;
  const pendingCount = incidents.filter((i) => !i.resolved).length;

  return (
      <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Quản lý sự cố</h1>
            <p className="text-sm text-slate-600">Xem và theo dõi các sự cố bạn đã báo cáo</p>
          </div>
          <button
              onClick={fetchIncidents}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              disabled={loading || driverLoading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Làm mới
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{incidents.length}</div>
                <div className="text-sm text-slate-600">Tổng sự cố</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-info-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary-600">{pendingCount}</div>
                <div className="text-sm text-slate-600">Chờ xử lý</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{resolvedCount}</div>
                <div className="text-sm text-slate-600">Đã xử lý</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">Lọc theo:</span>
          <div className="flex gap-2">
            <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filter === "all"
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
            >
              Tất cả
            </button>
            <button
                onClick={() => setFilter("pending")}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filter === "pending"
                        ? "bg-primary-600 text-white"
                        : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
            >
              Chờ xử lý
            </button>
            <button
                onClick={() => setFilter("resolved")}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filter === "resolved"
                        ? "bg-emerald-600 text-white"
                        : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
            >
              Đã xử lý
            </button>
          </div>
        </div>

        {driverLoading ? (
            <div className="flex items-center gap-2 text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải thông tin tài xế...
            </div>
        ) : error ? (
            <div className="flex items-center gap-2 text-rose-600">
              <XCircle className="h-4 w-4" /> {error}
            </div>
        ) : loading ? (
            <div className="flex items-center gap-2 text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải danh sách...
            </div>
        ) : filteredIncidents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white p-12 text-center">
              <Shield className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Chưa có sự cố nào</h3>
              <p className="text-sm text-slate-600">
                {filter === "all"
                    ? "Bạn chưa báo cáo sự cố nào. Hãy báo cáo khi có sự cố xảy ra."
                    : filter === "resolved"
                        ? "Chưa có sự cố nào đã được xử lý."
                        : "Tất cả sự cố đã được xử lý."}
              </p>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredIncidents.map((inc) => {
                const resolution = inc.resolutionAction
                    ? RESOLUTION_ACTIONS[inc.resolutionAction]
                    : null;
                const ResolutionIcon = resolution?.icon;

                return (
                    <div
                        key={inc.id}
                        className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="h-6 w-6 text-blue-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-slate-900">Chuyến {inc.tripId}</span>
                                {getSeverityBadge(inc.severity)}
                                {getResolutionBadge(inc)}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                <span>ID: {inc.id}</span>
                                <span>•</span>
                                <Calendar className="h-3.5 w-3.5" />
                                <span>
                            {inc.createdAt
                                ? new Date(inc.createdAt).toLocaleString("vi-VN")
                                : "--"}
                          </span>
                              </div>
                            </div>
                          </div>

                          {/* Description */}
                          <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="text-sm text-slate-700 leading-relaxed">{inc.description}</div>
                          </div>

                          {/* Resolution Details */}
                          {inc.resolved && (
                              <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
                                <div className="flex items-start gap-3">
                                  {ResolutionIcon && (
                                      <div className="p-2 rounded-lg bg-emerald-100 flex-shrink-0">
                                        <ResolutionIcon className={`h-5 w-5 ${resolution.color}`} />
                                      </div>
                                  )}
                                  <div className="flex-1">
                                    <div className="font-semibold text-emerald-900 mb-1">
                                      Giải pháp đã áp dụng: {resolution?.label || "Đã xử lý"}
                                    </div>
                                    {inc.resolutionNote && (
                                        <div className="text-sm text-emerald-800 mt-2 mb-2">
                                          {inc.resolutionNote}
                                        </div>
                                    )}
                                    <div className="text-xs text-emerald-700 flex items-center gap-2 mt-2">
                                      <User className="h-3.5 w-3.5" />
                                      <span>
                                Xử lý bởi: {inc.resolvedByName || "Điều phối viên"}
                                        {inc.resolvedAt && (
                                            <>
                                              {" • "}
                                              {new Date(inc.resolvedAt).toLocaleString("vi-VN")}
                                            </>
                                        )}
                              </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                          )}
                        </div>
                      </div>
                    </div>
                );
              })}
            </div>
        )}
      </div>
  );
}

