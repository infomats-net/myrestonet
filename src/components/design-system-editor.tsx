'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Palette, 
  Type, 
  Layout, 
  Image as ImageIcon, 
  Save, 
  Monitor, 
  Tablet, 
  Smartphone,
  RefreshCw,
  Sparkles,
  Loader2,
  Code,
  User,
  UtensilsCrossed,
  MessageSquare,
  Phone,
  MapPin,
  X,
  ChevronRight
} from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
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
  customCss?: string;
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
  },
  customCss: '/* Enter custom CSS here */\n.hero-title { font-size: 5rem; }'
};

const THEME_PRESETS = [
  { name: 'Light', colors: { primary: '#0EA5E9', accent: '#0284C7', background: '#FFFFFF', text: '#0F172A' } },
  { name: 'Dark', colors: { primary: '#38BDF8', accent: '#0284C7', background: '#0F172A', text: '#F8FAFC' } },
  { name: 'Modern', colors: { primary: '#10B981', accent: '#059669', background: '#F0FDFA', text: '#064E3B' } },
  { name: 'Vibrant', colors: { primary: '#F43F5E', accent: '#E11D48', background: '#FFF1F2', text: '#4C0519' } },
];

const FONT_OPTIONS = [
  { name: 'Inter (Sans)', value: 'Inter' },
  { name: 'Playfair Display (Serif)', value: 'Playfair Display' },
  { name: 'Montserrat (Modern)', value: 'Montserrat' },
  { name: 'Roboto (Clean)', value: 'Roboto' },
  { name: 'Poppins (Soft)', value: 'Poppins' },
  { name: 'Lora (Classic)', value: 'Lora' },
];

