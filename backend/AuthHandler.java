import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class AuthHandler implements HttpHandler {
    private static final String ADMIN_PASSWORD = System.getenv("ADMIN_PASSWORD");
    private static final String STAFF_PASSWORD = System.getenv("STAFF_PASSWORD");
    private final StaffUserDao staffUserDao = new StaffUserDao();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, OPTIONS");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type, X-Admin-Password, X-Username");

        if(exchange.getRequestMethod().equals("OPTIONS")){
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        String password = exchange.getRequestHeaders().getFirst("X-Admin-Password");
        String username = exchange.getRequestHeaders().getFirst("X-Username");

        try{
            if(username != null && !username.trim().isEmpty()){
                StaffUserAuth user = staffUserDao.getForAuth(username.trim());
                if(user != null && user.active && PasswordUtil.verify(password, user.salt, user.passwordHash)){
                    sendJson(exchange, 200, "{\"role\":\"" + user.role + "\",\"name\":\"" + escapeJson(user.name) + "\"}");
                } else {
                    sendJson(exchange, 401, "{\"error\":\"unauthorized\"}");
                }
                return;
            }

            String role = null;
            String name = null;
            if(ADMIN_PASSWORD != null && ADMIN_PASSWORD.equals(password)){
                role = "admin";
                name = "المدير";
            } else if(STAFF_PASSWORD != null && STAFF_PASSWORD.equals(password)){
                role = "staff";
                name = "فريق الطلبات";
            }

            if(role == null){
                sendJson(exchange, 401, "{\"error\":\"unauthorized\"}");
            } else {
                sendJson(exchange, 200, "{\"role\":\"" + role + "\",\"name\":\"" + name + "\"}");
            }
        }catch(Exception e){
            e.printStackTrace();
            sendJson(exchange, 500, "{\"error\":\"server error\"}");
        }
    }

    private String escapeJson(String s){
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
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
