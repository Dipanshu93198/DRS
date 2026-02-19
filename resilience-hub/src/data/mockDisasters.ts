export type DisasterType = 'earthquake' | 'flood' | 'wildfire' | 'cyclone' | 'tsunami' | 'volcano';
export type SeverityLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface Disaster {
  id: string;
  type: DisasterType;
  name: string;
  location: string;
  lat: number;
  lng: number;
  severity: SeverityLevel;
  magnitude?: number;
  affectedPopulation: number;
  deployedTeams: number;
  timestamp: string;
  description: string;
  status: 'active' | 'monitoring' | 'resolved';
}

export interface Alert {
  id: string;
  disasterId: string;
  type: 'warning' | 'critical' | 'info' | 'update';
  message: string;
  timestamp: string;
}

export const DISASTER_ICONS: Record<DisasterType, string> = {
  earthquake: '🌍',
  flood: '🌊',
  wildfire: '🔥',
  cyclone: '🌀',
  tsunami: '🌊',
  volcano: '🌋',
};

export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  low: 'success',
  moderate: 'warning',
  high: 'accent',
  critical: 'danger',
};

export const mockDisasters: Disaster[] = [
  {
    id: 'd1',
    type: 'earthquake',
    name: 'Tōhoku Offshore Quake',
    location: 'Miyagi Prefecture, Japan',
    lat: 38.32,
    lng: 142.37,
    severity: 'critical',
    magnitude: 7.2,
    affectedPopulation: 245000,
    deployedTeams: 48,
    timestamp: '2026-02-19T03:14:00Z',
    description: 'Major seismic event detected offshore. Tsunami advisory issued for coastal regions.',
    status: 'active',
  },
  {
    id: 'd2',
    type: 'flood',
    name: 'Mekong Delta Flooding',
    location: 'An Giang, Vietnam',
    lat: 10.38,
    lng: 105.43,
    severity: 'high',
    affectedPopulation: 182000,
    deployedTeams: 32,
    timestamp: '2026-02-18T14:30:00Z',
    description: 'Severe flooding across delta region. Multiple villages submerged. Evacuations ongoing.',
    status: 'active',
  },
  {
    id: 'd3',
    type: 'wildfire',
    name: 'Sierra Nevada Complex Fire',
    location: 'Fresno County, California',
    lat: 37.25,
    lng: -119.65,
    severity: 'high',
    affectedPopulation: 34000,
    deployedTeams: 22,
    timestamp: '2026-02-17T08:00:00Z',
    description: 'Multi-front wildfire burning through 45,000 acres. Containment at 23%.',
    status: 'active',
  },
  {
    id: 'd4',
    type: 'cyclone',
    name: 'Cyclone Arjun',
    location: 'Bay of Bengal, India',
    lat: 15.5,
    lng: 88.0,
    severity: 'critical',
    affectedPopulation: 1200000,
    deployedTeams: 85,
    timestamp: '2026-02-19T00:45:00Z',
    description: 'Category 4 cyclone approaching eastern coast. Wind speeds 220 km/h. Mass evacuations underway.',
    status: 'active',
  },
  {
    id: 'd5',
    type: 'tsunami',
    name: 'Solomon Islands Tsunami Warning',
    location: 'Guadalcanal, Solomon Islands',
    lat: -9.43,
    lng: 160.0,
    severity: 'moderate',
    affectedPopulation: 28000,
    deployedTeams: 8,
    timestamp: '2026-02-19T05:22:00Z',
    description: 'Tsunami advisory following 6.1 undersea earthquake. Wave height estimated 1.5m.',
    status: 'monitoring',
  },
  {
    id: 'd6',
    type: 'volcano',
    name: 'Mount Merapi Eruption',
    location: 'Central Java, Indonesia',
    lat: -7.54,
    lng: 110.44,
    severity: 'moderate',
    affectedPopulation: 56000,
    deployedTeams: 15,
    timestamp: '2026-02-18T20:10:00Z',
    description: 'Increased volcanic activity with pyroclastic flows. Exclusion zone extended to 7km.',
    status: 'active',
  },
  {
    id: 'd7',
    type: 'earthquake',
    name: 'Atacama Tremor',
    location: 'Atacama Region, Chile',
    lat: -27.36,
    lng: -70.33,
    severity: 'low',
    magnitude: 4.8,
    affectedPopulation: 8500,
    deployedTeams: 4,
    timestamp: '2026-02-19T07:55:00Z',
    description: 'Moderate tremor detected. No tsunami risk. Minor structural damage reported.',
    status: 'monitoring',
  },
];

export const mockAlerts: Alert[] = [
  { id: 'a1', disasterId: 'd4', type: 'critical', message: 'Cyclone Arjun upgraded to Category 4. Landfall expected in 8 hours.', timestamp: '2026-02-19T08:30:00Z' },
  { id: 'a2', disasterId: 'd1', type: 'critical', message: 'Tsunami advisory issued for Miyagi, Iwate, Fukushima coastlines.', timestamp: '2026-02-19T08:15:00Z' },
  { id: 'a3', disasterId: 'd3', type: 'warning', message: 'Wind shift detected. Fire front redirecting toward populated zone.', timestamp: '2026-02-19T08:00:00Z' },
  { id: 'a4', disasterId: 'd2', type: 'update', message: '12,000 additional residents evacuated from An Giang province.', timestamp: '2026-02-19T07:45:00Z' },
  { id: 'a5', disasterId: 'd6', type: 'warning', message: 'Pyroclastic flow detected on SE slope. Exclusion zone expanded.', timestamp: '2026-02-19T07:30:00Z' },
  { id: 'a6', disasterId: 'd5', type: 'info', message: 'Wave monitoring stations reporting normal levels. Advisory maintained.', timestamp: '2026-02-19T07:15:00Z' },
  { id: 'a7', disasterId: 'd4', type: 'update', message: '450,000 people evacuated from coastal Odisha districts.', timestamp: '2026-02-19T07:00:00Z' },
  { id: 'a8', disasterId: 'd7', type: 'info', message: 'Aftershock sequence subsiding. Monitoring continues.', timestamp: '2026-02-19T06:45:00Z' },
];
