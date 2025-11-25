import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Award, Calendar, MessageSquare, Star, Filter } from 'lucide-react';
import DriverPerformance from './DriverPerformance';
import StarRating from '../common/StarRating';
import { getDriverRatings, createRating, getRatingByTrip } from '../../api/ratings';
import { searchTrips } from '../../api/dispatch';

const DriverRatingsPage = () => {
    const { driverId } = useParams();
    const navigate = useNavigate();
    const [driver, setDriver] = useState(null);
    const [ratings, setRatings] = useState([]);
    const [trips, setTrips] = useState([]);
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [ratingForm, setRatingForm] = useState({
        punctualityRating: 5,
        attitudeRating: 5,
        safetyRating: 5,
        complianceRating: 5,
        comment: ''
    });

    useEffect(() => {
        loadDriverData();
        loadBranches();
    }, [driverId]);

    useEffect(() => {
        if (selectedBranch) {
            loadTrips();
        }
    }, [selectedBranch, driverId]);

    const loadBranches = async () => {
        try {
            const response = await fetch('/api/branches');
            const data = await response.json();
            console.log('Branches response:', data);
            setBranches(data.data || data || []);
        } catch (error) {
            console.error('Error loading branches:', error);
        }
    };

    const loadDriverData = async () => {
        setLoading(true);
        try {
            // Load driver info
            const driverResponse = await fetch(`/api/drivers/${driverId}`);
            const driverData = await driverResponse.json();
            console.log('Driver response:', driverData);
            setDriver(driverData.data || driverData);

            // Load ratings
            const ratingsResponse = await getDriverRatings(driverId);
            console.log('Ratings response:', ratingsResponse);
            setRatings(ratingsResponse || []);
        } catch (error) {
            console.error('Error loading driver data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTrips = async () => {
        try {
            const response = await searchTrips({
                driverId: Number(driverId),
                branchId: Number(selectedBranch),
                status: 'COMPLETED'
            });

            console.log('Trips response:', response);
            const tripsData = response || [];

            // Check rating status for each trip
            const tripsWithRating = await Promise.all(
                tripsData.map(async (trip) => {
                    try {
                        const ratingResponse = await getRatingByTrip(trip.tripId);
                        return {
                            ...trip,
                            hasRating: !!ratingResponse
                        };
                    } catch {
                        return {
                            ...trip,
                            hasRating: false
                        };
                    }
                })
            );

            console.log('Trips with rating:', tripsWithRating);
            setTrips(tripsWithRating);
        } catch (error) {
            console.error('Error loading trips:', error);
            setTrips([]);
        }
    };

    const handleRateTrip = (trip) => {
        setSelectedTrip(trip);
        setRatingForm({
            punctualityRating: 5,
            attitudeRating: 5,
            safetyRating: 5,
            complianceRating: 5,
            comment: ''
        });
        setShowRatingModal(true);
    };

    const handleSubmitRating = async () => {
        if (!selectedTrip) return;

        try {
            // Backend sẽ tự tính overallRating, không cần gửi
            // Backend sẽ tự lấy driverId từ trip, không cần gửi
            await createRating({
                tripId: selectedTrip.tripId,
                punctualityRating: ratingForm.punctualityRating,
                attitudeRating: ratingForm.attitudeRating,
                safetyRating: ratingForm.safetyRating,
                complianceRating: ratingForm.complianceRating,
                comment: ratingForm.comment || null
            });

            alert('Đánh giá thành công!');
            setShowRatingModal(false);
            loadDriverData();
            loadTrips();
        } catch (error) {
            console.error('Error submitting rating:', error);
            alert('Có lỗi xảy ra khi đánh giá. Vui lòng thử lại.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!driver) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <p className="text-gray-500 text-lg mb-4">Không tìm thấy tài xế</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Quay lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
            >
                <ArrowLeft size={20} />
                <span>Quay lại</span>
            </button>

            {/* Driver Header */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                            <User size={40} className="text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">{driver.fullName}</h1>
                            <p className="text-gray-600">Mã tài xế: #{driver.driverId}</p>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone size={16} />
                                    <span>{driver.phone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Award size={16} />
                                    <span>GPLX: {driver.licenseNumber}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-600 mb-2">Đánh giá trung bình</p>
                        <StarRating rating={driver.rating} size={24} />
                    </div>
                </div>
            </div>

            {/* Performance Section */}
            <div className="mb-6">
                <DriverPerformance driverId={driverId} />
            </div>

            {/* Branch Filter & Trips Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Filter size={24} />
                        Danh sách chuyến đi
                    </h2>
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Chi nhánh:</label>
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">-- Chọn chi nhánh --</option>
                            {branches.map((branch) => (
                                <option key={branch.branchId} value={branch.branchId}>
                                    {branch.branchName}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {!selectedBranch ? (
                    <div className="text-center py-12">
                        <Filter className="mx-auto text-gray-300 mb-4" size={48} />
                        <p className="text-gray-500">Vui lòng chọn chi nhánh để xem danh sách chuyến đi</p>
                    </div>
                ) : trips.length === 0 ? (
                    <div className="text-center py-12">
                        <MessageSquare className="mx-auto text-gray-300 mb-4" size={48} />
                        <p className="text-gray-500">Không có chuyến đi nào đã hoàn thành</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Mã chuyến
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Khách hàng
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Điểm đi - Điểm đến
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Thời gian
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Trạng thái đánh giá
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Thao tác
                                </th>
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {trips.map((trip) => (
                                <tr key={trip.tripId} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        #{trip.tripId}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {trip.customerName || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">
                                        <div className="max-w-xs">
                                            <div className="truncate">{trip.pickupLocation || 'N/A'}</div>
                                            <div className="text-gray-500">→ {trip.dropoffLocation || 'N/A'}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {trip.pickupTime ? new Date(trip.pickupTime).toLocaleString('vi-VN') : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {trip.hasRating ? (
                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                    Đã đánh giá
                                                </span>
                                        ) : (
                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                    Chưa đánh giá
                                                </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {!trip.hasRating && (
                                            <button
                                                onClick={() => handleRateTrip(trip)}
                                                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                            >
                                                <Star size={16} />
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

            {/* All Ratings List */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <MessageSquare size={24} />
                    Tất cả đánh giá ({ratings.length})
                </h2>

                {ratings.length === 0 ? (
                    <div className="text-center py-12">
                        <MessageSquare className="mx-auto text-gray-300 mb-4" size={48} />
                        <p className="text-gray-500">Chưa có đánh giá nào</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {ratings.map((rating) => (
                            <div
                                key={rating.ratingId}
                                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-gray-800">
                                                Chuyến #{rating.tripId}
                                            </span>
                                            {rating.customerName && (
                                                <>
                                                    <span className="text-gray-400">•</span>
                                                    <span className="text-gray-600">{rating.customerName}</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Calendar size={14} />
                                            <span>{new Date(rating.ratedAt).toLocaleString('vi-VN')}</span>
                                            {rating.ratedByName && (
                                                <>
                                                    <span>•</span>
                                                    <span>Đánh giá bởi: {rating.ratedByName}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StarRating rating={rating.overallRating} size={18} />
                                    </div>
                                </div>

                                {/* Rating Breakdown */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                    <div className="bg-gray-50 rounded p-2">
                                        <p className="text-xs text-gray-600 mb-1">⏰ Đúng giờ</p>
                                        <StarRating rating={rating.punctualityRating} size={14} showValue={false} />
                                    </div>
                                    <div className="bg-gray-50 rounded p-2">
                                        <p className="text-xs text-gray-600 mb-1">😊 Thái độ</p>
                                        <StarRating rating={rating.attitudeRating} size={14} showValue={false} />
                                    </div>
                                    <div className="bg-gray-50 rounded p-2">
                                        <p className="text-xs text-gray-600 mb-1">🛡️ An toàn</p>
                                        <StarRating rating={rating.safetyRating} size={14} showValue={false} />
                                    </div>
                                    <div className="bg-gray-50 rounded p-2">
                                        <p className="text-xs text-gray-600 mb-1">✅ Tuân thủ</p>
                                        <StarRating rating={rating.complianceRating} size={14} showValue={false} />
                                    </div>
                                </div>

                                {/* Comment */}
                                {rating.comment && (
                                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                                        <p className="text-sm text-gray-700 italic">"{rating.comment}"</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Rating Modal */}
            {showRatingModal && selectedTrip && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-gray-800">
                                    Đánh giá chuyến #{selectedTrip.tripId}
                                </h3>
                                <button
                                    onClick={() => setShowRatingModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Trip Info */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-600">Khách hàng:</span>
                                        <span className="ml-2 font-medium">{selectedTrip.customerName || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Thời gian:</span>
                                        <span className="ml-2 font-medium">
                                            {selectedTrip.pickupTime ? new Date(selectedTrip.pickupTime).toLocaleString('vi-VN') : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-gray-600">Tuyến đường:</span>
                                        <span className="ml-2 font-medium">
                                            {selectedTrip.pickupLocation} → {selectedTrip.dropoffLocation}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Rating Form */}
                            <div className="space-y-6">
                                {/* Punctuality */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        ⏰ Đúng giờ
                                    </label>
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                onClick={() => setRatingForm({ ...ratingForm, punctualityRating: star })}
                                                className="focus:outline-none"
                                            >
                                                <Star
                                                    size={32}
                                                    className={star <= ratingForm.punctualityRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                                                />
                                            </button>
                                        ))}
                                        <span className="ml-2 text-gray-600">{ratingForm.punctualityRating}/5</span>
                                    </div>
                                </div>

                                {/* Attitude */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        😊 Thái độ phục vụ
                                    </label>
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                onClick={() => setRatingForm({ ...ratingForm, attitudeRating: star })}
                                                className="focus:outline-none"
                                            >
                                                <Star
                                                    size={32}
                                                    className={star <= ratingForm.attitudeRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                                                />
                                            </button>
                                        ))}
                                        <span className="ml-2 text-gray-600">{ratingForm.attitudeRating}/5</span>
                                    </div>
                                </div>

                                {/* Safety */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        🛡️ An toàn lái xe
                                    </label>
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                onClick={() => setRatingForm({ ...ratingForm, safetyRating: star })}
                                                className="focus:outline-none"
                                            >
                                                <Star
                                                    size={32}
                                                    className={star <= ratingForm.safetyRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                                                />
                                            </button>
                                        ))}
                                        <span className="ml-2 text-gray-600">{ratingForm.safetyRating}/5</span>
                                    </div>
                                </div>

                                {/* Compliance */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        ✅ Tuân thủ quy định
                                    </label>
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                onClick={() => setRatingForm({ ...ratingForm, complianceRating: star })}
                                                className="focus:outline-none"
                                            >
                                                <Star
                                                    size={32}
                                                    className={star <= ratingForm.complianceRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                                                />
                                            </button>
                                        ))}
                                        <span className="ml-2 text-gray-600">{ratingForm.complianceRating}/5</span>
                                    </div>
                                </div>

                                {/* Comment */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        💬 Nhận xét
                                    </label>
                                    <textarea
                                        value={ratingForm.comment}
                                        onChange={(e) => setRatingForm({ ...ratingForm, comment: e.target.value })}
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Nhập nhận xét của bạn về tài xế..."
                                    />
                                </div>

                                {/* Overall Rating Preview */}
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">Đánh giá tổng thể:</span>
                                        <div className="flex items-center gap-2">
                                            <StarRating
                                                rating={(ratingForm.punctualityRating + ratingForm.attitudeRating + ratingForm.safetyRating + ratingForm.complianceRating) / 4}
                                                size={20}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowRatingModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSubmitRating}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Gửi đánh giá
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverRatingsPage;