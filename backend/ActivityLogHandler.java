import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

public class ActivityLogHandler implements HttpHandler {
    private static final String ADMIN_PASSWORD = System.getenv("ADMIN_PASSWORD");
    private final Gson gson = new Gson();
    private final ActivityLogDao dao = new ActivityLogDao();

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
        if(ADMIN_PASSWORD == null || !ADMIN_PASSWORD.equals(header)){
            sendJson(exchange, 401, "{\"error\":\"unauthorized\"}");
            return;
        }

        try{
            List<ActivityLogEntry> entries = dao.getRecent(100);
            sendJson(exchange, 200, gson.toJson(entries));
        }catch(Exception e){
            e.printStackTrace();
            sendJson(exchange, 500, "{\"error\":\"server error\"}");
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
