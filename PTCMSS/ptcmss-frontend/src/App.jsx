// src/App.jsx
import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from './api/client';
import TodoCard from './components/TodoCard';
import './App.css';

export default function App() {
    const [todos, setTodos] = useState([]);
    const [title, setTitle] = useState('');
    const [note, setNote] = useState('');
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await apiGet('/todos'); // fetch trả về JSON trực tiếp
            setTodos(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return todos;
        return todos.filter(t =>
            t.title.toLowerCase().includes(q) || (t.note || '').toLowerCase().includes(q)
        );
    }, [query, todos]);

    const add = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        await apiPost('/todos', { title: title.trim(), done: false, note: note.trim() || null });
        setTitle(''); setNote('');
        load();
    };

    const toggle = async (todo) => {
        await apiPut(`/todos/${todo.id}`, { ...todo, done: !todo.done });
        load();
    };

    const del = async (id) => {
        await apiDelete(`/todos/${id}`);
        load();
    };

    return (
        <div className="page">
            <header className="header">
                <div className="brand">
                    <div className="logo">🚌</div>
                    <div>
                        <h1>PTCMSS Dashboard</h1>
                        <p>React + Spring Boot + MySQL</p>
                    </div>
                </div>
                <div className="search">
                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Tìm công việc..."
                    />
                </div>
            </header>

            <main className="container">
                <form className="composer" onSubmit={add}>
                    <input
                        className="input"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Thêm công việc..."
                        maxLength={200}
                    />
                    <input
                        className="input"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Ghi chú (không bắt buộc)"
                        maxLength={500}
                    />
                    <button className="btn" type="submit">Thêm</button>
                </form>

                <section className="list">
                    {loading && <div className="hint">Đang tải...</div>}
                    {!loading && filtered.length === 0 && (
                        <div className="hint">Chưa có việc nào phù hợp.</div>
                    )}
                    {!loading && filtered.map(t => (
                        <TodoCard key={t.id} todo={t} onToggle={toggle} onDelete={del} />
                    ))}
                </section>
            </main>

            <footer className="footer">
                <a href="http://localhost:8080/actuator/health" target="_blank" rel="noreferrer">Health</a>
                <span>•</span>
                <span>{new Date().toLocaleString()}</span>
            </footer>
        </div>
    );
}
