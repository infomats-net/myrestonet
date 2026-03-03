
'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Globe, MapPin } from 'lucide-react';
import { REGIONS_DATA, State, City } from '@/lib/regions-data';

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
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  
  const [selectedStateId, setSelectedStateId] = useState<string>('');
  const [selectedCityId, setSelectedCityId] = useState<string>('');

  // 1. Update States when Country changes
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

  const handleStateChange = (stateId: string) => {
    setSelectedStateId(stateId);
    const state = states.find(s => s.id === stateId);
    const availableCities = state?.cities || [];
    setCities(availableCities);
    setSelectedCityId('');
    
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

  return (
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
        <Label className="font-bold text-slate-700 flex items-center gap-2">
          <MapPin className="h-3 w-3 text-primary" /> City
        </Label>
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
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
