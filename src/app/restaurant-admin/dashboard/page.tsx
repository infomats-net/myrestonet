"use client";

import { useState, Suspense } from 'react';
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
  ChevronLeft
} from 'lucide-react';
import { MOCK_MENU_ITEMS, MOCK_SALES_DATA, MOCK_RESTAURANTS } from '@/lib/mock-data';
import { getAiSalesInsights, AiSalesInsightsOutput } from '@/ai/flows/ai-sales-insights';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { localizedSeoContentGenerator, LocalizedSeoContentOutput } from '@/ai/flows/localized-seo-content';
import Link from 'next/link';

function DashboardContent() {
  const searchParams = useSearchParams();
  const impersonateId = searchParams.get('impersonate');
  const impersonatedRestaurant = impersonateId ? MOCK_RESTAURANTS.find(r => r.id === impersonateId) : null;
  
  const [activeTab, setActiveTab] = useState('overview');
  const [aiInsights, setAiInsights] = useState<AiSalesInsightsOutput | null>(null);
  const [seoResult, setSeoResult] = useState<LocalizedSeoContentOutput | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingSeo, setLoadingSeo] = useState(false);

  const [seoForm, setSeoForm] = useState({
    restaurantName: impersonatedRestaurant?.name || 'Bella Napoli',
    cuisineType: impersonatedRestaurant?.cuisineType || 'Italian',
    location: impersonatedRestaurant?.location || 'London, UK',
    description: impersonatedRestaurant?.description || 'The best authentic Italian pizza and pasta in central London.',
    menuHighlights: 'Wood-fired Pizza, Fresh Tagliatelle, Tiramisu',
    websiteUrl: impersonatedRestaurant?.customDomain ? `https://${impersonatedRestaurant.customDomain}` : 'https://bellanapoli.example.com',
    phoneNumber: '+44 20 7123 4567',
    address: impersonatedRestaurant?.address || '123 Pizza St, London, EC1 1BB',
    locale: 'en-GB'
  });

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
              {impersonatedRestaurant?.name || 'Bella Napoli'}
            </h1>
            <Badge className="bg-accent/20 text-accent border-accent/20">Active Pro</Badge>
          </div>
          <p className="text-muted-foreground">
            {impersonatedRestaurant?.adminEmail || 'Admin: gino@example.com'} • Location: {impersonatedRestaurant?.location || 'London, UK'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
            <ShoppingCart className="mr-2 h-4 w-4" /> View Orders
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
            <Settings className="mr-2 h-4 w-4" /> Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4" onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="bg-white border p-1 rounded-xl">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6">Overview</TabsTrigger>
          <TabsTrigger value="menu" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6">Menu Management</TabsTrigger>
          <TabsTrigger value="seo" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6">Localized SEO</TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6">AI Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Daily Sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">£1,240.50</div>
                <p className="text-xs text-muted-foreground">+8.2% from yesterday</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Open Orders</CardTitle>
                <Clock className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">4 urgent (delayed)</p>
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
                  <Globe className="h-5 w-5 text-primary" /> Local SEO Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span>Google Maps Status</span>
                    <Badge variant="outline" className="text-accent border-accent px-3">Optimized</Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Schema.org Markup</span>
                    <Badge variant="outline" className="text-destructive border-destructive px-3">Outdated</Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Menu Localization</span>
                    <Badge variant="outline" className="text-accent border-accent px-3">Complete (EN, IT)</Badge>
                  </div>
                  <Button variant="outline" className="w-full mt-4" onClick={() => setActiveTab('seo')}>
                    Update SEO Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="menu" className="space-y-6 pt-4">
          <Card className="border-none shadow-lg">
            <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="font-headline">Menu Catalog</CardTitle>
                <CardDescription>Update your items and manage real-time inventory.</CardDescription>
              </div>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {MOCK_MENU_ITEMS.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                    <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />
                    <div className="flex-1">
                      <h4 className="font-bold text-lg">{item.name}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs px-3">£{item.price.toFixed(2)}</Badge>
                        <Badge variant="outline" className="text-xs px-3">{item.category}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Inventory</p>
                      <p className={`text-xl font-bold ${item.inventory < 10 ? 'text-destructive' : 'text-accent'}`}>{item.inventory}</p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
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
                      <p className="text-2xl font-bold">£{aiInsights.keyPerformanceIndicators.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                      <p className="text-xs uppercase text-muted-foreground">Avg. Order</p>
                      <p className="text-2xl font-bold">£{aiInsights.keyPerformanceIndicators.averageOrderValue.toFixed(2)}</p>
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
                        <p className="font-bold text-accent">£{item.totalRevenueGenerated.toFixed(2)}</p>
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
