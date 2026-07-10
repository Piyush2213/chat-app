import axios from 'axios';
export const baseURL = 'http://127.0.0.1:8080';
export const  httpClient = axios.create({
    baseURL: baseURL,

});