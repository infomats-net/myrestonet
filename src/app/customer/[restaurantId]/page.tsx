
"use client";

import { use, useState, useEffect } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { doc, collection, addDoc, getDocs } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { 
  Loader2, 
  UtensilsCrossed, 
  MapPin, 
  ShoppingBag, 
  Plus, 
  Minus, 
  X, 
  CreditCard, 
  Truck, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger, 
  SheetFooter 
} from '@/components/ui/sheet';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export default function CustomerStorefront({ params }: { params: Promise<{ restaurantId: string }> }) {
  const resolvedParams = use(params);
  const restaurantId = resolvedParams.restaurantId;
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  // 1. Fetch Restaurant Info
  const restaurantRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId);
  }, [firestore, restaurantId]);
  const { data: restaurant, isLoading: loadingRes } = useDoc(restaurantRef);

  // 2. Fetch All Menus
  const menusQuery = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return collection(firestore, 'restaurants', restaurantId, 'menus');
  }, [firestore, restaurantId]);
  const { data: menus, isLoading: loadingMenus } = useCollection(menusQuery);

  const [allMenuItems, setAllMenuItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // 3. Fetch Items for all menus
  useEffect(() => {
    if (!firestore || !restaurantId || !menus) return;
    
    const fetchAllItems = async () => {
      setLoadingItems(true);
      const items: any[] = [];
      for (const menu of menus) {
        const querySnapshot = await getDocs(collection(firestore, 'restaurants', restaurantId, 'menus', menu.id, 'items'));
        querySnapshot.forEach((doc) => {
          items.push({ ...doc.data(), id: doc.id, menuId: menu.id, menuName: menu.name });
        });
      }
      setAllMenuItems(items);
      setLoadingItems(false);
    };

    fetchAllItems();
  }, [firestore, restaurantId, menus]);

  useEffect(() => {
    if (auth) signInAnonymously(auth);
  }, [auth]);

  useEffect(() => {
    if (restaurant?.paymentSettings) {
      const settings = restaurant.paymentSettings;
      if (settings.paypal?.enabled) setPaymentMethod('paypal');
      else if (settings.cod?.enabled) setPaymentMethod('cod');
    }
  }, [restaurant]);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
    toast({ title: "Added to cart", description: `${item.name} added.` });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === itemId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryEnabled = restaurant?.deliverySettings?.deliveryEnabled ?? true;
  const baseDeliveryCharge = restaurant?.deliverySettings?.deliveryCharge || 0;
  const freeThreshold = restaurant?.deliverySettings?.freeDeliveryAbove;
  const deliveryCharge = (deliveryEnabled && (freeThreshold === null || subtotal < (freeThreshold || 0))) ? baseDeliveryCharge : 0;
  const total = subtotal + deliveryCharge;

  const handleCheckout = async () => {
    if (!auth?.currentUser || !firestore || !restaurantId) return;
    setIsProcessing(true);
    try {
      const orderData = {
        customerId: auth.currentUser.uid,
        items: cart,
        subtotal,
        deliveryCharge,
        totalAmount: total,
        paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(firestore, 'restaurants', restaurantId, 'orders'), orderData);
      setCart([]);
      setOrderComplete(true);
      setIsCheckoutOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to place order." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loadingRes || loadingMenus || loadingItems) return (
    <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
  );

  if (!restaurant) return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <Card className="max-w-md p-12 rounded-[2rem] border-none shadow-xl">
        <UtensilsCrossed className="h-16 w-16 text-slate-200 mx-auto mb-4" />
        <h1 className="text-2xl font-black">Restaurant Not Found</h1>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-12">
        <header className="space-y-4 text-center">
          <div className="bg-primary/10 w-20 h-20 rounded-3xl flex items-center justify-center text-primary mx-auto shadow-sm border border-primary/5">
            <ShoppingBag className="h-10 w-10" />
          </div>
          <div className="space-y-1">
            <h1 className="text-5xl font-black text-slate-900 tracking-tight">{restaurant.name}</h1>
            <p className="text-slate-500 font-medium flex items-center justify-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> {restaurant.city}, {restaurant.country}
            </p>
          </div>
        </header>

        {orderComplete && (
          <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2.5rem] text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-emerald-900">Order Placed!</h2>
            <Button className="mt-6 bg-emerald-600 hover:bg-emerald-700" onClick={() => setOrderComplete(false)}>Order More</Button>
          </div>
        )}

        <section className="space-y-12">
          {menus?.map(menu => (
            <div key={menu.id} className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-3xl font-black text-slate-900">{menu.name}</h2>
                <Badge variant="outline" className="font-bold uppercase tracking-widest text-[10px]">
                  {allMenuItems.filter(i => i.menuId === menu.id).length} Items
                </Badge>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                {allMenuItems.filter(i => i.menuId === menu.id).map(item => (
                  <Card key={item.id} className="overflow-hidden border-none shadow-md rounded-[2rem] group hover:shadow-xl transition-all">
                    <CardContent className="p-8 flex justify-between items-center">
                      <div className="space-y-2">
                        <h3 className="font-black text-xl text-slate-900 group-hover:text-primary transition-colors">{item.name}</h3>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none font-bold uppercase text-[9px] tracking-wider">
                          {item.category}
                        </Badge>
                      </div>
                      <div className="text-right space-y-3">
                        <p className="font-black text-2xl text-primary">${item.price}</p>
                        <Button size="sm" className="rounded-full w-10 h-10 p-0" onClick={() => addToCart(item)}>
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>

      {cart.length > 0 && !orderComplete && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total</p>
              <p className="text-2xl font-black text-slate-900">${total.toFixed(2)}</p>
            </div>
            
            <Sheet open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
              <SheetTrigger asChild>
                <Button size="lg" className="rounded-2xl h-14 px-8 font-black text-lg gap-2 shadow-xl">
                  <ShoppingBag className="h-5 w-5" /> Checkout
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md rounded-l-[3rem] p-0 flex flex-col h-full border-none">
                <SheetHeader className="p-8 bg-slate-50/50 shrink-0">
                  <SheetTitle className="text-3xl font-black">Your Order</SheetTitle>
                </SheetHeader>
                
                <div className="flex-1 overflow-y-auto px-8 py-4 space-y-8 no-scrollbar">
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{item.name}</p>
                          <p className="text-xs text-muted-foreground">${item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-100 rounded-xl p-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                          <span className="font-black text-sm">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Payment</h4>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
                      {restaurant.paymentSettings?.paypal?.enabled && (
                        <div className="flex items-center space-x-2 border p-4 rounded-2xl">
                          <RadioGroupItem value="paypal" id="paypal" />
                          <Label htmlFor="paypal" className="font-bold">PayPal</Label>
                        </div>
                      )}
                      {restaurant.paymentSettings?.cod?.enabled && (
                        <div className="flex items-center space-x-2 border p-4 rounded-2xl">
                          <RadioGroupItem value="cod" id="cod" />
                          <Label htmlFor="cod" className="font-bold">Cash on Delivery</Label>
                        </div>
                      )}
                    </RadioGroup>
                  </div>

                  <div className="space-y-3 bg-slate-50 p-6 rounded-3xl border">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="font-bold">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Delivery</span>
                      <span className="font-bold">{deliveryCharge === 0 ? "FREE" : `$${deliveryCharge.toFixed(2)}`}</span>
                    </div>
                    <div className="pt-3 border-t flex justify-between items-center">
                      <span className="text-lg font-black">Total</span>
                      <span className="text-2xl font-black text-primary">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <SheetFooter className="p-8 border-t shrink-0">
                  <Button 
                    className="w-full h-16 rounded-[1.5rem] font-black text-xl" 
                    disabled={isProcessing || cart.length === 0 || !paymentMethod}
                    onClick={handleCheckout}
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : "Place Order"}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      )}
    </div>
  );
}
