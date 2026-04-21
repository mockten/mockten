import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { ArrowLeft, Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface AddProductPageProps {
  onBack: () => void;
}

export function AddProductPage({ onBack }: AddProductPageProps) {
  const [productData, setProductData] = useState({
    name: "",
    description: "",
    price: "",
    comparePrice: "",
    sku: "",
    stock: "",
    category: "",
    status: true,
  });
  const [images, setImages] = useState<string[]>([]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setProductData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // In a real app, you would upload these to a server
      // For now, we'll create object URLs for preview
      const newImages = Array.from(files).map((file) => URL.createObjectURL(file));
      setImages((prev) => [...prev, ...newImages].slice(0, 5)); // Max 5 images
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Product data:", productData, "Images:", images);
    toast.success("Product added successfully!");
    // Reset form
    setProductData({
      name: "",
      description: "",
      price: "",
      comparePrice: "",
      sku: "",
      stock: "",
      category: "",
      status: true,
    });
    setImages([]);
    // Navigate back after a short delay
    setTimeout(() => {
      onBack();
    }, 1500);
  };

  const handleSaveDraft = () => {
    console.log("Saving draft:", productData);
    toast.success("Draft saved!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-slate-900 mb-1">Add New Product</h2>
          <p className="text-slate-600">Fill in the product details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Essential product details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Wireless Headphones"
                    value={productData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your product..."
                    value={productData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    rows={5}
                    required
                  />
                  <p className="text-slate-500">Brief description for your product</p>
                </div>
              </CardContent>
            </Card>

            {/* Product Images */}
            <Card>
              <CardHeader>
                <CardTitle>Product Images</CardTitle>
                <CardDescription>Add up to 5 images</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Image Preview Grid */}
                  {images.length > 0 && (
                    <div className="grid grid-cols-5 gap-4">
                      {images.map((image, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                          <img src={image} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          {index === 0 && (
                            <div className="absolute bottom-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs">
                              Primary
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Button */}
                  {images.length < 5 && (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        <p className="text-slate-600 mb-1">Click to upload images</p>
                        <p className="text-slate-500">PNG, JPG up to 10MB</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                      />
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
                <CardDescription>Set your product pricing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={productData.price}
                        onChange={(e) => handleInputChange("price", e.target.value)}
                        className="pl-8"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="comparePrice">Compare at Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <Input
                        id="comparePrice"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={productData.comparePrice}
                        onChange={(e) => handleInputChange("comparePrice", e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <p className="text-slate-500">Original price for discount display</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inventory */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory</CardTitle>
                <CardDescription>Manage stock and SKU</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      placeholder="e.g. WH-001"
                      value={productData.sku}
                      onChange={(e) => handleInputChange("sku", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock Quantity *</Label>
                    <Input
                      id="stock"
                      type="number"
                      placeholder="0"
                      value={productData.stock}
                      onChange={(e) => handleInputChange("stock", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-6">
            {/* Product Status */}
            <Card>
              <CardHeader>
                <CardTitle>Product Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-700">Active</p>
                    <p className="text-slate-500">Product will be visible to customers</p>
                  </div>
                  <Switch
                    checked={productData.status}
                    onCheckedChange={(checked) => handleInputChange("status", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Product Organization */}
            <Card>
              <CardHeader>
                <CardTitle>Product Organization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={productData.category}
                    onValueChange={(value) => handleInputChange("category", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="clothing">Clothing</SelectItem>
                      <SelectItem value="accessories">Accessories</SelectItem>
                      <SelectItem value="home">Home & Garden</SelectItem>
                      <SelectItem value="sports">Sports & Outdoors</SelectItem>
                      <SelectItem value="books">Books</SelectItem>
                      <SelectItem value="toys">Toys & Games</SelectItem>
                      <SelectItem value="beauty">Beauty & Personal Care</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Preview Card */}
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {images.length > 0 ? (
                    <div className="aspect-square rounded-lg overflow-hidden border border-slate-200">
                      <img src={images[0]} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-slate-300" />
                    </div>
                  )}
                  <div>
                    <p className="text-slate-900">{productData.name || "Product Name"}</p>
                    <p className="text-slate-600">
                      {productData.price ? `$${productData.price}` : "$0.00"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons - Fixed at Bottom */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 py-4 mt-6 -mx-8 px-8 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleSaveDraft}>
            Save as Draft
          </Button>
          <Button type="button" variant="outline" onClick={onBack}>
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            Add Product
          </Button>
        </div>
      </form>
    </div>
  );
}
