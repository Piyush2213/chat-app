package com.whatsapp.chat_app.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EditMessageRequest {
    private String messageId;
    private String userName;
    private String content;
}