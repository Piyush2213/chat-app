import {httpClient} from '../config/AxiosHelper'

export const createRoomApi = async (roomDetail) => {
    const response = await httpClient.post(`api/v1/rooms/create-room`, {
        roomId: roomDetail.roomId,
        userName: roomDetail.userName,
    });
    return response.data;
}

// Now requires userName, since the backend needs to know who's asking to join.
export const JoinChatApi = async (roomId, userName) => {
    const response = await httpClient.get(`api/v1/rooms/join-room/${roomId}`, {
        params: { userName },
    });
    return response.data;
}

export const getMessageApi = async (roomId, size = 50, page = 0) => {
    const response = await httpClient.get(`api/v1/rooms/${roomId}/messages?size=${size}&page=${page}`);
    return response.data;
}

// Room owner fetches the current wait list (e.g. on page load).
export const getPendingRequestsApi = async (roomId) => {
    const response = await httpClient.get(`api/v1/rooms/${roomId}/pending-requests`);
    return response.data;
}

// Room owner accepts or denies a pending user.
export const decideJoinRequestApi = async (roomId, userName, approved) => {
    const response = await httpClient.post(`api/v1/rooms/${roomId}/decision`, {
        userName,
        approved,
    });
    return response.data;
}