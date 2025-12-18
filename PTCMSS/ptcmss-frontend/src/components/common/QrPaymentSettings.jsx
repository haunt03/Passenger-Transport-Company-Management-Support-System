import React from "react";
import { QrCode, Save, RefreshCw, AlertCircle, CheckCircle2, RefreshCcw } from "lucide-react";
import { getQrSettings, updateQrSettings } from "../../api/settings";

/**
 * QR Payment Settings Component
 * Allows admin to configure bank account info for QR payment generation
 */
export default function QrPaymentSettings() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [settings, setSettings] = React.useState({
    bankCode: "",
    accountNumber: "",
    accountName: "",
    descriptionPrefix: "",
  });
  const [originalSettings, setOriginalSettings] = React.useState(null);
  const [metadata, setMetadata] = React.useState({
    updatedAt: null,
    updatedBy: null,
    source: null,
  });
  const [errors, setErrors] = React.useState({});
  const [successMsg, setSuccessMsg] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");
  const [banks, setBanks] = React.useState([]);
  const [bankError, setBankError] = React.useState("");
  const [bankLoading, setBankLoading] = React.useState(false);

  // Load settings on mount
  React.useEffect(() => {
    loadSettings();
    loadBanks();
  }, []);
  const loadBanks = async () => {
    try {
      setBankLoading(true);
      setBankError("");

      const resp = await fetch("https://api.vietqr.io/v2/banks");
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const payload = await resp.json();
      if (payload?.code !== "00" || !Array.isArray(payload?.data)) {
        throw new Error("Dữ liệu ngân hàng không hợp lệ");
      }
      const sorted = [...payload.data].sort((a, b) =>
          (a.shortName || a.name || "").localeCompare(b.shortName || b.name || "")
      );
      setBanks(sorted);
    } catch (err) {
      console.error("Failed to load VietQR banks", err);
      setBankError("Không thể tải danh sách ngân hàng VietQR. Bạn vẫn có thể nhập mã thủ công.");
    } finally {
      setBankLoading(false);
    }
  };

  const handleBankSelect = (bin) => {
    handleInputChange("bankCode", bin || "");
  };


  const loadSettings = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const response = await getQrSettings();
      const data = response?.data || response;

      const loadedSettings = {
        bankCode: data.bankCode || "",
        accountNumber: data.accountNumber || "",
        accountName: data.accountName || "",
        descriptionPrefix: data.descriptionPrefix || "PTCMSS",
      };

      setSettings(loadedSettings);
      setOriginalSettings(loadedSettings);
      setMetadata({
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
        source: data.source,
      });
    } catch (error) {
      console.error("Error loading QR settings:", error);
      setErrorMsg("Không thể tải cấu hình QR. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
    // Clear messages
    setSuccessMsg("");
    setErrorMsg("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (!settings.bankCode || settings.bankCode.length < 6) {
      newErrors.bankCode = "Mã ngân hàng phải có ít nhất 6 ký tự";
    } else if (!/^\d+$/.test(settings.bankCode)) {
      newErrors.bankCode = "Mã ngân hàng chỉ được chứa số";
    }

    if (!settings.accountNumber || settings.accountNumber.length < 8) {
      newErrors.accountNumber = "Số tài khoản phải có ít nhất 8 ký tự";
    } else if (!/^\d+$/.test(settings.accountNumber)) {
      newErrors.accountNumber = "Số tài khoản chỉ được chứa số";
    }

    if (!settings.accountName || settings.accountName.length < 3) {
      newErrors.accountName = "Tên tài khoản phải có ít nhất 3 ký tự";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setErrorMsg("");
      setSuccessMsg("");

      const payload = {
        bankCode: settings.bankCode.trim(),
        accountNumber: settings.accountNumber.trim(),
        accountName: settings.accountName.trim().toUpperCase(),
        descriptionPrefix: settings.descriptionPrefix.trim() || "PTCMSS",
      };

      const response = await updateQrSettings(payload);
      const data = response?.data || response;

      // Update with response data
      const updatedSettings = {
        bankCode: data.bankCode || payload.bankCode,
        accountNumber: data.accountNumber || payload.accountNumber,
        accountName: data.accountName || payload.accountName,
        descriptionPrefix: data.descriptionPrefix || payload.descriptionPrefix,
      };

      setSettings(updatedSettings);
      setOriginalSettings(updatedSettings);
      setMetadata({
        updatedAt: data.updatedAt || new Date().toISOString(),
        updatedBy: data.updatedBy || "admin",
        source: "database",
      });

      setSuccessMsg("Cập nhật cấu hình QR thành công!");

      // Clear success message after 3s
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      console.error("Error updating QR settings:", error);
      const apiError = error?.response?.data?.message || error?.message;
      setErrorMsg(`Không thể cập nhật cấu hình: ${apiError || "Vui lòng thử lại"}`);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    if (!originalSettings) return false;
    return (
        settings.bankCode !== originalSettings.bankCode ||
        settings.accountNumber !== originalSettings.accountNumber ||
        settings.accountName !== originalSettings.accountName ||
        settings.descriptionPrefix !== originalSettings.descriptionPrefix
    );
  };

  if (loading) {
    return (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <QrCode className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-slate-900">Cấu hình thanh toán QR</h3>
          </div>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 text-slate-400 animate-spin" />
            <span className="ml-2 text-slate-600">Đang tải...</span>
          </div>
        </div>
    );
  }

  return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <QrCode className="h-5 w-5 text-emerald-600" />
          <h3 className="text-lg font-semibold text-slate-900">Cấu hình thanh toán QR</h3>
        </div>

        {/* Messages */}
        {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-emerald-800">{successMsg}</span>
            </div>
        )}

        {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-800">{errorMsg}</span>
            </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          {/* Bank Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ngân hàng <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                  value={settings.bankCode && banks.find((b) => b.bin === settings.bankCode) ? settings.bankCode : ""}
                  onChange={(e) => handleBankSelect(e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.bankCode
                          ? "border-red-300 focus:ring-red-200"
                          : "border-slate-300 focus:ring-emerald-200"
                  }`}
              >
                <option value="">
                  {bankLoading ? "Đang tải danh sách..." : "Chọn ngân hàng từ VietQR"}
                </option>
                {banks.map((bank) => (
                    <option key={bank.bin} value={bank.bin}>
                      {bank.shortName || bank.name} ({bank.bin})
                    </option>
                ))}
              </select>
              <button
                  type="button"
                  onClick={loadBanks}
                  className="px-3 py-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-slate-600"
                  title="Tải lại danh sách ngân hàng từ VietQR"
              >
                {bankLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              </button>
            </div>
            {bankError && (
                <p className="mt-1 text-sm text-primary-600">{bankError}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Dữ liệu lấy trực tiếp từ VietQR API. Chọn tên ngân hàng, hệ thống sẽ tự điền mã.
            </p>
          </div>

          {/* Bank Code */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mã ngân hàng <span className="text-red-500">*</span>
            </label>
            <input
                type="text"
                value={settings.bankCode}
                placeholder="VD: 970403 (Sacombank)"
                readOnly
                className={`w-full px-3 py-2 border rounded-lg bg-slate-50 text-slate-700 ${
                    errors.bankCode ? "border-red-300" : "border-slate-300"
                }`}
            />
            {errors.bankCode && (
                <p className="mt-1 text-sm text-red-600">{errors.bankCode}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Mã ngân hàng theo chuẩn VietQR (6-10 ký tự số) – tự sinh theo ngân hàng đã chọn, không chỉnh tay.
            </p>
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Số tài khoản <span className="text-red-500">*</span>
            </label>
            <input
                type="text"
                value={settings.accountNumber}
                onChange={(e) => handleInputChange("accountNumber", e.target.value)}
                placeholder="VD: 070122047995"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.accountNumber
                        ? "border-red-300 focus:ring-red-200"
                        : "border-slate-300 focus:ring-emerald-200"
                }`}
            />
            {errors.accountNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.accountNumber}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Số tài khoản ngân hàng nhận thanh toán (8-20 ký tự số)
            </p>
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tên tài khoản <span className="text-red-500">*</span>
            </label>
            <input
                type="text"
                value={settings.accountName}
                onChange={(e) => handleInputChange("accountName", e.target.value)}
                onBlur={(e) => {
                  // Auto-uppercase on blur
                  handleInputChange("accountName", e.target.value.toUpperCase());
                }}
                placeholder="VD: NGUYEN VAN THUAN"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.accountName
                        ? "border-red-300 focus:ring-red-200"
                        : "border-slate-300 focus:ring-emerald-200"
                }`}
            />
            {errors.accountName && (
                <p className="mt-1 text-sm text-red-600">{errors.accountName}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Tên chủ tài khoản (hiển thị trên mã QR, tự động chuyển sang chữ hoa)
            </p>
          </div>

          {/* Description Prefix */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mã mô tả
            </label>
            <input
                type="text"
                value={settings.descriptionPrefix}
                onChange={(e) => handleInputChange("descriptionPrefix", e.target.value)}
                placeholder="VD: PTCMSS"
                maxLength={20}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <p className="mt-1 text-xs text-slate-500">
              Tiền tố cho nội dung chuyển khoản (VD: PTCMSS-123). Tối đa 20 ký tự.
            </p>
          </div>
        </div>

        {/* Metadata */}
        {metadata.updatedAt && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                Cập nhật lần cuối:{" "}
                {new Date(metadata.updatedAt).toLocaleString("vi-VN")}
                {metadata.updatedBy && ` bởi ${metadata.updatedBy}`}
              </p>
            </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
              onClick={handleSave}
              disabled={saving || !hasChanges()}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  saving || !hasChanges()
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
          >
            {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
                <Save className="h-4 w-4" />
            )}
            {saving ? "Đang lưu..." : "Lưu cấu hình"}
          </button>

          {hasChanges() && (
              <button
                  onClick={() => {
                    setSettings(originalSettings);
                    setErrors({});
                    setSuccessMsg("");
                    setErrorMsg("");
                  }}
                  className="px-4 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Hủy thay đổi
              </button>
          )}
        </div>

        {/* Info note */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Lưu ý:</strong> Các thông tin API keys (VIETQR_CLIENT_ID, VIETQR_API_KEY)
            được bảo mật và không thể điều chỉnh qua giao diện. Chỉ có thể thay đổi qua biến môi trường.
          </p>
        </div>
      </div>
  );
}
