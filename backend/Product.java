import java.util.List;

public class Product {
    public int id;
    public String name;
    public String description;
    public String category;
    public double price;
    public Double compareAtPrice;
    public List<String> images;
    public List<String> sizes;
    public boolean inStock;
    public boolean featured;

    public Product(){
    }

    public Product(int id, String name, String description, String category, double price, List<String> images, List<String> sizes, boolean inStock, boolean featured){
        this.id = id;
        this.name = name;
        this.description = description;
        this.category = category;
        this.price = price;
        this.images = images;
        this.sizes = sizes;
        this.inStock = inStock;
        this.featured = featured;
    }
}
