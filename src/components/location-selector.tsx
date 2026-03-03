
'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, Globe } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface LocationSelectorProps {
  countryCode: string | undefined;
  onLocationChange: (location: {
    stateId: string;
    stateName: string;
    cityId: string;
    cityName: string;
  }) => void;
}

// Global in-memory cache to reduce reads across remounts
const statesCache: Record<string, any[]> = {};
const citiesCache: Record<string, any[]> = {};

export function LocationSelector({ countryCode, onLocationChange }: LocationSelectorProps) {
  const firestore = useFirestore();
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  
  const [selectedStateId, setSelectedStateId] = useState<string>('');
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // 1. Fetch States when Country changes
  useEffect(() => {
    const fetchStates = async () => {
      if (!firestore || !countryCode) {
        setStates([]);
        setSelectedStateId('');
        setSelectedCityId('');
        setCities([]);
        return;
      }

      setLoadingStates(true);
      setSelectedStateId('');
      setSelectedCityId('');
      setCities([]);

      try {
        if (statesCache[countryCode]) {
          setStates(statesCache[countryCode]);
        } else {
          const statesRef = collection(firestore, 'states');
          const q = query(statesRef, where('countryId', '==', countryCode));
          const snap = await getDocs(q);
          const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Sort in memory to avoid index requirements
          data.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
          
          statesCache[countryCode] = data;
          setStates(data);
        }
      } catch (e: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'states',
          operation: 'list',
        }));
      } finally {
        setLoadingStates(false);
      }
    };

    fetchStates();
  }, [firestore, countryCode]);

  // 2. Fetch Cities when State changes
  useEffect(() => {
    const fetchCities = async () => {
      if (!firestore || !selectedStateId) {
        setCities([]);
        setSelectedCityId('');
        return;
      }

      setLoadingCities(true);
      setSelectedCityId('');

      try {
        if (citiesCache[selectedStateId]) {
          setCities(citiesCache[selectedStateId]);
        } else {
          const citiesRef = collection(firestore, 'cities');
          const q = query(citiesRef, where('stateId', '==', selectedStateId));
          const snap = await getDocs(q);
          const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          data.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
          
          citiesCache[selectedStateId] = data;
          setCities(data);
        }
      } catch (e: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'cities',
          operation: 'list',
        }));
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, [firestore, selectedStateId]);

  const handleStateChange = (id: string) => {
    setSelectedStateId(id);
    const stateName = states.find(s => s.id === id)?.name || '';
    setSelectedCityId('');
    setCities([]);
    onLocationChange({ stateId: id, stateName, cityId: '', cityName: '' });
  };

  const handleCityChange = (id: string) => {
    setSelectedCityId(id);
    const stateName = states.find(s => s.id === selectedStateId)?.name || '';
    const cityName = cities.find(c => c.id === id)?.name || '';
    onLocationChange({ stateId: selectedStateId, stateName, cityId: id, cityName });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="font-bold text-slate-700 flex items-center gap-2">
            <Globe className="h-3 w-3 text-primary" /> State / Province
          </Label>
          {loadingStates && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
        </div>
        <Select 
          value={selectedStateId} 
          onValueChange={handleStateChange} 
          disabled={!countryCode || loadingStates}
        >
          <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100">
            <SelectValue placeholder={!countryCode ? "Select country first" : "Choose state..."} />
          </SelectTrigger>
          <SelectContent className="rounded-xl max-h-60">
            {states.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
            {!loadingStates && countryCode && states.length === 0 && (
              <div className="p-4 text-xs text-muted-foreground italic text-center">
                No states found for this country in database.
              </div>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="font-bold text-slate-700 flex items-center gap-2">
            <MapPin className="h-3 w-3 text-primary" /> City
          </Label>
          {loadingCities && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
        </div>
        <Select 
          value={selectedCityId} 
          onValueChange={handleCityChange} 
          disabled={!selectedStateId || loadingCities}
        >
          <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100">
            <SelectValue placeholder={!selectedStateId ? "Select state first" : "Choose city..."} />
          </SelectTrigger>
          <SelectContent className="rounded-xl max-h-60">
            {cities.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
            {!loadingCities && selectedStateId && cities.length === 0 && (
              <div className="p-4 text-xs text-muted-foreground italic text-center">
                No cities found for this state in database.
              </div>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
