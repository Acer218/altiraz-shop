import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class OrderDao {

    public Order create(Order o) throws Exception {
        String sql = "INSERT INTO orders (customer_name, phone, location, total_price) VALUES (?, ?, ?, ?)";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)){
            ps.setString(1, o.name);
            ps.setString(2, o.phone);
            ps.setString(3, o.location);
            ps.setDouble(4, o.total);
            ps.executeUpdate();
            try(ResultSet keys = ps.getGeneratedKeys()){
                keys.next();
                o.id = keys.getInt(1);
            }
            String itemSql = "INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES (?, ?, ?, ?, ?)";
            try(PreparedStatement ips = con.prepareStatement(itemSql)){
                for(OrderItem item : o.items){
                    ips.setInt(1, o.id);
                    ips.setInt(2, item.productId);
                    ips.setString(3, item.name);
                    ips.setDouble(4, item.price);
                    ips.setInt(5, item.qty);
                    ips.addBatch();
                }
                ips.executeBatch();
            }
        }
        return o;
    }

    public List<Order> getAll() throws Exception {
        Map<Integer, Order> map = new LinkedHashMap<>();
        String sql = "SELECT o.id, o.customer_name, o.phone, o.location, o.total_price, o.created_at, " +
                     "i.product_name, i.price, i.quantity " +
                     "FROM orders o LEFT JOIN order_items i ON i.order_id = o.id " +
                     "ORDER BY o.id DESC";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql);
            ResultSet rs = ps.executeQuery()){
            while(rs.next()){
                int id = rs.getInt("id");
                Order o = map.get(id);
                if(o == null){
                    o = new Order();
                    o.id = id;
                    o.name = rs.getString("customer_name");
                    o.phone = rs.getString("phone");
                    o.location = rs.getString("location");
                    o.total = rs.getDouble("total_price");
                    Timestamp ts = rs.getTimestamp("created_at");
                    o.date = ts.toInstant().toString();
                    o.items = new ArrayList<>();
                    map.put(id, o);
                }
                String pname = rs.getString("product_name");
                if(pname != null){
                    OrderItem item = new OrderItem();
                    item.name = pname;
                    item.price = rs.getDouble("price");
                    item.qty = rs.getInt("quantity");
                    o.items.add(item);
                }
            }
        }
        return new ArrayList<>(map.values());
    }

    public void delete(int id) throws Exception {
        String sql = "DELETE FROM orders WHERE id=?";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)){
            ps.setInt(1, id);
            ps.executeUpdate();
        }
    }
}