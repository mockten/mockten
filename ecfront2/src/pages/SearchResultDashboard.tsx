import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  avg_review?: number;
  review_count?: number;
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

type SortOrder =
  | 'default'
  | 'name_asc'
  | 'name_desc'
  | 'price_asc'
  | 'price_desc'
  | 'review_desc'
  | 'review_asc';

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

  const [sortOrder, setSortOrder] = useState<SortOrder>('default');
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);

  const [sortedDatasetKey, setSortedDatasetKey] = useState<string>('');
  const [sortedDataset, setSortedDataset] = useState<Product[]>([]);
  const [sortedDatasetTotal, setSortedDatasetTotal] = useState<number>(0);

  const requestSeqRef = useRef(0);

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

  const parseSortParam = (v: string | null): SortOrder => {
    if (
      v === 'name_asc' ||
      v === 'name_desc' ||
      v === 'price_asc' ||
      v === 'price_desc' ||
      v === 'review_desc' ||
      v === 'review_asc' ||
      v === 'default'
    ) {
      return v;
    }
    return 'default';
  };

  const makeDatasetKey = (q: string, f: SearchFilters, s: SortOrder) => {
    const keyObj = {
      q,
      s,
      f: {
        priceRange: f.priceRange,
        category: [...f.category].sort(),
        rating: f.rating,
        status: [...f.status].sort(),
        stock: f.stock,
        freeShipping: f.freeShipping,
      },
    };
    return JSON.stringify(keyObj);
  };

  const navigateWithPageReset = () => {
    const params = new URLSearchParams(location.search);
    params.set('p', '1');
    navigate(`?${params.toString()}`);
  };

  const buildSearchUrl = (query: string, page: number, f: SearchFilters) => {
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

    if (f.rating && f.rating > 0) {
      url += `&min_rating=${encodeURIComponent(String(f.rating))}`;
    }

    return url;
  };

  const sortAll = (items: Product[], order: SortOrder) => {
    const copied = [...items];

    copied.sort((a, b) => {
      if (order === 'price_asc') return (a.price ?? 0) - (b.price ?? 0);
      if (order === 'price_desc') return (b.price ?? 0) - (a.price ?? 0);

      if (order === 'review_desc' || order === 'review_asc') {
        const ar = (a.avg_review ?? a.ranking ?? 0);
        const br = (b.avg_review ?? b.ranking ?? 0);

        if (ar !== br) {
          return order === 'review_desc' ? (br - ar) : (ar - br);
        }

        const ac = (a.review_count ?? 0);
        const bc = (b.review_count ?? 0);
        if (ac !== bc) {
          return order === 'review_desc' ? (bc - ac) : (ac - bc);
        }
      }

      const nameA = (a.product_name ?? '').toString();
      const nameB = (b.product_name ?? '').toString();

      if (order === 'name_desc') {
        return nameB.localeCompare(nameA, undefined, { sensitivity: 'base' });
      }
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });

    return copied;
  };

  const fetchProducts = async (query: string, page: number, f: SearchFilters, s: SortOrder) => {
    const seq = ++requestSeqRef.current;

    const applyIfLatest = (fn: () => void) => {
      if (requestSeqRef.current !== seq) return;
      fn();
    };

    try {
      if (s === 'default') {
        const url = buildSearchUrl(query, page, f);
        const response = await fetch(url);

        if (!response.ok) {
          applyIfLatest(() => {
            setProducts([]);
            setTotalResults(0);
          });
          return;
        }

        const data = await response.json();

        applyIfLatest(() => {
          setProducts(data.items || []);
          setTotalResults(data.total || 0);
          setSortedDatasetKey('');
          setSortedDataset([]);
          setSortedDatasetTotal(0);
        });
        return;
      }

      const key = makeDatasetKey(query, f, s);

      if (key === sortedDatasetKey && sortedDataset.length > 0 && sortedDatasetTotal > 0) {
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const slice = sortedDataset.slice(start, end);

        applyIfLatest(() => {
          setProducts(slice);
          setTotalResults(sortedDatasetTotal);
        });
        return;
      }

      const firstRes = await fetch(buildSearchUrl(query, 1, f));
      if (!firstRes.ok) {
        applyIfLatest(() => {
          setProducts([]);
          setTotalResults(0);
          setSortedDatasetKey('');
          setSortedDataset([]);
          setSortedDatasetTotal(0);
        });
        return;
      }

      const firstData = await firstRes.json();
      const total = Number(firstData.total || 0);
      const pages = Math.max(1, Math.ceil(total / itemsPerPage));
      const allItems: Product[] = Array.isArray(firstData.items) ? [...firstData.items] : [];

      if (pages > 1) {
        for (let p = 2; p <= pages; p++) {
          const res = await fetch(buildSearchUrl(query, p, f));
          if (!res.ok) continue;

          const d = await res.json();
          if (Array.isArray(d.items)) {
            allItems.push(...d.items);
          }
        }
      }

      const allSorted = sortAll(allItems, s);

      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const slice = allSorted.slice(start, end);

      applyIfLatest(() => {
        setSortedDatasetKey(key);
        setSortedDataset(allSorted);
        setSortedDatasetTotal(total);
        setProducts(slice);
        setTotalResults(total);
      });
    } catch (err) {
      console.error(err);
      if (requestSeqRef.current !== seq) return;
      setProducts([]);
      setTotalResults(0);
      setSortedDatasetKey('');
      setSortedDataset([]);
      setSortedDatasetTotal(0);
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
    const s = parseSortParam(params.get('sort'));

    setSearchQuery(query);

    if (s !== sortOrder) {
      setSortOrder(s);
    }

    if (query && page !== currentPage) {
      setCurrentPage(page);
    }

    if (!query) {
      setProducts([]);
      setTotalResults(0);
      setSortedDatasetKey('');
      setSortedDataset([]);
      setSortedDatasetTotal(0);
      return;
    }

    fetchProducts(query, page, filters, s);
  }, [location.search, filters]);

  const handleProductClick = (productId: string) => {
    navigate(`/item/${productId}`);
  };

  const handleFilterChange = (filterType: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value,
    }));
    navigateWithPageReset();
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFilters(prev => ({
      ...prev,
      category: prev.category.includes(categoryId)
        ? prev.category.filter(c => c !== categoryId)
        : [...prev.category, categoryId],
    }));
    navigateWithPageReset();
  };

  const handleStatusToggle = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status],
    }));
    navigateWithPageReset();
  };

  const handleRatingToggle = (rating: number) => {
    setFilters(prev => ({
      ...prev,
      rating: prev.rating === rating ? 0 : rating,
    }));
    navigateWithPageReset();
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

  const totalPages = Math.ceil(totalResults / itemsPerPage) || 1;

  const sortLabel = useMemo(() => {
    if (sortOrder === 'default') return 'Default';
    if (sortOrder === 'name_asc') return 'Name (A→Z)';
    if (sortOrder === 'name_desc') return 'Name (Z→A)';
    if (sortOrder === 'price_asc') return 'Price (Low→High)';
    if (sortOrder === 'price_desc') return 'Price (High→Low)';
    if (sortOrder === 'review_desc') return 'Review (High→Low)';
    return 'Review (Low→High)';
  }, [sortOrder]);

  const applySortToUrl = (next: SortOrder) => {
    const params = new URLSearchParams(location.search);
    if (next === 'default') params.delete('sort');
    else params.set('sort', next);
    params.set('p', '1');
    navigate(`?${params.toString()}`);
  };

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
                  navigateWithPageReset();
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
                  navigateWithPageReset();
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
              {[4.5, 4.0, 3.5].map((rating) => {
                const selected = filters.rating === rating;
                return (
                  <Box
                    key={rating}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '16px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      border: selected ? '1px solid rgba(25, 118, 210, 0.65)' : '1px solid transparent',
                      backgroundColor: selected ? 'rgba(25, 118, 210, 0.10)' : 'transparent',
                    }}
                    onClick={() => handleRatingToggle(rating)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Star sx={{ color: '#ffc107', fontSize: '16px' }} />
                    </Box>
                    <Typography sx={{ fontFamily: 'Noto Sans', fontSize: '14px', color: 'black' }}>
                      {rating}〜
                    </Typography>
                  </Box>
                );
              })}
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
                setFilters({
                  priceRange: [0, 1000],
                  category: [],
                  rating: 0,
                  status: [],
                  stock: false,
                  freeShipping: false,
                });

                const params = new URLSearchParams(location.search);
                params.delete('sort');
                params.set('p', '1');
                navigate(`?${params.toString()}`);
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
                    selected={sortOrder === 'default'}
                    onClick={() => {
                      setSortAnchorEl(null);
                      applySortToUrl('default');
                    }}
                  >
                    Default
                  </MenuItem>
                  <MenuItem
                    selected={sortOrder === 'name_asc'}
                    onClick={() => {
                      setSortAnchorEl(null);
                      applySortToUrl('name_asc');
                    }}
                  >
                    Name (A→Z)
                  </MenuItem>
                  <MenuItem
                    selected={sortOrder === 'name_desc'}
                    onClick={() => {
                      setSortAnchorEl(null);
                      applySortToUrl('name_desc');
                    }}
                  >
                    Name (Z→A)
                  </MenuItem>
                  <MenuItem
                    selected={sortOrder === 'price_asc'}
                    onClick={() => {
                      setSortAnchorEl(null);
                      applySortToUrl('price_asc');
                    }}
                  >
                    Price (Low→High)
                  </MenuItem>
                  <MenuItem
                    selected={sortOrder === 'price_desc'}
                    onClick={() => {
                      setSortAnchorEl(null);
                      applySortToUrl('price_desc');
                    }}
                  >
                    Price (High→Low)
                  </MenuItem>
                  <MenuItem
                    selected={sortOrder === 'review_desc'}
                    onClick={() => {
                      setSortAnchorEl(null);
                      applySortToUrl('review_desc');
                    }}
                  >
                    Review (High→Low)
                  </MenuItem>
                  <MenuItem
                    selected={sortOrder === 'review_asc'}
                    onClick={() => {
                      setSortAnchorEl(null);
                      applySortToUrl('review_asc');
                    }}
                  >
                    Review (Low→High)
                  </MenuItem>
                </Menu>
              </Box>
            </Box>
          </Box>

          <Grid container spacing={2} sx={{ marginBottom: '32px' }}>
            {products.map((product) => (
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
                      {renderStars(product.avg_review ?? product.ranking ?? 0)}
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
