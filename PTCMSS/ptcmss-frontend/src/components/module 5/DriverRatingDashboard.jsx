import { useState, useEffect } from 'react';
import { Star, TrendingUp, Award, Users, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StarRating from '../common/StarRating';

const DriverRatingDashboard = () => {
    const navigate = useNavigate();
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [branches, setBranches] = useState([]);
    const [sortBy, setSortBy] = useState('rating'); // 'rating' | 'name' | 'totalRatings'

    useEffect(() => {
        loadBranches();
    }, []);

    useEffect(() => {
        if (selectedBranch) {
            loadDrivers();
        }
    }, [selectedBranch, sortBy]);

    const loadBranches = async () => {
        try {
            const response = await fetch('/api/branches');
            const data = await response.json();
            setBranches(data.data || []);
        } catch (error) {
            console.error('Error loading branches:', error);
        }
    };

    const loadDrivers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/drivers/branch/${selectedBranch}`);
            const data = await response.json();

            // Get performance for each driver
            const driversWithPerformance = await Promise.all(
                (data.data || []).map(async (driver) => {
                    try {
                        const perfResponse = await fetch(`/api/ratings/driver/${driver.driverId}/performance?days=30`);
                        const perfData = await perfResponse.json();
                        return {
                            ...driver,
                            performance: perfData.data
                        };
                    } catch {
                        return {
                            ...driver,
                            performance: null
                        };
                    }
                })
            );

            // Sort drivers
            const sorted = [...driversWithPerformance].sort((a, b) => {
                if (sortBy === 'rating') {
                    const ratingA = a.performance?.avgOverall || 0;
                    const ratingB = b.performance?.avgOverall || 0;
                    return ratingB - ratingA;
                } else if (sortBy === 'totalRatings') {
                    const totalA = a.performance?.totalRatings || 0;
                    const totalB = b.performance?.totalRatings || 0;
                    return totalB - totalA;
                } else {
                    return (a.fullName || '').localeCompare(b.fullName || '');
                }
            });

            setDrivers(sorted);
        } catch (error) {
            console.error('Error loading drivers:', error);
            setDrivers([]);
        } finally {
            setLoading(false);
        }
    };

    const getRatingColor = (rating) => {
        if (rating >= 4.5) return 'text-green-600';
        if (rating >= 4.0) return 'text-blue-600';
        if (rating >= 3.5) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getRatingBadge = (rating) => {
        if (rating >= 4.5) return { label: 'Xuất sắc', color: 'bg-green-100 text-green-800' };
        if (rating >= 4.0) return { label: 'Tốt', color: 'bg-blue-100 text-blue-800' };
        if (rating >= 3.5) return { label: 'Khá', color: 'bg-yellow-100 text-yellow-800' };
        return { label: 'Cần cải thiện', color: 'bg-red-100 text-red-800' };
    };

    const stats = {
        totalDrivers: drivers.length,
        avgRating: drivers.length > 0
            ? (drivers.reduce((sum, d) => sum + (d.performance?.avgOverall || 0), 0) / drivers.length).toFixed(1)
            : 0,
        topPerformers: drivers.filter(d => (d.performance?.avgOverall || 0) >= 4.5).length,
        totalRatings: drivers.reduce((sum, d) => sum + (d.performance?.totalRatings || 0), 0)
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Dashboard Đánh Giá Tài Xế
                </h1>
                <p className="text-gray-600">
                    Tổng quan hiệu suất và đánh giá tài xế (30 ngày gần nhất)
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Tổng tài xế</p>
                            <p className="text-3xl font-bold text-gray-800">{stats.totalDrivers}</p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-full">
                            <Users className="text-blue-600" size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Đánh giá TB</p>
                            <p className="text-3xl font-bold text-gray-800">{stats.avgRating}</p>
                        </div>
                        <div className="bg-yellow-100 p-3 rounded-full">
                            <Star className="text-yellow-600 fill-yellow-600" size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Xuất sắc</p>
                            <p className="text-3xl font-bold text-gray-800">{stats.topPerformers}</p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-full">
                            <Award className="text-green-600" size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Tổng đánh giá</p>
                            <p className="text-3xl font-bold text-gray-800">{stats.totalRatings}</p>
                        </div>
                        <div className="bg-purple-100 p-3 rounded-full">
                            <Calendar className="text-purple-600" size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Chi nhánh *
                        </label>
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">-- Chọn chi nhánh --</option>
                            {branches.map((branch) => (
                                <option key={branch.branchId} value={branch.branchId}>
                                    {branch.branchName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sắp xếp theo
                        </label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={!selectedBranch}
                        >
                            <option value="rating">Đánh giá cao nhất</option>
                            <option value="totalRatings">Nhiều đánh giá nhất</option>
                            <option value="name">Tên A-Z</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Drivers List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : !selectedBranch ? (
                    <div className="text-center py-12">
                        <Users className="mx-auto text-gray-300 mb-4" size={48} />
                        <p className="text-gray-500 text-lg">Vui lòng chọn chi nhánh để xem danh sách tài xế</p>
                    </div>
                ) : drivers.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="mx-auto text-gray-300 mb-4" size={48} />
                        <p className="text-gray-500 text-lg">Không có tài xế nào</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                        {drivers.map((driver, index) => {
                            const avgRating = driver.performance?.avgOverall || 0;
                            const badge = getRatingBadge(avgRating);

                            return (
                                <div
                                    key={driver.driverId}
                                    className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                                    onClick={() => navigate(`/ratings/driver/${driver.driverId}`)}
                                >
                                    {/* Rank Badge */}
                                    {index < 3 && sortBy === 'rating' && avgRating > 0 && (
                                        <div className="flex justify-end mb-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                                index === 1 ? 'bg-gray-100 text-gray-800' :
                                                    'bg-orange-100 text-orange-800'
                                            }`}>
                                                #{index + 1}
                                            </span>
                                        </div>
                                    )}

                                    {/* Driver Info */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                                            <Users className="text-blue-600" size={32} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-800 text-lg">
                                                {driver.fullName || 'N/A'}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                Mã: {driver.driverId}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Rating */}
                                    {driver.performance && driver.performance.totalRatings > 0 ? (
                                        <>
                                            <div className="flex items-center justify-between mb-3">
                                                <StarRating rating={avgRating} size={20} />
                                                <span className={`text-2xl font-bold ${getRatingColor(avgRating)}`}>
                                                    {avgRating.toFixed(1)}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between mb-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                                                    {badge.label}
                                                </span>
                                                <span className="text-sm text-gray-600">
                                                    {driver.performance.totalRatings} đánh giá
                                                </span>
                                            </div>

                                            {/* Criteria Mini Bars */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="w-16 text-gray-600">⏰ Đúng giờ</span>
                                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-blue-500 h-2 rounded-full"
                                                            style={{ width: `${(driver.performance.avgPunctuality / 5) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="w-8 text-right font-medium">
                                                        {parseFloat(driver.performance.avgPunctuality).toFixed(1)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="w-16 text-gray-600">😊 Thái độ</span>
                                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-green-500 h-2 rounded-full"
                                                            style={{ width: `${(driver.performance.avgAttitude / 5) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="w-8 text-right font-medium">
                                                        {parseFloat(driver.performance.avgAttitude).toFixed(1)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="w-16 text-gray-600">🛡️ An toàn</span>
                                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-yellow-500 h-2 rounded-full"
                                                            style={{ width: `${(driver.performance.avgSafety / 5) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="w-8 text-right font-medium">
                                                        {parseFloat(driver.performance.avgSafety).toFixed(1)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="w-16 text-gray-600">✅ Tuân thủ</span>
                                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-purple-500 h-2 rounded-full"
                                                            style={{ width: `${(driver.performance.avgCompliance / 5) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="w-8 text-right font-medium">
                                                        {parseFloat(driver.performance.avgCompliance).toFixed(1)}
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-4 text-gray-400">
                                            <Star size={32} className="mx-auto mb-2" />
                                            <p className="text-sm">Chưa có đánh giá</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverRatingDashboard;