import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

public class ReviewDao {

    public List<Review> getByProduct(int productId) throws Exception {
        List<Review> list = new ArrayList<>();
        String sql = "SELECT id, product_id, name, rating, comment, created_at FROM reviews WHERE product_id=? ORDER BY id DESC";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)){
            ps.setInt(1, productId);
            try(ResultSet rs = ps.executeQuery()){
                while(rs.next()){
                    Review r = new Review();
                    r.id = rs.getInt("id");
                    r.productId = rs.getInt("product_id");
                    r.name = rs.getString("name");
                    r.rating = rs.getInt("rating");
                    r.comment = rs.getString("comment");
                    Timestamp ts = rs.getTimestamp("created_at");
                    r.date = ts.toInstant().toString();
                    list.add(r);
                }
            }
        }
        return list;
    }

    public Review create(Review r) throws Exception {
        String sql = "INSERT INTO reviews (product_id, name, rating, comment) VALUES (?, ?, ?, ?)";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)){
            ps.setInt(1, r.productId);
            ps.setString(2, r.name);
            ps.setInt(3, r.rating);
            ps.setString(4, r.comment);
            ps.executeUpdate();
            try(ResultSet keys = ps.getGeneratedKeys()){
                keys.next();
                r.id = keys.getInt(1);
            }
        }
        return r;
    }

    public void delete(int id) throws Exception {
        String sql = "DELETE FROM reviews WHERE id=?";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)){
            ps.setInt(1, id);
            ps.executeUpdate();
        }
    }
}
