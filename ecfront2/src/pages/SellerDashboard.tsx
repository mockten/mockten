import React, { useState, ChangeEvent, useEffect} from 'react';
import { Button, TextField, Container, Box } from '@mui/material';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

type ImageUploadState = {
    file: File | null;
    previewUrl: string | null;
};

type Product = {
  product_name: string;
  seller_name: string;
  category: number[];
  price: number;
  stock: number;
  main_image: string;
  images: string[];
  token: string;
  file: File | null;
};

const categories = {
  book: 1,
  food: 2,
  music: 3,
  baby: 4,
  sports: 5,
  electronics: 6,
  game: 7
};

const SellerPage = () => {
  const [product, setProduct] = useState<Product>({
    product_name: '',
    seller_name: '',
    category: [],
    price: 0,
    stock: 0,
    main_image: '',
    images: ['', ''],
    token: '',
    file: null
  });
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sellerName = params.get('name'); 
    if (sellerName) {
      setProduct(prev => ({ ...prev, seller_name: sellerName }));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;  
    if (type === "checkbox") {
      const categoryId = categories[name]; 
      setProduct(prev => ({
        ...prev,
        category: checked
          ? [...prev.category, categoryId]
          : prev.category.filter(cat => cat !== categoryId)
      }));
    } else {
      setProduct(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const apiUrl = process.env.REACT_APP_ADDITEM_API;
    const formData = new FormData();
    formData.append('product_name', product.product_name);
    formData.append('price', product.price.toString());
    formData.append('seller_name', product.seller_name);
    formData.append('stock', product.stock.toString());
    formData.append('token', "test"); //??
    product.category.forEach(cat => {
      formData.append('category', cat.toString());

    });
    if (product.file) {
      formData.append('file', product.file);
    }
    try {
      const response = await fetch(`${apiUrl}/v1/seller/add`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Something went wrong');
      }

      const data = await response.json();
      console.log(data); // Success handling
    } catch (error) {
      console.error(error); // Error handling
    }
  };

  const [imageUpload, setImageUpload] = useState<ImageUploadState>({ file: null, previewUrl: null });

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setProduct(prev => ({ ...prev, file: file }));
      setImageUpload({
        file: file,
        previewUrl: URL.createObjectURL(file),
      });
    }
  };

  return (
    <Container component="main" maxWidth="xs">
    <h2>Let's register your products! </h2>
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="product_name"
          label="Product Name"
          name="product_name"
          autoComplete="product_name"
          autoFocus
          onChange={handleChange}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="price"
          label="¥"
          name="price"
          autoComplete="price"
          autoFocus
          type="number"
          InputProps={{
            inputProps: {
              min: 0,
              step: "0" 
            }
          }}
          onChange={handleChange}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="stock"
          label="stock"
          name="stock"
          autoComplete="price"
          autoFocus
          type="number"
          InputProps={{
            inputProps: {
              min: 1,
              step: "0" 
            }
          }}
          onChange={handleChange}
        />
        <FormControl
            required
            component="fieldset"
            sx={{ m: 3 }}
            variant="standard"
        >
        <FormLabel component="legend">Can pick up to 3</FormLabel>
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox onChange={handleChange} name="book" />
            }
            label="Book"
          />
          <FormControlLabel
            control={
              <Checkbox onChange={handleChange} name="food" />
            }
            label="Food&Beverage"
          />
          <FormControlLabel
            control={
              <Checkbox onChange={handleChange} name="music" />
            }
            label="Music"
          />
          <FormControlLabel
            control={
              <Checkbox onChange={handleChange} name="baby" />
            }
            label="Baby&Child"
          />
          <FormControlLabel
            control={
              <Checkbox onChange={handleChange} name="sports" />
            }
            label="Sports"
          />
          <FormControlLabel
            control={
              <Checkbox onChange={handleChange} name="electronics" />
            }
            label="Electronics"
          />
          <FormControlLabel
            control={
              <Checkbox onChange={handleChange} name="game" />
            }
            label="Game"
          />
        </FormGroup>
      </FormControl>
      <div>
      <input
        accept="image/*"
        style={{ display: 'none' }}
        id="raised-button-file"
        multiple
        type="file"
        onChange={handleImageChange}
      />
      <label htmlFor="raised-button-file">
        <Button variant="contained" component="span">
          Upload Image
        </Button>
      </label>
      {imageUpload.previewUrl && <img src={imageUpload.previewUrl} alt="Preview" style={{ width: '100%', marginTop: '10px' }} />}
    </div>
        <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
          Submit
        </Button>
      </Box>
    </Container>
  );
};

export default SellerPage;
