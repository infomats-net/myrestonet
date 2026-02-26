
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Palette, 
  Type, 
  Layout, 
  Image as ImageIcon, 
  Save, 
  RotateCcw, 
  Eye, 
  Smartphone, 
  Monitor, 
  Tablet,
  Check,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface DesignSettings {
  theme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    headerColor: string;
    footerColor: string;
  };
  typography: {
    fontFamily: string;
    headingFont: string;
    baseSize: string;
  };
  sections: {
    hero: { visible: boolean; height: string };
    about: { visible: boolean };
    gallery: { visible: boolean };
    reviews: { visible: boolean };
  };
}

const DEFAULT_SETTINGS: DesignSettings = {
  theme: {
    primary: '#42668A',
    secondary: '#F0F2F4',
    accent: '#53C683',
    background: '#FFFFFF',
    headerColor: '#FFFFFF',
    footerColor: '#1A1A1A'
  },
  typography: {
    fontFamily: 'Inter',
    headingFont: 'Inter',
    baseSize: '16px'
  },
  sections: {
    hero: { visible: true, height: '400px' },
    about: { visible: true },
    gallery: { visible: true },
    reviews: { visible: true }
  }
};

const THEME_PRESETS = [
  { name: 'Default Blue', colors: { primary: '#42668A', accent: '#53C683' } },
  { name: 'Vibrant Orange', colors: { primary: '#FF5733', accent: '#FFC300' } },
  { name: 'Midnight', colors: { primary: '#1A1A1A', accent: '#3498DB' } },
  { name: 'Forest', colors: { primary: '#27AE60', accent: '#F1C40F' } },
];

