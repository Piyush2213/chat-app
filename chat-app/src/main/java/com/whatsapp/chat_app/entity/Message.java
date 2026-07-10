package com.whatsapp.chat_app.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
public class Message {
    private String sender;
    private String content;
    private LocalDateTime timeStamp;

    // New fields for file/image sharing.
    // messageType is "TEXT" (default), "IMAGE", or "FILE".
    private String messageType;
    private String fileUrl;
    private String fileName;
    private String fileType;

    public Message(String sender, String content) {
        this.content = content;
        this.sender = sender;
        this.timeStamp = LocalDateTime.now();
        this.messageType = "TEXT";
    }
}