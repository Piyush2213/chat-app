import axios from 'axios';
export const baseURL = 'http://3.111.225.244:8080';
export const  httpClient = axios.create({
    baseURL: baseURL,

});