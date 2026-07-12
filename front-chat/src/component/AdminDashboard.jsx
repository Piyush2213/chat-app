import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getAllRoomsAdminApi, deleteRoomAdminApi, getAdminToken, clearAdminToken } from '../services/Adminservice';

function AdminDashboard() {
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!getAdminToken()) {
            navigate('/admin/login');
            return;
        }
        loadRooms();
    }, []);

    async function loadRooms() {
        setIsLoading(true);
        try {
            const data = await getAllRoomsAdminApi();
            setRooms(data);
        } catch (error) {
            if (error?.response?.status === 401) {
                clearAdminToken();
                toast.error('Session expired, please log in again');
                navigate('/admin/login');
            } else {
                toast.error('Failed to load rooms');
            }
        } finally {
            setIsLoading(false);
        }
    }

    async function handleShutdown(roomId) {
        if (!window.confirm(`Shut down room "${roomId}"? This deletes it permanently and disconnects everyone in it.`)) {
            return;
        }
        try {
            await deleteRoomAdminApi(roomId);
            setRooms((prev) => prev.filter((r) => r.roomId !== roomId));
            toast.success(`Room "${roomId}" shut down`);
        } catch (error) {
            toast.error('Failed to shut down room');
        }
    }

    function handleLogout() {
        clearAdminToken();
        navigate('/admin/login');
    }

    return (
        <div className="min-h-screen bg-[#12121A] text-[#E8E6F0]">
            <header className="flex items-center justify-between px-6 py-4 bg-[#181822] border-b border-white/5">
                <h1 className="text-lg font-semibold">Admin Dashboard</h1>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadRooms}
                        className="text-sm px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        Refresh
                    </button>
                    <button
                        onClick={handleLogout}
                        className="text-sm px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                    >
                        Log out
                    </button>
                </div>
            </header>

            <main className="p-6 max-w-5xl mx-auto">
                {isLoading ? (
                    <p className="text-sm text-[#8B899C]">Loading rooms...</p>
                ) : rooms.length === 0 ? (
                    <p className="text-sm text-[#8B899C]">No active rooms.</p>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-white/10">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#181822] text-left text-[#8B899C] text-xs uppercase tracking-wide">
                                    <th className="px-4 py-3">Room ID</th>
                                    <th className="px-4 py-3">Owner</th>
                                    <th className="px-4 py-3">Messages</th>
                                    <th className="px-4 py-3">Approved</th>
                                    <th className="px-4 py-3">Pending</th>
                                    <th className="px-4 py-3">Online now</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rooms.map((room) => (
                                    <tr key={room.roomId} className="border-t border-white/5 hover:bg-white/[0.02]">
                                        <td className="px-4 py-3 font-medium">{room.roomId}</td>
                                        <td className="px-4 py-3 text-[#C9C7D4]">{room.createdBy}</td>
                                        <td className="px-4 py-3 text-[#C9C7D4]">{room.messageCount}</td>
                                        <td className="px-4 py-3 text-[#C9C7D4]">{room.approvedCount}</td>
                                        <td className="px-4 py-3 text-[#C9C7D4]">{room.pendingCount}</td>
                                        <td className="px-4 py-3">
                                            <span className={room.onlineCount > 0 ? 'text-emerald-400' : 'text-[#5F5D6E]'}>
                                                {room.onlineCount}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleShutdown(room.roomId)}
                                                className="text-xs px-3 py-1.5 rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                                            >
                                                Shut down
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}

export default AdminDashboard;