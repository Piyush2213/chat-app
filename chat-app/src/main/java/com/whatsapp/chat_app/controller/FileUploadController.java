package com.whatsapp.chat_app.controller;

import com.whatsapp.chat_app.request.FileUploadRequest;
import com.whatsapp.chat_app.resoponse.FileUploadResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/files")
@CrossOrigin(origins = {"http://3.111.225.244:5173", "https://involved-novel-absolute-behalf.trycloudflare.com"}, allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
public class FileUploadController {

    // Folder (relative to where the app runs) where uploaded files are stored on disk.
    private static final String UPLOAD_DIR = "uploads";

    // 10 MB cap on the decoded file size. Adjust as needed.
    private static final long MAX_FILE_SIZE_BYTES = 10L * 1024 * 1024;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestBody FileUploadRequest request) {
        try {
            if (request.getFileData() == null || request.getFileData().isBlank()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("No file data provided");
            }

            // Some clients send data URLs like "data:image/png;base64,AAAA...".
            // Strip the prefix if present so we only decode the actual base64 payload.
            String base64Data = request.getFileData();
            int commaIndex = base64Data.indexOf(",");
            if (base64Data.startsWith("data:") && commaIndex != -1) {
                base64Data = base64Data.substring(commaIndex + 1);
            }

            byte[] decodedBytes = Base64.getDecoder().decode(base64Data);

            if (decodedBytes.length > MAX_FILE_SIZE_BYTES) {
                return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body("File exceeds 10MB limit");
            }

            // Make sure the upload directory exists.
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Prefix with a UUID so files never collide, but keep the original
            // extension so browsers/OS still recognize the file type.
            String originalName = request.getFileName() != null ? request.getFileName() : "file";
            String extension = "";
            int dotIndex = originalName.lastIndexOf(".");
            if (dotIndex != -1) {
                extension = originalName.substring(dotIndex);
            }
            String storedFileName = UUID.randomUUID() + extension;

            Path filePath = uploadPath.resolve(storedFileName);
            Files.write(filePath, decodedBytes);

            // This must match the resource handler mapping registered in StaticResourceConfig.
            String fileUrl = "/uploads/" + storedFileName;

            FileUploadResponse response = new FileUploadResponse(
                    fileUrl,
                    originalName,
                    request.getFileType()
            );

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid base64 file data");
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to save file");
        }
    }
}