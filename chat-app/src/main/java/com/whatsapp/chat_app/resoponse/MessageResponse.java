package com.whatsapp.chat_app.resoponse;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@Setter
public class MessageResponse {
    private String id;
    private String sender;
    private String content;
    private String roomId;
    private LocalDateTime timeStamp;

    private String messageType;
    private String fileUrl;
    private String fileName;
    private String fileType;

    private List<String> seenBy;
    private Map<String, List<String>> reactions;
}