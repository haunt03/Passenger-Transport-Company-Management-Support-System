import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2, MapPin, RefreshCw, Shield, XCircle, X, Ambulance, Phone, Truck, UserCheck, Ban, FileText, User, Mail, CreditCard, Building2, Search, Filter } from "lucide-react";
import { getBranchByUserId } from "../../api/branches";
import { listIncidentsByBranch, resolveIncident } from "../../api/incidents";
import { getCurrentRole, getStoredUserId, ROLES } from "../../utils/session";

// Helper function to translate severity to Vietnamese
const getSeverityLabel = (severity) => {
  const severityMap = {
    MINOR: "Nhẹ",
    NORMAL: "Bình thường",
    MAJOR: "Trung bình",
    CRITICAL: "Nghiêm trọng",
  };
  return severityMap[severity] || severity;
};

// Helper function to get severity priority for sorting
const getSeverityPriority = (severity) => {
  const priorityMap = {
    CRITICAL: 1,
    MAJOR: 2,
    MINOR: 3,
    NORMAL: 4,
  };
  return priorityMap[severity] || 99;
};

export default function CoordinatorIncidentListPage() {
  const role = useMemo(() => getCurrentRole(), []);
  const userId = useMemo(() => getStoredUserId(), []);
  const isBranchScoped = [ROLES.COORDINATOR, ROLES.MANAGER, ROLES.ADMIN].includes(role);

  const [branchId, setBranchId] = useState(null);
  const [branchLoading, setBranchLoading] = useState(true);
  const [branchError, setBranchError] = useState("");

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resolvingId, setResolvingId] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [resolutionAction, setResolutionAction] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");

  // Filter states
  const [filterDriverName, setFilterDriverName] = useState("");
  const [filterTripId, setFilterTripId] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterResolved, setFilterResolved] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // load branch
  useEffect(() => {
    if (!isBranchScoped) {
      setBranchLoading(false);
      return;
    }
    if (!userId) {
      setBranchError("Không xác định được user");
      setBranchLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setBranchLoading(true);
      setBranchError("");
      try {
        const resp = await getBranchByUserId(Number(userId));
        if (cancelled) return;
        const id = resp?.branchId ?? resp?.id ?? resp?.data?.branchId ?? resp?.data?.id ?? null;
        if (id) setBranchId(id);
        else setBranchError("Không tìm thấy chi nhánh");
      } catch (err) {
        if (cancelled) return;
        setBranchError(err?.message || "Không tải được chi nhánh");
      } finally {
        if (!cancelled) setBranchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isBranchScoped, userId]);

  // load incidents
  useEffect(() => {
    if (branchLoading) return;
    if (isBranchScoped && !branchId) return;
    fetchIncidents();
  }, [branchId, branchLoading]);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await listIncidentsByBranch(Number(branchId));
      const list = Array.isArray(data) ? data : data?.data || [];

      // Sort incidents: CRITICAL first, then MAJOR, then others
      // Also prioritize unresolved incidents
      const sortedList = [...list].sort((a, b) => {
        // First, prioritize unresolved incidents
        if (!a.resolved && b.resolved) return -1;
        if (a.resolved && !b.resolved) return 1;

        // Then sort by severity (CRITICAL > MAJOR > MINOR > NORMAL)
        const aPriority = getSeverityPriority(a.severity);
        const bPriority = getSeverityPriority(b.severity);
        if (aPriority !== bPriority) return aPriority - bPriority;

        // Finally, sort by creation date (newest first)
        const aDate = new Date(a.createdAt || 0).getTime();
        const bDate = new Date(b.createdAt || 0).getTime();
        return bDate - aDate;
      });

      setIncidents(sortedList);
    } catch (err) {
      setError(err?.message || "Không tải được danh sách sự cố");
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  const openResolveModal = (incident) => {
    setSelectedIncident(incident);
    setResolutionAction("");
    setResolutionNote("");
    setShowResolveModal(true);
  };

  const closeResolveModal = () => {
    setShowResolveModal(false);
    setSelectedIncident(null);
    setResolutionAction("");
    setResolutionNote("");
  };

  const onResolve = async () => {
    if (!selectedIncident) return;
    if (!resolutionAction) {
      alert("Vui lòng chọn hành động xử lý");
      return;
    }

    setResolvingId(selectedIncident.id);
    try {
      await resolveIncident(selectedIncident.id, resolutionAction, resolutionNote || null);
      await fetchIncidents();
      closeResolveModal();
    } catch (err) {
      alert(err?.message || "Không cập nhật được trạng thái");
    } finally {
      setResolvingId(null);
    }
  };

  const resolutionActions = [
    {
      value: "SEND_EMERGENCY_SUPPORT",
      label: "Gửi hỗ trợ khẩn cấp",
      description: "Gửi xe cứu thương, cứu hộ hoặc hỗ trợ khẩn cấp",
      icon: Ambulance,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      value: "CONTACT_DRIVER",
      label: "Liên hệ với tài xế",
      description: "Gọi điện hoặc liên lạc trực tiếp với tài xế",
      icon: Phone,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      value: "SEND_REPLACEMENT_VEHICLE",
      label: "Gửi xe thay thế",
      description: "Điều động xe khác để thay thế",
      icon: Truck,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      value: "REASSIGN_TRIP",
      label: "Chuyển chuyến đi",
      description: "Chuyển chuyến đi sang tài xế khác",
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      value: "CANCEL_TRIP",
      label: "Hủy chuyến đi",
      description: "Hủy chuyến đi do không thể tiếp tục",
      icon: Ban,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      value: "OTHER",
      label: "Giải pháp khác",
      description: "Các giải pháp khác không nằm trong danh sách",
      icon: FileText,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
    },
  ];

  const badge = (resolved) =>
      resolved ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" /> Đã xử lý
      </span>
      ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-info-100 text-info-700 border border-info-200">
        <Clock className="h-3.5 w-3.5" /> Chưa xử lý
      </span>
      );

  // Filter incidents based on filter criteria
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // Filter by driver name
      if (filterDriverName.trim()) {
        const driverName = (inc.driverName || "").toLowerCase();
        const searchTerm = filterDriverName.toLowerCase().trim();
        if (!driverName.includes(searchTerm)) return false;
      }

      // Filter by trip ID
      if (filterTripId.trim()) {
        const tripIdStr = String(inc.tripId || "").toLowerCase();
        const searchTerm = filterTripId.toLowerCase().trim();
        if (!tripIdStr.includes(searchTerm)) return false;
      }

      // Filter by severity
      if (filterSeverity !== "all") {
        if (inc.severity !== filterSeverity) return false;
      }

      // Filter by resolved status
      if (filterResolved !== "all") {
        const isResolved = filterResolved === "resolved";
        if (inc.resolved !== isResolved) return false;
      }

      return true;
    });
  }, [incidents, filterDriverName, filterTripId, filterSeverity, filterResolved]);

  const pendingCount = filteredIncidents.filter(i => !i.resolved).length;
  const resolvedCount = filteredIncidents.filter(i => i.resolved).length;
  const totalCount = filteredIncidents.length;

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 text-slate-900">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <AlertTriangle className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Sự cố chuyến đi</h1>
                <p className="text-sm text-slate-600 mt-1">Nhận và xử lý báo cáo sự cố của tài xế</p>
              </div>
            </div>
            <button
                onClick={fetchIncidents}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 hover:shadow-sm transition-all duration-200"
                disabled={loading || branchLoading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Làm mới
            </button>
          </div>

          {/* Stats Cards */}
          {!branchLoading && !error && incidents.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-slate-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-900">
                        {totalCount}
                        {totalCount !== incidents.length && (
                            <span className="text-sm font-normal text-slate-500 ml-1">
                        / {incidents.length}
                      </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-600">Tổng sự cố</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-info-100 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary-600">{pendingCount}</div>
                      <div className="text-sm text-slate-600">Chờ xử lý</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-600">{resolvedCount}</div>
                      <div className="text-sm text-slate-600">Đã xử lý</div>
                    </div>
                  </div>
                </div>
              </div>
          )}
        </div>

        {/* Error States */}
        {branchLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-3 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Đang tải chi nhánh...</span>
            </div>
        ) : branchError ? (
            <div className="bg-white rounded-xl border border-rose-200 p-6 flex items-center gap-3 text-rose-600">
              <XCircle className="h-5 w-5" />
              <span>{branchError}</span>
            </div>
        ) : error ? (
            <div className="bg-white rounded-xl border border-rose-200 p-6 flex items-center gap-3 text-rose-600">
              <XCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
        ) : null}

        {/* Filter Section */}
        {!branchLoading && !error && incidents.length > 0 && (
            <div className="mt-6 mb-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Bộ lọc</span>
                    {(filterDriverName || filterTripId || filterSeverity !== "all" || filterResolved !== "all") && (
                        <span className="ml-1 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                    {[
                      filterDriverName && "1",
                      filterTripId && "1",
                      filterSeverity !== "all" && "1",
                      filterResolved !== "all" && "1"
                    ].filter(Boolean).length}
                  </span>
                    )}
                  </button>
                  {(filterDriverName || filterTripId || filterSeverity !== "all" || filterResolved !== "all") && (
                      <button
                          onClick={() => {
                            setFilterDriverName("");
                            setFilterTripId("");
                            setFilterSeverity("all");
                            setFilterResolved("all");
                          }}
                          className="text-sm text-slate-600 hover:text-slate-900 underline"
                      >
                        Xóa bộ lọc
                      </button>
                  )}
                </div>

                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
                      {/* Driver Name Filter */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          Tên tài xế
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                              type="text"
                              value={filterDriverName}
                              onChange={(e) => setFilterDriverName(e.target.value)}
                              placeholder="Tìm theo tên..."
                              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Trip ID Filter */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          Mã chuyến đi
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                              type="text"
                              value={filterTripId}
                              onChange={(e) => setFilterTripId(e.target.value)}
                              placeholder="Tìm theo mã..."
                              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Severity Filter */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          Mức độ nghiêm trọng
                        </label>
                        <select
                            value={filterSeverity}
                            onChange={(e) => setFilterSeverity(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="all">Tất cả</option>
                          <option value="CRITICAL">Nghiêm trọng</option>
                          <option value="MAJOR">Trung bình</option>
                          <option value="MINOR">Nhẹ</option>
                          <option value="NORMAL">Bình thường</option>
                        </select>
                      </div>

                      {/* Resolved Status Filter */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">
                          Trạng thái
                        </label>
                        <select
                            value={filterResolved}
                            onChange={(e) => setFilterResolved(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="all">Tất cả</option>
                          <option value="pending">Chờ xử lý</option>
                          <option value="resolved">Đã xử lý</option>
                        </select>
                      </div>
                    </div>
                )}
              </div>
            </div>
        )}

        {/* Incidents List */}
        <div className="mt-6 grid grid-cols-1 gap-4">
          {loading ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="text-slate-600">Đang tải danh sách sự cố...</span>
              </div>
          ) : incidents.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Chưa có báo cáo sự cố nào</h3>
                <p className="text-sm text-slate-600">Tất cả đều ổn! Không có sự cố nào cần xử lý.</p>
              </div>
          ) : filteredIncidents.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Không tìm thấy kết quả</h3>
                <p className="text-sm text-slate-600">Không có sự cố nào phù hợp với bộ lọc của bạn.</p>
              </div>
          ) : (
              filteredIncidents.map((inc) => (
                  <div key={inc.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="flex items-start gap-4">
                      {/* Status Indicator */}
                      <div className={`h-16 w-1 rounded-full flex-shrink-0 ${
                          inc.resolved ? 'bg-emerald-500' :
                              inc.severity === 'CRITICAL' ? 'bg-rose-500' :
                                  inc.severity === 'MAJOR' ? 'bg-info-500' : 'bg-blue-500'
                      }`} />

                      <div className="flex-1 min-w-0">
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-lg font-bold text-slate-900">Chuyến {inc.tripId}</span>
                              {badge(inc.resolved)}
                              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                                  inc.severity === "CRITICAL" ? "bg-rose-100 text-rose-700" :
                                      inc.severity === "MAJOR" ? "bg-info-100 text-info-700" :
                                          "bg-blue-100 text-blue-700"
                              }`}>
                          {getSeverityLabel(inc.severity) || "Bình thường"}
                        </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span>ID: {inc.id}</span>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{inc.createdAt ? new Date(inc.createdAt).toLocaleString("vi-VN") : "--"}</span>
                              </div>
                            </div>
                          </div>
                          {!inc.resolved && (
                              <button
                                  onClick={() => openResolveModal(inc)}
                                  disabled={resolvingId === inc.id}
                                  className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
                              >
                                {resolvingId === inc.id ? "Đang xử lý..." : "Xử lý sự cố"}
                              </button>
                          )}
                        </div>

                        {/* Driver Information */}
                        <div className="mb-4 p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/60 rounded-xl">
                          <div className="flex items-start gap-3">
                            <div className="h-11 w-11 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-blue-900 mb-3 text-base">{inc.driverName || `Tài xế #${inc.driverId}`}</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {inc.driverPhone && (
                                    <a
                                        href={`tel:${inc.driverPhone}`}
                                        className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors group"
                                    >
                                      <Phone className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                      <span className="font-medium">{inc.driverPhone}</span>
                                    </a>
                                )}
                                {inc.driverEmail && (
                                    <a
                                        href={`mailto:${inc.driverEmail}`}
                                        className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors group"
                                    >
                                      <Mail className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                      <span className="font-medium truncate">{inc.driverEmail}</span>
                                    </a>
                                )}
                                {inc.driverLicenseNumber && (
                                    <div className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-700">
                                      <CreditCard className="h-4 w-4 text-slate-500" />
                                      <span className="text-sm">Bằng lái: <span className="font-medium">{inc.driverLicenseNumber}</span></span>
                                    </div>
                                )}
                                {inc.driverBranchName && (
                                    <div className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-700">
                                      <Building2 className="h-4 w-4 text-slate-500" />
                                      <span className="text-sm font-medium">{inc.driverBranchName}</span>
                                    </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Incident Description */}
                        <div className="mb-4 p-4 bg-info-50/50 border border-info-200/60 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-primary-600" />
                            <span className="text-xs font-semibold text-info-900 uppercase tracking-wide">Mô tả sự cố</span>
                          </div>
                          <div className="text-sm text-info-900 leading-relaxed">{inc.description}</div>
                        </div>

                        {/* Resolution Details */}
                        {inc.resolved && inc.resolutionAction && (
                            <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200/60 rounded-xl">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">Giải pháp đã áp dụng</span>
                              </div>
                              <div className="font-semibold text-emerald-900 mb-2">
                                {resolutionActions.find(a => a.value === inc.resolutionAction)?.label || inc.resolutionAction}
                              </div>
                              {inc.resolutionNote && (
                                  <div className="text-sm text-emerald-800 mb-3 leading-relaxed">{inc.resolutionNote}</div>
                              )}
                              {inc.resolvedByName && (
                                  <div className="text-xs text-emerald-700 flex items-center gap-2 pt-2 border-t border-emerald-200/60">
                                    <User className="h-3.5 w-3.5" />
                                    <span>
                            Xử lý bởi <span className="font-semibold">{inc.resolvedByName}</span>
                                      {inc.resolvedAt && (
                                          <> • {new Date(inc.resolvedAt).toLocaleString("vi-VN")}</>
                                      )}
                          </span>
                                  </div>
                              )}
                            </div>
                        )}
                      </div>
                    </div>
                  </div>
              ))
          )}
        </div>

        {/* Resolve Incident Modal */}
        {showResolveModal && selectedIncident && (
            <div
                className="fixed inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
                onClick={closeResolveModal}
            >
              <div
                  className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-modal-slide-in"
                  onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-slate-200 px-6 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Xử lý sự cố</h2>
                      <p className="text-sm text-slate-600 mt-0.5">
                        Chuyến {selectedIncident.tripId} <span className="text-slate-400">•</span> ID: {selectedIncident.id}
                      </p>
                    </div>
                  </div>
                  <button
                      onClick={closeResolveModal}
                      className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-all duration-200 flex items-center justify-center"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5 overflow-y-auto flex-1">
                  {/* Incident Description */}
                  <div className="mb-6 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-info-200/60 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-primary-600" />
                      <div className="text-sm font-semibold text-info-900">Mô tả sự cố</div>
                    </div>
                    <div className="text-sm text-info-800 leading-relaxed">{selectedIncident.description}</div>
                  </div>

                  {/* Action Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-800 mb-3">
                      Chọn hành động xử lý <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {resolutionActions.map((action, index) => {
                        const Icon = action.icon;
                        const isSelected = resolutionAction === action.value;
                        return (
                            <button
                                key={action.value}
                                onClick={() => setResolutionAction(action.value)}
                                className={`group relative p-4 border-2 rounded-xl text-left transition-all duration-200 transform hover:scale-[1.02] hover:shadow-md ${
                                    isSelected
                                        ? `${action.bgColor} border-current shadow-md scale-[1.02]`
                                        : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50"
                                }`}
                                style={{
                                  animationDelay: `${index * 50}ms`,
                                }}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2.5 rounded-xl transition-all duration-200 ${
                                    isSelected ? action.bgColor : "bg-slate-100 group-hover:bg-slate-200"
                                }`}>
                                  <Icon className={`h-5 w-5 transition-all duration-200 ${
                                      isSelected ? action.color : "text-slate-600"
                                  }`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`font-semibold transition-colors duration-200 ${
                                      isSelected ? "text-slate-900" : "text-slate-800"
                                  }`}>
                                    {action.label}
                                  </div>
                                  <div className={`text-xs mt-1.5 leading-relaxed ${
                                      isSelected ? "text-slate-700" : "text-slate-600"
                                  }`}>
                                    {action.description}
                                  </div>
                                </div>
                                <div className={`flex-shrink-0 transition-all duration-200 ${
                                    isSelected ? "opacity-100 scale-100" : "opacity-0 scale-75"
                                }`}>
                                  <CheckCircle2 className={`h-5 w-5 ${action.color}`} />
                                </div>
                              </div>
                              {isSelected && (
                                  <div
                                      className={`absolute inset-0 rounded-xl border-2 pointer-events-none animate-fade-in ${
                                          action.color.includes('red') ? 'border-red-600' :
                                              action.color.includes('blue') ? 'border-blue-600' :
                                                  action.color.includes('purple') ? 'border-purple-600' :
                                                      action.color.includes('green') ? 'border-green-600' :
                                                          action.color.includes('orange') ? 'border-orange-600' :
                                                              'border-gray-600'
                                      }`}
                                  />
                              )}
                            </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Solution Note */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
                      Ghi chú giải pháp <span className="text-slate-500 font-normal">(tùy chọn)</span>
                    </label>
                    <textarea
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        placeholder="Nhập chi tiết về giải pháp đã áp dụng..."
                        rows={4}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 resize-none"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
                  <button
                      onClick={closeResolveModal}
                      className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:shadow-sm transition-all duration-200"
                  >
                    Hủy
                  </button>
                  <button
                      onClick={onResolve}
                      disabled={!resolutionAction || resolvingId === selectedIncident.id}
                      className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
                  >
                    {resolvingId === selectedIncident.id ? (
                        <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </span>
                    ) : (
                        "Xác nhận xử lý"
                    )}
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}


