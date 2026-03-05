
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
  Copy,
  Instagram,
  Facebook,
  Twitter,
  Link as LinkIcon,
  TrendingUp,
  ChevronRight,
  Monitor
} from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { OperatingHoursEditor } from '@/components/operating-hours-editor';
import { localizedSeoContentGenerator } from '@/ai/flows/localized-seo-content';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    facebook: '',
    twitter: '',
    website: ''
  });
  const [seoForm, setSeoForm] = useState({
    metaTitle: '',
    metaDescription: '',
    keywords: [] as string[],
    usps: [] as string[]
  });
  const [seoAudit, setSeoAudit] = useState<any>(null);

  useEffect(() => {
    if (restaurant) {
      setDomainForm(restaurant.customDomain || '');
      setSocialLinks({
        instagram: restaurant.socialLinks?.instagram || '',
        facebook: restaurant.socialLinks?.facebook || '',
        twitter: restaurant.socialLinks?.twitter || '',
        website: restaurant.socialLinks?.website || ''
      });
      setSeoForm({
        metaTitle: restaurant.seoSettings?.metaTitle || '',
        metaDescription: restaurant.seoSettings?.metaDescription || '',
        keywords: restaurant.seoSettings?.keywords || [],
        usps: restaurant.seoSettings?.usps || []
      });
    }
  }, [restaurant]);

  const handleUpdateSettings = async () => {
    if (!firestore || !restaurantId) return;
    setLoading(true);
    try {
      await updateDoc(doc(firestore, 'restaurants', restaurantId), {
        customDomain: domainForm,
        socialLinks,
        seoSettings: seoForm,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Settings Saved", description: "Your domain, social, and SEO configurations are live." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save settings." });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSeo = async () => {
    if (!restaurant) return;
    setGeneratingSeo(true);
    try {
      const result = await localizedSeoContentGenerator({
        restaurantName: restaurant.name,
        cuisineType: restaurant.cuisine?.join(', ') || 'Various',
        location: `${restaurant.city}, ${restaurant.country}`,
        description: restaurant.description || "Premium dining experience focused on quality and atmosphere.",
        menuHighlights: "Signature chef specials and seasonal local ingredients.",
        websiteUrl: `https://myrestonet.app/customer/${restaurantId}`,
        phoneNumber: restaurant.contactPhone || 'Contact us via web',
        address: restaurant.address || restaurant.city,
        locale: 'en-US',
        usps: seoForm.usps
      });
      
      setSeoForm({
        ...seoForm,
        metaTitle: result.metaTitle,
        metaDescription: result.metaDescription,
        keywords: result.keywords
      });
      setSeoAudit(result.seoAudit);
      toast({ title: "AI SEO Analysis Complete", description: "Updated fields with recommended metadata." });
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Growth & Visibility</h1>
            <p className="text-muted-foreground text-sm font-medium">Manage your domain, social presence, and search engine authority.</p>
          </div>
        </div>
        <Button onClick={handleUpdateSettings} disabled={loading} className="h-14 rounded-2xl px-10 font-black shadow-xl">
          {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
          Publish All Changes
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-white border p-1 rounded-2xl h-14 w-fit">
          <TabsTrigger value="domain" className="rounded-xl h-full font-bold px-8 gap-2">
            <Globe className="h-4 w-4" /> Branding
          </TabsTrigger>
          <TabsTrigger value="seo" className="rounded-xl h-full font-bold px-8 gap-2">
            <TrendingUp className="h-4 w-4" /> Local SEO Engine
          </TabsTrigger>
          <TabsTrigger value="hours" className="rounded-xl h-full font-bold px-8 gap-2">
            <Clock className="h-4 w-4" /> Operations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="domain" className="space-y-8 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
              <CardHeader className="p-10 border-b bg-slate-50/50">
                <CardTitle className="text-xl font-black">Custom Domain</CardTitle>
                <CardDescription>Connect a branded URL to your storefront.</CardDescription>
              </CardHeader>
              <CardContent className="p-10 space-y-6">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Domain Name</Label>
                  <Input 
                    value={domainForm} 
                    onChange={e => setDomainForm(e.target.value)} 
                    placeholder="e.g. order.myrestaurant.com" 
                    className="h-12 rounded-xl bg-slate-50 border-slate-100"
                  />
                  <p className="text-[10px] text-slate-400 font-medium">Platform default: myrestonet.app/customer/{restaurantId}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
              <CardHeader className="p-10 border-b bg-slate-50/50">
                <CardTitle className="text-xl font-black">Social Profiles</CardTitle>
                <CardDescription>Link your socials to boost local ranking.</CardDescription>
              </CardHeader>
              <CardContent className="p-10 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Instagram className="h-3.5 w-3.5" /> Instagram</Label>
                    <Input value={socialLinks.instagram} onChange={e => setSocialLinks({...socialLinks, instagram: e.target.value})} placeholder="@handle" className="h-11 rounded-xl bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Facebook className="h-3.5 w-3.5" /> Facebook</Label>
                    <Input value={socialLinks.facebook} onChange={e => setSocialLinks({...socialLinks, facebook: e.target.value})} placeholder="facebook.com/..." className="h-11 rounded-xl bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Twitter className="h-3.5 w-3.5" /> X / Twitter</Label>
                    <Input value={socialLinks.twitter} onChange={e => setSocialLinks({...socialLinks, twitter: e.target.value})} placeholder="@handle" className="h-11 rounded-xl bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><LinkIcon className="h-3.5 w-3.5" /> Main Website</Label>
                    <Input value={socialLinks.website} onChange={e => setSocialLinks({...socialLinks, website: e.target.value})} placeholder="https://..." className="h-11 rounded-xl bg-slate-50" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="seo" className="space-y-8 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
                <CardHeader className="p-10 border-b bg-slate-50/50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-black">Search Engine Preview</CardTitle>
                    <CardDescription>Live visualization of your restaurant on Google.</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleGenerateSeo} 
                    disabled={generatingSeo}
                    className="rounded-xl h-12 bg-white border-primary/20 text-primary font-black hover:bg-primary/5"
                  >
                    {generatingSeo ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    AI SEO Audit
                  </Button>
                </CardHeader>
                <CardContent className="p-10 space-y-10">
                  {/* Google Preview Component */}
                  <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-2 shadow-inner">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="bg-white w-6 h-6 rounded-full border flex items-center justify-center"><Globe className="h-3 w-3 text-slate-400" /></div>
                      <span className="text-[10px] text-slate-500">https://myrestonet.app › customer › {restaurantId}</span>
                    </div>
                    <h3 className="text-xl text-[#1a0dab] hover:underline cursor-pointer font-medium leading-tight">
                      {seoForm.metaTitle || restaurant.name || "Restaurant Name"}
                    </h3>
                    <p className="text-sm text-[#4d5156] leading-relaxed line-clamp-2">
                      {seoForm.metaDescription || "Providing elite culinary experiences. View our menu and book a table online today..."}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-8 pt-6 border-t">
                    <div className="space-y-4">
                      <Label className="font-black text-xs uppercase tracking-widest text-slate-400">SEO Meta Title</Label>
                      <Input 
                        value={seoForm.metaTitle} 
                        onChange={e => setSeoForm({...seoForm, metaTitle: e.target.value})} 
                        className="h-12 rounded-xl bg-white border-slate-200"
                        placeholder="Max 60 characters..."
                      />
                    </div>
                    <div className="space-y-4">
                      <Label className="font-black text-xs uppercase tracking-widest text-slate-400">SEO Meta Description</Label>
                      <textarea 
                        value={seoForm.metaDescription} 
                        onChange={e => setSeoForm({...seoForm, metaDescription: e.target.value})} 
                        className="w-full min-h-[100px] p-4 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Describe your restaurant for search engines..."
                      />
                    </div>
                    <div className="space-y-4">
                      <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Hyper-Local Keywords</Label>
                      <div className="flex flex-wrap gap-2">
                        {seoForm.keywords?.map((k, i) => (
                          <Badge key={i} variant="secondary" className="bg-primary/10 text-primary border-none py-1.5 px-3 rounded-lg flex items-center gap-2">
                            {k}
                            <button onClick={() => setSeoForm({...seoForm, keywords: seoForm.keywords.filter(x => x !== k)})}><AlertCircle className="h-3 w-3" /></button>
                          </Badge>
                        ))}
                        <Input 
                          placeholder="Add keyword + Enter" 
                          onKeyDown={e => {
                            if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                              setSeoForm({...seoForm, keywords: [...seoForm.keywords, (e.target as HTMLInputElement).value]});
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                          className="h-10 w-40 rounded-xl bg-slate-50 border-dashed"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {seoAudit && (
                <Card className="rounded-[2.5rem] border-none shadow-xl bg-slate-900 text-white overflow-hidden animate-in zoom-in-95 duration-500">
                  <CardHeader className="p-8 border-b border-white/10 flex flex-row items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-black">SEO Health Audit</CardTitle>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Real-time pulse</p>
                    </div>
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-primary" strokeDasharray={175.9} strokeDashoffset={175.9 * (1 - seoAudit.score / 100)} />
                      </svg>
                      <span className="absolute text-sm font-black">{seoAudit.score}%</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Recommendations</h4>
                      <ul className="space-y-3">
                        {seoAudit.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="flex items-start gap-3 text-xs font-medium text-slate-300">
                            <ChevronRight className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-[2.5rem] border-none shadow-xl p-8 bg-white border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                  <h4 className="font-black uppercase text-xs tracking-widest">Global Standards</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  We automatically inject <strong>JSON-LD Schema.org</strong> data into your storefront. This signals to Google that you are a verified <strong>LocalBusiness</strong>, making you eligible for map pins and localized search priority.
                </p>
              </Card>

              <Card className="rounded-[2.5rem] border-none shadow-xl p-8 bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-3 mb-4">
                  <Monitor className="h-6 w-6 text-blue-600" />
                  <h4 className="font-black text-blue-900 uppercase text-xs tracking-widest">Local Ranking Tips</h4>
                </div>
                <ul className="space-y-3">
                  {['Keep opening hours updated', 'Add high-quality gallery photos', 'Link all social media profiles'].map((tip, i) => (
                    <li key={i} className="flex items-center gap-2 text-[11px] font-bold text-blue-700">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> {tip}
                    </li>
                  ))}
                </ul>
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
