import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

public class OrdersHandler implements HttpHandler {
    private static final String ADMIN_PASSWORD = System.getenv("ADMIN_PASSWORD");
    private static final String ORDER_TAKER_PASSWORD = System.getenv("STAFF_PASSWORD");
    private final Gson gson = new Gson();
    private final OrderDao dao = new OrderDao();
    private final DiscountCodeDao discountCodeDao = new DiscountCodeDao();
    private final ProductDao productDao = new ProductDao();
    private final SettingsDao settingsDao = new SettingsDao();

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
            if(method.equals("POST") && id == null){
                Order o = gson.fromJson(readBody(exchange), Order.class);

                if(o.name == null || o.name.trim().isEmpty()
                        || o.phone == null || !o.phone.matches("[0-9]{10}")
                        || o.location == null || o.location.trim().isEmpty()
                        || o.items == null || o.items.isEmpty()){
                    sendJson(exchange, 400, "{\"error\":\"invalid order data\"}");
                    return;
                }

                boolean isInspection = "inspection".equals(o.orderType);
                List<Product> allProducts = productDao.getAll();
                Settings currentSettings = settingsDao.get();

                double subtotal = 0;
                for(OrderItem item : o.items){
                    Product match = null;
                    for(Product p : allProducts){
                        if(p.id == item.productId){ match = p; break; }
                    }
                    if(match == null){
                        sendJson(exchange, 400, "{\"error\":\"invalid product in order\"}");
                        return;
                    }
                    if(item.qty < 1) item.qty = 1;
                    item.price = match.price;
                    item.name = match.name;
                    subtotal += item.price * item.qty;
                }

                if(isInspection){
                    o.deliveryFee = 0;
                    o.inspectionFee = currentSettings.inspectionFee;
                    o.discountCode = null;
                    o.discountAmount = 0;
                    o.total = currentSettings.inspectionFee;
                } else {
                    o.deliveryFee = currentSettings.deliveryFee;
                    o.inspectionFee = 0;
                    double discountAmount = 0;
                    if(o.discountCode != null && !o.discountCode.trim().isEmpty()){
                        DiscountCode dc = discountCodeDao.getByCode(o.discountCode);
                        if(dc != null && dc.active && (dc.maxUses == null || dc.usedCount < dc.maxUses)){
                            discountAmount = subtotal * (dc.percent / 100.0);
                            o.discountCode = dc.code;
                        } else {
                            o.discountCode = null;
                        }
                    }
                    o.discountAmount = discountAmount;
                    o.total = subtotal - discountAmount + o.deliveryFee;
                }

                Order created = dao.create(o);
                if(o.discountCode != null && !o.discountCode.trim().isEmpty()){
                    try{ discountCodeDao.incrementUsage(o.discountCode); }catch(Exception ignored){}
                }
                new Thread(() -> TelegramNotifier.sendOrderAlert(created)).start();
                sendJson(exchange, 201, gson.toJson(created));
                return;
            }

            if(!checkAdmin(exchange)){
                sendJson(exchange, 401, "{\"error\":\"unauthorized\"}");
                return;
            }

            if(method.equals("GET") && id == null){
                List<Order> orders = dao.getAll();
                sendJson(exchange, 200, gson.toJson(orders));
            } else if(method.equals("PUT") && id != null){
                Order o = gson.fromJson(readBody(exchange), Order.class);
                dao.updateStatus(id, o.status);
                sendJson(exchange, 200, "{\"updated\":true}");
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
        return ADMIN_PASSWORD.equals(header) || ORDER_TAKER_PASSWORD.equals(header);
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
