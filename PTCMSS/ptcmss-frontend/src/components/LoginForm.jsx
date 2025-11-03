import { useState } from 'react';
import { apiPost } from '../api/client';
import './LoginForm.css'; // Import file CSS

export default function LoginForm({ onLoggedIn }) {
  // ... (giữ nguyên code state và hàm submit) ...
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiPost('/auth/login', { username, password });
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      onLoggedIn?.(res);
    } catch (err) {
      setError('Đăng nhập thất bại. Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
      // THÊM DÒNG NÀY:
      <div className="login-page-container">

        {/* Form của bạn nằm bên trong div này */}
        <form className="login-form" onSubmit={submit}>
          <h2>Đăng nhập</h2>
          {error && <div className="error">{error}</div>}
          <div className="field">
            <label>Tên đăng nhập</label>
            <input value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="field">
            <label>Mật khẩu</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button className="btn" disabled={loading}>{loading ? 'Đang xử lý...' : 'Đăng nhập'}</button>
        </form>

      </div> // <-- VÀ ĐÓNG DÒNG NÀY
  );
}