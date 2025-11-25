import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Mail, ArrowRight } from 'lucide-react';

export default function VerificationSuccessPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [countdown, setCountdown] = useState(10);
    const message = searchParams.get('message') || 'Xác thực thành công';

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/login');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                    {/* Success Icon */}
                    <div className="mb-6 flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
                            <div className="relative bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full p-4">
                                <CheckCircle className="h-16 w-16 text-white" strokeWidth={2.5} />
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">
                        Xác thực thành công!
                    </h1>

                    {/* Message */}
                    <p className="text-gray-600 mb-6 leading-relaxed">
                        {message.replace(/\+/g, ' ')}
                    </p>

                    {/* Email Notice */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="text-left">
                                <p className="text-sm font-medium text-blue-900 mb-1">
                                    Kiểm tra email của bạn
                                </p>
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    Mật khẩu đăng nhập đã được gửi đến email của bạn.
                                    Vui lòng kiểm tra hộp thư (bao gồm cả thư mục spam).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Security Tips */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                        <p className="text-xs font-medium text-amber-900 mb-2">
                            Lưu ý bảo mật
                        </p>
                        <ul className="text-xs text-amber-800 text-left space-y-1">
                            <li>• Đổi mật khẩu ngay sau khi đăng nhập lần đầu</li>
                            <li>• Không chia sẻ thông tin đăng nhập với bất kỳ ai</li>
                            <li>• Lưu mật khẩu ở nơi an toàn</li>
                        </ul>
                    </div>

                    {/* Auto redirect notice */}
                    <div className="text-sm text-gray-500 mb-6">
                        Tự động chuyển đến trang đăng nhập sau{' '}
                        <span className="font-bold text-emerald-600">{countdown}</span> giây
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
                        >
                            <span>Đăng nhập ngay</span>
                            <ArrowRight className="h-4 w-4" />
                        </button>

                        <button
                            onClick={() => window.location.href = 'mailto:support@transpomanager.com'}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-all duration-200"
                        >
                            Liên hệ hỗ trợ
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