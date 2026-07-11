import React, { useState, useRef, useEffect } from 'react';
import MdAttachFile from '@mui/icons-material/AttachFile';
import MdSend from '@mui/icons-material/Send';
import MdInsertDriveFile from '@mui/icons-material/InsertDriveFile';
import MdClose from '@mui/icons-material/Close';
import useChatContext from '../context/ChatContext';
import { useNavigate } from 'react-router-dom';
import SockJS from 'sockjs-client';
import { baseURL } from '../config/AxiosHelper';
import toast from 'react-hot-toast';
import { Stomp } from '@stomp/stompjs';
import { getMessageApi, getPendingRequestsApi, decideJoinRequestApi } from '../services/RoomService';
import { uploadFileApi } from '../services/FileService';
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

function formatFileSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Renders the body of a single message: plain text, an inline image,
// or a document card with a download link.
function MessageBody({ message, isOwn }) {
    const fileUrl = message.fileUrl ? `${baseURL}${message.fileUrl}` : null;

    if (message.messageType === 'IMAGE' && fileUrl) {
        return (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block">
                <img
                    src={fileUrl}
                    alt={message.fileName || 'image'}
                    className="rounded-lg max-w-full max-h-64 object-cover"
                />
            </a>
        );
    }

    if (message.messageType === 'FILE' && fileUrl) {
        return (
            <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
                    isOwn ? 'bg-white/10' : 'bg-black/20'
                }`}
            >
                <MdInsertDriveFile fontSize="small" />
                <div className="min-w-0">
                    <p className="text-sm truncate max-w-[180px]">{message.fileName || 'Document'}</p>
                    <p className="text-[11px] opacity-70">Tap to download</p>
                </div>
            </a>
        );
    }

    return <span>{message.content}</span>;
}

function ChatPage() {
    const {
        roomId,
        currentUser,
        connected,
        setConnected,
        setRoomId,
        setCurrentUser,
        isRoomOwner,
        setIsRoomOwner,
    } = useChatContext();
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
    const fileInputRef = useRef(null);
    const [stompClient, setStompClient] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [isConnecting, setIsConnecting] = useState(true);

    // Attachment staged for sending, before it's uploaded.
    const [pendingFile, setPendingFile] = useState(null); // File object
    const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null); // local object URL for image preview
    const [isUploading, setIsUploading] = useState(false);

    // Owner-only: usernames waiting to be let into the room.
    const [pendingRequests, setPendingRequests] = useState([]);

    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // keep in sync with backend limit

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

    // Owner only: fetch anyone already waiting (e.g. requests that came in
    // before the owner had this page open).
    useEffect(() => {
        async function loadPendingRequests() {
            try {
                const list = await getPendingRequestsApi(roomId);
                setPendingRequests(list || []);
            } catch (error) {
                // Non-critical, skip silently.
            }
        }

        if (connected && isRoomOwner) {
            loadPendingRequests();
        }
    }, [roomId, isRoomOwner]);

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

                // Owner only: live notifications when someone new asks to join.
                if (isRoomOwner) {
                    client.subscribe(`/topic/room/${roomId}/joinRequests`, (message) => {
                        const event = JSON.parse(message.body);
                        setPendingRequests((prev) =>
                            prev.includes(event.userName) ? prev : [...prev, event.userName]
                        );
                        toast(`${event.userName} wants to join the room`);
                    });
                }
            });
        };

        if (connected) {
            connectWebSocket();
        }
    }, [roomId, isRoomOwner]);

    // Revoke the local preview object URL when it's replaced or the component unmounts,
    // so we don't leak memory.
    useEffect(() => {
        return () => {
            if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        };
    }, [pendingPreviewUrl]);

    async function respondToRequest(userName, approved) {
        try {
            await decideJoinRequestApi(roomId, userName, approved);
            setPendingRequests((prev) => prev.filter((name) => name !== userName));
            toast.success(approved ? `${userName} let in` : `${userName} denied`);
        } catch (error) {
            toast.error("Failed to send decision");
        }
    }

    function handleAttachClick() {
        fileInputRef.current?.click();
    }

    function handleFileChosen(e) {
        const file = e.target.files?.[0];
        // Reset the input value so choosing the same file again still fires onChange.
        e.target.value = '';

        if (!file) return;

        if (file.size > MAX_FILE_SIZE_BYTES) {
            toast.error("File is too large. Max size is 10MB.");
            return;
        }

        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);

        setPendingFile(file);
        setPendingPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    }

    function clearPendingFile() {
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        setPendingFile(null);
        setPendingPreviewUrl(null);
    }

    const sendMessage = async () => {
        if (!stompClient || !connected || isSending || isUploading) return;
        if (!input.trim() && !pendingFile) return;

        setIsSending(true);
        try {
            if (pendingFile) {
                setIsUploading(true);
                let uploadResult;
                try {
                    uploadResult = await uploadFileApi(pendingFile);
                } catch (error) {
                    toast.error("Failed to upload file");
                    return;
                } finally {
                    setIsUploading(false);
                }

                const isImage = pendingFile.type.startsWith('image/');
                const fileMessage = {
                    sender: currentUser,
                    content: input.trim() || (isImage ? 'Sent a photo' : 'Sent a document'),
                    roomId: roomId,
                    messageType: isImage ? 'IMAGE' : 'FILE',
                    fileUrl: uploadResult.url,
                    fileName: uploadResult.fileName,
                    fileType: uploadResult.fileType,
                };
                stompClient.send(`/app/sendMessage/${roomId}`, {}, JSON.stringify(fileMessage));
                clearPendingFile();
            } else {
                const message = {
                    sender: currentUser,
                    content: input,
                    roomId: roomId,
                    messageType: 'TEXT',
                };
                stompClient.send(`/app/sendMessage/${roomId}`, {}, JSON.stringify(message));
            }
            setInput('');
        } catch (error) {
            toast.error("Failed to send message");
        } finally {
            setIsSending(false);
            inputRef.current?.focus();
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
        setIsRoomOwner(false);
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
                    {isRoomOwner && (
                        <span className="ml-1 text-xs px-2 py-1 rounded-full bg-[#4C3AED]/15 text-[#8B7CFF]">
                            Owner
                        </span>
                    )}
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

            {/* Owner-only: live join-request panel */}
            {isRoomOwner && pendingRequests.length > 0 && (
                <div className="absolute top-16 right-4 sm:right-8 z-20 w-72 bg-[#1F1F2B] border border-white/10 rounded-xl shadow-xl overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                        <span className="text-sm font-medium">Join requests</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#4C3AED]/20 text-[#8B7CFF]">
                            {pendingRequests.length}
                        </span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {pendingRequests.map((name) => (
                            <div key={name} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-b-0">
                                <Avatar name={name} size={28} />
                                <span className="flex-1 text-sm truncate">{name}</span>
                                <button
                                    onClick={() => respondToRequest(name, true)}
                                    className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={() => respondToRequest(name, false)}
                                    className="text-xs px-2.5 py-1 rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/25"
                                >
                                    Deny
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                                    className={`px-3 py-2.5 text-sm leading-relaxed shadow-sm break-words ${
                                        isOwn
                                            ? 'bg-[#4C3AED] text-white rounded-2xl rounded-br-md'
                                            : 'bg-[#1F1F2B] text-[#E8E6F0] rounded-2xl rounded-bl-md border border-white/5'
                                    } ${message.messageType === 'IMAGE' ? 'p-1.5' : ''}`}
                                >
                                    <MessageBody message={message} isOwn={isOwn} />
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
                <div className="max-w-3xl mx-auto">
                    {/* Staged attachment preview */}
                    {pendingFile && (
                        <div className="flex items-center gap-3 mb-2 px-3 py-2 bg-[#1F1F2B] border border-white/10 rounded-xl">
                            {pendingPreviewUrl ? (
                                <img src={pendingPreviewUrl} alt="preview" className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                                    <MdInsertDriveFile fontSize="small" className="text-[#8B899C]" />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm truncate">{pendingFile.name}</p>
                                <p className="text-[11px] text-[#8B899C]">{formatFileSize(pendingFile.size)}</p>
                            </div>
                            <button
                                onClick={clearPendingFile}
                                className="p-1.5 rounded-full hover:bg-white/10 text-[#8B899C] hover:text-[#E8E6F0]"
                                aria-label="Remove attachment"
                            >
                                <MdClose fontSize="small" />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-3 bg-[#1F1F2B] border border-white/10 rounded-2xl px-3 py-2 focus-within:border-[#4C3AED]/60 transition-colors">
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFileChosen}
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                        />
                        <button
                            type="button"
                            onClick={handleAttachClick}
                            disabled={isUploading}
                            className="text-[#8B899C] hover:text-[#E8E6F0] p-2 rounded-full hover:bg-white/5 transition-colors disabled:opacity-50"
                            aria-label="Attach file"
                        >
                            <MdAttachFile fontSize="small" />
                        </button>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={pendingFile ? "Add a caption (optional)..." : "Message the room..."}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 bg-transparent text-sm text-[#E8E6F0] placeholder-[#5F5D6E] focus:outline-none py-1.5"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={isSending || isUploading || (!input.trim() && !pendingFile)}
                            aria-label="Send message"
                            className={`p-2.5 rounded-full transition-colors duration-150 ${
                                isSending || isUploading || (!input.trim() && !pendingFile)
                                    ? 'bg-white/5 text-[#5F5D6E] cursor-not-allowed'
                                    : 'bg-[#4C3AED] text-white hover:bg-[#5B4AF0]'
                            }`}
                        >
                            {isUploading ? (
                                <span className="block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <MdSend fontSize="small" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChatPage;