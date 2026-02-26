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
  User
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
    gallery: { visible: boolean };
    reviews: { visible: boolean };
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
    gallery: { visible: true },
    reviews: { visible: true }
  }
};

const THEME_PRESETS = [
  { name: 'Light', colors: { primary: '#0EA5E9', accent: '#0284C7', background: '#FFFFFF', text: '#0F172A' } },
  { name: 'Dark', colors: { primary: '#38BDF8', accent: '#0284C7', background: '#0F172A', text: '#F8FAFC' } },
  { name: 'Modern', colors: { primary: '#10B981', accent: '#059669', background: '#F0FDFA', text: '#064E3B' } },
  { name: 'Vibrant', colors: { primary: '#F43F5E', accent: '#E11D48', background: '#FFF1F2', text: '#4C0519' } },
];

export function DesignSystemEditor({ restaurantId }: { restaurantId: string }) {
  const [settings, setSettings] = useState<DesignSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [aiPrompt, setAiPrompt] = useState('');
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
      theme: { 
        ...prev.theme, 
        primary: preset.colors.primary, 
        accent: preset.colors.accent,
        background: preset.colors.background,
        text: preset.colors.text
      }
    }));
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden -m-4 md:-m-8">
      {/* Top Header Bar */}
      <header className="h-20 bg-white border-b px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-sky-100 p-2.5 rounded-2xl">
            <Palette className="h-6 w-6 text-sky-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-none">Restaurant Front Designer</h1>
            <p className="text-sm text-slate-500 mt-1">Customize your public restaurant identity.</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center bg-sky-50 rounded-full p-1 border border-sky-100">
            <button 
              onClick={() => setPreviewMode('desktop')}
              className={cn("p-2 rounded-full transition-all", previewMode === 'desktop' ? "bg-white text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
            >
              <Monitor className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setPreviewMode('tablet')}
              className={cn("p-2 rounded-full transition-all", previewMode === 'tablet' ? "bg-white text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
            >
              <Tablet className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setPreviewMode('mobile')}
              className={cn("p-2 rounded-full transition-all", previewMode === 'mobile' ? "bg-white text-sky-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
            >
              <Smartphone className="h-5 w-5" />
            </button>
          </div>

          <Button onClick={handleSave} disabled={saving} className="bg-sky-500 hover:bg-sky-600 text-white rounded-2xl h-11 px-6 shadow-lg shadow-sky-500/20 font-bold transition-all transform hover:-translate-y-0.5">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Publish Changes
          </Button>

          <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center border border-sky-200 text-sky-600 font-bold text-sm">
            {restaurantId.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Controls */}
        <aside className="w-[420px] bg-white border-r flex flex-col shrink-0">
          <Tabs defaultValue="theme" className="flex-1 flex flex-col">
            <div className="px-6 py-4 border-b bg-slate-50/50">
              <TabsList className="w-full h-12 bg-white border p-1 rounded-2xl shadow-sm">
                <TabsTrigger value="theme" className="flex-1 rounded-xl data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900"><Palette className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="gallery" className="flex-1 rounded-xl data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900"><ImageIcon className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="layout" className="flex-1 rounded-xl data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900"><Layout className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="fonts" className="flex-1 rounded-xl data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900"><Type className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="code" className="flex-1 rounded-xl data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900"><Code className="h-4 w-4" /></TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 px-6 py-6">
              <TabsContent value="theme" className="space-y-10 mt-0">
                {/* AI Theme Designer */}
                <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Sparkles className="h-12 w-12 text-sky-600" />
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-4 w-4 text-sky-500" />
                    <h3 className="text-sm font-bold text-sky-600 tracking-wider uppercase">AI Theme Designer</h3>
                  </div>
                  <div className="relative mb-4">
                    <Textarea 
                      placeholder="e.g. A rustic Italian trattoria with warm earth tones and elegant typography..." 
                      className="min-h-[100px] bg-slate-50 border-sky-100 focus-visible:ring-sky-500 rounded-2xl p-4 text-sm placeholder:text-slate-400"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" className="w-full rounded-full h-11 border-sky-200 text-sky-700 hover:bg-sky-50 font-bold gap-2">
                    <RefreshCw className="h-4 w-4" />
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
                        <Input value={settings.theme.primary} onChange={(e) => setSettings({...settings, theme: {...settings.theme, primary: e.target.value}})} className="h-11 rounded-xl bg-slate-50 border-slate-200 font-mono text-xs text-slate-600 focus-visible:ring-sky-500" />
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Accent</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={settings.theme.accent} onChange={(e) => setSettings({...settings, theme: {...settings.theme, accent: e.target.value}})} className="h-11 w-11 p-1 rounded-lg shrink-0 border-slate-200 cursor-pointer" />
                        <Input value={settings.theme.accent} onChange={(e) => setSettings({...settings, theme: {...settings.theme, accent: e.target.value}})} className="h-11 rounded-xl bg-slate-50 border-slate-200 font-mono text-xs text-slate-600 focus-visible:ring-sky-500" />
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Background</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={settings.theme.background} onChange={(e) => setSettings({...settings, theme: {...settings.theme, background: e.target.value}})} className="h-11 w-11 p-1 rounded-lg shrink-0 border-slate-200 cursor-pointer" />
                        <Input value={settings.theme.background} onChange={(e) => setSettings({...settings, theme: {...settings.theme, background: e.target.value}})} className="h-11 rounded-xl bg-slate-50 border-slate-200 font-mono text-xs text-slate-600 focus-visible:ring-sky-500" />
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Text</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={settings.theme.text} onChange={(e) => setSettings({...settings, theme: {...settings.theme, text: e.target.value}})} className="h-11 w-11 p-1 rounded-lg shrink-0 border-slate-200 cursor-pointer" />
                        <Input value={settings.theme.text} onChange={(e) => setSettings({...settings, theme: {...settings.theme, text: e.target.value}})} className="h-11 rounded-xl bg-slate-50 border-slate-200 font-mono text-xs text-slate-600 focus-visible:ring-sky-500" />
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
                        className="h-14 rounded-2xl bg-sky-50/30 border-sky-100 hover:bg-sky-50 hover:border-sky-200 text-slate-700 font-medium text-sm transition-all"
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg shadow-sm"><Monitor className="h-4 w-4 text-slate-500" /></div>
                      <span className="text-sm font-bold text-slate-700">Hero Header</span>
                    </div>
                    <Switch checked={settings.sections.hero.visible} onCheckedChange={(v) => setSettings({...settings, sections: {...settings.sections, hero: {...settings.sections.hero, visible: v}}})} />
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
                      <div className="bg-white p-2 rounded-lg shadow-sm"><User className="h-4 w-4 text-slate-500" /></div>
                      <span className="text-sm font-bold text-slate-700">About Section</span>
                    </div>
                    <Switch checked={settings.sections.about.visible} onCheckedChange={(v) => setSettings({...settings, sections: {...settings.sections, about: {visible: v}}})} />
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
        <main className="flex-1 bg-slate-100 flex flex-col items-center justify-center p-12 overflow-hidden">
          <div className={cn(
            "relative bg-white shadow-2xl transition-all duration-700 ease-in-out border-[12px] border-slate-900 overflow-hidden flex flex-col",
            previewMode === 'desktop' ? "w-full max-w-5xl h-[85%]" : previewMode === 'tablet' ? "w-[768px] h-[90%]" : "w-[375px] h-[80%]",
            "rounded-[40px]"
          )}>
            {/* Simulated Storefront Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth" style={{ 
              fontFamily: settings.typography.fontFamily,
              backgroundColor: settings.theme.background,
              color: settings.theme.text
            }}>
              {/* Nav */}
              <nav className="h-20 flex items-center justify-between px-10 sticky top-0 z-50 backdrop-blur-md" style={{ backgroundColor: `${settings.theme.headerColor}CC` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-sky-500" />
                  </div>
                  <span className="font-bold text-lg tracking-tight">Restaurant Name</span>
                </div>
                <div className="flex gap-8 text-[11px] font-black uppercase tracking-[0.2em] opacity-50">
                  <span className="cursor-pointer hover:opacity-100">Menu</span>
                  <span className="cursor-pointer hover:opacity-100">About</span>
                  <span className="cursor-pointer hover:opacity-100">Contact</span>
                </div>
              </nav>

              {/* Hero */}
              {settings.sections.hero.visible && (
                <section className="min-h-[500px] flex flex-col items-center justify-center text-center px-10 py-20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-sky-50 opacity-50" />
                  <div className="relative z-10 max-w-3xl">
                    <h2 className="text-6xl font-black mb-6 leading-[1.1]" style={{ color: settings.theme.text }}>
                      Restaurant Name
                    </h2>
                    <p className="text-xl opacity-70 mb-10 font-medium">
                      Signature culinary experience.
                    </p>
                    <Button 
                      className="rounded-full h-16 px-12 text-lg font-black shadow-xl transition-all transform hover:scale-105" 
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

              {/* About */}
              {settings.sections.about.visible && (
                <section className="py-24 px-16 grid grid-cols-2 gap-16 items-center">
                  <div className="bg-slate-50 rounded-[2.5rem] h-[300px] flex items-center justify-center">
                    <Layout className="h-16 w-16 text-slate-200" />
                  </div>
                  <div className="space-y-6">
                    <h3 className="text-4xl font-black leading-tight">Our Story</h3>
                    <p className="text-lg opacity-60 leading-relaxed">
                      We believe in serving authentic flavors using only the freshest local ingredients. Experience the art of culinary excellence in a warm and inviting atmosphere.
                    </p>
                  </div>
                </section>
              )}

              {/* Featured Menu Preview */}
              <section className="py-24 px-16 bg-slate-50/50">
                <div className="flex justify-between items-end mb-12">
                  <h3 className="text-4xl font-black">Featured Menu</h3>
                  <Button variant="link" className="font-bold uppercase tracking-widest text-[11px]">View All</Button>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="p-6 bg-white rounded-[2rem] shadow-sm flex gap-6 items-center">
                    <div className="w-24 h-24 bg-slate-100 rounded-2xl shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-bold">Signature Dish</h4>
                      <p className="text-sm opacity-50">$14.00</p>
                    </div>
                  </div>
                  <div className="p-6 bg-white rounded-[2rem] shadow-sm flex gap-6 items-center">
                    <div className="w-24 h-24 bg-slate-100 rounded-2xl shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-bold">Chef Special</h4>
                      <p className="text-sm opacity-50">$14.00</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Footer */}
              <footer className="py-16 text-center opacity-30 border-t">
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">© 2024 Restaurant Name Global</p>
              </footer>
            </div>
          </div>
          
          {/* Status Indicator */}
          <div className="mt-8 flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border text-[10px] font-black uppercase tracking-widest text-slate-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Preview Active
          </div>
        </main>
      </div>
    </div>
  );
}
