package com.whatsapp.chat_app.resoponse;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SeenEvent {
    private String messageId;
    private List<String> seenBy;
}