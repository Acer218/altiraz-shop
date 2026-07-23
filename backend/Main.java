import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;

public class Main {
    public static void main(String[] args) throws Exception {
        String portEnv = System.getenv("PORT");
        int port = (portEnv != null) ? Integer.parseInt(portEnv) : 8080;
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/api/products", new ProductsHandler());
        server.createContext("/api/orders", new OrdersHandler());
        server.setExecutor(null);
        server.start();
        System.out.println("Server running on port " + port);
    }
}