import React, { useState } from 'react'
import toast from 'react-hot-toast';
import { createRoomApi, JoinChatApi } from '../services/RoomService';
import { useNavigate } from 'react-router-dom';
import useChatContext from '../context/ChatContext';

function JoinCreateChat() {
    const [detail, setDetail] = useState({
        roomId:'',
        userName:'',
    });
    const { roomId, currentUser, connected, setRoomId, setCurrentUser, setConnected } = useChatContext();
    const navigate = useNavigate();

    // Validate the form inputs
    function toValidateForm() {
        if (detail.roomId === "" || detail.userName === "") {
            toast.error("Please fill all the values..");
            return false;
        }
        return true;
    }

    // Handle form input changes
    function handleFormInputChange(e) {
        setDetail({
            ...detail,
            [e.target.name]: e.target.value,
        });
    }

    // Handle joining chat
    async function joinChat() {
        if (toValidateForm()) {
            try {
                const room = await JoinChatApi(detail.roomId);
                toast.success("Joined..!");
                setCurrentUser(detail.userName);
                setRoomId(room.roomId);
                setConnected(true);
                navigate("/chat");
            } catch (error) {
                if (error.status === 400) {
                    toast.error("Room no longer exists!");
                } else {
                    toast.error("Error in joining room");
                }
            }
        }
    }

    // Handle creating a room
    async function createRoom() {
        if (toValidateForm()) {
            try {
                const response = await createRoomApi(detail);
                toast.success("Room Created..!");
                setCurrentUser(detail.userName);
                setRoomId(response.roomId);
                setConnected(true);
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-teal-500 to-indigo-600">
            <div className="p-8 w-full max-w-md flex flex-col gap-6 rounded-lg shadow-lg bg-white">
                <h1 className="text-3xl font-semibold text-center text-gray-800">Join or Create a Room</h1>

                {/* User Name Input */}
                <div>
                    <label htmlFor="userName" className="block text-sm font-medium text-gray-700">Enter Your Name</label>
                    <input 
                        onChange={handleFormInputChange}
                        value={detail.userName}
                        name="userName"
                        type="text"
                        placeholder="Enter your name..."
                        className="w-full p-3 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-500 opacity-100 text-gray-900 dark:bg-gray-700 dark:text-white" // Ensure text is readable
                    />
                </div>

                {/* Room ID Input */}
                <div>
                    <label htmlFor="roomId" className="block text-sm font-medium text-gray-700">Enter Room ID</label>
                    <input
                        onChange={handleFormInputChange}
                        value={detail.roomId}
                        name="roomId"
                        type="text"
                        placeholder="Enter room ID..."
                        className="w-full p-3 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-500 opacity-100 text-gray-900 dark:bg-gray-700 dark:text-white" // Ensure text is readable
                    />
                </div>

                {/* Buttons */}
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
            </div>
        </div>
    );
}

export default JoinCreateChat;
