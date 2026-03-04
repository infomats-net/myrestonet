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
  Star,
  Info,
  ChevronUp,
  ChevronDown,
  Map as MapIcon,
  Menu,
  CalendarDays,
  ShieldCheck,
  Columns
} from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { generatePalette } from '@/ai/flows/generate-palette';
import { ImageUploader } from '@/components/image-uploader';

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
  branding: {
    logoUrl?: string;
    bannerUrl?: string;
  };
  typography: {
    fontFamily: string;
    headingFont: string;
    baseSize: string;
  };
  sections: {
    navbar: { visible: boolean };
    hero: { visible: boolean; height: string };
    welcomeCard: { 
      visible: boolean;
      showBadges: boolean;
      showRating: boolean;
      showDeliveryInfo: boolean;
      showLocation: boolean;
      showRanking: boolean;
    };
    about: { visible: boolean };
    menuList: { visible: boolean };
    gallery: { visible: boolean };
    testimonials: { visible: boolean };
    contact: { visible: boolean };
    map: { visible: boolean };
    bookingCTA: { visible: boolean };
  };
  sectionOrder: string[];
  menuLayout?: 'style1' | 'style2' | 'style3' | 'style4';
  customCss?: string;
}

const SECTION_LABELS: Record<string, { label: string; icon: any }> = {
  navbar: { label: 'Navigation Bar', icon: Menu },
  hero: { label: 'Hero Banner', icon: Monitor },
  welcomeCard: { label: 'Info Card', icon: Info },
  about: { label: 'About Us', icon: User },
  menuList: { label: 'Menu Catalog', icon: UtensilsCrossed },
  gallery: { label: 'Photo Gallery', icon: ImageIcon },
  testimonials: { label: 'Testimonials', icon: MessageSquare },
  map: { label: 'Location Map', icon: MapIcon },
  contact: { label: 'Contact Details', icon: Phone },
  bookingCTA: { label: 'Booking Section (Plan Your Visit)', icon: CalendarDays },
};

const DEFAULT_ORDER = ['navbar', 'hero', 'welcomeCard', 'about', 'menuList', 'gallery', 'testimonials', 'map', 'contact', 'bookingCTA'];

const DEFAULT_SETTINGS: DesignSettings = {
  theme: {
    primary: '#22c55e',
    secondary: '#F0F9FF',
    accent: '#16a34a',
    background: '#FFFFFF',
    text: '#0F172A',
    headerColor: '#FFFFFF',
    footerColor: '#1A1A1A'
  },
  branding: {
    logoUrl: '',
    bannerUrl: ''
  },
  typography: {
    fontFamily: 'Inter',
    headingFont: 'Inter',
    baseSize: '16px'
  },
  sections: {
    navbar: { visible: true },
    hero: { visible: true, height: '400px' },
    welcomeCard: { 
      visible: true,
      showBadges: true,
      showRating: true,
      showDeliveryInfo: true,
      showLocation: true,
      showRanking: true
    },
    about: { visible: true },
    menuList: { visible: true },
    gallery: { visible: true },
    testimonials: { visible: true },
    contact: { visible: true },
    map: { visible: true },
    bookingCTA: { visible: true }
  },
  sectionOrder: DEFAULT_ORDER,
  menuLayout: 'style1',
  customCss: '/* Enter custom CSS here */\n.hero-title { font-size: 5rem; }'
};

const THEME_PRESETS = [
  { name: 'Light', colors: { primary: '#22c55e', secondary: '#f0fdf4', accent: '#16a34a', background: '#ffffff', text: '#0f172a' } },
  { name: 'Dark', colors: { primary: '#38bdf8', secondary: '#1e293b', accent: '#0284c7', background: '#0f172a', text: '#f8fafc' } },
  { name: 'Modern', colors: { primary: '#10b981', secondary: '#ecfdf5', accent: '#059669', background: '#f8fafc', text: '#064e3b' } },
  { name: 'Vibrant', colors: { primary: '#f43f5e', secondary: '#fff1f2', accent: '#e11d48', background: '#ffffff', text: '#111827' } },
  { name: 'Minimalist', colors: { primary: '#18181b', secondary: '#f5f5f5', accent: '#52525b', background: '#ffffff', text: '#09090b' } },
];

