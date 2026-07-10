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

// Deterministic accent color per username, so the same person always
// gets the same avatar color across sessions.
const AVATAR_PALETTE = [
    { bg: '#4C3AED', fg: '#EDE9FE' }, // violet
    { bg: '#0E9F8E', fg: '#E6FFFA' }, // teal
    { bg: '#D9642C', fg: '#FFF1E6' }, // amber-clay
    { bg: '#2563EB', fg: '#E8EEFF' }, // blue
    { bg: '#C2417A', fg: '#FFE9F2' }, // rose
    { bg: '#5B8A00', fg: '#F1FFDE' }, // olive
];

function colorForName(name = '') {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function initialsForName(name = '') {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

function Avatar({ name, size = 40 }) {
    const { bg, fg } = colorForName(name);
    return (
        <div
            style={{
                width: size,
                height: size,
                minWidth: size,
                backgroundColor: bg,
                color: fg,
            }}
            className="rounded-full flex items-center justify-center font-semibold select-none"
        >
            <span style={{ fontSize: size * 0.4 }}>{initialsForName(name)}</span>
        </div>
    );
}

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
    const inputRef = useRef(null);
    const [stompClient, setStompClient] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [isConnecting, setIsConnecting] = useState(true);

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
            setIsConnecting(true);
            const socket = new SockJS(`${baseURL}/chat`);
            const client = Stomp.over(socket);
            client.connect({}, () => {
                setStompClient(client);
                setIsConnecting(false);
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
                inputRef.current?.focus();
            }
        }
    };

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    function handleLogout() {
        stompClient.disconnect();
        setConnected(false);
        setCurrentUser("");
        setRoomId("");
        navigate('/');
    }

    return (
        <div className="flex flex-col h-screen bg-[#12121A] text-[#E8E6F0] font-sans">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-3 bg-[#181822] border-b border-white/5 shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#4C3AED]/20 flex items-center justify-center">
                        <span className="text-[#8B7CFF] font-bold text-sm">#</span>
                    </div>
                    <div className="leading-tight">
                        <p className="text-[10px] uppercase tracking-widest text-[#8B899C]">Room</p>
                        <h1 className="text-sm font-semibold text-[#F2F1F7]">{roomId}</h1>
                    </div>
                    <span
                        className={`ml-2 flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
                            isConnecting
                                ? 'bg-yellow-500/10 text-yellow-400'
                                : 'bg-emerald-500/10 text-emerald-400'
                        }`}
                    >
                        <span
                            className={`w-1.5 h-1.5 rounded-full ${
                                isConnecting ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'
                            }`}
                        />
                        {isConnecting ? 'Connecting' : 'Live'}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Avatar name={currentUser} size={32} />
                        <span className="text-sm text-[#C9C7D4] hidden sm:inline">{currentUser}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-sm font-medium text-[#F2F1F7] bg-white/5 hover:bg-red-500/20 hover:text-red-300 px-3 py-1.5 rounded-lg transition-colors duration-150"
                    >
                        Leave
                    </button>
                </div>
            </header>

            {/* Chat Messages */}
            <main
                ref={chatBoxRef}
                className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 flex flex-col gap-3"
                style={{
                    backgroundImage:
                        'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.035) 1px, transparent 0)',
                    backgroundSize: '22px 22px',
                }}
            >
                {messages.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-[#5F5D6E] gap-2">
                        <p className="text-sm">No messages yet.</p>
                        <p className="text-xs">Say something to get the conversation going.</p>
                    </div>
                )}

                {messages.map((message, index) => {
                    const isOwn = message.sender === currentUser;
                    const prev = messages[index - 1];
                    const isSameSenderAsPrev = prev && prev.sender === message.sender;

                    return (
                        <div
                            key={index}
                            className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'} ${
                                isSameSenderAsPrev ? 'mt-0' : 'mt-3'
                            }`}
                        >
                            {!isOwn && (
                                <div className="w-8">
                                    {!isSameSenderAsPrev && <Avatar name={message.sender} size={32} />}
                                </div>
                            )}

                            <div className={`max-w-[75%] sm:max-w-md flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                {!isSameSenderAsPrev && (
                                    <span className={`text-xs text-[#8B899C] mb-1 px-1 ${isOwn ? 'mr-1' : 'ml-1'}`}>
                                        {isOwn ? 'You' : message.sender}
                                    </span>
                                )}
                                <div
                                    className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm break-words ${
                                        isOwn
                                            ? 'bg-[#4C3AED] text-white rounded-2xl rounded-br-md'
                                            : 'bg-[#1F1F2B] text-[#E8E6F0] rounded-2xl rounded-bl-md border border-white/5'
                                    }`}
                                >
                                    {message.content}
                                </div>
                                <span className="text-[10px] text-[#5F5D6E] mt-1 px-1">
                                    {timeAgo(message.timeStamp)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </main>

            {/* Message Input */}
            <div className="px-4 sm:px-8 py-4 bg-[#181822] border-t border-white/5">
                <div className="max-w-3xl mx-auto flex items-center gap-3 bg-[#1F1F2B] border border-white/10 rounded-2xl px-3 py-2 focus-within:border-[#4C3AED]/60 transition-colors">
                    <button
                        type="button"
                        className="text-[#8B899C] hover:text-[#E8E6F0] p-2 rounded-full hover:bg-white/5 transition-colors"
                        aria-label="Attach file"
                    >
                        <MdAttachFile fontSize="small" />
                    </button>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Message the room..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent text-sm text-[#E8E6F0] placeholder-[#5F5D6E] focus:outline-none py-1.5"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={isSending || !input.trim()}
                        aria-label="Send message"
                        className={`p-2.5 rounded-full transition-colors duration-150 ${
                            isSending || !input.trim()
                                ? 'bg-white/5 text-[#5F5D6E] cursor-not-allowed'
                                : 'bg-[#4C3AED] text-white hover:bg-[#5B4AF0]'
                        }`}
                    >
                        <MdSend fontSize="small" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ChatPage;