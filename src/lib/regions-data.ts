
export interface City {
  id: string;
  name: string;
}

export interface State {
  id: string;
  name: string;
  cities: City[];
}

export interface CountryRegions {
  [countryCode: string]: State[];
}

export const REGIONS_DATA: CountryRegions = {
  AU: [
    { id: 'nsw', name: 'New South Wales', cities: [{ id: 'sydney', name: 'Sydney' }, { id: 'newcastle', name: 'Newcastle' }, { id: 'wollongong', name: 'Wollongong' }] },
    { id: 'vic', name: 'Victoria', cities: [{ id: 'melbourne', name: 'Melbourne' }, { id: 'geelong', name: 'Geelong' }, { id: 'ballarat', name: 'Ballarat' }] },
    { id: 'qld', name: 'Queensland', cities: [{ id: 'brisbane', name: 'Brisbane' }, { id: 'goldcoast', name: 'Gold Coast' }, { id: 'cairns', name: 'Cairns' }] },
    { id: 'wa', name: 'Western Australia', cities: [{ id: 'perth', name: 'Perth' }, { id: 'fremantle', name: 'Freemantle' }, { id: 'bunbury', name: 'Bunbury' }] },
    { id: 'sa', name: 'South Australia', cities: [{ id: 'adelaide', name: 'Adelaide' }, { id: 'mountgambier', name: 'Mount Gambier' }] },
    { id: 'tas', name: 'Tasmania', cities: [{ id: 'hobart', name: 'Hobart' }, { id: 'launceston', name: 'Launceston' }] },
    { id: 'act', name: 'Australian Capital Territory', cities: [{ id: 'canberra', name: 'Canberra' }] },
    { id: 'nt', name: 'Northern Territory', cities: [{ id: 'darwin', name: 'Darwin' }, { id: 'alicesprings', name: 'Alice Springs' }] },
  ],
  GB: [
    { id: 'eng', name: 'England', cities: [{ id: 'london', name: 'London' }, { id: 'manchester', name: 'Manchester' }, { id: 'birmingham', name: 'Birmingham' }, { id: 'liverpool', name: 'Liverpool' }] },
    { id: 'sct', name: 'Scotland', cities: [{ id: 'edinburgh', name: 'Edinburgh' }, { id: 'glasgow', name: 'Glasgow' }, { id: 'aberdeen', name: 'Aberdeen' }] },
    { id: 'wls', name: 'Wales', cities: [{ id: 'cardiff', name: 'Cardiff' }, { id: 'swansea', name: 'Swansea' }] },
    { id: 'nir', name: 'Northern Ireland', cities: [{ id: 'belfast', name: 'Belfast' }, { id: 'derry', name: 'Derry' }] },
  ],
  US: [
    { id: 'ca', name: 'California', cities: [{ id: 'la', name: 'Los Angeles' }, { id: 'sf', name: 'San Francisco' }, { id: 'sd', name: 'San Diego' }] },
    { id: 'ny', name: 'New York', cities: [{ id: 'nyc', name: 'New York City' }, { id: 'buffalo', name: 'Buffalo' }, { id: 'albany', name: 'Albany' }] },
    { id: 'tx', name: 'Texas', cities: [{ id: 'houston', name: 'Houston' }, { id: 'austin', name: 'Austin' }, { id: 'dallas', name: 'Dallas' }] },
    { id: 'fl', name: 'Florida', cities: [{ id: 'miami', name: 'Miami' }, { id: 'orlando', name: 'Orlando' }, { id: 'tampa', name: 'Tampa' }] },
    { id: 'il', name: 'Illinois', cities: [{ id: 'chicago', name: 'Chicago' }] },
  ],
  AE: [
    { id: 'dxb', name: 'Dubai', cities: [{ id: 'dxb-city', name: 'Dubai City' }, { id: 'jebel-ali', name: 'Jebel Ali' }] },
    { id: 'auh', name: 'Abu Dhabi', cities: [{ id: 'auh-city', name: 'Abu Dhabi City' }, { id: 'al-ain', name: 'Al Ain' }] },
    { id: 'shj', name: 'Sharjah', cities: [{ id: 'shj-city', name: 'Sharjah City' }, { id: 'khor-fakkan', name: 'Khor Fakkan' }] },
    { id: 'ajm', name: 'Ajman', cities: [{ id: 'ajm-city', name: 'Ajman City' }] },
  ],
  SA: [
    { id: 'riy', name: 'Riyadh', cities: [{ id: 'riy-city', name: 'Riyadh City' }, { id: 'al-kharj', name: 'Al-Kharj' }] },
    { id: 'mak', name: 'Makkah', cities: [{ id: 'jeddah', name: 'Jeddah' }, { id: 'makkah-city', name: 'Makkah City' }, { id: 'taif', name: 'Taif' }] },
    { id: 'mad', name: 'Madinah', cities: [{ id: 'mad-city', name: 'Madinah City' }, { id: 'yanbu', name: 'Yanbu' }] },
    { id: 'eas', name: 'Eastern Province', cities: [{ id: 'dammam', name: 'Dammam' }, { id: 'khobar', name: 'Al Khobar' }, { id: 'dhahran', name: 'Dhahran' }] },
  ],
  PK: [
    { id: 'pun', name: 'Punjab', cities: [{ id: 'lahore', name: 'Lahore' }, { id: 'faisalabad', name: 'Faisalabad' }, { id: 'multan', name: 'Multan' }, { id: 'rawalpindi', name: 'Rawalpindi' }] },
    { id: 'sin', name: 'Sindh', cities: [{ id: 'karachi', name: 'Karachi' }, { id: 'hyderabad', name: 'Hyderabad' }, { id: 'sukkur', name: 'Sukkur' }] },
    { id: 'kpk', name: 'Khyber Pakhtunkhwa', cities: [{ id: 'peshawar', name: 'Peshawar' }, { id: 'abbottabad', name: 'Abbottabad' }] },
    { id: 'bal', name: 'Balochistan', cities: [{ id: 'quetta', name: 'Quetta' }, { id: 'gwadar', name: 'Gwadar' }] },
    { id: 'ict', name: 'Islamabad Capital Territory', cities: [{ id: 'islamabad', name: 'Islamabad' }] },
  ],
  NZ: [
    { id: 'auk', name: 'Auckland', cities: [{ id: 'auk-city', name: 'Auckland City' }] },
    { id: 'wlg', name: 'Wellington', cities: [{ id: 'wlg-city', name: 'Wellington City' }, { id: 'lower-hutt', name: 'Lower Hutt' }] },
    { id: 'can', name: 'Canterbury', cities: [{ id: 'christchurch', name: 'Christchurch' }] },
    { id: 'otg', name: 'Otago', cities: [{ id: 'dunedin', name: 'Dunedin' }, { id: 'queenstown', name: 'Queenstown' }] },
  ],
  MY: [
    { id: 'sel', name: 'Selangor', cities: [{ id: 'shah-alam', name: 'Shah Alam' }, { id: 'petaling-jaya', name: 'Petaling Jaya' }] },
    { id: 'kl', name: 'Kuala Lumpur', cities: [{ id: 'kl-city', name: 'Kuala Lumpur City' }] },
    { id: 'pen', name: 'Penang', cities: [{ id: 'george-town', name: 'George Town' }, { id: 'butterworth', name: 'Butterworth' }] },
    { id: 'joh', name: 'Johor', cities: [{ id: 'johor-bahru', name: 'Johor Bahru' }] },
  ],
  TH: [
    { id: 'bkk', name: 'Bangkok', cities: [{ id: 'bkk-city', name: 'Bangkok City' }] },
    { id: 'chi', name: 'Chiang Mai', cities: [{ id: 'chi-city', name: 'Chiang Mai City' }] },
    { id: 'pku', name: 'Phuket', cities: [{ id: 'pku-city', name: 'Phuket City' }] },
    { id: 'cho', name: 'Chon Buri', cities: [{ id: 'pattaya', name: 'Pattaya' }] },
  ],
  SG: [
    { id: 'cen', name: 'Central Region', cities: [{ id: 'singapore-city', name: 'Singapore' }] },
    { id: 'est', name: 'East Region', cities: [{ id: 'tampines', name: 'Tampines' }] },
    { id: 'wst', name: 'West Region', cities: [{ id: 'jurong', name: 'Jurong' }] },
  ],
};
