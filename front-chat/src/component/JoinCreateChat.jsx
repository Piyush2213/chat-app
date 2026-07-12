import React, { useState } from 'react'
import toast from 'react-hot-toast';
import { createRoomApi, JoinChatApi } from '../services/RoomService';
import { useNavigate } from 'react-router-dom';
import useChatContext from '../context/ChatContext';
import { getRecentRooms, addRecentRoom, removeRecentRoom } from '../config/RecentRooms';

function JoinCreateChat() {
    const [detail, setDetail] = useState({
        roomId: '',
        userName: '',
    });
    const { setRoomId, setCurrentUser, setConnected, setIsRoomOwner } = useChatContext();
    const navigate = useNavigate();
    const [recentRooms, setRecentRooms] = useState(getRecentRooms());

    function toValidateForm() {
        if (detail.roomId === "" || detail.userName === "") {
            toast.error("Please fill all the values..");
            return false;
        }
        return true;
    }

    function handleFormInputChange(e) {
        setDetail({
            ...detail,
            [e.target.name]: e.target.value,
        });
    }

    async function performJoin(roomId, userName) {
        try {
            const room = await JoinChatApi(roomId, userName);
            setCurrentUser(userName);
            setRoomId(room.roomId);

            if (room.status === "PENDING") {
                setIsRoomOwner(false);
                setConnected(false);
                addRecentRoom(roomId, userName, 'member');
                toast("Waiting for the room owner to approve your request...");
                navigate("/waiting-approval");
            } else {
                setIsRoomOwner(room.status === "OWNER");
                setConnected(true);
                addRecentRoom(roomId, userName, room.status === "OWNER" ? 'owner' : 'member');
                toast.success("Joined..!");
                navigate("/chat");
            }
        } catch (error) {
            if (error.status === 400) {
                toast.error("Room no longer exists!");
                removeRecentRoom(roomId);
                setRecentRooms(getRecentRooms());
            } else {
                toast.error("Error in joining room");
            }
        }
    }

    async function joinChat() {
        if (toValidateForm()) {
            await performJoin(detail.roomId, detail.userName);
        }
    }

    async function createRoom() {
        if (toValidateForm()) {
            try {
                const response = await createRoomApi(detail);
                toast.success("Room Created..!");
                setCurrentUser(detail.userName);
                setRoomId(response.roomId);
                setIsRoomOwner(true);
                setConnected(true);
                addRecentRoom(response.roomId, detail.userName, 'owner');
                navigate("/chat");
            } catch (error) {
                if (error.status === 400) {
                    toast.error("Room already exists!");
                } else {
                    toast.error("Error in creating room");
                }
            }
        }
    }

    function handleRejoin(room) {
        performJoin(room.roomId, room.userName);
    }

    function handleRemoveRecent(e, roomId) {
        e.stopPropagation();
        removeRecentRoom(roomId);
        setRecentRooms(getRecentRooms());
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-teal-500 to-indigo-600 py-10">
            <div className="p-8 w-full max-w-md flex flex-col gap-6 rounded-lg shadow-lg bg-white">
                <h1 className="text-3xl font-semibold text-center text-gray-800">Join or Create a Room</h1>

                <div>
                    <label htmlFor="userName" className="block text-sm font-medium text-gray-700">Enter Your Name</label>
                    <input
                        onChange={handleFormInputChange}
                        value={detail.userName}
                        name="userName"
                        type="text"
                        placeholder="Enter your name..."
                        className="w-full p-3 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-500 opacity-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                    />
                </div>

                <div>
                    <label htmlFor="roomId" className="block text-sm font-medium text-gray-700">Enter Room ID</label>
                    <input
                        onChange={handleFormInputChange}
                        value={detail.roomId}
                        name="roomId"
                        type="text"
                        placeholder="Enter room ID..."
                        className="w-full p-3 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-500 opacity-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                    />
                </div>

                <div className="flex justify-center gap-5">
                    <button
                        onClick={joinChat}
                        className="px-6 py-3 w-full bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    >
                        Join Room
                    </button>
                    <button
                        onClick={createRoom}
                        className="px-6 py-3 w-full bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                        Create Room
                    </button>
                </div>

                {recentRooms.length > 0 && (
                    <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Recent rooms</p>
                        <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                            {recentRooms.map((room) => (
                                <button
                                    key={room.roomId}
                                    onClick={() => handleRejoin(room)}
                                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-left transition-colors"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{room.roomId}</p>
                                        <p className="text-xs text-gray-500">
                                            as {room.userName}{room.role === 'owner' ? ' · owner' : ''}
                                        </p>
                                    </div>
                                    <span
                                        onClick={(e) => handleRemoveRecent(e, room.roomId)}
                                        className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 shrink-0"
                                    >
                                        Remove
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default JoinCreateChat;