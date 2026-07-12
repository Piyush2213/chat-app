import {httpClient} from '../config/AxiosHelper'

export const createRoomApi = async (roomDetail) => {
    const response = await httpClient.post(`api/v1/rooms/create-room`, {
        roomId: roomDetail.roomId,
        userName: roomDetail.userName,
    });
    return response.data;
}

export const JoinChatApi = async (roomId, userName) => {
    const response = await httpClient.get(`api/v1/rooms/join-room/${roomId}`, {
        params: { userName },
    });
    return response.data;
}

// page 0 = most recent `size` messages. Higher page = further back in history.
export const getMessageApi = async (roomId, size = 50, page = 0) => {
    const response = await httpClient.get(`api/v1/rooms/${roomId}/messages?size=${size}&page=${page}`);
    return response.data;
}

export const getPendingRequestsApi = async (roomId) => {
    const response = await httpClient.get(`api/v1/rooms/${roomId}/pending-requests`);
    return response.data;
}

export const decideJoinRequestApi = async (roomId, userName, approved) => {
    const response = await httpClient.post(`api/v1/rooms/${roomId}/decision`, {
        userName,
        approved,
    });
    return response.data;
}

// Owner removes an active member from the room.
export const kickUserApi = async (roomId, userName) => {
    const response = await httpClient.post(`api/v1/rooms/${roomId}/kick`, {
        userName,
    });
    return response.data;
}