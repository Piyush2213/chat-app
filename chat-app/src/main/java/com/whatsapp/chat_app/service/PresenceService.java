package com.whatsapp.chat_app.service;

import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PresenceService {

    // roomId -> usernames currently online in that room
    private final Map<String, Set<String>> roomOnlineUsers = new ConcurrentHashMap<>();

    // websocket sessionId -> [roomId, userName], so a disconnect knows who to remove
    private final Map<String, String[]> sessionInfo = new ConcurrentHashMap<>();

    public void userConnected(String sessionId, String roomId, String userName) {
        roomOnlineUsers.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet()).add(userName);
        sessionInfo.put(sessionId, new String[]{roomId, userName});
    }

    // Returns [roomId, userName] for the session that disconnected, or null if unknown.
    public String[] userDisconnected(String sessionId) {
        String[] info = sessionInfo.remove(sessionId);
        if (info != null) {
            Set<String> users = roomOnlineUsers.get(info[0]);
            if (users != null) {
                users.remove(info[1]);
            }
        }
        return info;
    }

    public Set<String> getOnlineUsers(String roomId) {
        return roomOnlineUsers.getOrDefault(roomId, Collections.emptySet());
    }
}