export interface Category {
  id: number;
  name: string;
  isActive: boolean;
}

export interface Product {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isAvailable: boolean;
  isVeg: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  totalAmount: number;
  couponCode?: string;
  discountAmount: number;
  status: string;
  createdAt: string;
  items: { productId: number; productName: string; quantity: number; price: number }[];
}

export interface Coupon {
  id: number;
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscountAmount: number | null;
  startDate: string;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}