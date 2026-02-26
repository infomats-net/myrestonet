
"use client";

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Utensils, 
  Settings, 
  BarChart3, 
  Globe, 
  ShoppingCart, 
  Sparkles,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Save,
  Loader2,
  Plus,
  ChevronLeft,
  Info,
  Package,
  Calendar,
  Palette
} from 'lucide-react';
import { MOCK_SALES_DATA } from '@/lib/mock-data';
import { getAiSalesInsights, AiSalesInsightsOutput } from '@/ai/flows/ai-sales-insights';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { localizedSeoContentGenerator, LocalizedSeoContentOutput } from '@/ai/flows/localized-seo-content';
import Link from 'next/link';
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DesignSystemEditor } from '@/components/design-system-editor';

function DashboardContent() {
  const searchParams = useSearchParams();
  const impersonateId = searchParams.get('impersonate');
  const initialTab = searchParams.get('tab') || 'overview';
  const firestore = useFirestore();
  const { user: authUser, isUserLoading: authLoading } = useUser();
  
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser?.uid]);
  
  const { data: userProfile, isLoading: loadingProfile } = useDoc(userProfileRef);
  
  // Determine if we have a restaurant to load based on the profile or impersonation
  const effectiveRestaurantId = impersonateId || (userProfile?.role === 'RestaurantAdmin' ? userProfile.restaurantId : null);

  const restaurantRef = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return doc(firestore, 'restaurants', effectiveRestaurantId);
  }, [firestore, effectiveRestaurantId]);

  const { data: restaurant, isLoading: loadingRes } = useDoc(restaurantRef);
  
  const menusQuery = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return collection(firestore, 'restaurants', effectiveRestaurantId, 'menus');
  }, [firestore, effectiveRestaurantId]);

  const { data: menus, isLoading: loadingMenus } = useCollection(menusQuery);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !effectiveRestaurantId) return null;
    return collection(firestore, 'restaurants', effectiveRestaurantId, 'orders');
  }, [firestore, effectiveRestaurantId]);

  const { data: orders, isLoading: loadingOrders } = useCollection(ordersQuery);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [aiInsights, setAiInsights] = useState<AiSalesInsightsOutput | null>(null);
  const [seoResult, setSeoResult] = useState<LocalizedSeoContentOutput | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingSeo, setLoadingSeo] = useState(false);

  const [seoForm, setSeoForm] = useState({
    restaurantName: '',
    cuisineType: '',
    location: '',
    description: '',
    menuHighlights: 'Chef specials, Seasonal menu',
    websiteUrl: '',
    phoneNumber: '',
    address: '',
    locale: 'en-GB'
  });

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (restaurant) {
      setSeoForm({
        restaurantName: restaurant.name || '',
        cuisineType: Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(', ') : '',
        location: `${restaurant.city || ''}, ${restaurant.country || ''}`,
        description: restaurant.description || '',
        menuHighlights: 'Chef specials, Seasonal menu',
        websiteUrl: restaurant.customDomain ? `https://${restaurant.customDomain}` : '',
        phoneNumber: restaurant.contactPhone || '',
        address: restaurant.address || '',
        locale: 'en-GB'
      });
    }
  }, [restaurant]);

  const generateInsights = async () => {
    setLoadingAi(true);
    try {
      const result = await getAiSalesInsights({
        salesData: MOCK_SALES_DATA,
        timeframe: 'last 30 days'
      });
      setAiInsights(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAi(false);
    }
  };

  const generateSeo = async () => {
    setLoadingSeo(true);
    try {
      const result = await localizedSeoContentGenerator(seoForm);
      setSeoResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSeo(false);
    }
  };

  /**
   * REFINED LOADING LOGIC:
   * 1. If Firebase Auth is still determining the user state, we are loading.
   * 2. If we have an authenticated user but their profile is still loading, we are loading.
   * 3. If we have a profile but we're still waiting to fetch the restaurant data, we are loading.
   */
  const isTrulyLoading = authLoading || 
                         (!!authUser && loadingProfile) || 
                         (!!effectiveRestaurantId && loadingRes && !restaurant);

  if (isTrulyLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-primary/50" />
          </div>
        </div>
        <p className="text-muted-foreground animate-pulse font-medium">Validating Merchant Credentials...</p>
      </div>
    );
  }

  // Final check: if we are NOT loading anymore, and we still don't have a restaurant, THEN show the restriction error.
  if (!restaurant && !loadingRes && !loadingProfile && !authLoading) {
    return (
      <div className="p-20 text-center max-w-md mx-auto space-y-6">
        <div className="bg-destructive/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto text-destructive">
          <Info className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-primary">Access Restriction</h2>
          <p className="text-muted-foreground">
            We couldn't connect your account to a specific restaurant profile. This usually happens if your subscription is pending or if you haven't been assigned a tenant ID.
          </p>
          <p className="text-xs text-muted-foreground/60 italic">
            Please contact your platform administrator or try logging in again.
          </p>
        </div>
        <div className="pt-4 space-y-2">
          <Button variant="outline" asChild className="w-full">
            <Link href="/auth/login">Return to Login</Link>
          </Button>
          <Button variant="ghost" asChild className="w-full text-xs">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      {impersonateId && (
        <Button variant="outline" size="sm" asChild className="mb-2">
          <Link href="/super-admin/tenants">
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Super Admin
          </Link>
        </Button>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-headline font-bold text-primary">
              {restaurant?.name}
            </h1>
            <Badge className="bg-accent/20 text-accent border-accent/20">Active Pro</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {restaurant?.contactEmail} • Location: {restaurant?.city}, {restaurant?.country}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-primary text-primary hover:bg-primary/10" asChild>
            <Link href={`/customer/${restaurant?.id}`} target="_blank">
              <ShoppingCart className="mr-2 h-4 w-4" /> View Storefront
            </Link>
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
            <Settings className="mr-2 h-4 w-4" /> Store Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4" onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="bg-white border p-1 rounded-xl flex overflow-x-auto no-scrollbar h-auto w-full md:w-auto">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5">Overview</TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5">Orders</TabsTrigger>
          <TabsTrigger value="menu" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5">Menus</TabsTrigger>
          <TabsTrigger value="design" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5 flex items-center gap-2">
            <Palette className="h-4 w-4" /> Design System
          </TabsTrigger>
          <TabsTrigger value="seo" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5">SEO Engine</TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6 py-2.5">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Daily Sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{restaurant?.baseCurrency === 'GBP' ? '£' : '$'}1,240.50</div>
                <p className="text-xs text-muted-foreground">+8.2% from yesterday</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Open Orders</CardTitle>
                <Clock className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orders?.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length || 0}</div>
                <p className="text-xs text-muted-foreground">Active platform-wide</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg. Prep Time</CardTitle>
                <Utensils className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">18 min</div>
                <p className="text-xs text-accent font-semibold">Performing optimally</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" /> AI Insights Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!aiInsights ? (
                  <div className="text-center py-8 space-y-4">
                    <p className="text-muted-foreground">Generate deep-dive insights from your recent sales data.</p>
                    <Button onClick={generateInsights} disabled={loadingAi} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                      {loadingAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Run AI Analysis"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-accent-soft rounded-lg border border-accent/10">
                      <p className="text-sm italic">"{aiInsights.overallPerformanceSummary}"</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Key Recommendation:</h4>
                      <p className="text-sm text-muted-foreground">{aiInsights.actionableRecommendations[0]}</p>
                    </div>
                    <Button variant="link" className="p-0 h-auto text-primary" onClick={() => setActiveTab('analytics')}>
                      View Full Analysis <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" /> Storefront Design
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Customize your website's theme, colors, and layout in our drag-and-drop editor.</p>
                  <Button variant="outline" className="w-full" onClick={() => setActiveTab('design')}>
                    Open Design Management
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="design" className="pt-4">
          <DesignSystemEditor restaurantId={effectiveRestaurantId!} />
        </TabsContent>

        <TabsContent value="orders" className="space-y-6 pt-4">
          <Card className="border-none shadow-lg overflow-hidden">
            <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="font-headline">Order Management</CardTitle>
                <CardDescription>Track and update active customer orders.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingOrders ? (
                <div className="text-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                </div>
              ) : orders && orders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Order ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.id.slice(-6).toUpperCase()}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(order.orderedAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] uppercase">
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{order.orderType}</TableCell>
                        <TableCell className="font-bold">{restaurant?.baseCurrency === 'GBP' ? '£' : '$'}{order.totalAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Update</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-20 border-2 border-dashed rounded-xl space-y-4 m-6">
                  <div className="bg-primary/5 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <Package className="h-8 w-8 text-primary/40" />
                  </div>
                  <p className="text-muted-foreground">No orders have been placed yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu" className="space-y-6 pt-4">
          <Card className="border-none shadow-lg">
            <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="font-headline">Menu Catalog</CardTitle>
                <CardDescription>Manage your active menus and digital catalogue.</CardDescription>
              </div>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Create Menu
              </Button>
            </CardHeader>
            <CardContent>
              {loadingMenus ? (
                <div className="text-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                </div>
              ) : menus && menus.length > 0 ? (
                <div className="grid gap-4">
                  {menus.map((menu) => (
                    <div key={menu.id} className="flex items-center gap-4 p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                      <div className="bg-primary/10 p-4 rounded-xl">
                        <Utensils className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">{menu.name}</h4>
                        <p className="text-sm text-muted-foreground">{menu.description || 'No description provided.'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={menu.isActive ? 'default' : 'secondary'}>
                          {menu.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button variant="ghost" size="icon">
                          <ChevronLeft className="h-4 w-4 rotate-180" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 border-2 border-dashed rounded-xl space-y-4">
                  <p className="text-muted-foreground">You haven't created any menus yet.</p>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" /> Start Initial Menu
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline">Restaurant Details for SEO</CardTitle>
                <CardDescription>Fill out your restaurant profile to generate optimized SEO tags.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Restaurant Name</Label>
                    <Input value={seoForm.restaurantName} onChange={(e) => setSeoForm({...seoForm, restaurantName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cuisine</Label>
                    <Input value={seoForm.cuisineType} onChange={(e) => setSeoForm({...seoForm, cuisineType: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={seoForm.description} onChange={(e) => setSeoForm({...seoForm, description: e.target.value})} className="min-h-[100px]" />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={seoForm.address} onChange={(e) => setSeoForm({...seoForm, address: e.target.value})} />
                </div>
                <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm" onClick={generateSeo} disabled={loadingSeo}>
                  {loadingSeo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate SEO Strategy"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg h-fit">
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" /> AI Generated SEO Package
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!seoResult ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl">
                    <p className="text-muted-foreground">Generated SEO content will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-xs uppercase text-muted-foreground">Meta Title</Label>
                      <div className="p-3 bg-muted/50 rounded border text-sm font-medium">{seoResult.metaTitle}</div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs uppercase text-muted-foreground">Meta Description</Label>
                      <div className="p-3 bg-muted/50 rounded border text-sm">{seoResult.metaDescription}</div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs uppercase text-muted-foreground">Schema.org JSON-LD</Label>
                      <div className="p-3 bg-muted/50 rounded border text-[10px] font-mono whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto">
                        {seoResult.schemaMarkup}
                      </div>
                    </div>
                    <Button className="w-full mt-4 bg-primary shadow-sm">
                      <Save className="mr-2 h-4 w-4" /> Apply Global Meta Tags
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6 pt-4">
          {!aiInsights ? (
            <Card className="border-none shadow-lg text-center py-20">
              <CardContent className="space-y-4">
                <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                  <BarChart3 className="h-10 w-10 text-primary opacity-40" />
                </div>
                <h3 className="text-xl font-bold">Comprehensive Sales Intelligence</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Run our AI auditor to identify trends, underperforming menu items, and peak revenue windows.
                </p>
                <Button onClick={generateInsights} disabled={loadingAi} className="bg-primary shadow-md">
                  {loadingAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Run Deep Analysis"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="font-headline">Performance Trend Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                      <p className="text-xs uppercase text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">{restaurant?.baseCurrency === 'GBP' ? '£' : '$'}{aiInsights.keyPerformanceIndicators.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                      <p className="text-xs uppercase text-muted-foreground">Avg. Order</p>
                      <p className="text-2xl font-bold">{restaurant?.baseCurrency === 'GBP' ? '£' : '$'}{aiInsights.keyPerformanceIndicators.averageOrderValue.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                      <p className="text-xs uppercase text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold">{aiInsights.keyPerformanceIndicators.numberOfOrders}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-bold mb-4 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-accent" /> Detected Trends
                    </h4>
                    <div className="space-y-2">
                      {aiInsights.performanceTrends.map((trend, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm p-3 bg-white border rounded-lg shadow-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                          <span>{trend}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold mb-4 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-accent" /> Strategic Recommendations
                    </h4>
                    <div className="space-y-2">
                      {aiInsights.actionableRecommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm p-3 bg-accent/5 border border-accent/20 rounded-lg">
                          <Sparkles className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                          <span className="font-medium">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="font-headline text-lg">Top Performers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {aiInsights.bestSellingItems.map((item, i) => (
                      <div key={i} className="flex justify-between items-center border-b pb-3 last:border-0 last:pb-0">
                        <div>
                          <p className="font-semibold text-sm">{item.itemName}</p>
                          <p className="text-xs text-muted-foreground">{item.totalQuantitySold} sold</p>
                        </div>
                        <p className="font-bold text-accent">{restaurant?.baseCurrency === 'GBP' ? '£' : '$'}{item.totalRevenueGenerated.toFixed(2)}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-primary text-white">
                  <CardHeader>
                    <CardTitle className="font-headline text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-accent" /> Promotional Strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4">
                      {aiInsights.promotionalStrategies.slice(0, 3).map((strat, i) => (
                        <li key={i} className="text-sm border-l-2 border-accent pl-4 italic leading-relaxed">
                          "{strat}"
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function RestaurantAdminDashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
