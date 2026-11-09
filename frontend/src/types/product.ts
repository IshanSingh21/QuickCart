export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  children?: Category[];
  _count?: {
    products: number;
    children?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: string;
  stock: number;
  version: number;
  categoryId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Pick<Category, 'id' | 'name' | 'slug'>;
  images: ProductImage[];
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'createdAt' | 'price' | 'name';
  order?: 'asc' | 'desc';
  isActive?: 'true' | 'false' | 'all';
}
