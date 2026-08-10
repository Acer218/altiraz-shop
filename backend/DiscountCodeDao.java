import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class DiscountCodeDao {

    public List<DiscountCode> getAll() throws Exception {
        List<DiscountCode> list = new ArrayList<>();
        String sql = "SELECT id, code, percent, active FROM discount_codes ORDER BY id DESC";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql);
            ResultSet rs = ps.executeQuery()){
            while(rs.next()){
                DiscountCode dc = new DiscountCode();
                dc.id = rs.getInt("id");
                dc.code = rs.getString("code");
                dc.percent = rs.getDouble("percent");
                dc.active = rs.getBoolean("active");
                list.add(dc);
            }
        }
        return list;
    }

    public DiscountCode getByCode(String code) throws Exception {
        String sql = "SELECT id, code, percent, active FROM discount_codes WHERE UPPER(code) = UPPER(?)";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)){
            ps.setString(1, code);
            try(ResultSet rs = ps.executeQuery()){
                if(rs.next()){
                    DiscountCode dc = new DiscountCode();
                    dc.id = rs.getInt("id");
                    dc.code = rs.getString("code");
                    dc.percent = rs.getDouble("percent");
                    dc.active = rs.getBoolean("active");
                    return dc;
                }
            }
        }
        return null;
    }

    public DiscountCode create(DiscountCode dc) throws Exception {
        String sql = "INSERT INTO discount_codes (code, percent, active) VALUES (?, ?, true)";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)){
            ps.setString(1, dc.code.trim().toUpperCase());
            ps.setDouble(2, dc.percent);
            ps.executeUpdate();
            try(ResultSet keys = ps.getGeneratedKeys()){
                keys.next();
                dc.id = keys.getInt(1);
            }
        }
        dc.active = true;
        return dc;
    }

    public void delete(int id) throws Exception {
        String sql = "DELETE FROM discount_codes WHERE id=?";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)){
            ps.setInt(1, id);
            ps.executeUpdate();
        }
    }
}
