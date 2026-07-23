import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class ProductDao {

    public List<Product> getAll() throws Exception {
        Map<Integer, Product> map = new LinkedHashMap<>();
        String sql = "SELECT p.id, p.name, p.description, p.category, p.price, i.image_data " +
                     "FROM products p LEFT JOIN product_images i ON i.product_id = p.id " +
                     "ORDER BY p.id DESC, i.sort_order ASC";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql);
            ResultSet rs = ps.executeQuery()){
            while(rs.next()){
                int id = rs.getInt("id");
                Product p = map.get(id);
                if(p == null){
                    p = new Product(id, rs.getString("name"), rs.getString("description"),
                            rs.getString("category"), rs.getDouble("price"), new ArrayList<>());
                    map.put(id, p);
                }
                String img = rs.getString("image_data");
                if(img != null){
                    p.images.add(img);
                }
            }
        }
        return new ArrayList<>(map.values());
    }

    public Product create(Product p) throws Exception {
        String sql = "INSERT INTO products (name, description, category, price) VALUES (?, ?, ?, ?)";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)){
            ps.setString(1, p.name);
            ps.setString(2, p.description);
            ps.setString(3, p.category);
            ps.setDouble(4, p.price);
            ps.executeUpdate();
            try(ResultSet keys = ps.getGeneratedKeys()){
                keys.next();
                p.id = keys.getInt(1);
            }
            insertImages(con, p.id, p.images);
        }
        return p;
    }

    public void update(Product p) throws Exception {
        String sql = "UPDATE products SET name=?, description=?, category=?, price=? WHERE id=?";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)){
            ps.setString(1, p.name);
            ps.setString(2, p.description);
            ps.setString(3, p.category);
            ps.setDouble(4, p.price);
            ps.setInt(5, p.id);
            ps.executeUpdate();

            try(PreparedStatement del = con.prepareStatement("DELETE FROM product_images WHERE product_id=?")){
                del.setInt(1, p.id);
                del.executeUpdate();
            }
            insertImages(con, p.id, p.images);
        }
    }

    public void delete(int id) throws Exception {
        String sql = "DELETE FROM products WHERE id=?";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)){
            ps.setInt(1, id);
            ps.executeUpdate();
        }
    }

    private void insertImages(Connection con, int productId, List<String> images) throws Exception {
        if(images == null || images.isEmpty()) return;
        String sql = "INSERT INTO product_images (product_id, image_data, sort_order) VALUES (?, ?, ?)";
        try(PreparedStatement ps = con.prepareStatement(sql)){
            for(int i = 0; i < images.size(); i++){
                ps.setInt(1, productId);
                ps.setString(2, images.get(i));
                ps.setInt(3, i);
                ps.addBatch();
            }
            ps.executeBatch();
        }
    }
}