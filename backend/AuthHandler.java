import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class AuthHandler implements HttpHandler {
    private static final String ADMIN_PASSWORD = System.getenv("ADMIN_PASSWORD");
    private static final String STAFF_PASSWORD = System.getenv("STAFF_PASSWORD");

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, OPTIONS");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type, X-Admin-Password");

        if(exchange.getRequestMethod().equals("OPTIONS")){
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        String header = exchange.getRequestHeaders().getFirst("X-Admin-Password");
        String role = null;
        if(ADMIN_PASSWORD != null && ADMIN_PASSWORD.equals(header)){
            role = "admin";
        } else if(STAFF_PASSWORD != null && STAFF_PASSWORD.equals(header)){
            role = "staff";
        }

        if(role == null){
            sendJson(exchange, 401, "{\"error\":\"unauthorized\"}");
        } else {
            sendJson(exchange, 200, "{\"role\":\"" + role + "\"}");
        }
    }

    private void sendJson(HttpExchange exchange, int status, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try(OutputStream os = exchange.getResponseBody()){
            os.write(bytes);
        }
    }
}
