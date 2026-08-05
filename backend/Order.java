import java.util.List;

public class Order {
    public int id;
    public String name;
    public String phone;
    public String location;
    public double total;
    public String date;
    public String status;
    public String orderType;
    public double deliveryFee;
    public double inspectionFee;
    public List<OrderItem> items;
}
