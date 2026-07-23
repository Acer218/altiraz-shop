FROM eclipse-temurin:21-jdk

WORKDIR /app

ADD https://repo1.maven.org/maven2/org/postgresql/postgresql/42.7.4/postgresql-42.7.4.jar /app/lib/postgresql-42.7.4.jar
ADD https://repo1.maven.org/maven2/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar /app/lib/gson-2.10.1.jar

COPY backend/*.java ./src/

RUN javac -cp "lib/*" -d out src/*.java

EXPOSE 8080

CMD ["java", "-cp", "out:lib/*", "Main"]
