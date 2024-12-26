# Chat Application

A real-time chat application built using modern web technologies such as React (Frontend), Spring Boot (Backend), and MongoDB (Database). This application allows users to create rooms, send messages, and join public or private chat rooms. It is designed to be scalable, secure, and optimized for performance.

---

## Features

- **Real-time messaging**: Instant communication with other users in real-time.
- **Room creation**: Create and join chat rooms.
- **Private and Public rooms**: Supports both public and private chat rooms.
- **Persistent storage**: Messages are stored in MongoDB.
- **Responsive Design**: Works seamlessly across devices (desktop, tablet, mobile).

---

## Technologies Used

- **Frontend**: React, Vite (for fast development), Axios (for HTTP requests).
- **Backend**: Spring Boot (Java), REST API for communication.
- **Database**: MongoDB (NoSQL).
- **Containerization**: Docker, Docker Compose for easy deployment.
- **Hosting**: AWS EC2, Elastic IP for deployment.

---

## Prerequisites

Before running the application locally or on a server, ensure you have the following installed:

- [Docker](https://www.docker.com/products/docker-desktop) (for containerization)
- [Docker Compose](https://docs.docker.com/compose/) (for managing multi-container applications)
- [Node.js](https://nodejs.org/) (for running frontend locally)
- [Java JDK 11+](https://www.oracle.com/java/technologies/javase-jdk11-downloads.html) (for Spring Boot)
- [MongoDB](https://www.mongodb.com/try/download/community) or a MongoDB Cloud instance (for persistent storage)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/chat-application.git
cd chat-application
```

### 2. Setup Environment Variables

Create a `.env` file in the root of the project and configure the necessary environment variables for the backend and database:

```bash
# Backend environment variables
MONGODB_USER=your_mongodb_username
MONGODB_PASSWORD=your_mongodb_password
MONGODB_DATABASE=your_database_name
SPRING_LOCAL_PORT=8080
SPRING_DOCKER_PORT=8080

# MongoDB environment variables
MONGODB_LOCAL_PORT=27017
MONGODB_DOCKER_PORT=27017
```

### 3. Build Docker Containers

If you're using Docker for deployment, you can use Docker Compose to build and start the application:

```bash
docker-compose up --build
```

This command will:
- Build the Docker images for the frontend, backend, and MongoDB.
- Start the application in different containers.
- Expose the frontend on `http://localhost:5173` and the backend on `http://localhost:8080`.

### 4. Running Locally (Frontend)

If you're running the frontend locally for development (without Docker), navigate to the `frontend` directory and start the application using Vite:

```bash
cd front-chat
npm install
npm run dev
```

By default, the frontend will be available at `http://localhost:5173`.

### 5. Running Locally (Backend)

Navigate to the backend folder and run the Spring Boot application:

```bash
cd chat-backend
./mvnw spring-boot:run
```

The backend will be accessible at `http://localhost:8080`.

---

## Deployment

To deploy the application to AWS EC2, follow these steps:

1. **Create an EC2 instance** with your desired operating system (e.g., Amazon Linux 2).
2. **Install Docker** on your EC2 instance:

   ```bash
   sudo yum update -y
   sudo amazon-linux-extras install docker
   sudo service docker start
   sudo usermod -a -G docker ec2-user
   ```

3. **Allocate and Associate an Elastic IP** to your EC2 instance.

4. **Transfer your Docker Compose setup to EC2**:

   - Use `scp` (Secure Copy Protocol) or any file transfer tool to upload your project files to the EC2 instance.
   
   ```bash
   scp -i your-ec2-key.pem -r /path/to/your/chat-application ec2-user@your-ec2-ip:/home/ec2-user/
   ```

5. **Run Docker Compose on EC2**:

   Navigate to your project directory on the EC2 instance and run:

   ```bash
   docker-compose up --build -d
   ```

   This will start your chat application on the EC2 instance, accessible via the Elastic IP.

---


## Testing

You can test the application by visiting the following URLs:

- **Frontend**: `http://localhost:5173` (or your EC2 IP if deployed on EC2)
- **Backend API**: `http://localhost:8080/api/v1/rooms/create-room` (or your EC2 IP if deployed)

For automated tests, run the backend tests using Maven:

```bash
cd chat-backend
./mvnw test
```

---


## Contributing

Contributions are welcome! Please fork this repository, make your changes, and submit a pull request. Ensure your code follows the project's coding standards and includes appropriate tests.
