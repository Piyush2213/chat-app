import { httpClient } from '../config/AxiosHelper';

// Converts a browser File object into a base64 string WITHOUT the
// "data:image/png;base64," prefix, since the backend expects raw base64.
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result; // "data:image/png;base64,AAAA..."
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

// Uploads a file to the backend and returns { url, fileName, fileType }.
export async function uploadFileApi(file) {
    const fileData = await fileToBase64(file);

    const response = await httpClient.post('/api/v1/files/upload', {
        fileName: file.name,
        fileType: file.type,
        fileData,
    });

    return response.data; // { url, fileName, fileType }
}