
/**
 * @fileOverview This file formerly contained mock data for prototyping.
 * All mock data has been removed in favor of real-time Firestore data.
 */

export interface Restaurant {
  id: string;
  name: string;
  cuisineType: string;
  location: string;
  address: string;
  description: string;
  adminEmail: string;
  customDomain?: string;
  status: 'active' | 'suspended';
  subscriptionTier: 'basic' | 'pro' | 'enterprise';
}

export const MOCK_RESTAURANTS: Restaurant[] = [];

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inventory: number;
  imageUrl: string;
}

export const MOCK_MENU_ITEMS: MenuItem[] = [];

export const MOCK_SALES_DATA: any[] = [];