export function DesignSystemEditor({ restaurantId }: { restaurantId: string }) {
  const [settings, setSettings] = useState<DesignSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!firestore || !restaurantId) return;

    const docRef = doc(firestore, 'restaurants', restaurantId, 'design', 'settings');

    const unsub = onSnapshot(
      docRef, 
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSettings({
            ...DEFAULT_SETTINGS,
            ...data,
            theme: { ...DEFAULT_SETTINGS.theme, ...data.theme },
            typography: { ...DEFAULT_SETTINGS.typography, ...data.typography },
            sections: { ...DEFAULT_SETTINGS.sections, ...data.sections },
            customCss: data.customCss ?? DEFAULT_SETTINGS.customCss
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
      toast({ title: "AI Palette Generated", description: "Successfully updated theme colors." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "AI Generation Failed", description: error.message });
    } finally {
      setGeneratingAi(false);
    }
  };

  if (loading) return <div className="p-20 flex justify-center h-full"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  const initials = user?.email?.substring(0, 2).toUpperCase() || 'IT';

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-white overflow-hidden rounded-3xl border shadow-sm">
      {/* Designer Header */}
      <header className="h-20 border-b flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500 shadow-sm border border-sky-100">
            <Palette className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Restaurant Front Designer</h1>
            <p className="text-sm text-slate-500">Customize your public restaurant identity.</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="bg-slate-100/80 p-1 rounded-full flex gap-1">
            {[
              { id: 'desktop', icon: Monitor },
              { id: 'tablet', icon: Tablet },
              { id: 'mobile', icon: Smartphone }
            ].map((device) => (
              <button
                key={device.id}
                onClick={() => setPreviewMode(device.id as any)}
                className={cn(
                  "p-2.5 rounded-full transition-all",
                  previewMode === device.id ? "bg-white text-sky-500 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <device.icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="rounded-2xl h-12 px-6 bg-sky-500 hover:bg-sky-600 text-white font-bold gap-2 shadow-lg shadow-sky-500/20"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Publish Changes
          </Button>

          <Avatar className="h-10 w-10 border-2 border-slate-100">
            <AvatarFallback className="bg-sky-50 text-sky-600 font-bold">{initials}</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Controls */}
        <aside className="w-[440px] border-r flex flex-col shrink-0">
          <Tabs defaultValue="theme" className="flex-1 flex flex-col">
            <div className="px-8 pt-6 pb-2">
              <TabsList className="w-full h-14 bg-slate-50 border p-1 rounded-2xl">
                <TabsTrigger value="theme" className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"><Palette className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="gallery" className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"><ImageIcon className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="layout" className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"><Layout className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="fonts" className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"><Type className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="code" className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"><Code className="h-4 w-4" /></TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 px-8 py-6">
              <TabsContent value="theme" className="space-y-10 mt-0 pb-10">
                {/* AI Section */}
                <div className="p-6 rounded-3xl bg-white border border-sky-100 shadow-sm relative overflow-hidden group">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-4 w-4 text-sky-500" />
                    <h3 className="text-[11px] font-bold text-sky-500 tracking-wider uppercase">AI Theme Designer</h3>
                  </div>
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 p-1 mb-4">
                    <Textarea 
                      placeholder="e.g. A rustic Italian trattoria with warm earth tones and elegant typography..." 
                      className="min-h-[100px] border-none focus-visible:ring-0 shadow-none text-sm placeholder:text-slate-400 p-4 bg-transparent resize-none"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full rounded-full h-12 border-sky-100 text-slate-700 bg-sky-50/50 hover:bg-sky-50 font-bold gap-2"
                    onClick={handleAiGenerate}
                    disabled={generatingAi}
                  >
                    {generatingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Generate Palette
                  </Button>
                </div>

                {/* Color Palette */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 tracking-[0.2em] uppercase mb-8">Color Palette</h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-8">
                    {[
                      { label: 'Primary', key: 'primary' },
                      { label: 'Accent', key: 'accent' },
                      { label: 'Background', key: 'background' },
                      { label: 'Text', key: 'text' }
                    ].map((item) => (
                      <div key={item.key} className="space-y-3">
                        <Label className="text-xs font-medium text-slate-500">{item.label}</Label>
                        <div className="flex gap-2">
                          <div className="relative h-11 w-11 shrink-0">
                            <Input 
                              type="color" 
                              value={(settings.theme as any)[item.key]} 
                              onChange={(e) => setSettings({...settings, theme: {...settings.theme, [item.key]: e.target.value}})} 
                              className="absolute inset-0 h-full w-full p-0 border-none rounded-lg cursor-pointer overflow-hidden opacity-0 z-10" 
                            />
                            <div 
                              className="absolute inset-0 rounded-lg border shadow-sm" 
                              style={{ backgroundColor: (settings.theme as any)[item.key] }}
                            />
                          </div>
                          <Input 
                            value={(settings.theme as any)[item.key].toUpperCase()} 
                            onChange={(e) => setSettings({...settings, theme: {...settings.theme, [item.key]: e.target.value}})} 
                            className="h-11 rounded-xl bg-sky-50/30 border-sky-100/50 font-mono text-xs text-slate-600 focus-visible:ring-sky-500" 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Template Presets */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 tracking-[0.2em] uppercase mb-6">Template Presets</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {THEME_PRESETS.map((p) => (
                      <Button 
                        key={p.name} 
                        variant="outline" 
                        className="h-14 rounded-2xl bg-sky-50/30 border-sky-100/50 hover:bg-sky-50 hover:border-sky-200 text-slate-600 font-medium text-sm transition-all"
                        onClick={() => applyPreset(p)}
                      >
                        {p.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Other tabs follow the same styling pattern... */}
              <TabsContent value="layout" className="space-y-6 mt-0">
                <h4 className="text-[11px] font-bold text-slate-400 tracking-[0.2em] uppercase mb-6">Layout & Sections</h4>
                <div className="space-y-3">
                  {[
                    { id: 'hero', label: 'Hero Header', icon: Monitor, visibilityKey: 'hero' },
                    { id: 'about', label: 'About Section', icon: User, visibilityKey: 'about' },
                    { id: 'menuList', label: 'Menu List', icon: UtensilsCrossed, visibilityKey: 'menuList' },
                    { id: 'gallery', label: 'Gallery', icon: ImageIcon, visibilityKey: 'gallery' },
                    { id: 'testimonials', label: 'Testimonials', icon: MessageSquare, visibilityKey: 'testimonials' },
                    { id: 'contact', label: 'Contact', icon: Phone, visibilityKey: 'contact' },
                    { id: 'map', label: 'Map', icon: MapPin, visibilityKey: 'map' },
                  ].map((section) => (
                    <div key={section.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100"><section.icon className="h-4 w-4 text-slate-400" /></div>
                        <span className="text-sm font-semibold text-slate-700">{section.label}</span>
                      </div>
                      <Switch 
                        checked={(settings.sections as any)[section.visibilityKey].visible} 
                        onCheckedChange={(v) => setSettings({
                          ...settings, 
                          sections: {
                            ...settings.sections, 
                            [section.visibilityKey]: {
                              ...(settings.sections as any)[section.visibilityKey],
                              visible: v
                            }
                          }
                        })} 
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="fonts" className="space-y-8 mt-0">
                <h4 className="text-[11px] font-bold text-slate-400 tracking-[0.2em] uppercase mb-6">Typography</h4>
                <div className="space-y-8">
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Heading Typography</Label>
                    <Select value={settings.typography.headingFont} onValueChange={(v) => setSettings({...settings, typography: {...settings.typography, headingFont: v}})}>
                      <SelectTrigger className="h-12 rounded-2xl bg-slate-50/50 border-slate-200 focus:ring-sky-500"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map(font => (
                          <SelectItem key={font.value} value={font.value}>{font.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Body Typography</Label>
                    <Select value={settings.typography.fontFamily} onValueChange={(v) => setSettings({...settings, typography: {...settings.typography, fontFamily: v}})}>
                      <SelectTrigger className="h-12 rounded-2xl bg-slate-50/50 border-slate-200 focus:ring-sky-500"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map(font => (
                          <SelectItem key={font.value} value={font.value}>{font.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="code" className="space-y-6 mt-0">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[11px] font-bold text-slate-400 tracking-[0.2em] uppercase">Custom CSS</h4>
                  <Badge className="rounded-full bg-sky-50 text-sky-600 border-sky-100 font-bold px-3 py-1">ADVANCED</Badge>
                </div>
                <Textarea 
                  className="min-h-[400px] font-mono text-xs bg-[#0F172A] text-slate-300 border-none rounded-3xl p-6 focus-visible:ring-1 focus-visible:ring-sky-500/50 resize-none shadow-xl"
                  spellCheck={false}
                  value={settings.customCss}
                  onChange={(e) => setSettings({...settings, customCss: e.target.value})}
                />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </aside>

        {/* Preview Area */}
        <main className="flex-1 bg-slate-50/50 p-12 flex flex-col items-center justify-center relative overflow-hidden">
          <div className={cn(
            "relative bg-white shadow-2xl transition-all duration-500 ease-out border-[16px] border-slate-900 rounded-[3rem] overflow-hidden flex flex-col",
            previewMode === 'desktop' ? "w-full max-w-5xl h-[700px]" : previewMode === 'tablet' ? "w-[600px] h-[700px]" : "w-[360px] h-[700px]"
          )}>
            <div className="flex-1 overflow-y-auto no-scrollbar" style={{ 
              fontFamily: settings.typography.fontFamily,
              backgroundColor: settings.theme.background,
              color: settings.theme.text
            }}>
              {/* Fonts */}
              <link href={`https://fonts.googleapis.com/css2?family=${settings.typography.fontFamily.replace(' ', '+')}&family=${settings.typography.headingFont.replace(' ', '+')}&display=swap`} rel="stylesheet" />

              {/* Custom CSS */}
              {settings.customCss && <style dangerouslySetInnerHTML={{ __html: settings.customCss }} />}

              <nav className="h-16 flex items-center justify-between px-8 sticky top-0 z-50 bg-white/90 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-sky-500" />
                  </div>
                  <span className="font-bold text-sm tracking-tight" style={{ fontFamily: settings.typography.headingFont }}>Meze Kebab and Grill</span>
                </div>
                <div className="hidden sm:flex items-center gap-6 text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                  <span>Menu</span>
                  <span>About</span>
                  <span>Contact</span>
                </div>
              </nav>

              {settings.sections.hero.visible && (
                <section className="min-h-[400px] flex flex-col items-center justify-center text-center px-10 py-16 relative overflow-hidden">
                  <div className="absolute inset-0" style={{ backgroundColor: `${settings.theme.primary}15` }} />
                  <div className="relative z-10 max-w-xl">
                    <h2 className="text-6xl font-black mb-6 leading-tight" style={{ color: settings.theme.text, fontFamily: settings.typography.headingFont }}>
                      Meze Kebab and Grill
                    </h2>
                    <p className="text-lg opacity-70 mb-10 font-medium">Signature culinary experience.</p>
                    <Button 
                      className="rounded-full h-14 px-10 text-base font-bold shadow-xl" 
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
                <section className="py-24 px-12 flex items-center gap-12">
                  <div className="flex-1 space-y-6">
                    <h3 className="text-4xl font-black" style={{ fontFamily: settings.typography.headingFont }}>The Craft Story</h3>
                    <p className="text-base opacity-60 leading-relaxed font-medium">
                      Experience a blend of tradition and modern culinary techniques. We believe in serving authentic flavors using only the freshest local ingredients.
                    </p>
                  </div>
                  <div className="w-48 h-48 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 shadow-inner border border-slate-100">
                    <Layout className="h-16 w-16" />
                  </div>
                </section>
              )}

              <footer className="py-12 text-center opacity-30 border-t mt-20" style={{ backgroundColor: settings.theme.footerColor }}>
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">© 2024 Meze Kebab and Grill Global</p>
              </footer>
            </div>
            
            {/* Scroll indicator for preview */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
               <div className="w-1.5 h-16 bg-slate-200/50 rounded-full" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
