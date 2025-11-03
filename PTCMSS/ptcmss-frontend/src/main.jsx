// File: src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
// Import các công cụ router
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import các "trang" của bạn
import App from './App.jsx'; // Đây là trang Todo list (file bạn chụp màn hình)
import LoginForm from './components/LoginForm.jsx'; // Đây là trang Login

// Import file CSS (giữ nguyên)
import './index.css';

// Render ứng dụng với cấu hình router
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <Routes>
                {/*
          Route 1:
          Khi người dùng truy cập đường dẫn "/" (trang chủ)
          Nó sẽ render component <App /> (trang Todo của bạn)
        */}
                <Route path="/" element={<App />} />

                {/*
          Route 2:
          Khi người dùng truy cập đường dẫn "/login"
          Nó sẽ render component <LoginForm />
        */}
                <Route path="/login" element={<LoginForm />} />

                {/* Bạn có thể thêm các trang khác (ví dụ: /register) ở đây */}
            </Routes>
        </BrowserRouter>
    </React.StrictMode>
);