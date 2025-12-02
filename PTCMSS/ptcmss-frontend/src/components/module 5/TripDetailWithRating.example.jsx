/**
 * Example: Tích hợp Rating vào Trip Detail Page
 *
 * File này là ví dụ minh họa cách tích hợp chức năng đánh giá tài xế
 * vào trang chi tiết chuyến đi.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TripRatingButton from './TripRatingButton';
import StarRating from '../common/StarRating';

const TripDetailWithRating = () => {
    const { tripId } = useParams();
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTripDetail();
    }, [tripId]);

    const loadTripDetail = async () => {
        setLoading(true);
        try {
            // Replace with your actual API call
            const response = await fetch(`/api/trips/${tripId}`);
            const data = await response.json();
            setTrip(data.data);
        } catch (error) {
            console.error('Error loading trip:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8">Đang tải...</div>;
    }

    if (!trip) {
        return <div className="p-8">Không tìm thấy chuyến</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-gray-800">
                        Chi tiết chuyến #{trip.tripId}
                    </h1>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${trip.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            trip.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                        }`}>
                        {trip.status}
                    </span>
                </div>

                {/* Trip Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <p className="text-sm text-gray-600">Điểm đi</p>
                        <p className="font-medium">{trip.startLocation}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Điểm đến</p>
                        <p className="font-medium">{trip.endLocation}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Thời gian bắt đầu</p>
                        <p className="font-medium">
                            {new Date(trip.startTime).toLocaleString('vi-VN')}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Thời gian kết thúc</p>
                        <p className="font-medium">
                            {trip.endTime ? new Date(trip.endTime).toLocaleString('vi-VN') : 'Chưa kết thúc'}
                        </p>
                    </div>
                </div>

                {/* Driver Info */}
                <div className="border-t pt-4 mb-6">
                    <h3 className="font-semibold text-gray-800 mb-3">Thông tin tài xế</h3>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">{trip.driverName}</p>
                            <p className="text-sm text-gray-600">SĐT: {trip.driverPhone}</p>
                        </div>
                        {trip.driverRating && (
                            <StarRating rating={trip.driverRating} size={18} />
                        )}
                    </div>
                </div>

                {/* Rating Button - Chỉ hiện khi trip COMPLETED */}
                <div className="border-t pt-4">
                    <TripRatingButton
                        trip={trip}
                        onRatingComplete={() => {
                            // Reload trip data to show updated rating
                            loadTripDetail();
                            // Or show success message
                            alert('Cảm ơn bạn đã đánh giá!');
                        }}
                    />
                </div>
            </div>

            {/* Additional trip details... */}
        </div>
    );
};

export default TripDetailWithRating;
