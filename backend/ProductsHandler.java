import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

public class ProductsHandler implements HttpHandler {
    private static final String ADMIN_PASSWORD = "i HATE MY LIFE218";
    private final Gson gson = new Gson();
    private final ProductDao dao = new ProductDao();

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
                List<Product> products = dao.getAll();
                sendJson(exchange, 200, gson.toJson(products));
                return;
            }

            if(!checkAdmin(exchange)){
                sendJson(exchange, 401, "{\"error\":\"unauthorized\"}");
                return;
            }

            if(method.equals("POST")){
                Product p = gson.fromJson(readBody(exchange), Product.class);
                Product created = dao.create(p);
                sendJson(exchange, 201, gson.toJson(created));
            } else if(method.equals("PUT") && id != null){
                Product p = gson.fromJson(readBody(exchange), Product.class);
                p.id = id;
                dao.update(p);
                sendJson(exchange, 200, gson.toJson(p));
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
        return ADMIN_PASSWORD.equals(header);
    }

    private String readBody(HttpExchange exchange) throws IOException {
        return new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
    }

    private void addCorsHeaders(HttpExchange exchange){
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
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
