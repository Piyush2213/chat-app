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
    private String id;

    private String sender;
    private String content;
    private LocalDateTime timeStamp;

    private String messageType;
    private String fileUrl;
    private String fileName;
    private String fileType;

    private List<String> seenBy = new ArrayList<>();
    private Map<String, List<String>> reactions = new HashMap<>();

    // True once the author has edited the content at least once.
    private boolean edited = false;

    // Soft-delete: content/file fields get cleared, but the message stays
    // in place (as a placeholder) so the conversation flow isn't disrupted.
    private boolean deleted = false;

    public Message(String sender, String content) {
        this.id = UUID.randomUUID().toString();
        this.content = content;
        this.sender = sender;
        this.timeStamp = LocalDateTime.now();
        this.messageType = "TEXT";
        this.seenBy = new ArrayList<>();
        this.reactions = new HashMap<>();
        this.edited = false;
        this.deleted = false;
    }
}