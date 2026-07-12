import axios from 'axios';
import { baseURL } from '../config/AxiosHelper';

const ADMIN_TOKEN_KEY = 'chatapp_admin_token';

export function getAdminToken() {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
}

// Separate axios client so admin requests always carry the current token,
// without touching the regular (unauthenticated) chat API client.
const adminClient = axios.create({ baseURL });

adminClient.interceptors.request.use((config) => {
    const token = getAdminToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const adminLoginApi = async (username, password) => {
    const response = await adminClient.post('/api/v1/admin/login', { username, password });
    return response.data; // { token }
};

export const getAllRoomsAdminApi = async () => {
    const response = await adminClient.get('/api/v1/admin/rooms');
    return response.data;
};

export const deleteRoomAdminApi = async (roomId) => {
    const response = await adminClient.delete(`/api/v1/admin/rooms/${roomId}`);
    return response.data;
};

export default adminClient;