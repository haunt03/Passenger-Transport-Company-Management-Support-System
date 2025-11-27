import React, { useState, useEffect } from 'react';
import { Star, TrendingUp, Award, Calendar } from 'lucide-react';
import { getDriverPerformance } from '../../api/ratings';

const DriverPerformance = ({ driverId }) => {
    const [performance, setPerformance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => {
        loadPerformance();
    }, [driverId, days]);

    const loadPerformance = async () => {
        setLoading(true);
        try {
            const response = await getDriverPerformance(driverId, days);
            setPerformance(response.data);
        } catch (error) {
            console.error('Error loading performance:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderStars = (rating) => {
        const value = parseFloat(rating) || 0;
        return (
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        size={16}
                        className={star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                    />
                ))}
                <span className="ml-2 text-sm font-semibold text-gray-700">
                    {value.toFixed(1)}
                </span>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!performance) {
        return (
            <div className="text-center p-8 text-gray-500">
                Không có dữ liệu đánh giá
            </div>
        );
    }

    const criteria = [
        { key: 'avgPunctuality', label: 'Đúng giờ', icon: '⏰', color: 'blue' },
        { key: 'avgAttitude', label: 'Thái độ', icon: '😊', color: 'green' },
        { key: 'avgSafety', label: 'An toàn', icon: '🛡️', color: 'yellow' },
        { key: 'avgCompliance', label: 'Tuân thủ', icon: '✅', color: 'purple' },
    ];

    return (
        <div className="space-y-6">
            {/* Header with Period Selector */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Award className="text-blue-600" size={24} />
                    <h3 className="text-xl font-bold text-gray-800">Hiệu suất tài xế</h3>
                </div>
                <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                    <option value={7}>7 ngày</option>
                    <option value={30}>30 ngày</option>
                    <option value={90}>90 ngày</option>
                </select>
            </div>

            {/* Overall Rating Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-blue-600 font-medium mb-1">Đánh giá tổng thể</p>
                        <div className="flex items-center gap-3">
                            <span className="text-4xl font-bold text-blue-900">
                                {parseFloat(performance.avgOverall || 0).toFixed(1)}
                            </span>
                            <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        size={24}
                                        className={
                                            star <= (performance.avgOverall || 0)
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-gray-300'
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-blue-600 mb-1">Tổng đánh giá</p>
                        <p className="text-3xl font-bold text-blue-900">{performance.totalRatings}</p>
                    </div>
                </div>
            </div>

            {/* Criteria Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {criteria.map(({ key, label, icon }) => (
                    <div key={key} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">{icon}</span>
                            <span className="font-medium text-gray-700">{label}</span>
                        </div>
                        {renderStars(performance[key])}
                    </div>
                ))}
            </div>

            {/* Recent Ratings */}
            {performance.recentRatings && performance.recentRatings.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Calendar size={20} />
                        Đánh giá gần đây
                    </h4>
                    <div className="space-y-4">
                        {performance.recentRatings.map((rating) => (
                            <div key={rating.ratingId} className="border-b border-gray-100 pb-4 last:border-0">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="text-sm text-gray-600">
                                            Chuyến #{rating.tripId}
                                            {rating.customerName && ` - ${rating.customerName}`}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {new Date(rating.ratedAt).toLocaleDateString('vi-VN')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Star size={16} className="fill-yellow-400 text-yellow-400" />
                                        <span className="font-semibold text-gray-700">
                                            {parseFloat(rating.overallRating).toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                                {rating.comment && (
                                    <p className="text-sm text-gray-600 italic">"{rating.comment}"</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverPerformance;
