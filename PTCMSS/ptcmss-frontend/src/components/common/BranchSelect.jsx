import React, { useState, useEffect } from 'react';
import { Building2, AlertCircle } from 'lucide-react';
import { getAllBranchesForSelection } from '../../api/branches';

/**
 * BranchSelect - Component dropdown chọn chi nhánh
 *
 * Props:
 * - value: number - ID chi nhánh được chọn
 * - onChange: function - Callback khi thay đổi (nhận branchId)
 * - required: boolean - Bắt buộc chọn (default: false)
 * - disabled: boolean - Disable select (default: false)
 * - error: string - Thông báo lỗi
 * - label: string - Label cho select (default: "Chi nhánh")
 * - placeholder: string - Placeholder (default: "-- Chọn chi nhánh --")
 * - className: string - Custom class cho container
 */
export default function BranchSelect({
                                         value,
                                         onChange,
                                         required = false,
                                         disabled = false,
                                         error = '',
                                         label = 'Chi nhánh',
                                         placeholder = '-- Chọn chi nhánh --',
                                         className = '',
                                     }) {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        loadBranches();
    }, []);

    const loadBranches = async () => {
        setLoading(true);
        setLoadError('');
        try {
            const response = await getAllBranchesForSelection();
            setBranches(response.data || []);
        } catch (err) {
            console.error('Failed to load branches:', err);
            setLoadError('Không thể tải danh sách chi nhánh');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const branchId = e.target.value ? parseInt(e.target.value) : null;
        onChange?.(branchId);
    };

    return (
        <div className={className}>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-2">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <span>{label}</span>
                {required && <span className="text-red-500">*</span>}
            </label>

            <div className="relative">
                <select
                    value={value || ''}
                    onChange={handleChange}
                    disabled={disabled || loading}
                    className={`w-full border rounded-lg px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${error
                        ? 'border-rose-300 focus:border-rose-400'
                        : 'border-slate-300 focus:border-sky-500/50'
                    } ${disabled || loading
                        ? 'bg-slate-50 text-slate-500 cursor-not-allowed'
                        : 'bg-white'
                    }`}
                >
                    <option value="">{loading ? 'Đang tải...' : placeholder}</option>
                    {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                            {branch.branchName}
                        </option>
                    ))}
                </select>

                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin h-4 w-4 border-2 border-sky-500 border-t-transparent rounded-full"></div>
                    </div>
                )}
            </div>

            {(error || loadError) && (
                <div className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{error || loadError}</span>
                </div>
            )}

            {!loading && !loadError && branches.length === 0 && (
                <div className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>Chưa có chi nhánh nào</span>
                </div>
            )}
        </div>
    );
}
