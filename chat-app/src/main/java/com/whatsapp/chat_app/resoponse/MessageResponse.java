package com.whatsapp.chat_app.resoponse;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
@Getter
@Setter
public class MessageResponse {
    private String sender;
    private String content;
    private String roomId;
    private LocalDateTime timeStamp;
}
