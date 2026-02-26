
export interface Restaurant {
  id: string;
  name: string;
  cuisineType: string;
  location: string;
  address: string;
  description: string;
  adminEmail: string;
  status: 'active' | 'suspended';
  subscriptionTier: 'basic' | 'pro' | 'enterprise';
}

export const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: 'rest-1',
    name: 'Bella Napoli',
    cuisineType: 'Italian',
    location: 'London, UK',
    address: '123 Pizza St, London, EC1 1BB',
    description: 'Authentic wood-fired pizzas and homemade pasta in the heart of London.',
    adminEmail: 'admin@bellanapoli.com',
    status: 'active',
    subscriptionTier: 'pro',
  },
  {
    id: 'rest-2',
    name: 'Sakura Zen',
    cuisineType: 'Japanese',
    location: 'Paris, France',
    address: '45 Rue de Sushi, Paris, 75001',
    description: 'Minimalist Japanese dining featuring premium grade sushi and sashimi.',
    adminEmail: 'manager@sakurazen.fr',
    status: 'active',
    subscriptionTier: 'enterprise',
  },
  {
    id: 'rest-3',
    name: 'Le Petit Bistro',
    cuisineType: 'French',
    location: 'New York, USA',
    address: '789 French Way, NY 10001',
    description: 'A charming corner bistro serving classic French comfort food.',
    adminEmail: 'chef@lepetitbistro.com',
    status: 'suspended',
    subscriptionTier: 'basic',
  },
];

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

export const MOCK_MENU_ITEMS: MenuItem[] = [
  {
    id: 'item-1',
    restaurantId: 'rest-1',
    name: 'Margherita Pizza',
    description: 'San Marzano tomatoes, fresh mozzarella, basil, and EVOO.',
    price: 14.50,
    category: 'Pizza',
    inventory: 50,
    imageUrl: 'https://picsum.photos/seed/pizza1/600/400',
  },
  {
    id: 'item-2',
    restaurantId: 'rest-1',
    name: 'Truffle Carbonara',
    description: 'Fresh tagliatelle, pancetta, black truffle, and parmesan cream.',
    price: 18.00,
    category: 'Pasta',
    inventory: 30,
    imageUrl: 'https://picsum.photos/seed/pasta1/600/400',
  },
];

export const MOCK_SALES_DATA = [
  {
    orderId: 'ord-1',
    timestamp: new Date().toISOString(),
    items: [
      { itemId: 'item-1', itemName: 'Margherita Pizza', quantity: 2, price: 14.50 },
      { itemId: 'item-2', itemName: 'Truffle Carbonara', quantity: 1, price: 18.00 },
    ],
    totalAmount: 47.00,
  },
  {
    orderId: 'ord-2',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    items: [
      { itemId: 'item-1', itemName: 'Margherita Pizza', quantity: 1, price: 14.50 },
    ],
    totalAmount: 14.50,
  },
];
