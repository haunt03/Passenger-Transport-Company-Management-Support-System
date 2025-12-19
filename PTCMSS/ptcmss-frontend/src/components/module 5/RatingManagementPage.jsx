import React, { useState, useEffect, useMemo } from 'react';
import { Star, Search, Filter, Calendar, User, MapPin, Phone } from 'lucide-react';
import RateDriverDialog from './RateDriverDialog';
import StarRating from '../common/StarRating';
import Pagination from '../common/Pagination';
import CustomerTripsModal from '../common/CustomerTripsModal';
import { getRatingByTrip, getCompletedTripsForRating } from '../../api/ratings';
import { getCustomer, getCustomerBookings } from '../../api/customers';
import { getBranchByUserId } from '../../api/branches';
import { getCurrentRole, getStoredUserId, ROLES } from '../../utils/session';

const RatingManagementPage = () => {
    const role = useMemo(() => getCurrentRole(), []);
    const userId = useMemo(() => getStoredUserId(), []);
    const isBranchScoped = role === ROLES.MANAGER || role === ROLES.COORDINATOR || role === ROLES.CONSULTANT;

    const [trips, setTrips] = useState([]);
    const [filteredTrips, setFilteredTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('pending'); // 'pending' | 'rated' | 'all'
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [showRatingDialog, setShowRatingDialog] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);

    // Branch state
    const [branchId, setBranchId] = useState(null);
    const [branchLoading, setBranchLoading] = useState(true);

    // Customer detail modal
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerDetail, setCustomerDetail] = useState(null);
    const [customerTrips, setCustomerTrips] = useState([]);
    const [loadingCustomerTrips, setLoadingCustomerTrips] = useState(false);
    const [customerTripsError, setCustomerTripsError] = useState(null);

    // Load branch for scoped users
    useEffect(() => {
        if (!isBranchScoped) {
            setBranchLoading(false);
            return;
        }
        if (!userId) {
            setBranchLoading(false);
            return;
        }

        let cancelled = false;
        async function loadBranch() {
            setBranchLoading(true);
            try {
                const resp = await getBranchByUserId(Number(userId));
                if (cancelled) return;

                // Try multiple possible response formats
                const id = resp?.branchId ?? resp?.id ?? resp?.data?.branchId ?? resp?.data?.id ?? null;

                if (id) {
                    setBranchId(id);
                }
            } catch (err) {
                console.error("[RatingManagementPage] Error loading branch:", err);
            } finally {
                if (!cancelled) setBranchLoading(false);
            }
        }
        loadBranch();
        return () => { cancelled = true; };
    }, [isBranchScoped, userId]);

    useEffect(() => {
        if (branchLoading) return;
        // Nếu là branch scoped nhưng chưa có branchId, đợi thêm
        if (isBranchScoped && !branchId) return;
        // Nếu không phải branch scoped hoặc đã có branchId, load trips
        loadTrips();
    }, [branchId, branchLoading, isBranchScoped]);

    useEffect(() => {
        filterTrips();
    }, [trips, searchTerm, filterStatus]);

    const loadTrips = async () => {
        setLoading(true);
        try {
            // Call real API to get completed trips with branchId filter if applicable
            const response = await getCompletedTripsForRating(isBranchScoped ? branchId : null);
            let tripsData = response.data || response || [];

            // Double-check: chỉ lấy trips COMPLETED (phòng trường hợp API trả về sai)
            tripsData = tripsData.filter(trip => trip.status === 'COMPLETED');

            // Check rating status for each trip
            const tripsWithRating = await Promise.all(
                tripsData.map(async (trip) => {
                    try {
                        const ratingResponse = await getRatingByTrip(trip.tripId);
                        // Handle different response formats
                        const ratingData = ratingResponse?.data ?? ratingResponse;
                        // Check if rating exists and has valid data
                        const hasRating = ratingData !== null &&
                            ratingData !== undefined &&
                            (ratingData.ratingId || ratingData.overallRating !== undefined);

                        if (hasRating) {
                            console.log(`Trip ${trip.tripId} has rating:`, ratingData);
                        }

                        return {
                            ...trip,
                            hasRating: hasRating,
                            rating: hasRating ? ratingData : null
                        };
                    } catch (err) {
                        console.error(`Error checking rating for trip ${trip.tripId}:`, err);
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
        setTotalPages(Math.ceil(filtered.length / pageSize));
        setCurrentPage(1); // Reset to first page when filtering
    };

    const handleRateClick = (trip) => {
        setSelectedTrip(trip);
        setShowRatingDialog(true);
    };

    const handleRatingSuccess = () => {
        setShowRatingDialog(false);
        setSelectedTrip(null);
        // Delay nhỏ để đảm bảo backend đã lưu xong
        setTimeout(() => {
            loadTrips(); // Reload to update rating status
        }, 500);
    };

    // Handle customer click to show detail modal
    const handleCustomerClick = async (trip) => {
        const customerId = trip.customerId;
        if (!customerId) {
            console.warn('No customerId found in trip:', trip);
            return;
        }

        setSelectedCustomer(trip);
        setLoadingCustomerTrips(true);
        setCustomerTripsError(null);
        setCustomerDetail(null);
        setCustomerTrips([]);

        try {
            // Fetch customer detail
            const customerResponse = await getCustomer(customerId);
            const customerData = customerResponse?.data || customerResponse;
            setCustomerDetail(customerData);

            // Fetch customer bookings/trips
            const bookingsResponse = await getCustomerBookings(customerId, { page: 0, size: 100 });
            const bookingsData = bookingsResponse?.data || bookingsResponse || {};
            const bookings = bookingsData?.content || bookingsData?.items || (Array.isArray(bookingsData) ? bookingsData : []);

            // Extract all trips from bookings
            const allTrips = [];
            for (const booking of bookings) {
                const trips = Array.isArray(booking.trips) ? booking.trips : [];
                for (const tripItem of trips) {
                    allTrips.push({
                        ...tripItem,
                        bookingId: booking.id || booking.bookingId,
                        bookingCode: booking.code || booking.bookingCode,
                        bookingStatus: booking.status,
                        bookingCreatedAt: booking.createdAt,
                    });
                }
            }

            // Fetch ratings for each trip
            const tripsWithRatings = await Promise.all(
                allTrips.map(async (tripItem) => {
                    const tripId = tripItem.id || tripItem.tripId;
                    if (!tripId) return { ...tripItem, rating: null };

                    try {
                        const ratingResponse = await getRatingByTrip(tripId);
                        const rating = ratingResponse?.data || ratingResponse || null;
                        return { ...tripItem, rating };
                    } catch (err) {
                        return { ...tripItem, rating: null };
                    }
                })
            );

            // Sort by date (newest first)
            tripsWithRatings.sort((a, b) => {
                const dateA = a.pickup_time || a.dropoff_eta || a.bookingCreatedAt || "";
                const dateB = b.pickup_time || b.dropoff_eta || b.bookingCreatedAt || "";
                return new Date(dateB) - new Date(dateA);
            });

            setCustomerTrips(tripsWithRatings);
        } catch (err) {
            console.error('Error fetching customer detail:', err);
            setCustomerTripsError('Không thể tải thông tin khách hàng');
        } finally {
            setLoadingCustomerTrips(false);
        }
    };

    const handleCloseCustomerModal = () => {
        setSelectedCustomer(null);
        setCustomerDetail(null);
        setCustomerTrips([]);
        setCustomerTripsError(null);
    };

    const getStatusBadge = (hasRating) => {
        if (hasRating) {
            return (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    Đã đánh giá
                </span>
            );
        }
        return (
            <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
                Chưa đánh giá
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Đánh giá tài xế</h1>
                <p className="text-gray-600">Đánh giá hiệu suất tài xế sau các chuyến hoàn thành</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-primary-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Chưa đánh giá</p>
                            <p className="text-3xl font-bold text-gray-800">
                                {trips.filter(t => !t.hasRating).length}
                            </p>
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
                            <p className="text-3xl font-bold text-gray-800">
                                {trips.filter(t => t.hasRating).length}
                            </p>
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
                            <p className="text-3xl font-bold text-gray-800">{trips.length}</p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-full">
                            <Calendar className="text-blue-600" size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Tìm theo tên tài xế, khách hàng, mã chuyến..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilterStatus('pending')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatus === 'pending'
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Chưa đánh giá
                        </button>
                        <button
                            onClick={() => setFilterStatus('rated')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatus === 'rated'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Đã đánh giá
                        </button>
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterStatus === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Tất cả
                        </button>
                    </div>
                </div>
            </div>

            {/* Trips List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {filteredTrips.length === 0 ? (
                    <div className="text-center py-12">
                        <Star className="mx-auto text-gray-300 mb-4" size={48} />
                        <p className="text-gray-500 text-lg">Không có chuyến nào</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full table-fixed">
                            <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Chuyến
                                </th>
                                <th className="w-40 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tài xế
                                </th>
                                <th className="w-48 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Khách hàng
                                </th>
                                <th className="w-56 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tuyến đường
                                </th>
                                <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Thời gian
                                </th>
                                <th className="w-28 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Trạng thái
                                </th>
                                <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Đánh giá
                                </th>
                                <th className="w-32 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Thao tác
                                </th>
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTrips.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((trip) => (
                                <tr key={trip.tripId} className="hover:bg-gray-50 align-top">
                                    <td className="px-4 py-4">
                                        <div className="text-sm font-medium text-gray-900">#{trip.tripId}</div>
                                        <div className="text-sm text-gray-500">Đơn #{trip.bookingId}</div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                <User className="text-blue-600" size={20} />
                                            </div>
                                            <div className="ml-3">
                                                <div className="text-sm font-medium text-gray-900 truncate">{trip.driverName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div
                                            className="text-sm text-gray-900 cursor-pointer hover:text-blue-600 hover:underline transition-colors"
                                            onClick={() => handleCustomerClick(trip)}
                                            title="Click để xem chi tiết khách hàng"
                                        >
                                            <div className="font-medium">{trip.customerName}</div>
                                            {trip.customerPhone && (
                                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                                    <Phone className="h-3 w-3" />
                                                    <span className="font-mono">{trip.customerPhone}</span>
                                                </div>
                                            )}
                                            {trip.customerAddress && (
                                                <div className="text-xs text-gray-500 mt-1 line-clamp-2" title={trip.customerAddress}>
                                                    {trip.customerAddress}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-start gap-2">
                                            <MapPin className="text-gray-400 flex-shrink-0 mt-0.5" size={16} />
                                            <div className="text-sm min-w-0">
                                                <div className="text-gray-900 line-clamp-2" title={trip.startLocation}>
                                                    {trip.startLocation}
                                                </div>
                                                <div className="text-gray-500 line-clamp-2 mt-1" title={trip.endLocation}>
                                                    → {trip.endLocation}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="text-sm text-gray-900 whitespace-nowrap">
                                            {new Date(trip.endTime).toLocaleDateString('vi-VN')}
                                        </div>
                                        <div className="text-sm text-gray-500 whitespace-nowrap">
                                            {new Date(trip.endTime).toLocaleTimeString('vi-VN', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        {trip.status === 'COMPLETED' ? (
                                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                                    Hoàn thành
                                                </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                                    {trip.status || 'N/A'}
                                                </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        {trip.hasRating && trip.rating ? (
                                            (() => {
                                                // Lấy overallRating, nếu không có thì tính từ các rating khác
                                                let overallRating = trip.rating.overallRating;
                                                if (overallRating === null || overallRating === undefined) {
                                                    // Tính trung bình từ 4 tiêu chí
                                                    const ratings = [
                                                        trip.rating.punctualityRating,
                                                        trip.rating.attitudeRating,
                                                        trip.rating.safetyRating,
                                                        trip.rating.complianceRating
                                                    ].filter(r => r !== null && r !== undefined);
                                                    if (ratings.length > 0) {
                                                        overallRating = ratings.reduce((sum, r) => sum + Number(r), 0) / ratings.length;
                                                    }
                                                }
                                                const ratingValue = overallRating !== null && overallRating !== undefined
                                                    ? Number(overallRating)
                                                    : 0;
                                                return ratingValue > 0 ? (
                                                    <StarRating
                                                        rating={ratingValue}
                                                        size={16}
                                                    />
                                                ) : (
                                                    <span className="text-sm text-gray-400">Đang tính...</span>
                                                );
                                            })()
                                        ) : (
                                            <span className="text-sm text-gray-400">Chưa có</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        {trip.hasRating ? (
                                            <button
                                                onClick={() => handleRateClick(trip)}
                                                className="text-blue-600 hover:text-blue-900 text-sm font-medium whitespace-nowrap"
                                            >
                                                Xem chi tiết
                                            </button>
                                        ) : trip.status === 'COMPLETED' ? (
                                            <button
                                                onClick={() => handleRateClick(trip)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                                            >
                                                Đánh giá
                                            </button>
                                        ) : (
                                            <span className="text-sm text-gray-400">
                                                    Chưa hoàn thành
                                                </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-6">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}

            {/* Rating Dialog */}
            {showRatingDialog && selectedTrip && (
                <RateDriverDialog
                    trip={selectedTrip}
                    existingRating={selectedTrip.hasRating ? selectedTrip.rating : null}
                    onClose={() => {
                        setShowRatingDialog(false);
                        setSelectedTrip(null);
                    }}
                    onSuccess={handleRatingSuccess}
                />
            )}

            {/* Customer Detail Modal */}
            {selectedCustomer && (
                <CustomerTripsModal
                    customer={customerDetail || {
                        fullName: selectedCustomer.customerName,
                        customerName: selectedCustomer.customerName,
                        phone: selectedCustomer.customerPhone,
                        email: null,
                        address: selectedCustomer.customerAddress,
                        branchName: null
                    }}
                    trips={customerTrips}
                    loading={loadingCustomerTrips}
                    error={customerTripsError}
                    onClose={handleCloseCustomerModal}
                />
            )}
        </div>
    );
};

export default RatingManagementPage;