export function DesignSystemEditor({ restaurantId }: { restaurantId: string }) {
  const [settings, setSettings] = useState<DesignSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (!firestore || !restaurantId) return;

    const docRef = doc(firestore, 'restaurants', restaurantId, 'design', 'settings');

    const unsub = onSnapshot(
      docRef, 
      (snap) => {
        if (snap.exists()) {
          setSettings(snap.data() as DesignSettings);
        }
        setLoading(false);
      },
      async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [firestore, restaurantId]);

  const handleSave = async () => {
    if (!firestore || !restaurantId) return;
    setSaving(true);
    try {
      await setDoc(doc(firestore, 'restaurants', restaurantId, 'design', 'settings'), {
        ...settings,
        updatedAt: new Date().toISOString()
      });
      toast({ title: 'Design Saved', description: 'Your storefront has been updated.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: typeof THEME_PRESETS[0]) => {
    setSettings(prev => ({
      ...prev,
      theme: { ...prev.theme, primary: preset.colors.primary, accent: preset.colors.accent }
    }));
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col xl:flex-row h-[calc(100vh-140px)] gap-6">
      {/* Sidebar Controls */}
      <div className="w-full xl:w-96 space-y-6 overflow-y-auto no-scrollbar pb-10">
        <Tabs defaultValue="theme" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="theme"><Palette className="h-4 w-4 mr-2" /> Theme</TabsTrigger>
            <TabsTrigger value="layout"><Layout className="h-4 w-4 mr-2" /> Layout</TabsTrigger>
            <TabsTrigger value="fonts"><Type className="h-4 w-4 mr-2" /> Style</TabsTrigger>
          </TabsList>

          <TabsContent value="theme" className="space-y-6 mt-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Palette className="h-4 w-4" /> Branding Colors
                </CardTitle>
                <CardDescription className="text-xs">Define your restaurant's unique color palette.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={settings.theme.primary} onChange={(e) => setSettings({...settings, theme: {...settings.theme, primary: e.target.value}})} className="h-10 w-12 p-1" />
                      <Input value={settings.theme.primary} onChange={(e) => setSettings({...settings, theme: {...settings.theme, primary: e.target.value}})} className="font-mono text-xs" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Accent Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={settings.theme.accent} onChange={(e) => setSettings({...settings, theme: {...settings.theme, accent: e.target.value}})} className="h-10 w-12 p-1" />
                      <Input value={settings.theme.accent} onChange={(e) => setSettings({...settings, theme: {...settings.theme, accent: e.target.value}})} className="font-mono text-xs" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Presets</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {THEME_PRESETS.map((p) => (
                      <Button 
                        key={p.name} 
                        variant="outline" 
                        size="sm" 
                        className="h-8 justify-start text-[10px]"
                        onClick={() => applyPreset(p)}
                      >
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: p.colors.primary }} />
                        {p.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">Navigation Styling</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Header Background</Label>
                  <Input type="color" value={settings.theme.headerColor} onChange={(e) => setSettings({...settings, theme: {...settings.theme, headerColor: e.target.value}})} className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Footer Background</Label>
                  <Input type="color" value={settings.theme.footerColor} onChange={(e) => setSettings({...settings, theme: {...settings.theme, footerColor: e.target.value}})} className="h-10" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="layout" className="space-y-6 mt-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Layout className="h-4 w-4" /> Section Visibility
                </CardTitle>
                <CardDescription className="text-xs">Control which components appear on your storefront.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold">Hero Header</Label>
                    <p className="text-[10px] text-muted-foreground">The large banner at the top.</p>
                  </div>
                  <Switch checked={settings.sections.hero.visible} onCheckedChange={(v) => setSettings({...settings, sections: {...settings.sections, hero: {...settings.sections.hero, visible: v}}})} />
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold">About Section</Label>
                    <p className="text-[10px] text-muted-foreground">Your story and description.</p>
                  </div>
                  <Switch checked={settings.sections.about.visible} onCheckedChange={(v) => setSettings({...settings, sections: {...settings.sections, about: {visible: v}}})} />
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold">Photo Gallery</Label>
                    <p className="text-[10px] text-muted-foreground">Display your venue and food.</p>
                  </div>
                  <Switch checked={settings.sections.gallery.visible} onCheckedChange={(v) => setSettings({...settings, sections: {...settings.sections, gallery: {visible: v}}})} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fonts" className="space-y-6 mt-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Type className="h-4 w-4" /> Typography
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Global Font Family</Label>
                  <Select value={settings.typography.fontFamily} onValueChange={(v) => setSettings({...settings, typography: {...settings.typography, fontFamily: v}})}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter (Sans)</SelectItem>
                      <SelectItem value="Playfair Display">Playfair (Serif)</SelectItem>
                      <SelectItem value="Montserrat">Montserrat (Modern)</SelectItem>
                      <SelectItem value="Roboto">Roboto (Clean)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Base Font Size</Label>
                  <Select value={settings.typography.baseSize} onValueChange={(v) => setSettings({...settings, typography: {...settings.typography, baseSize: v}})}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="14px">Small (14px)</SelectItem>
                      <SelectItem value="16px">Standard (16px)</SelectItem>
                      <SelectItem value="18px">Large (18px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col gap-2 pt-4">
          <Button onClick={handleSave} disabled={saving} className="w-full h-12 bg-primary shadow-lg">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Publish Design Changes
          </Button>
          <Button variant="ghost" onClick={() => setSettings(DEFAULT_SETTINGS)} className="text-xs">
            <RotateCcw className="mr-2 h-3 w-3" /> Reset to Defaults
          </Button>
        </div>
      </div>

      {/* Preview Pane */}
      <div className="flex-1 bg-muted/30 rounded-3xl overflow-hidden border-4 border-muted flex flex-col relative group">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border shadow-2xl flex items-center gap-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2 border-r pr-4">
            <Monitor className={cn("h-5 w-5 cursor-pointer transition-colors", previewMode === 'desktop' ? "text-primary" : "text-muted-foreground")} onClick={() => setPreviewMode('desktop')} />
            <Tablet className={cn("h-5 w-5 cursor-pointer transition-colors", previewMode === 'tablet' ? "text-primary" : "text-muted-foreground")} onClick={() => setPreviewMode('tablet')} />
            <Smartphone className={cn("h-5 w-5 cursor-pointer transition-colors", previewMode === 'mobile' ? "text-primary" : "text-muted-foreground")} onClick={() => setPreviewMode('mobile')} />
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-accent" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Live Editing Mode</span>
          </div>
        </div>

        <div className={cn(
          "flex-1 mx-auto transition-all duration-500 overflow-hidden bg-white shadow-2xl",
          previewMode === 'desktop' ? "w-full" : previewMode === 'tablet' ? "w-[768px]" : "w-[375px]"
        )}>
          {/* Simulated Storefront */}
          <div className="h-full overflow-y-auto no-scrollbar" style={{ fontFamily: settings.typography.fontFamily, transform: 'scale(3)', transformOrigin: 'top center' }}>
            {/* Nav */}
            <div className="h-16 border-b flex items-center justify-between px-6" style={{ backgroundColor: settings.theme.headerColor }}>
              <div className="h-8 w-32 bg-primary/20 rounded animate-pulse" style={{ backgroundColor: `${settings.theme.primary}20` }} />
              <div className="flex gap-4">
                <div className="h-4 w-12 bg-muted rounded" />
                <div className="h-4 w-12 bg-muted rounded" />
                <div className="h-4 w-12 bg-muted rounded" />
              </div>
            </div>

            {/* Hero */}
            {settings.sections.hero.visible && (
              <div className="w-full flex items-center justify-center relative overflow-hidden bg-muted" style={{ height: settings.sections.hero.height }}>
                <img src={`https://picsum.photos/seed/${restaurantId}/1200/600`} className="absolute inset-0 w-full h-full object-cover opacity-60 brightness-75" />
                <div className="relative text-center space-y-4">
                  <h1 className="text-4xl font-bold text-white shadow-sm">Restaurant Name</h1>
                  <Button className="rounded-full px-8 h-12" style={{ backgroundColor: settings.theme.primary }}>Order Now</Button>
                </div>
              </div>
            )}

            {/* About */}
            {settings.sections.about.visible && (
              <div className="p-12 text-center max-w-2xl mx-auto space-y-4">
                <h2 className="text-3xl font-bold" style={{ color: settings.theme.primary }}>Our Story</h2>
                <p className="text-muted-foreground leading-relaxed" style={{ fontSize: settings.typography.baseSize }}>
                  We believe in serving authentic flavors using only the freshest local ingredients. 
                  Experience the art of culinary excellence in a warm and inviting atmosphere.
                </p>
                <div className="w-16 h-1 mx-auto rounded-full" style={{ backgroundColor: settings.theme.accent }} />
              </div>
            )}

            {/* Menu Snippet */}
            <div className="p-12 bg-muted/20">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold">Featured Menu</h2>
                <span className="text-sm font-bold uppercase tracking-widest" style={{ color: settings.theme.accent }}>View All</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2].map(i => (
                  <Card key={i} className="overflow-hidden border-none shadow-sm">
                    <div className="h-32 bg-muted">
                      <img src={`https://picsum.photos/seed/${i + 10}/300/200`} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="h-4 w-3/4 bg-muted rounded" />
                      <div className="h-3 w-1/2 bg-muted rounded" />
                      <div className="flex justify-between items-center pt-2">
                        <span className="font-bold" style={{ color: settings.theme.primary }}>$14.00</span>
                        <div className="h-8 w-8 rounded-full" style={{ backgroundColor: settings.theme.accent }} />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-12 text-white text-center" style={{ backgroundColor: settings.theme.footerColor }}>
              <p className="text-xs opacity-50 uppercase tracking-widest font-bold">© 2024 Restaurant Name Global</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
