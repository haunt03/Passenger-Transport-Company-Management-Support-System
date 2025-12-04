/**
 * Example: Tích hợp Performance vào Driver Detail Page
 *
 * File này là ví dụ minh họa cách tích hợp hiển thị hiệu suất tài xế
 * vào trang chi tiết tài xế.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DriverPerformance from './DriverPerformance';
import StarRating from '../common/StarRating';
import { User, Phone, Mail, Calendar, Award } from 'lucide-react';

const DriverDetailWithPerformance = () => {
    const { driverId } = useParams();
    const [driver, setDriver] = useState(null);
    const [activeTab, setActiveTab] = useState('info'); // 'info' or 'performance'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDriverDetail();
    }, [driverId]);

    const loadDriverDetail = async () => {
        setLoading(true);
        try {
            // Replace with your actual API call
            const response = await fetch(`/api/drivers/${driverId}`);
            const data = await response.json();
            setDriver(data.data);
        } catch (error) {
            console.error('Error loading driver:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8">Đang tải...</div>;
    }

    if (!driver) {
        return <div className="p-8">Không tìm thấy tài xế</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header Card */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                            <User size={40} className="text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">{driver.fullName}</h1>
                            <p className="text-gray-600">Mã tài xế: #{driver.driverId}</p>
                            <div className="mt-2">
                                <StarRating rating={driver.rating} size={20} />
                            </div>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${driver.status === 'Available' ? 'bg-green-100 text-green-800' :
                        driver.status === 'On_Trip' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                    }`}>
                        {driver.status}
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-md mb-6">
                <div className="border-b">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`px-6 py-3 font-medium transition-colors ${activeTab === 'info'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <User size={18} />
                                Thông tin
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('performance')}
                            className={`px-6 py-3 font-medium transition-colors ${activeTab === 'performance'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Award size={18} />
                                Hiệu suất
                            </div>
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'info' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                                        <Phone size={16} />
                                        <span className="text-sm">Số điện thoại</span>
                                    </div>
                                    <p className="font-medium">{driver.phone}</p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                                        <Mail size={16} />
                                        <span className="text-sm">Email</span>
                                    </div>
                                    <p className="font-medium">{driver.email}</p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                                        <Calendar size={16} />
                                        <span className="text-sm">Số GPLX</span>
                                    </div>
                                    <p className="font-medium">{driver.licenseNumber}</p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                                        <Calendar size={16} />
                                        <span className="text-sm">Hạng GPLX</span>
                                    </div>
                                    <p className="font-medium">{driver.licenseClass}</p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                                        <Calendar size={16} />
                                        <span className="text-sm">Ngày hết hạn GPLX</span>
                                    </div>
                                    <p className="font-medium">
                                        {driver.licenseExpiry
                                            ? new Date(driver.licenseExpiry).toLocaleDateString('vi-VN')
                                            : 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                                        <Award size={16} />
                                        <span className="text-sm">Chi nhánh</span>
                                    </div>
                                    <p className="font-medium">{driver.branchName}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'performance' && (
                        <DriverPerformance driverId={driver.driverId} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default DriverDetailWithPerformance;