const FONT_OPTIONS = [
  { name: 'Inter (Sans)', value: 'Inter' },
  { name: 'Playfair Display (Serif)', value: 'Playfair Display' },
  { name: 'Montserrat (Modern)', value: 'Montserrat' },
  { name: 'Roboto (Clean)', value: 'Roboto' },
  { name: 'Poppins (Soft)', value: 'Poppins' },
  { name: 'Lora (Classic)', value: 'Lora' },
];

const MENU_LAYOUT_OPTIONS = [
  { name: 'Classic List', value: 'style1' },
  { name: 'Grid Cards', value: 'style2' },
  { name: 'Category Tabs', value: 'style3' },
  { name: 'Modern Minimal', value: 'style4' },
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
          
          const rawOrder = data.sectionOrder || DEFAULT_ORDER;
          const mergedOrder = [...rawOrder];
          DEFAULT_ORDER.forEach(key => {
            if (!mergedOrder.includes(key)) {
              mergedOrder.push(key);
            }
          });

          setSettings({
            ...DEFAULT_SETTINGS,
            ...data,
            theme: { ...DEFAULT_SETTINGS.theme, ...data.theme },
            branding: { ...DEFAULT_SETTINGS.branding, ...data.branding },
            typography: { ...DEFAULT_SETTINGS.typography, ...data.typography },
            sections: { 
              ...DEFAULT_SETTINGS.sections, 
              ...data.sections,
              welcomeCard: {
                ...DEFAULT_SETTINGS.sections.welcomeCard,
                ...data.sections?.welcomeCard
              }
            },
            sectionOrder: mergedOrder,
            menuLayout: data.menuLayout || 'style1',
            customCss: data.customCss ?? DEFAULT_SETTINGS.customCss
          } as DesignSettings);
        }
        setLoading(false);
      },
      async (serverError) => {
        const contextualError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'get',
        });
        errorEmitter.emit('permission-error', contextualError);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [firestore, restaurantId]);

  const handleSave = async () => {
    if (!firestore || !restaurantId) return;
    setSaving(true);
    try {
      const docRef = doc(firestore, 'restaurants', restaurantId, 'design', 'settings');
      await setDoc(docRef, {
        ...settings,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast({ title: 'Design Saved', description: 'Your storefront layout has been updated.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: "Access denied by security rules." });
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: typeof THEME_PRESETS[0]) => {
    setSettings(prev => ({
      ...prev,
      theme: { 
        ...prev.theme, 
        ...preset.colors
      }
    }));
    toast({ title: "Preset Applied", description: `Theme set to ${preset.name}.` });
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
      toast({ variant: "destructive", title: "AI Generation Failed", description: "Could not generate palette at this time." });
    } finally {
      setGeneratingAi(false);
    }
  };

  const updateSectionVisibility = (key: string, visible: boolean) => {
    setSettings(prev => ({
      ...prev, 
      sections: {
        ...prev.sections, 
        [key]: {
          ...(prev.sections as any)[key],
          visible
        }
      }
    }));
  };

  const updateWelcomeCardSetting = (key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        welcomeCard: {
          ...prev.sections.welcomeCard,
          [key]: value
        }
      }
    }));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...settings.sectionOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    
    setSettings(prev => ({ ...prev, sectionOrder: newOrder }));
  };

  if (loading) return <div className="p-20 flex justify-center h-full items-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-white overflow-hidden rounded-3xl border shadow-sm">
      <header className="h-20 border-b flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shadow-sm border border-primary/10">
            <Palette className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Store Designer</h1>
            <p className="text-sm text-slate-500">Configure your tenant's public presence.</p>
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
                  previewMode === device.id ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <device.icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="rounded-2xl h-12 px-6 bg-primary hover:bg-primary/90 text-white font-bold gap-2 shadow-lg shadow-primary/20"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Publish
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[440px] border-r flex flex-col shrink-0 min-h-0">
          <Tabs defaultValue="theme" className="flex-1 flex flex-col min-h-0">
            <div className="px-8 pt-6 pb-2 shrink-0">
              <TabsList className="w-full h-14 bg-slate-50 border p-1 rounded-2xl">
                <TabsTrigger value="theme" className="flex-1 rounded-xl h-full data-[state=active]:bg-white gap-2">
                  <Palette className="h-4 w-4" />
                  <span className="text-xs font-bold">Theme</span>
                </TabsTrigger>
                <TabsTrigger value="branding" className="flex-1 rounded-xl h-full data-[state=active]:bg-white gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-xs font-bold">Assets</span>
                </TabsTrigger>
                <TabsTrigger value="layout" className="flex-1 rounded-xl h-full data-[state=active]:bg-white gap-2">
                  <Layout className="h-4 w-4" />
                  <span className="text-xs font-bold">Layout</span>
                </TabsTrigger>
                <TabsTrigger value="fonts" className="flex-1 rounded-xl h-full data-[state=active]:bg-white gap-2">
                  <Type className="h-4 w-4" />
                  <span className="text-xs font-bold">Fonts</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="px-8 py-4 pb-20">
                <TabsContent value="theme" className="space-y-8 mt-0">
                  <div className="p-5 rounded-2xl bg-white border border-primary/10 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h3 className="text-[11px] font-bold text-primary tracking-wider uppercase">AI Theme Designer</h3>
                    </div>
                    <Textarea 
                      placeholder="Describe your restaurant vibe..." 
                      className="min-h-[80px] mb-3 bg-slate-50 border-none resize-none"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                    />
                    <Button 
                      variant="outline" 
                      className="w-full rounded-full h-10 bg-primary/5 font-bold text-xs gap-2"
                      onClick={handleAiGenerate}
                      disabled={generatingAi}
                    >
                      {generatingAi ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Generate Palette
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Template Presets</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {THEME_PRESETS.map((preset) => (
                        <Button
                          key={preset.name}
                          variant="outline"
                          className={cn(
                            "h-16 rounded-2xl border-2 transition-all font-bold",
                            settings.theme.primary === preset.colors.primary && settings.theme.background === preset.colors.background
                              ? "bg-primary/5 border-primary/20 text-primary shadow-sm"
                              : "bg-slate-50/50 hover:bg-slate-100 hover:border-slate-200 text-slate-600"
                          )}
                          onClick={() => applyPreset(preset)}
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Brand Colors</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Primary', key: 'primary' },
                        { label: 'Accent', key: 'accent' },
                        { label: 'Background', key: 'background' },
                        { label: 'Text', key: 'text' }
                      ].map((item) => (
                        <div key={item.key} className="space-y-1.5">
                          <Label className="text-[10px] font-medium text-slate-500 uppercase">{item.label}</Label>
                          <div className="flex gap-2">
                            <Input 
                              type="color" 
                              value={(settings.theme as any)[item.key]} 
                              onChange={(e) => setSettings({...settings, theme: {...settings.theme, [item.key]: e.target.value}})} 
                              className="h-9 w-9 p-0 border-none rounded-lg cursor-pointer" 
                            />
                            <Input 
                              value={(settings.theme as any)[item.key].toUpperCase()} 
                              onChange={(e) => setSettings({...settings, theme: {...settings.theme, [item.key]: e.target.value}})} 
                              className="h-9 rounded-lg font-mono text-[10px]" 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="branding" className="space-y-8 mt-0">
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Restaurant Visuals</h4>
                    
                    <ImageUploader 
                      label="Restaurant Logo"
                      path={`restaurants/${restaurantId}/branding/logo`}
                      currentUrl={settings.branding.logoUrl}
                      onUploadSuccess={(url) => setSettings({...settings, branding: {...settings.branding, logoUrl: url}})}
                    />

                    <ImageUploader 
                      label="Hero Banner"
                      path={`restaurants/${restaurantId}/branding/banner`}
                      currentUrl={settings.branding.bannerUrl}
                      onUploadSuccess={(url) => setSettings({...settings, branding: {...settings.branding, bannerUrl: url}})}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="layout" className="space-y-8 mt-0">
                   <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase flex items-center gap-2">
                      <Columns className="h-3 w-3" /> Menu Layout Style
                    </h4>
                    <Select 
                      value={settings.menuLayout || 'style1'} 
                      onValueChange={(v) => setSettings({...settings, menuLayout: v as any})}
                    >
                      <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {MENU_LAYOUT_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                   </div>

                   <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase mb-4">Sections Order & Visibility</h4>
                    <div className="space-y-3">
                      {settings.sectionOrder.map((sectionKey, index) => {
                        const sectionInfo = SECTION_LABELS[sectionKey];
                        if (!sectionInfo) return null;
                        
                        return (
                          <div key={sectionKey} className="space-y-2">
                            <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border shadow-sm group hover:border-primary/20 transition-colors">
                              <div className="flex flex-col gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-slate-300 hover:text-primary disabled:opacity-30" 
                                  disabled={index === 0}
                                  onClick={() => moveSection(index, 'up')}
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-slate-300 hover:text-primary disabled:opacity-30" 
                                  disabled={index === settings.sectionOrder.length - 1}
                                  onClick={() => moveSection(index, 'down')}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="flex-1 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                  <sectionInfo.icon className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-700">{sectionInfo.label}</span>
                              </div>

                              <Switch 
                                className="scale-75"
                                checked={(settings.sections as any)[sectionKey].visible} 
                                onCheckedChange={(v) => updateSectionVisibility(sectionKey, v)} 
                              />
                            </div>
                            
                            {sectionKey === 'welcomeCard' && settings.sections.welcomeCard.visible && (
                              <div className="ml-12 p-4 bg-slate-50/30 rounded-2xl border border-dashed space-y-4 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center justify-between">
                                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Show Status Badges</Label>
                                  <Switch className="scale-75" checked={settings.sections.welcomeCard.showBadges} onCheckedChange={(v) => updateWelcomeCardSetting('showBadges', v)} />
                                </div>
                                <div className="flex items-center justify-between">
                                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Show Ratings</Label>
                                  <Switch className="scale-75" checked={settings.sections.welcomeCard.showRating} onCheckedChange={(v) => updateWelcomeCardSetting('showRating', v)} />
                                </div>
                                <div className="flex items-center justify-between">
                                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Show Location Details</Label>
                                  <Switch className="scale-75" checked={settings.sections.welcomeCard.showLocation} onCheckedChange={(v) => updateWelcomeCardSetting('showLocation', v)} />
                                </div>
                                <div className="flex items-center justify-between">
                                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Show Delivery & Wait Info</Label>
                                  <Switch className="scale-75" checked={settings.sections.welcomeCard.showDeliveryInfo} onCheckedChange={(v) => updateWelcomeCardSetting('showDeliveryInfo', v)} />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                   </div>
                </TabsContent>

                <TabsContent value="fonts" className="space-y-6 mt-0">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-semibold text-slate-500 uppercase">Heading Font</Label>
                    <Select 
                      value={settings.typography.headingFont} 
                      onValueChange={(v) => setSettings({...settings, typography: {...settings.typography, headingFont: v}})}
                    >
                      <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map(font => <SelectItem key={font.value} value={font.value}>{font.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-semibold text-slate-500 uppercase">Body Font</Label>
                    <Select 
                      value={settings.typography.fontFamily} 
                      onValueChange={(v) => setSettings({...settings, typography: {...settings.typography, fontFamily: v}})}
                    >
                      <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map(font => <SelectItem key={font.value} value={font.value}>{font.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </aside>

        <main className="flex-1 bg-slate-50/50 p-12 flex items-center justify-center relative overflow-hidden">
          <div className={cn(
            "relative bg-white shadow-2xl transition-all duration-500 border-[16px] border-slate-900 rounded-[3rem] overflow-hidden flex flex-col",
            previewMode === 'desktop' ? "w-full max-w-4xl h-[600px]" : previewMode === 'tablet' ? "w-[500px] h-[600px]" : "w-[320px] h-[600px]"
          )}>
            <div className="flex-1 overflow-y-auto no-scrollbar" style={{ 
              fontFamily: settings.typography.fontFamily,
              backgroundColor: settings.theme.background,
              color: settings.theme.text,
              fontSize: settings.typography.baseSize
            }}>
              {settings.sections.navbar.visible && (
                <nav className="h-16 flex items-center justify-between px-8 border-b" style={{ backgroundColor: settings.theme.headerColor }}>
                  <div className="flex items-center gap-2">
                    {settings.branding.logoUrl ? (
                      <img src={settings.branding.logoUrl} className="h-8 w-auto" alt="Logo" />
                    ) : (
                      <span className="font-bold text-sm" style={{ color: settings.theme.primary, fontFamily: settings.typography.headingFont }}>Signature Dining</span>
                    )}
                  </div>
                  <div className="flex gap-4 text-[9px] uppercase font-bold text-slate-400">
                    <span>Menu</span>
                    <span>About</span>
                  </div>
                </nav>
              )}

              <div className="space-y-12 pb-20">
                {settings.sectionOrder.map(sectionKey => {
                  const section = (settings.sections as any)[sectionKey];
                  if (!section?.visible || sectionKey === 'navbar') return null;

                  switch(sectionKey) {
                    case 'hero':
                      return (
                        <section key="hero" className="h-64 flex flex-col items-center justify-center text-center p-8 relative overflow-hidden">
                          {settings.branding.bannerUrl ? (
                            <img src={settings.branding.bannerUrl} className="absolute inset-0 w-full h-full object-cover" alt="Banner" />
                          ) : (
                            <div className="absolute inset-0" style={{ backgroundColor: `${settings.theme.primary}10` }} />
                          )}
                          <div className="relative z-10 p-6 rounded-2xl backdrop-blur-sm bg-black/20">
                            <h2 className="text-4xl font-black mb-4 text-white" style={{ fontFamily: settings.typography.headingFont }}>Taste the Future</h2>
                            <Button size="sm" style={{ backgroundColor: settings.theme.primary }}>View Menu</Button>
                          </div>
                        </section>
                      );
                    case 'welcomeCard':
                      return (
                        <div key="welcomeCard" className="px-8 -mt-6">
                          <div className="bg-white rounded-2xl p-6 shadow-lg border space-y-4">
                            <div className="flex items-center justify-between">
                              {settings.sections.welcomeCard.showBadges && (
                                <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold">Open Now</Badge>
                              )}
                              {settings.sections.welcomeCard.showRating && (
                                <div className="flex items-center gap-1 text-amber-500">
                                  <Star className="h-3 w-3 fill-current" />
                                  <span className="text-[10px] font-black">4.9</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <h3 className="font-bold" style={{ fontFamily: settings.typography.headingFont }}>Welcome</h3>
                              {settings.sections.welcomeCard.showLocation && (
                                <p className="text-[10px] opacity-50">Providing elite culinary experiences since 2024.</p>
                              )}
                            </div>
                            {settings.sections.welcomeCard.showDeliveryInfo && (
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-slate-50 p-2 rounded-lg text-[8px] font-bold uppercase text-slate-400">15 min wait</div>
                                <div className="bg-slate-50 p-2 rounded-lg text-[8px] font-bold uppercase text-slate-400">Free delivery</div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    default:
                      return null;
                  }
                })}
              </div>

              <footer className="py-8 text-center opacity-20 text-[8px] uppercase font-bold tracking-[0.2em]" style={{ backgroundColor: settings.theme.footerColor }}>
                © Powered by MyRestoNet
              </footer>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
