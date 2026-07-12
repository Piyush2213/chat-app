package com.whatsapp.chat_app.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DeleteMessageRequest {
    private String messageId;
    private String userName;
}