'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Globe, 
  Clock, 
  Search, 
  Sparkles, 
  Loader2, 
  Save, 
  ExternalLink, 
  ShieldCheck, 
  Info,
  CheckCircle2,
  AlertCircle,
  Copy
} from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { OperatingHoursEditor } from '@/components/operating-hours-editor';
import { localizedSeoContentGenerator } from '@/ai/flows/localized-seo-content';
import { cn } from '@/lib/utils';

export function StoreSettingsManager({ restaurantId }: { restaurantId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('domain');
  const [loading, setLoading] = useState(false);
  const [generatingSeo, setGeneratingSeo] = useState(false);

  const resRef = useMemoFirebase(() => {
    if (!firestore || !restaurantId) return null;
    return doc(firestore, 'restaurants', restaurantId);
  }, [firestore, restaurantId]);
  
  const { data: restaurant, isLoading } = useDoc(resRef);

  const [domainForm, setDomainForm] = useState('');
  const [seoData, setSeoData] = useState<any>(null);

  useEffect(() => {
    if (restaurant) {
      setDomainForm(restaurant.customDomain || '');
    }
  }, [restaurant]);

  const handleUpdateDomain = async () => {
    if (!firestore || !restaurantId) return;
    setLoading(true);
    try {
      await updateDoc(doc(firestore, 'restaurants', restaurantId), {
        customDomain: domainForm,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Domain Updated", description: "Your custom domain preferences have been saved." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save domain settings." });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Value Copied",
      description: "Text added to clipboard.",
    });
  };

  const handleGenerateSeo = async () => {
    if (!restaurant) return;
    setGeneratingSeo(true);
    try {
      const result = await localizedSeoContentGenerator({
        restaurantName: restaurant.name,
        cuisineType: restaurant.cuisine?.join(', ') || 'Various',
        location: `${restaurant.city}, ${restaurant.country}`,
        description: "Premium dining experience focused on quality and atmosphere.",
        menuHighlights: "Signature chef specials and seasonal local ingredients.",
        websiteUrl: `https://myrestonet.app/customer/${restaurantId}`,
        phoneNumber: restaurant.contactPhone || 'Contact us via web',
        address: restaurant.address || restaurant.city,
        locale: 'en-US'
      });
      setSeoData(result);
      toast({ title: "AI SEO Generated", description: "Optimized meta-tags are ready." });
    } catch (e) {
      toast({ variant: "destructive", title: "AI Generation Failed" });
    } finally {
      setGeneratingSeo(false);
    }
  };

  if (isLoading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center text-primary shadow-sm border border-primary/5">
            <Globe className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Store Settings</h1>
            <p className="text-muted-foreground text-sm font-medium">Manage your public domain and search visibility.</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-white border p-1 rounded-2xl h-14 w-fit">
          <TabsTrigger value="domain" className="rounded-xl h-full font-bold px-8 gap-2">
            <Globe className="h-4 w-4" /> Domain
          </TabsTrigger>
          <TabsTrigger value="seo" className="rounded-xl h-full font-bold px-8 gap-2">
            <Search className="h-4 w-4" /> Local SEO
          </TabsTrigger>
          <TabsTrigger value="hours" className="rounded-xl h-full font-bold px-8 gap-2">
            <Clock className="h-4 w-4" /> Opening Hours
          </TabsTrigger>
        </TabsList>

        <TabsContent value="domain" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
                <CardHeader className="p-10 border-b bg-slate-50/50">
                  <CardTitle className="text-xl font-black">Custom Domain Management</CardTitle>
                  <CardDescription>Connect your own domain to your MyRestoNet storefront.</CardDescription>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                  <div className="space-y-4">
                    <Label className="font-bold text-slate-700">Domain Name</Label>
                    <div className="flex gap-3">
                      <Input 
                        value={domainForm} 
                        onChange={e => setDomainForm(e.target.value)} 
                        placeholder="e.g. order.myrestaurant.com" 
                        className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold"
                      />
                      <Button 
                        onClick={handleUpdateDomain} 
                        disabled={loading}
                        className="h-14 rounded-2xl px-8 font-black shadow-lg"
                      >
                        {loading ? <Loader2 className="animate-spin" /> : "Save Domain"}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400 font-medium">Leave empty to use your default platform URL: <span className="text-primary font-bold">myrestonet.app/customer/{restaurantId}</span></p>
                  </div>

                  {restaurant?.customDomain && (
                    <div className="space-y-6 pt-8 border-t">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">DNS Configuration Instructions</h3>
                      <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-6 overflow-hidden">
                        <div className="space-y-4">
                          <p className="text-xs font-bold text-primary uppercase tracking-[0.2em]">Step 1: Add A Records</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div 
                              onClick={() => handleCopy('199.36.158.100')}
                              className="p-4 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center group cursor-pointer hover:bg-white/10 transition-colors"
                            >
                              <div className="space-y-1">
                                <span className="text-[10px] opacity-40 uppercase font-black">Type: A</span>
                                <p className="font-mono text-sm">199.36.158.100</p>
                              </div>
                              <Copy className="h-3.5 w-3.5 opacity-0 group-hover:opacity-40 transition-opacity" />
                            </div>
                            <div 
                              onClick={() => handleCopy('199.36.158.95')}
                              className="p-4 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center group cursor-pointer hover:bg-white/10 transition-colors"
                            >
                              <div className="space-y-1">
                                <span className="text-[10px] opacity-40 uppercase font-black">Type: A</span>
                                <p className="font-mono text-sm">199.36.158.95</p>
                              </div>
                              <Copy className="h-3.5 w-3.5 opacity-0 group-hover:opacity-40 transition-opacity" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <p className="text-xs font-bold text-amber-400 uppercase tracking-[0.2em]">Step 2: Verification TXT Record</p>
                          <div 
                            onClick={() => handleCopy(`firebase-verification-v1-restaurant-${restaurantId}`)}
                            className="p-4 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center group cursor-pointer hover:bg-white/10 transition-colors"
                          >
                            <div className="space-y-1">
                              <span className="text-[10px] opacity-40 uppercase font-black">Type: TXT (Host: _firebase)</span>
                              <p className="font-mono text-xs truncate max-w-[250px]">firebase-verification-v1-restaurant-{restaurantId}</p>
                            </div>
                            <Copy className="h-3.5 w-3.5 opacity-0 group-hover:opacity-40 transition-opacity" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="rounded-[2.5rem] border-none shadow-xl p-8 bg-white">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                <h4 className="text-lg font-black text-center">SSL Included</h4>
                <p className="text-sm text-slate-500 mt-2 text-center leading-relaxed">
                  Every connected domain automatically receives a free Let's Encrypt SSL certificate, managed by the MyRestoNet infrastructure.
                </p>
              </Card>

              <Card className="rounded-[2.5rem] border-none shadow-xl p-8 bg-amber-50 border border-amber-100">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <h4 className="font-black text-amber-900 uppercase text-xs tracking-widest">Propagation Info</h4>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                  DNS changes can take up to 24-48 hours to fully propagate globally. During this time, your storefront might still point to the platform default URL.
                </p>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="seo" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
                <CardHeader className="p-10 border-b bg-slate-50/50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-black">AI-Powered Search Optimization</CardTitle>
                    <CardDescription>Improve your local ranking on Google and Maps.</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleGenerateSeo} 
                    disabled={generatingSeo}
                    className="rounded-xl h-12 bg-white border-primary/20 text-primary font-black hover:bg-primary/5"
                  >
                    {generatingSeo ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Analyze & Optimize
                  </Button>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                  {seoData ? (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Meta Title</Label>
                        <p className="p-4 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-900">{seoData.metaTitle}</p>
                      </div>
                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Meta Description</Label>
                        <p className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600 leading-relaxed">{seoData.metaDescription}</p>
                      </div>
                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Suggested Keywords</Label>
                        <div className="flex flex-wrap gap-2">
                          {seoData.keywords?.map((k: string) => (
                            <Badge key={k} variant="secondary" className="bg-primary/5 text-primary border-primary/10 px-3 py-1">{k}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">JSON-LD Schema Markup (Business Intelligence)</Label>
                        <div className="p-6 bg-slate-900 rounded-[1.5rem] overflow-x-auto">
                          <code className="text-[10px] text-emerald-400 font-mono block whitespace-pre">
                            {seoData.schemaMarkup}
                          </code>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 text-center space-y-6">
                      <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto text-primary opacity-20">
                        <Search className="h-10 w-10" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-lg">No SEO Pulse Found</h3>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2">Click the button above to let MyRestoNet AI analyze your business and generate localized search metadata.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="rounded-[2.5rem] border-none shadow-xl bg-slate-900 text-white p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                  <h4 className="font-black">SEO Compliance</h4>
                </div>
                <div className="space-y-4">
                  <p className="text-xs opacity-70 leading-relaxed">
                    Our AI ensures your restaurant complies with <strong>LocalBusiness</strong> standards for Schema.org, which helps Google display your hours, location, and rating directly in search results.
                  </p>
                  <Button variant="outline" className="w-full h-12 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10 font-bold text-xs" asChild>
                    <a href="https://developers.google.com/search/docs/appearance/structured-data/restaurant" target="_blank">Google SEO Guide</a>
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hours">
          <OperatingHoursEditor restaurantId={restaurantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
