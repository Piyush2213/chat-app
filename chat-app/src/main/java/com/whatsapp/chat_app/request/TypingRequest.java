package com.whatsapp.chat_app.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TypingRequest {
    private String userName;
    private boolean typing;
}