import React, { useState, useRef, useEffect } from 'react';
import MdAttachFile from '@mui/icons-material/AttachFile';
import MdSend from '@mui/icons-material/Send';
import MdInsertDriveFile from '@mui/icons-material/InsertDriveFile';
import MdClose from '@mui/icons-material/Close';
import MdEdit from '@mui/icons-material/Edit';
import MdDelete from '@mui/icons-material/Delete';
import MdGroup from '@mui/icons-material/Group';
import useChatContext from '../context/ChatContext';
import { useNavigate } from 'react-router-dom';
import SockJS from 'sockjs-client';
import { baseURL } from '../config/AxiosHelper';
import toast from 'react-hot-toast';
import { Stomp } from '@stomp/stompjs';
import { getMessageApi, getPendingRequestsApi, decideJoinRequestApi, kickUserApi } from '../services/RoomService';
import { uploadFileApi } from '../services/FileService';
import { timeAgo } from '../config/Helper';

const QUICK_EMOJIS = ['👍', '❤️', '😂'];
const PAGE_SIZE = 50;

const AVATAR_PALETTE = [
    { bg: '#4C3AED', fg: '#EDE9FE' },
    { bg: '#0E9F8E', fg: '#E6FFFA' },
    { bg: '#D9642C', fg: '#FFF1E6' },
    { bg: '#2563EB', fg: '#E8EEFF' },
    { bg: '#C2417A', fg: '#FFE9F2' },
    { bg: '#5B8A00', fg: '#F1FFDE' },
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

function Avatar({ name, size = 40, online = false }) {
    const { bg, fg } = colorForName(name);
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <div
                style={{ width: size, height: size, backgroundColor: bg, color: fg }}
                className="rounded-full flex items-center justify-center font-semibold select-none"
            >
                <span style={{ fontSize: size * 0.4 }}>{initialsForName(name)}</span>
            </div>
            {online && (
                <span
                    className="absolute bottom-0 right-0 rounded-full bg-emerald-400 border-2 border-[#12121A]"
                    style={{ width: Math.max(size * 0.32, 8), height: Math.max(size * 0.32, 8) }}
                />
            )}
        </div>
    );
}

function formatFileSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDateDivider(timeStamp) {
    const date = new Date(timeStamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (isSameDay(date, today)) return 'Today';
    if (isSameDay(date, yesterday)) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function DateDivider({ label }) {
    return (
        <div className="flex items-center gap-3 my-2 select-none">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-[11px] text-[#5F5D6E] px-2">{label}</span>
            <div className="flex-1 h-px bg-white/5" />
        </div>
    );
}

function SeenTicks({ message, currentUser }) {
    if (message.sender !== currentUser) return null;
    const seenByOthers = (message.seenBy || []).filter((u) => u !== currentUser);
    return (
        <span className={`text-[10px] ml-1 ${seenByOthers.length > 0 ? 'text-[#8B7CFF]' : 'text-[#5F5D6E]'}`}>
            {seenByOthers.length > 0 ? '✓✓' : '✓'}
        </span>
    );
}

function QuickReactBar({ isOwn, onPick }) {
    return (
        <div
            className={`hidden group-hover:flex items-center gap-1 absolute -top-4 ${
                isOwn ? 'right-0' : 'left-0'
            } bg-[#1F1F2B] border border-white/10 rounded-full px-1.5 py-1 shadow-lg z-10`}
        >
            {QUICK_EMOJIS.map((emoji) => (
                <button
                    key={emoji}
                    onClick={() => onPick(emoji)}
                    className="text-sm leading-none hover:scale-125 transition-transform"
                    aria-label={`React with ${emoji}`}
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
}

// Edit/delete controls, shown on hover for messages the current user is
// allowed to act on.
function MessageActions({ canEdit, canDelete, isOwn, onEdit, onDelete }) {
    if (!canEdit && !canDelete) return null;
    return (
        <div
            className={`hidden group-hover:flex items-center gap-1 absolute -top-4 ${
                isOwn ? 'left-0' : 'right-0'
            } bg-[#1F1F2B] border border-white/10 rounded-full px-1.5 py-1 shadow-lg z-10`}
        >
            {canEdit && (
                <button onClick={onEdit} className="text-[#8B899C] hover:text-[#E8E6F0] p-0.5" aria-label="Edit message">
                    <MdEdit style={{ fontSize: 14 }} />
                </button>
            )}
            {canDelete && (
                <button onClick={onDelete} className="text-[#8B899C] hover:text-red-400 p-0.5" aria-label="Delete message">
                    <MdDelete style={{ fontSize: 14 }} />
                </button>
            )}
        </div>
    );
}

function ReactionChips({ message, currentUser, onToggle }) {
    const reactions = message.reactions || {};
    const emojis = Object.keys(reactions).filter((e) => (reactions[e] || []).length > 0);
    if (emojis.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1 mt-1">
            {emojis.map((emoji) => {
                const users = reactions[emoji];
                const reactedByMe = users.includes(currentUser);
                return (
                    <button
                        key={emoji}
                        onClick={() => onToggle(message.id, emoji)}
                        className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                            reactedByMe
                                ? 'bg-[#4C3AED]/20 border-[#4C3AED]/50 text-[#C9C1FF]'
                                : 'bg-white/5 border-white/10 text-[#C9C7D4] hover:bg-white/10'
                        }`}
                        title={users.join(', ')}
                    >
                        {emoji} {users.length}
                    </button>
                );
            })}
        </div>
    );
}

function MessageBody({ message, isOwn }) {
    if (message.deleted) {
        return <span className="italic text-[#5F5D6E]">This message was deleted</span>;
    }

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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${isOwn ? 'bg-white/10' : 'bg-black/20'}`}
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

    const [pendingFile, setPendingFile] = useState(null);
    const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const [pendingRequests, setPendingRequests] = useState([]);

    const [typingUsers, setTypingUsers] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);

    // Pagination (scroll-up to load older messages)
    const [nextPage, setNextPage] = useState(1); // page 0 was the initial load
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);
    const prevScrollHeightRef = useRef(0);
    const isPrependingRef = useRef(false);

    // Edit state
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editingContent, setEditingContent] = useState('');

    // Members / kick panel (owner only)
    const [showMembers, setShowMembers] = useState(false);

    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

    // Initial message load
    useEffect(() => {
        async function loadMessages() {
            try {
                const initial = await getMessageApi(roomId, PAGE_SIZE, 0);
                setMessages(initial);
                setHasMoreMessages(initial.length === PAGE_SIZE);
                setNextPage(1);
            } catch (error) {
                toast.error("Failed to load messages");
            }
        }

        if (connected) {
            loadMessages();
        }
    }, [roomId]);

    useEffect(() => {
        async function loadPendingRequests() {
            try {
                const list = await getPendingRequestsApi(roomId);
                setPendingRequests(list || []);
            } catch (error) {
                // Non-critical.
            }
        }

        if (connected && isRoomOwner) {
            loadPendingRequests();
        }
    }, [roomId, isRoomOwner]);

    // Scroll to bottom on new messages, but NOT when we just prepended older ones.
    useEffect(() => {
        if (isPrependingRef.current) {
            // Restore scroll position so the view doesn't jump after prepending.
            if (chatBoxRef.current) {
                const newScrollHeight = chatBoxRef.current.scrollHeight;
                chatBoxRef.current.scrollTop = newScrollHeight - prevScrollHeightRef.current;
            }
            isPrependingRef.current = false;
            return;
        }
        if (chatBoxRef.current) {
            chatBoxRef.current.scroll({ top: chatBoxRef.current.scrollHeight, behavior: "smooth" });
        }
    }, [messages]);

    async function loadOlderMessages() {
        if (isLoadingOlder || !hasMoreMessages) return;
        setIsLoadingOlder(true);
        try {
            const older = await getMessageApi(roomId, PAGE_SIZE, nextPage);
            if (older.length === 0) {
                setHasMoreMessages(false);
            } else {
                if (chatBoxRef.current) {
                    prevScrollHeightRef.current = chatBoxRef.current.scrollHeight;
                }
                isPrependingRef.current = true;
                setMessages((prev) => [...older, ...prev]);
                setNextPage((p) => p + 1);
                if (older.length < PAGE_SIZE) setHasMoreMessages(false);
            }
        } catch (error) {
            toast.error("Failed to load older messages");
        } finally {
            setIsLoadingOlder(false);
        }
    }

    function handleChatScroll(e) {
        if (e.target.scrollTop < 60 && hasMoreMessages && !isLoadingOlder) {
            loadOlderMessages();
        }
    }

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
                    setMessages((prev) => [...prev, newMessage]);
                });

                client.subscribe(`/topic/room/${roomId}/typing`, (message) => {
                    const event = JSON.parse(message.body);
                    if (event.userName === currentUser) return;
                    setTypingUsers((prev) => {
                        if (event.typing) {
                            return prev.includes(event.userName) ? prev : [...prev, event.userName];
                        }
                        return prev.filter((u) => u !== event.userName);
                    });
                });

                client.subscribe(`/topic/room/${roomId}/presence`, (message) => {
                    const list = JSON.parse(message.body);
                    setOnlineUsers(list || []);
                });

                client.subscribe(`/topic/room/${roomId}/seen`, (message) => {
                    const event = JSON.parse(message.body);
                    setMessages((prev) =>
                        prev.map((m) => (m.id === event.messageId ? { ...m, seenBy: event.seenBy } : m))
                    );
                });

                client.subscribe(`/topic/room/${roomId}/reactions`, (message) => {
                    const event = JSON.parse(message.body);
                    setMessages((prev) =>
                        prev.map((m) => (m.id === event.messageId ? { ...m, reactions: event.reactions } : m))
                    );
                });

                // Edited messages
                client.subscribe(`/topic/room/${roomId}/messageEdited`, (message) => {
                    const event = JSON.parse(message.body);
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === event.messageId ? { ...m, content: event.content, edited: true } : m
                        )
                    );
                });

                // Deleted messages
                client.subscribe(`/topic/room/${roomId}/messageDeleted`, (message) => {
                    const event = JSON.parse(message.body);
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === event.messageId
                                ? { ...m, deleted: true, content: '', fileUrl: null, fileName: null, fileType: null }
                                : m
                        )
                    );
                });

                // Room shut down by an admin -- everyone gets removed, not just one user.
                client.subscribe(`/topic/room/${roomId}/roomClosed`, () => {
                    toast.error("This room has been shut down by an administrator.");
                    if (client.connected) client.disconnect();
                    setConnected(false);
                    setCurrentUser("");
                    setRoomId("");
                    setIsRoomOwner(false);
                    navigate('/');
                });

                // Being kicked
                client.subscribe(`/topic/room/${roomId}/kicked`, (message) => {
                    const event = JSON.parse(message.body);
                    if (event.userName !== currentUser) return;
                    toast.error("You were removed from this room by the owner.");
                    if (client.connected) client.disconnect();
                    setConnected(false);
                    setCurrentUser("");
                    setRoomId("");
                    setIsRoomOwner(false);
                    navigate('/');
                });

                if (isRoomOwner) {
                    client.subscribe(`/topic/room/${roomId}/joinRequests`, (message) => {
                        const event = JSON.parse(message.body);
                        setPendingRequests((prev) =>
                            prev.includes(event.userName) ? prev : [...prev, event.userName]
                        );
                        toast(`${event.userName} wants to join the room`);
                    });
                }

                client.send(`/app/presence/${roomId}`, {}, JSON.stringify({ userName: currentUser }));
            });
        };

        if (connected) {
            connectWebSocket();
        }
    }, [roomId, isRoomOwner]);

    useEffect(() => {
        return () => {
            if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        };
    }, [pendingPreviewUrl]);

    useEffect(() => {
        if (!stompClient || !connected) return;
        messages.forEach((message) => {
            if (!message.id || message.sender === currentUser || message.deleted) return;
            const seenBy = message.seenBy || [];
            if (!seenBy.includes(currentUser)) {
                stompClient.send(
                    `/app/markSeen/${roomId}`,
                    {},
                    JSON.stringify({ messageId: message.id, userName: currentUser })
                );
            }
        });
    }, [messages, stompClient, connected]);

    async function respondToRequest(userName, approved) {
        try {
            await decideJoinRequestApi(roomId, userName, approved);
            setPendingRequests((prev) => prev.filter((name) => name !== userName));
            toast.success(approved ? `${userName} let in` : `${userName} denied`);
        } catch (error) {
            toast.error("Failed to send decision");
        }
    }

    async function handleKick(userName) {
        try {
            await kickUserApi(roomId, userName);
            setOnlineUsers((prev) => prev.filter((u) => u !== userName));
            toast.success(`${userName} was removed from the room`);
        } catch (error) {
            toast.error("Failed to remove user");
        }
    }

    function toggleReaction(messageId, emoji) {
        if (!stompClient || !connected || !messageId) return;
        stompClient.send(`/app/react/${roomId}`, {}, JSON.stringify({ messageId, emoji, userName: currentUser }));
    }

    function startEdit(message) {
        setEditingMessageId(message.id);
        setEditingContent(message.content);
    }

    function cancelEdit() {
        setEditingMessageId(null);
        setEditingContent('');
    }

    function saveEdit(messageId) {
        if (!stompClient || !connected || !editingContent.trim()) return;
        stompClient.send(
            `/app/editMessage/${roomId}`,
            {},
            JSON.stringify({ messageId, userName: currentUser, content: editingContent.trim() })
        );
        cancelEdit();
    }

    function deleteMessage(messageId) {
        if (!stompClient || !connected) return;
        if (!window.confirm('Delete this message?')) return;
        stompClient.send(
            `/app/deleteMessage/${roomId}`,
            {},
            JSON.stringify({ messageId, userName: currentUser })
        );
    }

    function sendTyping(isTyping) {
        if (!stompClient || !connected) return;
        stompClient.send(`/app/typing/${roomId}`, {}, JSON.stringify({ userName: currentUser, typing: isTyping }));
    }

    function handleInputChange(e) {
        setInput(e.target.value);

        if (!isTypingRef.current) {
            isTypingRef.current = true;
            sendTyping(true);
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
            sendTyping(false);
        }, 2000);
    }

    function stopTypingNow() {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (isTypingRef.current) {
            isTypingRef.current = false;
            sendTyping(false);
        }
    }

    function handleAttachClick() {
        fileInputRef.current?.click();
    }

    function handleFileChosen(e) {
        const file = e.target.files?.[0];
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

        stopTypingNow();
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
        stopTypingNow();
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
                            isConnecting ? 'bg-yellow-500/10 text-yellow-400' : 'bg-emerald-500/10 text-emerald-400'
                        }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${isConnecting ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'}`} />
                        {isConnecting ? 'Connecting' : 'Live'}
                    </span>
                    {isRoomOwner && (
                        <span className="ml-1 text-xs px-2 py-1 rounded-full bg-[#4C3AED]/15 text-[#8B7CFF]">Owner</span>
                    )}
                    <button
                        onClick={() => setShowMembers((s) => !s)}
                        className="ml-1 flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-white/5 text-[#8B899C] hover:bg-white/10"
                    >
                        <MdGroup style={{ fontSize: 14 }} />
                        {onlineUsers.length}
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Avatar name={currentUser} size={32} online />
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

            {/* Members panel */}
            {showMembers && (
                <div className="absolute top-16 left-4 sm:left-8 z-20 w-64 bg-[#1F1F2B] border border-white/10 rounded-xl shadow-xl overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                        <span className="text-sm font-medium">Members online</span>
                        <button onClick={() => setShowMembers(false)} className="text-[#8B899C] hover:text-[#E8E6F0]">
                            <MdClose style={{ fontSize: 16 }} />
                        </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {onlineUsers.length === 0 && (
                            <p className="text-xs text-[#5F5D6E] px-4 py-3">No one else online right now.</p>
                        )}
                        {onlineUsers.map((name) => (
                            <div key={name} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-b-0">
                                <Avatar name={name} size={28} online />
                                <span className="flex-1 text-sm truncate">
                                    {name}
                                    {name === currentUser ? ' (you)' : ''}
                                </span>
                                {isRoomOwner && name !== currentUser && (
                                    <button
                                        onClick={() => handleKick(name)}
                                        className="text-xs px-2.5 py-1 rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/25"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                onScroll={handleChatScroll}
                className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 flex flex-col gap-3"
                style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.035) 1px, transparent 0)',
                    backgroundSize: '22px 22px',
                }}
            >
                {isLoadingOlder && (
                    <div className="flex justify-center py-2">
                        <span className="block w-5 h-5 border-2 border-white/20 border-t-[#8B7CFF] rounded-full animate-spin" />
                    </div>
                )}

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
                    const showDateDivider = !prev || !isSameDay(new Date(prev.timeStamp), new Date(message.timeStamp));
                    const isEditing = editingMessageId === message.id;

                    const canEdit = isOwn && !message.deleted;
                    const canDelete = (isOwn || isRoomOwner) && !message.deleted;

                    return (
                        <React.Fragment key={message.id || index}>
                            {showDateDivider && <DateDivider label={formatDateDivider(message.timeStamp)} />}

                            <div
                                className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'} ${
                                    isSameSenderAsPrev && !showDateDivider ? 'mt-0' : 'mt-3'
                                }`}
                            >
                                {!isOwn && (
                                    <div className="w-8">
                                        {!isSameSenderAsPrev && (
                                            <Avatar name={message.sender} size={32} online={onlineUsers.includes(message.sender)} />
                                        )}
                                    </div>
                                )}

                                <div className={`max-w-[75%] sm:max-w-md flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                    {!isSameSenderAsPrev && (
                                        <span className={`text-xs text-[#8B899C] mb-1 px-1 ${isOwn ? 'mr-1' : 'ml-1'}`}>
                                            {isOwn ? 'You' : message.sender}
                                        </span>
                                    )}

                                    {isEditing ? (
                                        <div className="w-full min-w-[220px] flex flex-col gap-1.5">
                                            <textarea
                                                value={editingContent}
                                                onChange={(e) => setEditingContent(e.target.value)}
                                                className="w-full text-sm rounded-lg bg-[#1F1F2B] border border-[#4C3AED]/50 px-3 py-2 text-[#E8E6F0] focus:outline-none resize-none"
                                                rows={2}
                                                autoFocus
                                            />
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={cancelEdit} className="text-xs px-2.5 py-1 rounded-md bg-white/5 text-[#8B899C] hover:bg-white/10">
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => saveEdit(message.id)}
                                                    className="text-xs px-2.5 py-1 rounded-md bg-[#4C3AED] text-white hover:bg-[#5B4AF0]"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="group relative">
                                            {!message.deleted && (
                                                <QuickReactBar isOwn={isOwn} onPick={(emoji) => toggleReaction(message.id, emoji)} />
                                            )}
                                            <MessageActions
                                                canEdit={canEdit}
                                                canDelete={canDelete}
                                                isOwn={isOwn}
                                                onEdit={() => startEdit(message)}
                                                onDelete={() => deleteMessage(message.id)}
                                            />
                                            <div
                                                className={`px-3 py-2.5 text-sm leading-relaxed shadow-sm break-words ${
                                                    isOwn
                                                        ? 'bg-[#4C3AED] text-white rounded-2xl rounded-br-md'
                                                        : 'bg-[#1F1F2B] text-[#E8E6F0] rounded-2xl rounded-bl-md border border-white/5'
                                                } ${message.messageType === 'IMAGE' && !message.deleted ? 'p-1.5' : ''}`}
                                            >
                                                <MessageBody message={message} isOwn={isOwn} />
                                            </div>
                                        </div>
                                    )}

                                    {!message.deleted && <ReactionChips message={message} currentUser={currentUser} onToggle={toggleReaction} />}

                                    <span className="text-[10px] text-[#5F5D6E] mt-1 px-1 flex items-center gap-1">
                                        {timeAgo(message.timeStamp)}
                                        {message.edited && !message.deleted && <span className="italic">(edited)</span>}
                                        <SeenTicks message={message} currentUser={currentUser} />
                                    </span>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </main>

            {typingUsers.length > 0 && (
                <div className="px-4 sm:px-8 pb-1 text-xs text-[#8B899C] italic">
                    {typingUsers.length === 1
                        ? `${typingUsers[0]} is typing...`
                        : `${typingUsers.join(', ')} are typing...`}
                </div>
            )}

            {/* Message Input */}
            <div className="px-4 sm:px-8 py-4 bg-[#181822] border-t border-white/5">
                <div className="max-w-3xl mx-auto">
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
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onBlur={stopTypingNow}
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