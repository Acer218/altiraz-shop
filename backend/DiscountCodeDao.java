import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class DiscountCodeDao {

    public List<DiscountCode> getAll() throws Exception {
        List<DiscountCode> list = new ArrayList<>();
        String sql = "SELECT id, code, percent, active, max_uses, used_count FROM discount_codes ORDER BY id DESC";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql);
            ResultSet rs = ps.executeQuery()){
            while(rs.next()){
                list.add(mapRow(rs));
            }
        }
        return list;
    }

    public DiscountCode getByCode(String code) throws Exception {
        String sql = "SELECT id, code, percent, active, max_uses, used_count FROM discount_codes WHERE UPPER(code) = UPPER(?)";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)){
            ps.setString(1, code);
            try(ResultSet rs = ps.executeQuery()){
                if(rs.next()){
                    return mapRow(rs);
                }
            }
        }
        return null;
    }

    public DiscountCode create(DiscountCode dc) throws Exception {
        String sql = "INSERT INTO discount_codes (code, percent, active, max_uses, used_count) VALUES (?, ?, true, ?, 0)";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)){
            ps.setString(1, dc.code.trim().toUpperCase());
            ps.setDouble(2, dc.percent);
            if(dc.maxUses != null && dc.maxUses > 0) ps.setInt(3, dc.maxUses);
            else ps.setNull(3, java.sql.Types.INTEGER);
            ps.executeUpdate();
            try(ResultSet keys = ps.getGeneratedKeys()){
                keys.next();
                dc.id = keys.getInt(1);
            }
        }
        dc.active = true;
        dc.usedCount = 0;
        return dc;
    }

    public void incrementUsage(String code) throws Exception {
        String sql = "UPDATE discount_codes SET used_count = used_count + 1 WHERE UPPER(code) = UPPER(?)";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)){
            ps.setString(1, code);
            ps.executeUpdate();
        }
    }

    public void delete(int id) throws Exception {
        String sql = "DELETE FROM discount_codes WHERE id=?";
        try(Connection con = Db.getConnection();
            PreparedStatement ps = con.prepareStatement(sql)){
            ps.setInt(1, id);
            ps.executeUpdate();
        }
    }

    private DiscountCode mapRow(ResultSet rs) throws Exception {
        DiscountCode dc = new DiscountCode();
        dc.id = rs.getInt("id");
        dc.code = rs.getString("code");
        dc.percent = rs.getDouble("percent");
        dc.active = rs.getBoolean("active");
        int maxUsesRaw = rs.getInt("max_uses");
        dc.maxUses = rs.wasNull() ? null : maxUsesRaw;
        dc.usedCount = rs.getInt("used_count");
        return dc;
    }
}
