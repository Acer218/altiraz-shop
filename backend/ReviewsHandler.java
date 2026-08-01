import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

public class ReviewsHandler implements HttpHandler {
    private static final String ADMIN_PASSWORD = "i HATE MY LIFE218";
    private static final String ORDER_TAKER_PASSWORD = "orders123";
    private final Gson gson = new Gson();
    private final ReviewDao dao = new ReviewDao();

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
                Integer productId = parseProductId(exchange);
                if(productId == null){
                    sendJson(exchange, 400, "{\"error\":\"productId is required\"}");
                    return;
                }
                List<Review> reviews = dao.getByProduct(productId);
                sendJson(exchange, 200, gson.toJson(reviews));
                return;
            }

            if(method.equals("POST") && id == null){
                Review r = gson.fromJson(readBody(exchange), Review.class);
                if(r.name == null || r.name.trim().isEmpty() || r.rating < 1 || r.rating > 5){
                    sendJson(exchange, 400, "{\"error\":\"invalid review\"}");
                    return;
                }
                Review created = dao.create(r);
                sendJson(exchange, 201, gson.toJson(created));
                return;
            }

            if(method.equals("DELETE") && id != null){
                if(!checkAdmin(exchange)){
                    sendJson(exchange, 401, "{\"error\":\"unauthorized\"}");
                    return;
                }
                dao.delete(id);
                sendJson(exchange, 200, "{\"deleted\":true}");
                return;
            }

            sendJson(exchange, 404, "{\"error\":\"not found\"}");
        } catch(Exception e){
            e.printStackTrace();
            sendJson(exchange, 500, "{\"error\":\"server error\"}");
        }
    }

    private Integer parseProductId(HttpExchange exchange){
        String query = exchange.getRequestURI().getQuery();
        if(query == null) return null;
        for(String pair : query.split("&")){
            String[] kv = pair.split("=");
            if(kv.length == 2 && kv[0].equals("productId")){
                try{ return Integer.parseInt(kv[1]); }catch(NumberFormatException e){ return null; }
            }
        }
        return null;
    }

    private boolean checkAdmin(HttpExchange exchange){
        String header = exchange.getRequestHeaders().getFirst("X-Admin-Password");
        return ADMIN_PASSWORD.equals(header) || ORDER_TAKER_PASSWORD.equals(header);
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
