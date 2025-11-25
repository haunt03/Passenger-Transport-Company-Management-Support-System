import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, AlertTriangle, ArrowLeft, Mail } from 'lucide-react';

export default function VerificationErrorPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const message = searchParams.get('message') || 'Xác thực không thành công';

    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-orange-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                    {/* Error Icon */}
                    <div className="mb-6 flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-rose-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
                            <div className="relative bg-gradient-to-br from-rose-400 to-rose-600 rounded-full p-4">
                                <XCircle className="h-16 w-16 text-white" strokeWidth={2.5} />
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">
                        Xác thực không thành công
                    </h1>

                    {/* Error Message */}
                    <p className="text-gray-600 mb-6 leading-relaxed">
                        {message.replace(/\+/g, ' ')}
                    </p>

                    {/* Common Issues */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
                        <div className="flex items-start gap-3 mb-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm font-medium text-amber-900">
                                Các nguyên nhân thường gặp:
                            </p>
                        </div>
                        <ul className="text-xs text-amber-800 space-y-2 ml-8">
                            <li>• Link xác thực đã hết hạn (thường là 24 giờ)</li>
                            <li>• Link đã được sử dụng trước đó</li>
                            <li>• Link bị sai hoặc không đầy đủ</li>
                            <li>• Tài khoản đã được xác thực rồi</li>
                        </ul>
                    </div>

                    {/* What to do */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                        <p className="text-sm font-medium text-blue-900 mb-2">
                            Bạn có thể làm gì?
                        </p>
                        <ul className="text-xs text-blue-700 space-y-2">
                            <li>• Liên hệ với quản trị viên để được gửi lại email xác thực</li>
                            <li>• Kiểm tra xem tài khoản đã được kích hoạt chưa bằng cách thử đăng nhập</li>
                            <li>• Đảm bảo bạn click vào link mới nhất trong email</li>
                        </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>Về trang đăng nhập</span>
                        </button>

                        <button
                            onClick={() => window.location.href = 'mailto:support@transpomanager.com'}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            <Mail className="h-4 w-4" />
                            <span>Liên hệ hỗ trợ</span>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    © 2025 TranspoManager. All rights reserved.
                </p>
            </div>
        </div>
    );
}