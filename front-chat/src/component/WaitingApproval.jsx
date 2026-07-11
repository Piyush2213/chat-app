import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import toast from 'react-hot-toast';
import useChatContext from '../context/ChatContext';
import { baseURL } from '../config/AxiosHelper';

function WaitingApproval() {
    const { roomId, currentUser, setConnected, setIsRoomOwner } = useChatContext();
    const navigate = useNavigate();
    const [status, setStatus] = useState('waiting'); // 'waiting' | 'denied'
    const stompRef = useRef(null);

    useEffect(() => {
        // If someone lands here directly without going through the join flow,
        // there's nothing to wait for.
        if (!roomId || !currentUser) {
            navigate('/');
            return;
        }

        const socket = new SockJS(`${baseURL}/chat`);
        const client = Stomp.over(socket);
        stompRef.current = client;

        client.connect({}, () => {
            client.subscribe(`/topic/room/${roomId}/joinDecision`, (message) => {
                const event = JSON.parse(message.body);
                if (event.userName !== currentUser) return; // not about us

                if (event.approved) {
                    setIsRoomOwner(false);
                    setConnected(true);
                    toast.success('You were approved! Joining room...');
                    navigate('/chat');
                } else {
                    setStatus('denied');
                    toast.error('The room owner denied your request.');
                }
            });
        });

        return () => {
            if (stompRef.current?.connected) {
                stompRef.current.disconnect();
            }
        };
    }, [roomId, currentUser]);

    function goBack() {
        navigate('/');
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-teal-500 to-indigo-600">
            <div className="p-8 w-full max-w-md flex flex-col items-center gap-5 rounded-lg shadow-lg bg-white text-center">
                {status === 'waiting' ? (
                    <>
                        <span className="block w-10 h-10 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
                        <h1 className="text-2xl font-semibold text-gray-800">Waiting for approval</h1>
                        <p className="text-gray-600">
                            The owner of room <span className="font-medium text-gray-800">{roomId}</span> needs to let you in.
                            This page will update automatically.
                        </p>
                    </>
                ) : (
                    <>
                        <div className="w-10 h-10 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xl font-bold">
                            !
                        </div>
                        <h1 className="text-2xl font-semibold text-gray-800">Request denied</h1>
                        <p className="text-gray-600">The room owner didn't approve your request to join.</p>
                    </>
                )}
                <button
                    onClick={goBack}
                    className="px-6 py-3 w-full bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition duration-200"
                >
                    Back to home
                </button>
            </div>
        </div>
    );
}

export default WaitingApproval;