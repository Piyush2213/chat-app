package com.whatsapp.chat_app.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminSetupRequest {
    private String username;
    private String password;
}