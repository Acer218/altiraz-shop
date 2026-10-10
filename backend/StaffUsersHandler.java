import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;


public class StaffUsersHandler implements HttpHandler {
    private static final String ADMIN_PASSWORD = System.getenv("ADMIN_PASSWORD");
    private final Gson gson = new Gson();
    private final StaffUserDao dao = new StaffUserDao();
    private final ActivityLogDao logDao = new ActivityLogDao();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        addCorsHeaders(exchange);
        String method = exchange.getRequestMethod();

        if(method.equals("OPTIONS")){
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        if(!checkAdmin(exchange)){
            sendJson(exchange, 401, "{\"error\":\"unauthorized\"}");
            return;
        }

        String path = exchange.getRequestURI().getPath();
        String[] parts = path.split("/");
        Integer id = null;
        if(parts.length > 3){
            try{ id = Integer.parseInt(parts[3]); }catch(NumberFormatException ignored){}
        }
        String actor = exchange.getRequestHeaders().getFirst("X-Actor-Name");

        try{
            if(method.equals("GET") && id == null){
                List<StaffUser> users = dao.getAll();
                sendJson(exchange, 200, gson.toJson(users));
            } else if(method.equals("POST")){
                StaffUser u = gson.fromJson(readBody(exchange), StaffUser.class);
                if(u.name == null || u.name.trim().isEmpty()
                        || u.username == null || u.username.trim().isEmpty()
                        || u.password == null || u.password.trim().isEmpty()
                        || u.role == null || !(u.role.equals("admin") || u.role.equals("staff"))){
                    sendJson(exchange, 400, "{\"error\":\"invalid data\"}");
                    return;
                }
                StaffUser created = dao.create(u);
                logDao.log(actor, "أنشأ حسابًا جديدًا: " + created.name + " (" + created.role + ")");
                sendJson(exchange, 201, gson.toJson(created));
            } else if(method.equals("PUT") && id != null){
                StaffUser u = gson.fromJson(readBody(exchange), StaffUser.class);
                dao.setActive(id, u.active);
                logDao.log(actor, (u.active ? "فعّل" : "عطّل") + " حساب موظف رقم " + id);
                sendJson(exchange, 200, "{\"updated\":true}");
            } else if(method.equals("DELETE") && id != null){
                dao.delete(id);
                logDao.log(actor, "حذف حساب موظف رقم " + id);
                sendJson(exchange, 200, "{\"deleted\":true}");
            } else {
                sendJson(exchange, 404, "{\"error\":\"not found\"}");
            }
        }catch(Exception e){
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
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type, X-Admin-Password, X-Actor-Name");
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
