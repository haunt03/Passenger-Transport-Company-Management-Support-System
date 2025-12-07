import { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import { createRating } from '../../api/ratings';

const RateDriverDialog = ({ trip, onClose, onSuccess, existingRating = null }) => {
    const isReadOnly = existingRating !== null && existingRating !== undefined;

    const [ratings, setRatings] = useState({
        punctualityRating: 5,
        attitudeRating: 5,
        safetyRating: 5,
        complianceRating: 5,
    });
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Load existing rating if provided
    useEffect(() => {
        if (isReadOnly && existingRating) {
            setRatings({
                punctualityRating: existingRating.punctualityRating || 0,
                attitudeRating: existingRating.attitudeRating || 0,
                safetyRating: existingRating.safetyRating || 0,
                complianceRating: existingRating.complianceRating || 0,
            });
            setComment(existingRating.comment || '');
        }
    }, [existingRating, isReadOnly]);

    const criteria = [
        { key: 'punctualityRating', label: 'Đúng giờ', icon: '⏰' },
        { key: 'attitudeRating', label: 'Thái độ', icon: '😊' },
        { key: 'safetyRating', label: 'An toàn', icon: '🛡️' },
        { key: 'complianceRating', label: 'Tuân thủ quy trình', icon: '✅' },
    ];

    const handleStarClick = (criteriaKey, value) => {
        if (isReadOnly) return; // Disable in read-only mode
        setRatings(prev => ({ ...prev, [criteriaKey]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate all ratings are provided
        const allRated = Object.values(ratings).every(r => r > 0);
        if (!allRated) {
            setError('Vui lòng đánh giá tất cả các tiêu chí');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Backend sẽ tự tính overallRating, không cần gửi
            // Backend sẽ tự lấy driverId từ trip, không cần gửi
            await createRating({
                tripId: trip.tripId,
                punctualityRating: ratings.punctualityRating,
                attitudeRating: ratings.attitudeRating,
                safetyRating: ratings.safetyRating,
                complianceRating: ratings.complianceRating,
                comment: comment.trim() || null,
            });

            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Error submitting rating:', err);
            // Nếu trip đã được đánh giá rồi, reload lại để cập nhật UI
            if (err.message?.includes('already rated') || err.data?.message?.includes('already rated')) {
                setError('Chuyến này đã được đánh giá rồi. Đang cập nhật...');
                // Reload sau 1 giây để cập nhật UI
                setTimeout(() => {
                    onSuccess?.();
                    onClose();
                }, 1000);
            } else {
                setError(err.message || err.data?.message || 'Không thể gửi đánh giá');
            }
        } finally {
            setLoading(false);
        }
    };

    const StarRating = ({ value, onChange, readOnly = false }) => {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => !readOnly && onChange(star)}
                        disabled={readOnly}
                        className={`focus:outline-none transition-transform ${readOnly ? 'cursor-default' : 'hover:scale-110'}`}
                    >
                        <Star
                            size={28}
                            className={star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                        />
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            {isReadOnly ? 'Chi tiết đánh giá' : 'Đánh giá tài xế'}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Chuyến #{trip.tripId} - {trip.driverName || 'Tài xế'}
                        </p>
                        {trip.customerName && (
                            <p className="text-xs text-gray-500 mt-1">
                                Khách hàng: {trip.customerName}
                            </p>
                        )}
                        {trip.customerPhone && (
                            <p className="text-xs text-gray-500 mt-0.5">
                                SĐT khách: {trip.customerPhone}
                            </p>
                        )}
                        {isReadOnly && existingRating?.ratedAt && (
                            <p className="text-xs text-gray-400 mt-1">
                                Đánh giá vào: {new Date(existingRating.ratedAt).toLocaleString('vi-VN')}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={isReadOnly ? (e) => { e.preventDefault(); onClose(); } : handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Rating Criteria */}
                    <div className="space-y-6 mb-6">
                        {criteria.map(({ key, label, icon }) => (
                            <div key={key} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{icon}</span>
                                    <span className="font-medium text-gray-700">{label}</span>
                                </div>
                                <StarRating
                                    value={ratings[key]}
                                    onChange={(value) => handleStarClick(key, value)}
                                    readOnly={isReadOnly}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Overall Rating Preview */}
                    <div className="bg-blue-50 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Đánh giá tổng thể:</span>
                            <div className="flex items-center gap-2">
                                <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            size={20}
                                            className={
                                                star <= ((ratings.punctualityRating + ratings.attitudeRating + ratings.safetyRating + ratings.complianceRating) / 4)
                                                    ? 'fill-yellow-400 text-yellow-400'
                                                    : 'text-gray-300'
                                            }
                                        />
                                    ))}
                                </div>
                                <span className="font-bold text-gray-800">
                                    {((ratings.punctualityRating + ratings.attitudeRating + ratings.safetyRating + ratings.complianceRating) / 4).toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Comment */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            💬 Nhận xét {!isReadOnly && '(tùy chọn)'}
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => !isReadOnly && setComment(e.target.value)}
                            disabled={isReadOnly}
                            rows={4}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${
                                isReadOnly
                                    ? 'bg-gray-50 text-gray-600 cursor-not-allowed'
                                    : 'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                            }`}
                            placeholder={isReadOnly ? 'Không có nhận xét' : "Chia sẻ trải nghiệm của bạn về chuyến đi..."}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-end">
                        {isReadOnly ? (
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Đóng
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                    disabled={loading}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Đang gửi...' : 'Gửi đánh giá'}
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RateDriverDialog;