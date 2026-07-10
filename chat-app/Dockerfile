FROM maven:3.9.9-eclipse-temurin-17 AS build

WORKDIR /chat-app

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jdk

COPY --from=build /chat-app/target/chat-app-0.0.1-SNAPSHOT.jar /chat-app-0.0.1-SNAPSHOT.jar
COPY run.sh /run.sh

RUN chmod +x /run.sh

EXPOSE 8080

ENTRYPOINT ["/run.sh"]