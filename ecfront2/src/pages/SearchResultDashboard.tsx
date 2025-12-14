import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  TextField,
  Typography,
  Card,
  CardContent,
  IconButton,
  Grid,
  Button,
  Checkbox,
  FormControlLabel,
  Chip,
  Pagination,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Star,
  StarHalf,
  StarBorder,
  Sort,
} from '@mui/icons-material';
import Appbar from '../components/Appbar';
import Footer from '../components/Footer';
import photoSvg from "../assets/photo.svg";

interface Product {
  product_id: string;
  product_name: string;
  seller_name: string;
  category: number;
  price: number;
  ranking: number;
  stocks: number;
}

interface Category {
  category_id: string;
  category_name: string;
}

interface SearchFilters {
  priceRange: [number, number];
  category: string[];
  rating: number;
  status: string[];
  stock: boolean;
  freeShipping: boolean;
}

type SortOrder = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc';

const SearchResultNew: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [filters, setFilters] = useState<SearchFilters>({
    priceRange: [0, 1000],
    category: [],
    rating: 0,
    status: [],
    stock: false,
    freeShipping: false,
  });

  const [priceMinInput, setPriceMinInput] = useState<string>('');
  const [priceMaxInput, setPriceMaxInput] = useState<string>('');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const itemsPerPage = 20;

  const [sortOrder, setSortOrder] = useState<SortOrder>('name_asc');
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);

  const parseNumberOrEmptyToNull = (v: string): number | null => {
    const t = v.trim();
    if (t === '') return null;
    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    return n;
  };

  const normalizePriceRange = (min: number | null, max: number | null): [number, number] => {
    const defaultMin = 0;
    const defaultMax = 1000;

    const mi = min == null ? defaultMin : Math.max(0, Math.floor(min));
    const ma = max == null ? defaultMax : Math.max(0, Math.floor(max));

    if (mi <= ma) return [mi, ma];
    return [ma, mi];
  };

  const fetchProducts = async (query: string, page: number, f: SearchFilters) => {
    try {
      let url = `/api/search?q=${encodeURIComponent(query)}&p=${page}`;

      f.status.forEach(s => {
        url += `&status=${encodeURIComponent(s)}`;
      });

      f.category.forEach(catId => {
        url += `&category=${encodeURIComponent(catId)}`;
      });

      if (f.stock) {
        url += `&stock=1`;
      }

      const [minPrice, maxPrice] = f.priceRange;
      if (minPrice !== 0) {
        url += `&min_price=${encodeURIComponent(String(minPrice))}`;
      }
      if (maxPrice !== 1000) {
        url += `&max_price=${encodeURIComponent(String(maxPrice))}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        setProducts([]);
        setTotalResults(0);
        return;
      }

      const data = await response.json();

      setProducts(data.items || []);
      setTotalResults(data.total || 0);
    } catch (err) {
      console.error(err);
      setProducts([]);
      setTotalResults(0);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        if (!res.ok) {
          setCategories([]);
          return;
        }
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setCategories([]);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q') || '';
    const page = parseInt(params.get('p') || '1', 10);

    setSearchQuery(query);

    if (query && page !== currentPage) {
      setCurrentPage(page);
    }

    if (!query) {
      setProducts([]);
      setTotalResults(0);
      return;
    }

    fetchProducts(query, page, filters);
  }, [location.search, filters]);

  const handleProductClick = (productId: string) => {
    navigate(`/item/${productId}`);
  };

  const handleFilterChange = (filterType: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFilters(prev => ({
      ...prev,
      category: prev.category.includes(categoryId)
        ? prev.category.filter(c => c !== categoryId)
        : [...prev.category, categoryId],
    }));
  };

  const handleStatusToggle = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status],
    }));
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} sx={{ color: '#ffc107', fontSize: '16px' }} />);
    }

    if (hasHalfStar) {
      stars.push(<StarHalf key="half" sx={{ color: '#ffc107', fontSize: '16px' }} />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<StarBorder key={`empty-${i}`} sx={{ color: '#ffc107', fontSize: '16px' }} />);
    }

    return stars;
  };

  const sortedProducts = useMemo(() => {
    const copied = [...products];

    copied.sort((a, b) => {
      if (sortOrder === 'price_asc') return (a.price ?? 0) - (b.price ?? 0);
      if (sortOrder === 'price_desc') return (b.price ?? 0) - (a.price ?? 0);

      const nameA = (a.product_name ?? '').toString();
      const nameB = (b.product_name ?? '').toString();

      if (sortOrder === 'name_desc') {
        return nameB.localeCompare(nameA, undefined, { sensitivity: 'base' });
      }
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });

    return copied;
  }, [products, sortOrder]);

  const totalPages = Math.ceil(totalResults / itemsPerPage) || 1;

  const sortLabel =
    sortOrder === 'name_asc' ? 'Name (A→Z)'
      : sortOrder === 'name_desc' ? 'Name (Z→A)'
        : sortOrder === 'price_asc' ? 'Price (Low→High)'
          : 'Price (High→Low)';

  return (
    <Box sx={{ width: '100vw', minHeight: '100vh', backgroundColor: 'white' }}>
      <Appbar />

      <Container maxWidth="lg" sx={{ display: 'flex' }}>
        <Box
          sx={{
            width: '240px',
            backgroundColor: '#f5f5f5',
            minHeight: 'calc(100vh - 72px)',
            padding: '16px',
            borderRight: '1px solid #dddddd',
          }}
        >
          <Box sx={{ marginBottom: '24px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '16px',
                color: 'black',
                marginBottom: '16px',
                paddingLeft: '20px',
              }}
            >
              Price
            </Typography>
            <Box sx={{ paddingLeft: '20px' }}>
              <TextField
                size="small"
                placeholder="Min"
                type="number"
                sx={{ width: '120px', marginBottom: '8px' }}
                value={priceMinInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setPriceMinInput(v);
                  const min = parseNumberOrEmptyToNull(v);
                  const max = parseNumberOrEmptyToNull(priceMaxInput);
                  const next = normalizePriceRange(min, max);
                  setFilters(prev => ({ ...prev, priceRange: next }));
                }}
              />
              <TextField
                size="small"
                placeholder="Max"
                type="number"
                sx={{ width: '120px' }}
                value={priceMaxInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setPriceMaxInput(v);
                  const min = parseNumberOrEmptyToNull(priceMinInput);
                  const max = parseNumberOrEmptyToNull(v);
                  const next = normalizePriceRange(min, max);
                  setFilters(prev => ({ ...prev, priceRange: next }));
                }}
              />
            </Box>
          </Box>

          <Box sx={{ marginBottom: '24px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '16px',
                color: 'black',
                marginBottom: '16px',
                paddingLeft: '20px',
              }}
            >
              Category
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingLeft: '20px' }}>
              {categories.map((cat) => (
                <Chip
                  key={cat.category_id}
                  label={cat.category_name}
                  onClick={() => handleCategoryToggle(cat.category_name)}
                  color={filters.category.includes(cat.category_name) ? 'primary' : 'default'}
                  size="small"
                />
              ))}
            </Box>
          </Box>

          <Box sx={{ marginBottom: '24px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '16px',
                color: 'black',
                marginBottom: '16px',
                paddingLeft: '20px',
              }}
            >
              Review
            </Typography>
            <Box sx={{ paddingLeft: '20px' }}>
              {[4.5, 4.0, 3.5].map((rating) => (
                <Box
                  key={rating}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleFilterChange('rating', rating)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Star sx={{ color: '#ffc107', fontSize: '16px' }} />
                  </Box>
                  <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: 'black' }}>
                    {rating}〜
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Box sx={{ marginBottom: '24px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '16px',
                color: 'black',
                marginBottom: '16px',
                paddingLeft: '20px',
              }}
            >
              Status
            </Typography>
            <Box sx={{ paddingLeft: '20px' }}>
              <FormControlLabel
                control={<Checkbox checked={filters.status.includes('New')} onChange={() => handleStatusToggle('New')} />}
                label="New"
                sx={{ display: 'block' }}
              />
              <FormControlLabel
                control={<Checkbox checked={filters.status.includes('Used')} onChange={() => handleStatusToggle('Used')} />}
                label="Used"
                sx={{ display: 'block' }}
              />
            </Box>
          </Box>

          <Box sx={{ marginBottom: '24px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontWeight: 'bold',
                fontSize: '16px',
                color: 'black',
                marginBottom: '16px',
                paddingLeft: '20px',
              }}
            >
              Stocks
            </Typography>
            <Box sx={{ paddingLeft: '20px' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.stock}
                    onChange={(e) => handleFilterChange('stock', e.target.checked)}
                  />
                }
                label="Show only in stock"
              />
            </Box>
          </Box>

          <Box sx={{ paddingLeft: '20px' }}>
            <Button
              variant="text"
              fullWidth
              sx={{ textTransform: 'none' }}
              onClick={() => {
                setPriceMinInput('');
                setPriceMaxInput('');
                setSortOrder('name_asc');
                setFilters({
                  priceRange: [0, 1000],
                  category: [],
                  rating: 0,
                  status: [],
                  stock: false,
                  freeShipping: false,
                });
              }}
            >
              Clear
            </Button>
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1, padding: '24px' }}>
          <Box sx={{ marginBottom: '16px' }}>
            <Typography
              sx={{
                fontFamily: 'Noto Sans',
                fontSize: '20px',
                color: 'black',
                marginBottom: '8px',
              }}
            >
              Category
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography
                sx={{
                  fontFamily: 'Noto Sans',
                  fontSize: '14px',
                  color: '#666666',
                }}
              >
                Showing results for "{searchQuery}"
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: 'black' }}>
                  {sortLabel}
                </Typography>
                <IconButton size="small" onClick={(e) => setSortAnchorEl(e.currentTarget)}>
                  <Sort sx={{ fontSize: '16px' }} />
                </IconButton>
                <Menu
                  anchorEl={sortAnchorEl}
                  open={Boolean(sortAnchorEl)}
                  onClose={() => setSortAnchorEl(null)}
                >
                  <MenuItem
                    selected={sortOrder === 'name_asc'}
                    onClick={() => {
                      setSortOrder('name_asc');
                      setSortAnchorEl(null);
                    }}
                  >
                    Name (A→Z)
                  </MenuItem>
                  <MenuItem
                    selected={sortOrder === 'name_desc'}
                    onClick={() => {
                      setSortOrder('name_desc');
                      setSortAnchorEl(null);
                    }}
                  >
                    Name (Z→A)
                  </MenuItem>
                  <MenuItem
                    selected={sortOrder === 'price_asc'}
                    onClick={() => {
                      setSortOrder('price_asc');
                      setSortAnchorEl(null);
                    }}
                  >
                    Price (Low→High)
                  </MenuItem>
                  <MenuItem
                    selected={sortOrder === 'price_desc'}
                    onClick={() => {
                      setSortOrder('price_desc');
                      setSortAnchorEl(null);
                    }}
                  >
                    Price (High→Low)
                  </MenuItem>
                </Menu>
              </Box>
            </Box>
          </Box>

          <Grid container spacing={2} sx={{ marginBottom: '32px' }}>
            {sortedProducts.map((product) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.product_id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 3 },
                  }}
                  onClick={() => handleProductClick(product.product_id)}
                >
                  <Box
                    sx={{
                      height: '100px',
                      backgroundColor: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={`/api/storage/${product.product_id}.png`}
                      alt="Product"
                      style={{ width: '64px', height: '64px' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = photoSvg;
                      }}
                    />
                  </Box>

                  <CardContent sx={{ padding: '8px' }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontFamily: 'Noto Sans',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        color: 'black',
                        marginBottom: '8px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {product.product_name}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '8px' }}>
                      {renderStars(product.ranking || 4.0)}
                    </Box>

                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'Noto Sans',
                        fontSize: '14px',
                        color: '#666666',
                      }}
                    >
                      ${product.price}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(_, page) => {
                const params = new URLSearchParams(location.search);
                params.set('p', page.toString());
                navigate(`?${params.toString()}`);
              }}
              color="primary"
            />
          </Box>
        </Box>
      </Container>

      <Footer />
    </Box>
  );
};

export default SearchResultNew;
