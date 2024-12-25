import {httpClient} from '../config/AxiosHelper'

export const createRoomApi= async(roomDetail)=>{
    const response = await httpClient.post(`api/v1/rooms/create-room`, roomDetail);
    return response.data;
}

export const JoinChatApi= async(roomId)=>{
    const response = await httpClient.get(`api/v1/rooms/join-room/${roomId}`);
    return response.data;
}

export const getMessageApi= async(roomId, size=50, page=0)=>{
    const response = await httpClient.get(`api/v1/rooms/${roomId}/messages?size=${size}&page=${page}`);
    return response.data;
}
