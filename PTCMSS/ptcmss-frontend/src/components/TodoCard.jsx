export default function TodoCard({ todo, onToggle, onDelete }) {
    return (
        <div className="card">
            <div className="card-left">
                <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={() => onToggle(todo)}
                    aria-label="toggle"
                />
            </div>
            <div className="card-body">
                <div className={`title ${todo.done ? 'done' : ''}`}>{todo.title}</div>
                {todo.note && <div className="note">{todo.note}</div>}
            </div>
            <button className="del" onClick={() => onDelete(todo.id)} aria-label="delete">
                ×
            </button>
        </div>
    );
}
