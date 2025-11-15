// Demo tích hợp tối giản
import React from "react";
import AssignDriverDialog from "./components/module 5/AssignDriverDialog.jsx";

export default function DemoAssign() {
    const [open, setOpen] = React.useState(false);
    const order = {
        id: 889,
        code: "ORD-889",
        pickup_time: "2025-10-25T08:30:00",
        vehicle_type: "7-seater",
        branch_name: "Hà Nội",
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4">
            <button
                onClick={() => setOpen(true)}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm"
            >
                Gán chuyến cho {order.code}
            </button>

            <AssignDriverDialog
                open={open}
                order={order}
                onClose={() => setOpen(false)}
                onAssigned={(res) => {
                    console.log("Assigned OK:", res);
                    // TODO: refresh danh sách đơn/queue tại đây
                }}
            />
        </div>
    );
}
