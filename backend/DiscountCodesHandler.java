import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

public class DiscountCodesHandler implements HttpHandler {
    private static final String ADMIN_PASSWORD = System.getenv("ADMIN_PASSWORD");
    private final Gson gson = new Gson();
    private final DiscountCodeDao dao = new DiscountCodeDao();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        addCorsHeaders(exchange);
        String method = exchange.getRequestMethod();

        if(method.equals("OPTIONS")){
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        String path = exchange.getRequestURI().getPath();
        String[] parts = path.split("/");
        Integer id = null;
        if(parts.length > 3){
            try{ id = Integer.parseInt(parts[3]); }catch(NumberFormatException ignored){}
        }

        try{
            if(method.equals("GET") && id == null){
                String query = exchange.getRequestURI().getQuery();
                if(query != null && query.startsWith("code=")){
                    String code = URLDecoder.decode(query.substring(5), StandardCharsets.UTF_8);
                    DiscountCode dc = dao.getByCode(code);
                    if(dc != null && dc.active){
                        sendJson(exchange, 200, "{\"valid\":true,\"percent\":" + dc.percent + ",\"code\":\"" + dc.code + "\"}");
                    } else {
                        sendJson(exchange, 200, "{\"valid\":false}");
                    }
                    return;
                }

                if(!checkAdmin(exchange)){
                    sendJson(exchange, 401, "{\"error\":\"unauthorized\"}");
                    return;
                }
                List<DiscountCode> codes = dao.getAll();
                sendJson(exchange, 200, gson.toJson(codes));
                return;
            }

            if(!checkAdmin(exchange)){
                sendJson(exchange, 401, "{\"error\":\"unauthorized\"}");
                return;
            }

            if(method.equals("POST")){
                DiscountCode dc = gson.fromJson(readBody(exchange), DiscountCode.class);
                if(dc.code == null || dc.code.trim().isEmpty() || dc.percent <= 0 || dc.percent > 100){
                    sendJson(exchange, 400, "{\"error\":\"invalid code or percent\"}");
                    return;
                }
                DiscountCode created = dao.create(dc);
                sendJson(exchange, 201, gson.toJson(created));
            } else if(method.equals("DELETE") && id != null){
                dao.delete(id);
                sendJson(exchange, 200, "{\"deleted\":true}");
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
        return ADMIN_PASSWORD != null && ADMIN_PASSWORD.equals(header);
    }

    private String readBody(HttpExchange exchange) throws IOException {
        return new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
    }

    private void addCorsHeaders(HttpExchange exchange){
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
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
