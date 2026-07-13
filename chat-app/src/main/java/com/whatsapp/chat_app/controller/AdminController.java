package com.whatsapp.chat_app.controller;

import com.whatsapp.chat_app.Repo.AdminUserRepo;
import com.whatsapp.chat_app.Repo.RoomRepo;
import com.whatsapp.chat_app.config.JwtUtil;
import com.whatsapp.chat_app.entity.AdminUser;
import com.whatsapp.chat_app.entity.Room;
import com.whatsapp.chat_app.request.AdminLoginRequest;
import com.whatsapp.chat_app.request.AdminSetupRequest;
import com.whatsapp.chat_app.resoponse.AdminLoginResponse;
import com.whatsapp.chat_app.resoponse.RoomSummary;
import com.whatsapp.chat_app.service.PresenceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin")
@CrossOrigin(origins = {"http://3.111.225.244:5173", "https://involved-novel-absolute-behalf.trycloudflare.com"}, allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
public class AdminController {

    @Autowired
    private AdminUserRepo adminUserRepo;

    @Autowired
    private RoomRepo roomRepo;

    @Autowired
    private PresenceService presenceService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // One-time only: works exactly once, the first time it's called, then
    // permanently refuses (count() > 0). Call this yourself right after
    // deploying -- e.g. via curl or Postman -- to set your own credentials.
    // There is intentionally no frontend page for this: exposing a public
    // "create admin" UI would itself be a race-to-claim-it vulnerability.
    @PostMapping("/setup")
    public ResponseEntity<?> setup(@RequestBody AdminSetupRequest request) {
        if (adminUserRepo.count() > 0) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Admin already configured");
        }
        if (request.getUsername() == null || request.getUsername().isBlank()
                || request.getPassword() == null || request.getPassword().length() < 8) {
            return ResponseEntity.badRequest().body("Username and a password (8+ characters) are required");
        }

        AdminUser admin = new AdminUser();
        admin.setUsername(request.getUsername());
        admin.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        adminUserRepo.save(admin);

        return ResponseEntity.ok("Admin account created");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AdminLoginRequest request) {
        AdminUser admin = adminUserRepo.findByUsername(request.getUsername());
        if (admin == null || !passwordEncoder.matches(request.getPassword(), admin.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }
        String token = jwtUtil.generateToken(admin.getUsername());
        return ResponseEntity.ok(new AdminLoginResponse(token));
    }

    @GetMapping("/rooms")
    public ResponseEntity<List<RoomSummary>> listRooms() {
        List<Room> rooms = roomRepo.findAll();
        List<RoomSummary> summaries = rooms.stream().map(room -> {
            RoomSummary s = new RoomSummary();
            s.setRoomId(room.getRoomId());
            s.setCreatedBy(room.getCreatedBy());
            s.setMessageCount(room.getMessages() != null ? room.getMessages().size() : 0);
            s.setPendingCount(room.getPendingRequests() != null ? room.getPendingRequests().size() : 0);
            s.setApprovedCount(room.getApprovedUsers() != null ? room.getApprovedUsers().size() : 0);
            s.setOnlineCount(presenceService.getOnlineUsers(room.getRoomId()).size());
            return s;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(summaries);
    }

    // Deletes the room entirely and force-disconnects anyone currently in it.
    @DeleteMapping("/rooms/{roomId}")
    public ResponseEntity<Void> deleteRoom(@PathVariable String roomId) {
        roomRepo.deleteById(roomId);
        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId + "/roomClosed",
                "This room has been shut down by an administrator."
        );
        return ResponseEntity.ok().build();
    }
}