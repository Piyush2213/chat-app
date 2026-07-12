package com.whatsapp.chat_app.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
public class Message {
    // Stable id so read-receipts and reactions can target a specific message.
    private String id;

    private String sender;
    private String content;
    private LocalDateTime timeStamp;

    private String messageType;
    private String fileUrl;
    private String fileName;
    private String fileType;

    // Usernames who have seen this message (sender is added automatically).
    private List<String> seenBy = new ArrayList<>();

    // emoji -> usernames who reacted with it.
    private Map<String, List<String>> reactions = new HashMap<>();

    public Message(String sender, String content) {
        this.id = UUID.randomUUID().toString();
        this.content = content;
        this.sender = sender;
        this.timeStamp = LocalDateTime.now();
        this.messageType = "TEXT";
        this.seenBy = new ArrayList<>();
        this.reactions = new HashMap<>();
    }
}