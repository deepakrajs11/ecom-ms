FROM eclipse-temurin:21-jdk AS build

ARG SERVICE
WORKDIR /workspace

COPY ${SERVICE}/.mvn .mvn
COPY ${SERVICE}/mvnw ${SERVICE}/pom.xml ./
RUN sed -i 's/\r$//' ./mvnw && chmod +x ./mvnw && ./mvnw -DskipTests dependency:go-offline

COPY ${SERVICE}/src ./src
RUN ./mvnw -DskipTests package

FROM eclipse-temurin:21-jre

WORKDIR /app
COPY --from=build /workspace/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
