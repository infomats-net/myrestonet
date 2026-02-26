'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Loader2,
  Code,
  RefreshCw,
  X,
  ChevronRight,
  User,
  UtensilsCrossed,
  MessageSquare,
  Phone,
  MapPin
} from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { generatePalette } from '@/ai/flows/generate-palette';

interface DesignSettings {
  theme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
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
    menuList: { visible: boolean };
    gallery: { visible: boolean };
    testimonials: { visible: boolean };
    contact: { visible: boolean };
    map: { visible: boolean };
  };
}

const DEFAULT_SETTINGS: DesignSettings = {
  theme: {
    primary: '#0EA5E9',
    secondary: '#F0F9FF',
    accent: '#0284C7',
    background: '#FFFFFF',
    text: '#0F172A',
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
    menuList: { visible: true },
    gallery: { visible: true },
    testimonials: { visible: true },
    contact: { visible: true },
    map: { visible: true }
  }
};

const THEME_PRESETS = [
  { name: 'Light', colors: { primary: '#0EA5E9', accent: '#0284C7', background: '#FFFFFF', text: '#0F172A' } },
  { name: 'Dark', colors: { primary: '#38BDF8', accent: '#0284C7', background: '#0F172A', text: '#F8FAFC' } },
  { name: 'Modern', colors: { primary: '#10B981', accent: '#059669', background: '#F0FDFA', text: '#064E3B' } },
  { name: 'Vibrant', colors: { primary: '#F43F5E', accent: '#E11D48', background: '#FFF1F2', text: '#4C0519' } },
  { name: 'Minimalist', colors: { primary: '#27272A', accent: '#71717A', background: '#FAFAFA', text: '#09090B' } },
];

export function DesignSystemEditor({ restaurantId }: { restaurantId: string }) {
  const [settings, setSettings] = useState<DesignSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (!firestore || !restaurantId) return;

    const docRef = doc(firestore, 'restaurants', restaurantId, 'design', 'settings');

    const unsub = onSnapshot(
      docRef, 
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          // Merge with defaults to handle new section properties
          setSettings({
            ...DEFAULT_SETTINGS,
            ...data,
            theme: { ...DEFAULT_SETTINGS.theme, ...data.theme },
            typography: { ...DEFAULT_SETTINGS.typography, ...data.typography },
            sections: { ...DEFAULT_SETTINGS.sections, ...data.sections },
          } as DesignSettings);
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
      theme: { 
        ...prev.theme, 
        primary: preset.colors.primary, 
        accent: preset.colors.accent,
        background: preset.colors.background,
        text: preset.colors.text
      }
    }));
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAi(true);
    try {
      const palette = await generatePalette({ description: aiPrompt });
      setSettings(prev => ({
        ...prev,
        theme: {
          ...prev.theme,
          primary: palette.primary,
          accent: palette.accent,
          background: palette.background,
          text: palette.text,
        }
      }));
      toast({ title: "AI Palette Generated", description: "Successfully updated theme colors based on your description." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "AI Generation Failed", description: error.message });
    } finally {
      setGeneratingAi(false);
    }
  };

  if (loading) return <div className="p-20 flex justify-center h-full"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Controls */}
        <aside className="w-[420px] bg-white border-r flex flex-col shrink-0">
          <Tabs defaultValue="theme" className="flex-1 flex flex-col">
            <div className="px-6 py-4 border-b bg-white">
              <TabsList className="w-full h-12 bg-slate-50 border p-1 rounded-2xl">
                <TabsTrigger value="theme" className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"><Palette className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="gallery" className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"><ImageIcon className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="layout" className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"><Layout className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="fonts" className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"><Type className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="code" className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"><Code className="h-4 w-4" /></TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 px-6 py-6">
              <TabsContent value="theme" className="space-y-10 mt-0 pb-10">
                {/* AI Theme Designer */}
                <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-sm relative overflow-hidden group">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-4 w-4 text-sky-500" />
                    <h3 className="text-sm font-bold text-sky-600 tracking-wider uppercase">AI Theme Designer</h3>
                  </div>
                  <div className="bg-sky-50 rounded-2xl border border-sky-100 p-2 mb-4 overflow-hidden shadow-sm">
                    <Textarea 
                      placeholder="e.g. A rustic Italian trattoria with warm earth tones and elegant typography..." 
                      className="min-h-[100px] border-none focus-visible:ring-0 shadow-none text-sm placeholder:text-slate-400 p-3 bg-transparent"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full rounded-full h-11 border-sky-200 text-sky-700 hover:bg-sky-50 bg-white font-bold gap-2 shadow-sm"
                    onClick={handleAiGenerate}
                    disabled={generatingAi}
                  >
                    {generatingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Generate Palette
                  </Button>
                </div>

                {/* Color Palette Grid */}
                <div>
                  <h4 className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase mb-6 px-1">Color Palette</h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                    <div className="space-y-2.5">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Primary</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={settings.theme.primary} onChange={(e) => setSettings({...settings, theme: {...settings.theme, primary: e.target.value}})} className="h-11 w-11 p-1 rounded-lg shrink-0 border-slate-200 cursor-pointer" />
                        <Input value={settings.theme.primary} onChange={(e) => setSettings({...settings, theme: {...settings.theme, primary: e.target.value}})} className="h-11 rounded-xl bg-sky-50/50 border-sky-100/50 font-mono text-xs text-slate-600 focus-visible:ring-sky-500" />
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Accent</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={settings.theme.accent} onChange={(e) => setSettings({...settings, theme: {...settings.theme, accent: e.target.value}})} className="h-11 w-11 p-1 rounded-lg shrink-0 border-slate-200 cursor-pointer" />
                        <Input value={settings.theme.accent} onChange={(e) => setSettings({...settings, theme: {...settings.theme, accent: e.target.value}})} className="h-11 rounded-xl bg-sky-50/50 border-sky-100/50 font-mono text-xs text-slate-600 focus-visible:ring-sky-500" />
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Background</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={settings.theme.background} onChange={(e) => setSettings({...settings, theme: {...settings.theme, background: e.target.value}})} className="h-11 w-11 p-1 rounded-lg shrink-0 border-slate-200 cursor-pointer" />
                        <Input value={settings.theme.background} onChange={(e) => setSettings({...settings, theme: {...settings.theme, background: e.target.value}})} className="h-11 rounded-xl bg-sky-50/50 border-sky-100/50 font-mono text-xs text-slate-600 focus-visible:ring-sky-500" />
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Text</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={settings.theme.text} onChange={(e) => setSettings({...settings, theme: {...settings.theme, text: e.target.value}})} className="h-11 w-11 p-1 rounded-lg shrink-0 border-slate-200 cursor-pointer" />
                        <Input value={settings.theme.text} onChange={(e) => setSettings({...settings, theme: {...settings.theme, text: e.target.value}})} className="h-11 rounded-xl bg-sky-50/50 border-sky-100/50 font-mono text-xs text-slate-600 focus-visible:ring-sky-500" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Template Presets */}
                <div>
                  <h4 className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase mb-6 px-1">Template Presets</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {THEME_PRESETS.map((p) => (
                      <Button 
                        key={p.name} 
                        variant="outline" 
                        className="h-14 rounded-2xl bg-sky-50/30 border-sky-100/50 hover:bg-sky-50 hover:border-sky-200 text-slate-700 font-medium text-sm transition-all"
                        onClick={() => applyPreset(p)}
                      >
                        {p.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="layout" className="space-y-6 mt-0">
                <h4 className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase mb-6 px-1">Layout & Sections</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg shadow-sm"><Monitor className="h-4 w-4 text-slate-500" /></div>
                      <span className="text-sm font-bold text-slate-700">Hero Header</span>
                    </div>
                    <Switch checked={settings.sections.hero.visible} onCheckedChange={(v) => setSettings({...settings, sections: {...settings.sections, hero: {...settings.sections.hero, visible: v}}})} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg shadow-sm"><User className="h-4 w-4 text-slate-500" /></div>
                      <span className="text-sm font-bold text-slate-700">About Section</span>
                    </div>
                    <Switch checked={settings.sections.about.visible} onCheckedChange={(v) => setSettings({...settings, sections: {...settings.sections, about: {visible: v}}})} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg shadow-sm"><UtensilsCrossed className="h-4 w-4 text-slate-500" /></div>
                      <span className="text-sm font-bold text-slate-700">Menu List</span>
                    </div>
                    <Switch checked={settings.sections.menuList.visible} onCheckedChange={(v) => setSettings({...settings, sections: {...settings.sections, menuList: {visible: v}}})} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg shadow-sm"><ImageIcon className="h-4 w-4 text-slate-500" /></div>
                      <span className="text-sm font-bold text-slate-700">Gallery</span>
                    </div>
                    <Switch checked={settings.sections.gallery.visible} onCheckedChange={(v) => setSettings({...settings, sections: {...settings.sections, gallery: {visible: v}}})} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg shadow-sm"><MessageSquare className="h-4 w-4 text-slate-500" /></div>
                      <span className="text-sm font-bold text-slate-700">Testimonials</span>
                    </div>
                    <Switch checked={settings.sections.testimonials.visible} onCheckedChange={(v) => setSettings({...settings, sections: {...settings.sections, testimonials: {visible: v}}})} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg shadow-sm"><Phone className="h-4 w-4 text-slate-500" /></div>
                      <span className="text-sm font-bold text-slate-700">Contact</span>
                    </div>
                    <Switch checked={settings.sections.contact.visible} onCheckedChange={(v) => setSettings({...settings, sections: {...settings.sections, contact: {visible: v}}})} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg shadow-sm"><MapPin className="h-4 w-4 text-slate-500" /></div>
                      <span className="text-sm font-bold text-slate-700">Map</span>
                    </div>
                    <Switch checked={settings.sections.map.visible} onCheckedChange={(v) => setSettings({...settings, sections: {...settings.sections, map: {visible: v}}})} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="fonts" className="space-y-6 mt-0">
                <h4 className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase mb-6 px-1">Typography</h4>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Font Family</Label>
                    <Select value={settings.typography.fontFamily} onValueChange={(v) => setSettings({...settings, typography: {...settings.typography, fontFamily: v}})}>
                      <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter (Sans)</SelectItem>
                        <SelectItem value="Playfair Display">Playfair (Serif)</SelectItem>
                        <SelectItem value="Montserrat">Montserrat (Modern)</SelectItem>
                        <SelectItem value="Roboto">Roboto (Clean)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </aside>

        {/* Main Preview Area */}
        <main className="flex-1 bg-muted/30 p-12 flex flex-col items-center justify-center relative group">
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-white/80 backdrop-blur-md px-6 py-2 rounded-full border shadow-sm">
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Editing Mode</span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setPreviewMode('desktop')}
                className={cn("p-1.5 rounded-md transition-all", previewMode === 'desktop' ? "bg-primary text-white" : "text-slate-400 hover:text-slate-600")}
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={() => setPreviewMode('tablet')}
                className={cn("p-1.5 rounded-md transition-all", previewMode === 'tablet' ? "bg-primary text-white" : "text-slate-400 hover:text-slate-600")}
              >
                <Tablet className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={() => setPreviewMode('mobile')}
                className={cn("p-1.5 rounded-md transition-all", previewMode === 'mobile' ? "bg-primary text-white" : "text-slate-400 hover:text-slate-600")}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className={cn(
            "relative bg-white shadow-2xl transition-all duration-700 ease-in-out border-[12px] border-slate-900 overflow-hidden flex flex-col",
            previewMode === 'desktop' ? "w-full max-w-5xl h-[600px]" : previewMode === 'tablet' ? "w-[600px] h-[700px]" : "w-[340px] h-[600px]",
            "rounded-[40px]"
          )}>
            <div className="flex-1 overflow-y-auto no-scrollbar" style={{ 
              fontFamily: settings.typography.fontFamily,
              backgroundColor: settings.theme.background,
              color: settings.theme.text
            }}>
              <nav className="h-16 flex items-center justify-between px-8 sticky top-0 z-50 backdrop-blur-md" style={{ backgroundColor: `${settings.theme.headerColor}CC` }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-bold text-base tracking-tight">Restaurant Name</span>
                </div>
              </nav>

              {settings.sections.hero.visible && (
                <section className="min-h-[300px] flex flex-col items-center justify-center text-center px-8 py-12 relative overflow-hidden">
                  <div className="absolute inset-0 bg-primary/5" />
                  <div className="relative z-10">
                    <h2 className="text-4xl font-black mb-4 leading-tight" style={{ color: settings.theme.text }}>
                      Restaurant Name
                    </h2>
                    <Button 
                      className="rounded-full h-12 px-8 font-bold shadow-lg" 
                      style={{ 
                        backgroundColor: settings.theme.primary,
                        color: settings.theme.background 
                      }}
                    >
                      Order Now
                    </Button>
                  </div>
                </section>
              )}

              {settings.sections.about.visible && (
                <section className="py-16 px-10">
                  <h3 className="text-2xl font-black mb-4">Our Story</h3>
                  <p className="text-sm opacity-60 leading-relaxed">
                    We believe in serving authentic flavors using only the freshest local ingredients. Experience the art of culinary excellence in a warm and inviting atmosphere.
                  </p>
                </section>
              )}

              {settings.sections.menuList.visible && (
                <section className="py-16 px-10 bg-slate-50/50">
                  <div className="flex justify-between items-end mb-8">
                    <h3 className="text-2xl font-black">Featured Menu</h3>
                    <Button variant="link" className="font-bold uppercase tracking-widest text-[9px]">View All</Button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-white rounded-2xl shadow-sm flex gap-4 items-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-xl shrink-0" />
                      <div>
                        <h4 className="font-bold text-sm">Signature Dish</h4>
                        <p className="text-xs opacity-50">$14.00</p>
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-2xl shadow-sm flex gap-4 items-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-xl shrink-0" />
                      <div>
                        <h4 className="font-bold text-sm">Chef Special</h4>
                        <p className="text-xs opacity-50">$14.00</p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <footer className="py-12 text-center opacity-30 border-t">
                <p className="text-[9px] font-black uppercase tracking-[0.2em]">© 2024 Restaurant Name Global</p>
              </footer>
            </div>
          </div>

          <div className="absolute bottom-10 right-10 flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white rounded-2xl h-12 px-8 shadow-xl font-bold">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Publish Changes
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}