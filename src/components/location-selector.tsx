
'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Globe, MapPin, Plus, Loader2, Info } from 'lucide-react';
import { REGIONS_DATA, State, City } from '@/lib/regions-data';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface LocationSelectorProps {
  countryCode: string | undefined;
  onLocationChange: (location: {
    stateId: string;
    stateName: string;
    cityId: string;
    cityName: string;
  }) => void;
}

export function LocationSelector({ countryCode, onLocationChange }: LocationSelectorProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  
  const [selectedStateId, setSelectedStateId] = useState<string>('');
  const [selectedCityId, setSelectedCityId] = useState<string>('');

  // Firestore City Addition State
  const [isAddCityOpen, setIsAddCityOpen] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [isSubmittingCity, setIsSubmittingCity] = useState(false);

  // 1. Load Custom Cities from Firestore
  const customCitiesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedStateId) return null;
    return query(
      collection(firestore, 'cities'), 
      where('stateId', '==', selectedStateId),
      where('countryCode', '==', countryCode)
    );
  }, [firestore, selectedStateId, countryCode]);

  const { data: customCities, isLoading: loadingCustomCities } = useCollection(customCitiesQuery);

  // 2. Update States when Country changes
  useEffect(() => {
    if (!countryCode || !REGIONS_DATA[countryCode]) {
      setStates([]);
      setSelectedStateId('');
      setCities([]);
      setSelectedCityId('');
      return;
    }

    const availableStates = REGIONS_DATA[countryCode];
    setStates(availableStates);
    setSelectedStateId('');
    setCities([]);
    setSelectedCityId('');
  }, [countryCode]);

  // 3. Update Cities when State or Firestore Data changes
  useEffect(() => {
    const staticState = states.find(s => s.id === selectedStateId);
    const staticCities = staticState?.cities || [];
    
    // Merge static cities with dynamic Firestore cities
    const dynamicCities = customCities?.map(c => ({
      id: c.id,
      name: c.name
    })) || [];

    // Remove duplicates by name
    const merged = [...staticCities];
    dynamicCities.forEach(dc => {
      if (!merged.some(sc => sc.name.toLowerCase() === dc.name.toLowerCase())) {
        merged.push(dc);
      }
    });

    // Sort alphabetically
    setCities(merged.sort((a, b) => a.name.localeCompare(b.name)));
  }, [selectedStateId, states, customCities]);

  const handleStateChange = (stateId: string) => {
    setSelectedStateId(stateId);
    setSelectedCityId('');
    
    const state = states.find(s => s.id === stateId);
    
    onLocationChange({
      stateId,
      stateName: state?.name || '',
      cityId: '',
      cityName: ''
    });
  };

  const handleCityChange = (cityId: string) => {
    setSelectedCityId(cityId);
    const state = states.find(s => s.id === selectedStateId);
    const city = cities.find(c => c.id === cityId);
    
    onLocationChange({
      stateId: selectedStateId,
      stateName: state?.name || '',
      cityId,
      cityName: city?.name || ''
    });
  };

  const handleAddCustomCity = async () => {
    if (!firestore || !newCityName.trim() || !selectedStateId || !countryCode) return;
    
    setIsSubmittingCity(true);
    try {
      // Check if already exists in merged list
      if (cities.some(c => c.name.toLowerCase() === newCityName.trim().toLowerCase())) {
        toast({ variant: "destructive", title: "City already exists", description: "This city is already in the list." });
        setIsAddCityOpen(false);
        return;
      }

      const cityData = {
        name: newCityName.trim(),
        stateId: selectedStateId,
        countryCode: countryCode,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(firestore, 'cities'), cityData);
      
      toast({ title: "City Added", description: `${newCityName} is now available for all users in this state.` });
      setIsAddCityOpen(false);
      setNewCityName('');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "Failed to add city. Ensure you are signed in." });
    } finally {
      setIsSubmittingCity(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="font-bold text-slate-700 flex items-center gap-2">
            <Globe className="h-3 w-3 text-primary" /> State / Province
          </Label>
          <Select 
            value={selectedStateId} 
            onValueChange={handleStateChange} 
            disabled={!countryCode}
          >
            <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100">
              <SelectValue placeholder={!countryCode ? "Select country first" : "Choose state..."} />
            </SelectTrigger>
            <SelectContent className="rounded-xl max-h-60">
              {states.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="font-bold text-slate-700 flex items-center gap-2">
              <MapPin className="h-3 w-3 text-primary" /> City
            </Label>
            {selectedStateId && (
              <Button 
                variant="link" 
                size="sm" 
                className="h-auto p-0 text-[10px] font-black uppercase text-primary gap-1"
                onClick={() => setIsAddCityOpen(true)}
              >
                <Plus className="h-3 w-3" /> Missing?
              </Button>
            )}
          </div>
          <div className="relative">
            {loadingCustomCities && <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-slate-400 z-10" />}
            <Select 
              value={selectedCityId} 
              onValueChange={handleCityChange} 
              disabled={!selectedStateId}
            >
              <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100">
                <SelectValue placeholder={!selectedStateId ? "Select state first" : "Choose city..."} />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-60">
                {cities.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
                {cities.length === 0 && !loadingCustomCities && (
                  <div className="p-4 text-center">
                    <p className="text-xs text-slate-400 font-medium italic">No cities listed yet.</p>
                    <Button variant="link" size="sm" className="text-[10px] uppercase font-black" onClick={() => setIsAddCityOpen(true)}>Add One Now</Button>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Dialog open={isAddCityOpen} onOpenChange={setIsAddCityOpen}>
        <DialogContent className="rounded-[2.5rem] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Add Missing City</DialogTitle>
            <DialogDescription>
              Add a city permanently to the global database for this region.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>City Name</Label>
              <Input 
                value={newCityName} 
                onChange={e => setNewCityName(e.target.value)} 
                placeholder="e.g. Springfield"
                className="h-12 rounded-xl bg-slate-50"
              />
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3 border border-blue-100">
              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                This city will be saved permanently and visible to all other restaurants in <strong>{states.find(s => s.id === selectedStateId)?.name}</strong>.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              className="w-full h-14 rounded-2xl font-black" 
              onClick={handleAddCustomCity}
              disabled={isSubmittingCity || !newCityName.trim()}
            >
              {isSubmittingCity ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
              Save City Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
