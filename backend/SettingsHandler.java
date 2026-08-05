import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class SettingsHandler implements HttpHandler {
    private static final String ADMIN_PASSWORD = "i HATE MY LIFE218";
    private final Gson gson = new Gson();
    private final SettingsDao dao = new SettingsDao();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        addCorsHeaders(exchange);
        String method = exchange.getRequestMethod();

        if(method.equals("OPTIONS")){
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        try{
            if(method.equals("GET")){
                Settings s = dao.get();
                sendJson(exchange, 200, gson.toJson(s));
                return;
            }

            if(!checkAdmin(exchange)){
                sendJson(exchange, 401, "{\"error\":\"unauthorized\"}");
                return;
            }

            if(method.equals("PUT")){
                Settings s = gson.fromJson(readBody(exchange), Settings.class);
                dao.update(s);
                sendJson(exchange, 200, gson.toJson(s));
            } else {
                sendJson(exchange, 404, "{\"error\":\"not found\"}");
            }
        } catch(Exception e){
            e.printStackTrace();
            sendJson(exchange, 500, "{\"error\":\"server error\"}");
        }
    }

    private boolean checkAdmin(HttpExchange exchange){
        String header = exchange.getRequestHeaders().getFirst("X-Admin-Password");
        return ADMIN_PASSWORD.equals(header);
    }

    private String readBody(HttpExchange exchange) throws IOException {
        return new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
    }

    private void addCorsHeaders(HttpExchange exchange){
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type, X-Admin-Password");
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
