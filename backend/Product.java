import java.util.List;

public class Product {
    public int id;
    public String name;
    public String description;
    public String category;
    public double price;
    public List<String> images;

    public Product(){
    }

    public Product(int id, String name, String description, String category, double price, List<String> images){
        this.id = id;
        this.name = name;
        this.description = description;
        this.category = category;
        this.price = price;
        this.images = images;
    }
}
