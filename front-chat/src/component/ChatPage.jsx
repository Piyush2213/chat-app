import React, { useState, useRef, useEffect } from 'react';
import MdAttachFile from '@mui/icons-material/AttachFile';
import MdSend from '@mui/icons-material/Send';
import useChatContext from '../context/ChatContext';
import { useNavigate } from 'react-router-dom';
import SockJS from 'sockjs-client';
import { baseURL } from '../config/AxiosHelper';
import toast from 'react-hot-toast';
import { Stomp } from '@stomp/stompjs';
import { getMessageApi } from '../services/RoomService';
import { timeAgo } from '../config/Helper';

function ChatPage() {
    const { roomId, currentUser, connected, setConnected, setRoomId, setCurrentUser } = useChatContext();
    const navigate = useNavigate();

    useEffect(() => {
        if (!connected) {
            navigate("/");
        }
    }, [connected, roomId, currentUser]);

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const chatBoxRef = useRef(null);
    const [stompClient, setStompClient] = useState(null);
    const [isSending, setIsSending] = useState(false);

    // Load messages when component mounts or roomId changes
    useEffect(() => {
        async function loadMessages() {
            try {
                const messages = await getMessageApi(roomId);
                setMessages(messages);
            } catch (error) {
                toast.error("Failed to load messages");
            }
        }

        if (connected) {
            loadMessages();
        }
    }, [roomId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scroll({
                top: chatBoxRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [messages]);

    useEffect(() => {
        const connectWebSocket = () => {
            const socket = new SockJS(`${baseURL}/chat`);
            const client = Stomp.over(socket);
            client.connect({}, () => {
                setStompClient(client);
                toast.success("Connected!");
                client.subscribe(`/topic/room/${roomId}`, (message) => {
                    const newMessage = JSON.parse(message.body);
                    setMessages((prev) => [...prev, newMessage]); // Add new message to the state
                });
            });
        };

        if (connected) {
            connectWebSocket();
        }
    }, [roomId]);

    const sendMessage = async () => {
        if (stompClient && connected && input.trim() && !isSending) {
            setIsSending(true);
            const message = {
                sender: currentUser,
                content: input,
                roomId: roomId,
            };
            try {
                stompClient.send(`/app/sendMessage/${roomId}`, {}, JSON.stringify(message));
                setInput('');
            } catch (error) {
                toast.error("Failed to send message");
            } finally {
                setIsSending(false);
            }
        }
    };

    function handleLogout() {
        stompClient.disconnect();
        setConnected(false);
        setCurrentUser("");
        setRoomId("");
        navigate('/');
    }

    return (
        <div className="flex flex-col h-screen bg-gradient-to-r from-teal-400 to-indigo-600">
            {/* Header */}
            <header className="p-4 bg-gray-900 text-white shadow-md flex justify-between items-center">
                <div>
                    <h1 className="text-lg font-semibold">Room: <span className="text-teal-300">{roomId}</span></h1>
                </div>
                <div>
                    <h1 className="text-lg font-semibold">User: <span className="text-teal-300">{currentUser}</span></h1>
                </div>
                <div>
                    <button 
                        onClick={handleLogout} 
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-200"
                    >
                        Exit
                    </button>
                </div>
            </header>

            {/* Chat Messages */}
            <main className="flex-grow p-6 bg-white bg-opacity-80 rounded-t-3xl shadow-lg overflow-hidden">
                <div ref={chatBoxRef} className="flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
                    {messages.map((message, index) => (
                        <div key={index} className={`flex ${message.sender === currentUser ? "justify-end" : "justify-start"}`}>
                            <div className={`p-4 max-w-xs rounded-xl ${message.sender === currentUser ? 'bg-teal-500 text-white' : 'bg-gray-300 text-gray-800'}`}>
                                <div className="flex items-center gap-3">
                                    <img
                                        className="h-10 w-10 rounded-full"
                                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNt9UpcsobJNOGFHPeBt-88iRmqjflBnIjhw&s"
                                        alt={message.sender}
                                    />
                                    <div>
                                        <p className="font-medium">{message.sender}</p>
                                        <p>{message.content}</p>
                                        <p className="text-xs text-gray-500">{timeAgo(message.timeStamp)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Message Input */}
            <div className="fixed bottom-4 left-0 w-full py-4 bg-gradient-to-r from-teal-400 to-indigo-600 z-20">
                <div className="max-w-4xl mx-auto flex items-center justify-between px-6 bg-white shadow-md rounded-lg">
                    <input
                        type="text"
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="w-full bg-gray-100 text-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <div className="flex gap-4">
                        <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-full transition duration-150">
                            <MdAttachFile size={20} />
                        </button>
                        <button
                            onClick={sendMessage}
                            disabled={isSending}
                            className={`bg-teal-500 hover:bg-teal-600 text-white p-2 rounded-full transition duration-200 ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <MdSend size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChatPage;
