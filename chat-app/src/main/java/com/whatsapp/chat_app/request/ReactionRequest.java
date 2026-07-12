package com.whatsapp.chat_app.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReactionRequest {
    private String messageId;
    private String emoji;
    private String userName;
}