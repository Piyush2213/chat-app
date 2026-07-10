package com.whatsapp.chat_app.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadRequest {
    // Original file name, e.g. "vacation.jpg"
    private String fileName;

    // MIME type, e.g. "image/jpeg" or "application/pdf"
    private String fileType;

    // Raw base64 content WITHOUT the "data:image/png;base64," prefix.
    // Strip that prefix on the frontend before sending.
    private String fileData;
}