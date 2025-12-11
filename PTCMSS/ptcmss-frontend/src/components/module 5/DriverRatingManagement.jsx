import { useState, useEffect } from 'react';
import { Star, Search, Filter, Calendar, User, MapPin, TrendingUp, Award } from 'lucide-react';
import RateDriverDialog from './RateDriverDialog';
import StarRating from '../common/StarRating';
import { getRatingByTrip } from '../../api/ratings';
import { searchTrips } from '../../api/dispatch';

const DriverRatingManagement = () => {
    const [trips, setTrips] = useState([]);
    const [filteredTrips, setFilteredTrips] = useState([]);
    const [branches, setBranches] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedDriver, setSelectedDriver] = useState('');
    const [filterStatus, setFilterStatus] = useState('pending'); // 'pending' | 'rated' | 'all'
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Dialog
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [showRatingDialog, setShowRatingDialog] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedBranch) {
            loadTrips();
        }
    }, [selectedBranch, selectedDriver, dateFrom, dateTo]);

    useEffect(() => {
        filterTrips();
    }, [trips, searchTerm, filterStatus]);

    const loadInitialData = async () => {
        try {
            // Load branches
            const branchResponse = await fetch('/api/branches');
            const branchData = await branchResponse.json();
            setBranches(branchData.data || []);

            // Load drivers
            const driverResponse = await fetch('/api/drivers');
            const driverData = await driverResponse.json();
            setDrivers(driverData.data || []);
        } catch (error) {
            console.error('Error loading initial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTrips = async () => {
        if (!selectedBranch) return;

        setLoading(true);
        try {
            const searchParams = {
                branchId: Number(selectedBranch),
                status: 'COMPLETED'
            };

            if (selectedDriver) {
                searchParams.driverId = Number(selectedDriver);
            }

            if (dateFrom) {
                searchParams.startDate = dateFrom;
            }

            if (dateTo) {
                searchParams.endDate = dateTo;
            }

            const response = await searchTrips(searchParams);
            const tripsData = response.data || [];

            // Check rating status for each trip
            const tripsWithRating = await Promise.all(
                tripsData.map(async (trip) => {
                    try {
                        const ratingResponse = await getRatingByTrip(trip.tripId);
                        return {
                            ...trip,
                            hasRating: !!ratingResponse.data,
                            rating: ratingResponse.data
                        };
                    } catch {
                        return {
                            ...trip,
                            hasRating: false,
                            rating: null
                        };
                    }
                })
            );

            setTrips(tripsWithRating);
        } catch (error) {
            console.error('Error loading trips:', error);
            setTrips([]);
        } finally {
            setLoading(false);
        }
    };

    const filterTrips = () => {
        let filtered = trips;

        // Filter by rating status
        if (filterStatus === 'pending') {
            filtered = filtered.filter(trip => !trip.hasRating);
        } else if (filterStatus === 'rated') {
            filtered = filtered.filter(trip => trip.hasRating);
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(trip =>
                trip.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                trip.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                trip.tripId?.toString().includes(searchTerm)
            );
        }

        setFilteredTrips(filtered);
    };

    const handleRateClick = (trip) => {
        setSelectedTrip(trip);
        setShowRatingDialog(true);
    };

    const handleRatingSuccess = () => {
        setShowRatingDialog(false);
        setSelectedTrip(null);
        loadTrips(); // Reload to update rating status
    };

    const getStatusBadge = (hasRating) => {
        if (hasRating) {
            return (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    ✓ Đã đánh giá
                </span>
            );
        }
        return (
            <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
                ⏳ Chưa đánh giá
            </span>
        );
    };

    const stats = {
        pending: trips.filter(t => !t.hasRating).length,
        rated: trips.filter(t => t.hasRating).length,
        total: trips.length,
        avgRating: trips.filter(t => t.hasRating).length > 0
            ? (trips.filter(t => t.hasRating).reduce((sum, t) => sum + (t.rating?.overallRating || 0), 0) / trips.filter(t => t.hasRating).length).toFixed(1)
            : 0
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Quản lý đánh giá tài xế
                </h1>
                <p className="text-gray-600">
                    Đánh giá hiệu suất tài xế sau các chuyến đã hoàn thành
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-primary-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Chưa đánh giá</p>
                            <p className="text-3xl font-bold text-gray-800">{stats.pending}</p>
                        </div>
                        <div className="bg-primary-100 p-3 rounded-full">
                            <Star className="text-primary-600" size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Đã đánh giá</p>
                            <p className="text-3xl font-bold text-gray-800">{stats.rated}</p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-full">
                            <Star className="text-green-600 fill-green-600" size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Tổng chuyến</p>
                            <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-full">
                            <Calendar className="text-blue-600" size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Đánh giá TB</p>
                            <p className="text-3xl font-bold text-gray-800">{stats.avgRating}</p>
                        </div>
                        <div className="bg-purple-100 p-3 rounded-full">
                            <Award className="text-purple-600" size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                    {/* Branch Filter */}
                    <div>
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

                    {/* Driver Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tài xế
                        </label>
                        <select
                            value={selectedDriver}
                            onChange={(e) => setSelectedDriver(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={!selectedBranch}
                        >
                            <option value="">Tất cả tài xế</option>
                            {drivers.map((driver) => (
                                <option key={driver.driverId} value={driver.driverId}>
                                    {driver.fullName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date From */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Từ ngày
                        </label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={!selectedBranch}
                        />
                    </div>

                    {/* Date To */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Đến ngày
                        </label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={!selectedBranch}
                        />
                    </div>

                    {/* Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tìm kiếm
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Tên, mã chuyến..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Status Filter Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterStatus('pending')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatus === 'pending'
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Chưa đánh giá ({stats.pending})
                    </button>
                    <button
                        onClick={() => setFilterStatus('rated')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatus === 'rated'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Đã đánh giá ({stats.rated})
                    </button>
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatus === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Tất cả ({stats.total})
                    </button>
                </div>
            </div>

            {/* Trips List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : !selectedBranch ? (
                    <div className="text-center py-12">
                        <Filter className="mx-auto text-gray-300 mb-4" size={48} />
                        <p className="text-gray-500 text-lg">Vui lòng chọn chi nhánh để xem danh sách chuyến</p>
                    </div>
                ) : filteredTrips.length === 0 ? (
                    <div className="text-center py-12">
                        <Star className="mx-auto text-gray-300 mb-4" size={48} />
                        <p className="text-gray-500 text-lg">Không có chuyến nào</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Chuyến
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Tài xế
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Khách hàng
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Tuyến đường
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Thời gian hoàn thành
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Trạng thái
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Đánh giá
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredTrips.map((trip) => (
                                    <tr key={trip.tripId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                #{trip.tripId}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                Đơn #{trip.bookingId}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <User className="text-blue-600" size={20} />
                                                </div>
                                                <div className="ml-3">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {trip.driverName || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {trip.customerName || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-2">
                                                <MapPin className="text-gray-400 flex-shrink-0 mt-0.5" size={16} />
                                                <div className="text-sm max-w-xs">
                                                    <div className="text-gray-900 truncate">
                                                        {trip.pickupLocation || trip.startLocation || 'N/A'}
                                                    </div>
                                                    <div className="text-gray-500 truncate">
                                                        → {trip.dropoffLocation || trip.endLocation || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {trip.endTime
                                                    ? new Date(trip.endTime).toLocaleDateString('vi-VN')
                                                    : 'N/A'
                                                }
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {trip.endTime
                                                    ? new Date(trip.endTime).toLocaleTimeString('vi-VN', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })
                                                    : ''
                                                }
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(trip.hasRating)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {trip.hasRating && trip.rating ? (
                                                <div className="flex items-center gap-2">
                                                    <StarRating rating={trip.rating.overallRating} size={16} />
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">Chưa có</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {!trip.hasRating && (
                                                <button
                                                    onClick={() => handleRateClick(trip)}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                                >
                                                    Đánh giá
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Rating Dialog */}
            {showRatingDialog && selectedTrip && (
                <RateDriverDialog
                    trip={selectedTrip}
                    onClose={() => {
                        setShowRatingDialog(false);
                        setSelectedTrip(null);
                    }}
                    onSuccess={handleRatingSuccess}
                />
            )}
        </div>
    );
};

export default DriverRatingManagement;
