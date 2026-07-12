package com.whatsapp.chat_app.resoponse;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RoomSummary {
    private String roomId;
    private String createdBy;
    private int messageCount;
    private int pendingCount;
    private int approvedCount;
    private int onlineCount;
}