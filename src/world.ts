import population from './data/tornado-population.json'
import counties from './data/us-counties.json'
import { hazardNames, hazards, type NewHazard } from './hazards'
import { homeReplacement } from './impact'

export type Storm = 'Hurricane' | 'Tornado' | 'Blizzard' | NewHazard
export type Place = [name: string, lat: number, lon: number, country?: string, localId?: string]
export type ZoneId = 0 | 1 | 2 | 3 | 4
export type Zone = {
  name: string; x: number; y: number; sea: boolean; neighbors: ZoneId[]
  population: number; housing: number; area: number; assets: number; density: number; source: string
}
export type Theater = { id: string; name: string; storm: Storm; places: [Place, Place, Place, Place, Place]; custom?: true }

export const stormRules = {
  Hurricane: { color: '#55dcf5' },
  Tornado: { color: '#ffb665' },
  Blizzard: { color: '#a9b5ff', opening: 'Build snowpack', alternate: 'Trigger whiteout', upgrade: 'Snow Bands', effect: 'Bank snow faster and reach a neighboring snow-covered zone during whiteout.' },
}

export function stormColor(storm: Storm) {
  return storm in stormRules ? stormRules[storm as keyof typeof stormRules].color : hazards[storm as NewHazard].color
}

export const theaters: Theater[] = [
  { id: 'gulf', name: 'Gulf of Mexico', storm: 'Hurricane', places: [
    ['Northern Gulf', 27.6, -89.5], ['Central Gulf', 24.9, -92.4],
    ['New Orleans area', 29.95, -90.08, 'US', '22071'], ['Baton Rouge area', 30.45, -91.14, 'US', '22033'], ['Mississippi coast', 30.42, -88.9, 'US', '28059'],
  ] },
  { id: 'caribbean', name: 'Caribbean Sea', storm: 'Hurricane', places: [
    ['Jamaica Passage', 16.6, -77.2], ['Western Caribbean', 14.5, -80.6],
    ['Kingston area', 18.01, -76.79, 'JM'], ['Montego Bay area', 18.48, -77.91, 'JM'], ['Santiago de Cuba area', 20.02, -75.83, 'CU'],
  ] },
  { id: 'philippines', name: 'Philippine Sea', storm: 'Hurricane', places: [
    ['Philippine Sea', 13.3, 125.1], ['Western Pacific', 12.3, 129.3],
    ['Tacloban area', 11.25, 125, 'PH'], ['Cebu area', 10.32, 123.9, 'PH'], ['Bicol area', 13.42, 123.42, 'PH'],
  ] },
  { id: 'bengal', name: 'Bay of Bengal', storm: 'Hurricane', places: [
    ['Northern Bay', 20, 89.4], ['Central Bay', 16.9, 88.6],
    ['Khulna area', 22.81, 89.56, 'BD'], ['Dhaka area', 23.81, 90.41, 'BD'], ['Kolkata area', 22.57, 88.36, 'IN'],
  ] },
  { id: 'coral', name: 'Coral Sea', storm: 'Hurricane', places: [
    ['Queensland shelf', -16.2, 147.4], ['Coral Sea', -15.2, 151.3],
    ['Cairns area', -16.92, 145.77, 'AU'], ['Atherton area', -17.27, 145.48, 'AU'], ['Townsville area', -19.26, 146.82, 'AU'],
  ] },
  { id: 'mozambique', name: 'Mozambique Channel', storm: 'Hurricane', places: [
    ['Western Channel', -18.9, 37.5], ['Central Channel', -18.7, 40.9],
    ['Beira area', -19.83, 34.84, 'MZ'], ['Chimoio area', -19.12, 33.48, 'MZ'], ['Quelimane area', -17.88, 36.89, 'MZ'],
  ] },
  { id: 'plains', name: 'Great Plains', storm: 'Tornado', places: [
    ['Western Oklahoma', 35.4, -99.4, 'US', '40009'], ['Texas Panhandle', 35.2, -101.83, 'US', '48375'],
    ['Oklahoma City area', 35.47, -97.51, 'US', '40109'], ['Wichita area', 37.69, -97.34, 'US', '20173'], ['Tulsa area', 36.15, -95.99, 'US', '40143'],
  ] },
  { id: 'pampas', name: 'Pampas', storm: 'Tornado', places: [
    ['Western Pampas', -35.66, -63.76, 'AR'], ['Central Pampas', -36.62, -64.29, 'AR'],
    ['Buenos Aires area', -34.61, -58.38, 'AR'], ['Rosario area', -32.95, -60.64, 'AR'], ['Pergamino area', -33.89, -60.57, 'AR'],
  ] },
  { id: 'europe', name: 'Central Europe', storm: 'Tornado', places: [
    ['South Moravia', 48.8, 17.09, 'CZ'], ['Lower Austria', 48.56, 15.74, 'AT'],
    ['Brno area', 49.2, 16.61, 'CZ'], ['Vienna area', 48.21, 16.37, 'AT'], ['Bratislava area', 48.15, 17.11, 'SK'],
  ] },
  { id: 'bengal-plains', name: 'Bengal Plains', storm: 'Tornado', places: [
    ['Tangail area', 24.25, 89.92, 'BD'], ['Bogra area', 24.85, 89.37, 'BD'],
    ['Dhaka area', 23.81, 90.41, 'BD'], ['Mymensingh area', 24.75, 90.4, 'BD'], ['Rajshahi area', 24.37, 88.6, 'BD'],
  ] },
  { id: 'highveld', name: 'South African Highveld', storm: 'Tornado', places: [
    ['Eastern Free State', -28.65, 28.2, 'ZA'], ['Central Free State', -28.62, 27, 'ZA'],
    ['Harrismith area', -28.28, 29.13, 'ZA'], ['Bethlehem area', -28.23, 28.3, 'ZA'], ['Ladysmith area', -28.56, 29.78, 'ZA'],
  ] },
  { id: 'ontario', name: 'Great Lakes', storm: 'Blizzard', places: [
    ['Bruce County', 44.45, -81.23, 'CA', 'Bruce, ON'], ['Huron County', 43.59, -81.45, 'CA', 'Huron, ON'],
    ['Toronto area', 43.65, -79.38, 'CA', 'Toronto, ON'], ['Simcoe County', 44.45, -79.72, 'CA', 'Simcoe, ON'], ['Middlesex County', 43, -81.25, 'CA', 'Middlesex, ON'],
  ] },
  { id: 'quebec', name: 'St. Lawrence Valley', storm: 'Blizzard', places: [
    ['Charlevoix', 47.54, -70.4, 'CA', 'Charlevoix, QC'], ['Lac-Saint-Jean', 48.56, -71.65, 'CA', 'Lac-Saint-Jean-Est, QC'],
    ['Quebec City area', 46.81, -71.21, 'CA', 'Québec, QC'], ['Saguenay area', 48.43, -71.07, 'CA', 'Saguenay (Chicoutimi), QC'], ['Trois-Rivières area', 46.34, -72.55, 'CA', 'Trois-Rivières, QC'],
  ] },
  { id: 'scandinavia', name: 'Scandinavia', storm: 'Blizzard', places: [
    ['Central Norway', 61.11, 10.46, 'NO'], ['Western Sweden', 60.61, 15.63, 'SE'],
    ['Oslo area', 59.91, 10.75, 'NO'], ['Örebro area', 59.27, 15.21, 'SE'], ['Karlstad area', 59.38, 13.5, 'SE'],
  ] },
  { id: 'hokkaido', name: 'Northern Japan', storm: 'Blizzard', places: [
    ['Central Hokkaido', 43.34, 142.38, 'JP'], ['Eastern Hokkaido', 43.1, 144.1, 'JP'],
    ['Sapporo area', 43.06, 141.35, 'JP'], ['Asahikawa area', 43.77, 142.36, 'JP'], ['Obihiro area', 42.92, 143.2, 'JP'],
  ] },
  { id: 'alberta', name: 'Alberta Foothills', storm: 'Blizzard', places: [
    ['Cochrane area', 51.19, -114.47, 'CA'], ['Rocky Mountain House area', 52.37, -114.92, 'CA'],
    ['Calgary area', 51.05, -114.07, 'CA'], ['Medicine Hat area', 50.04, -110.68, 'CA'], ['Lethbridge area', 49.69, -112.83, 'CA'],
  ] },
  { id: 'new-england', name: 'New England Coast', storm: 'Blizzard', places: [
    ['Cape Cod area', 41.70, -70.30, 'US'], ['Cape Ann area', 42.65, -70.63, 'US'],
    ['Boston area', 42.36, -71.06, 'US'], ['Portland, Maine area', 43.66, -70.26, 'US'], ['Providence area', 41.82, -71.41, 'US'],
  ] },
  { id: 'colorado', name: 'Colorado Front Range', storm: 'Blizzard', places: [
    ['Palmer Divide', 39.13, -104.84, 'US'], ['Pueblo area', 38.27, -104.61, 'US'],
    ['Denver area', 39.74, -104.99, 'US'], ['Fort Collins area', 40.58, -105.08, 'US'], ['Colorado Springs area', 38.83, -104.82, 'US'],
  ] },
]

type StartArea = [id: string, name: string, places: Theater['places']]

const convectiveAreas: StartArea[] = [
  ['prairies', 'Canadian Prairies', [
    ['Saskatoon area', 52.13, -106.67, 'CA'], ['Regina area', 50.45, -104.62, 'CA'],
    ['Yorkton area', 51.21, -102.46, 'CA'], ['Brandon area', 49.85, -99.95, 'CA'], ['Winnipeg area', 49.90, -97.14, 'CA'],
  ]],
  ['plains', 'Central Plains', theaters.find(theater => theater.id === 'plains')!.places],
  ['pampas', 'Argentine Pampas', theaters.find(theater => theater.id === 'pampas')!.places],
  ['bengal', 'Bengal Plains', theaters.find(theater => theater.id === 'bengal-plains')!.places],
  ['europe', 'Central Europe', theaters.find(theater => theater.id === 'europe')!.places],
]

const inlandAreas: Record<string, StartArea[]> = {
  Wildfire: [
    ['california', 'California Foothills', [
      ['Sierra foothills', 38.76, -120.58, 'US', '06017'], ['Butte foothills', 39.76, -121.62, 'US', '06007'],
      ['Placerville area', 38.73, -120.80, 'US', '06017'], ['Auburn area', 38.90, -121.07, 'US', '06061'], ['Grass Valley area', 39.22, -121.06, 'US', '06057'],
    ]],
    ['australia', 'Southeast Australia', [
      ['Blue Mountains', -33.69, 150.32, 'AU'], ['Southern Highlands', -34.47, 150.44, 'AU'],
      ['Katoomba area', -33.71, 150.31, 'AU'], ['Penrith area', -33.75, 150.69, 'AU'], ['Lithgow area', -33.48, 150.15, 'AU'],
    ]],
    ['mediterranean', 'Eastern Mediterranean', [
      ['Attica foothills', 38.18, 23.83, 'GR'], ['Euboea highlands', 38.63, 23.62, 'GR'],
      ['Marathon area', 38.16, 23.96, 'GR'], ['Athens area', 37.98, 23.73, 'GR'], ['Chalcis area', 38.46, 23.59, 'GR'],
    ]],
  ],
  Flooding: [
    ['mississippi', 'Lower Mississippi', [
      ['Upper delta', 33.5, -90.3, 'US', '28133'], ['Yazoo basin', 32.86, -90.41, 'US', '28163'],
      ['Vicksburg area', 32.35, -90.88, 'US', '28149'], ['Natchez area', 31.56, -91.40, 'US', '28001'], ['Baton Rouge area', 30.45, -91.14, 'US', '22033'],
    ]],
    ['ganges', 'Ganges–Brahmaputra Delta', [
      ['Jamuna floodplain', 24.4, 89.72, 'BD'], ['Padma floodplain', 23.67, 89.6, 'BD'],
      ['Dhaka area', 23.81, 90.41, 'BD'], ['Chandpur area', 23.23, 90.65, 'BD'], ['Barishal area', 22.70, 90.37, 'BD'],
    ]],
    ['rhine', 'Lower Rhine', [
      ['Rhine valley', 51.14, 6.87, 'DE'], ['Ruhr lowlands', 51.44, 6.78, 'DE'],
      ['Duisburg area', 51.43, 6.76, 'DE'], ['Wesel area', 51.66, 6.62, 'DE'], ['Arnhem area', 51.99, 5.91, 'NL'],
    ]],
  ],
  'Dust Storm': [
    ['sonora', 'Sonoran Desert', [
      ['Sonoran flats', 32.87, -112.65, 'US', '04013'], ['Lower Gila', 32.98, -113.12, 'US', '04013'],
      ['Phoenix area', 33.45, -112.07, 'US', '04013'], ['Casa Grande area', 32.88, -111.76, 'US', '04021'], ['Yuma area', 32.69, -114.62, 'US', '04027'],
    ]],
    ['sahel', 'Western Sahel', [
      ['Sahel plains', 15.6, -9.9, 'MR'], ['Mauritanian interior', 17.01, -13.91, 'MR'],
      ['Nioro area', 15.24, -9.57, 'ML'], ['Kayes area', 14.45, -11.45, 'ML'], ['Kiffa area', 16.62, -11.40, 'MR'],
    ]],
    ['arabia', 'Arabian Peninsula', [
      ['Najd plateau', 25.24, 46.12, 'SA'], ['Central dunes', 26.45, 45.22, 'SA'],
      ['Riyadh area', 24.71, 46.68, 'SA'], ['Al Kharj area', 24.15, 47.31, 'SA'], ['Al Majma’ah area', 25.90, 45.35, 'SA'],
    ]],
  ],
  'Heat Dome': [
    ['northwest', 'Pacific Northwest', [
      ['Columbia basin', 46.20, -119.12, 'US', '53005'], ['Yakima valley', 46.60, -120.51, 'US', '53077'],
      ['Portland area', 45.52, -122.68, 'US', '41051'], ['Seattle area', 47.61, -122.33, 'US', '53033'], ['Spokane area', 47.66, -117.43, 'US', '53063'],
    ]],
    ['iberia', 'Iberian Peninsula', [
      ['Central plateau', 39.81, -4.02, 'ES'], ['Guadiana basin', 38.89, -6.97, 'ES'],
      ['Madrid area', 40.42, -3.70, 'ES'], ['Seville area', 37.39, -5.99, 'ES'], ['Córdoba area', 37.89, -4.78, 'ES'],
    ]],
    ['indo-gangetic', 'Indo-Gangetic Plain', [
      ['Upper Gangetic Plain', 28.37, 79.43, 'IN'], ['Yamuna plain', 27.18, 78.01, 'IN'],
      ['Delhi area', 28.61, 77.21, 'IN'], ['Lucknow area', 26.85, 80.95, 'IN'], ['Jaipur area', 26.91, 75.79, 'IN'],
    ]],
  ],
}

for (const storm of hazardNames) {
  for (const [id, name, places] of inlandAreas[storm] ?? convectiveAreas) {
    theaters.push({ id: `${storm.toLowerCase().replaceAll(' ', '-')}-${id}`, name, storm, places })
  }
}

export function project(lat: number, lon: number) {
  return { x: (lon + 180) * 10, y: (90 - lat) * 10 }
}

export function bounds(theater: Theater) {
  const points = theater.places.map(([, lat, lon]) => project(lat, lon))
  const left = Math.min(...points.map(p => p.x)) - 22
  const top = Math.min(...points.map(p => p.y)) - 20
  return { left, top, width: Math.max(...points.map(p => p.x)) - left + 22, height: Math.max(...points.map(p => p.y)) - top + 20 }
}

export const zoneIds: ZoneId[] = [0, 1, 2, 3, 4]
const neighbors: ZoneId[][] = [[2, 1], [0, 4], [3, 4], [4, 2], [2, 3]]
const nationalFallback = {
  US: { n: 'United States', d: 93.8 },
  CA: { n: 'Canada', d: 36991981 / 8788702.8 * 2.589988 },
}

export function makeZone([name, lat, lon, country, localId]: Place, area: number, connections: ZoneId[] = []): Zone {
  const division = country === 'CA' && localId ? population.CANADA_CENSUS_DIVISIONS.find(row => row.n === localId) : undefined
  const county = country === 'US' && localId ? counties[localId as keyof typeof counties] : undefined
  const local = division ?? county
  const national = population.WORLD_COUNTRIES.find(row => row.iso === country)
    ?? (country === 'US' || country === 'CA' ? nationalFallback[country] : undefined)
  const density = local ? local.d : national?.d ?? 0
  const housingDensity = local ? local.h : density * 0.4
  const modeledArea = local && density ? Math.min(area, local.pop / density) : area
  return {
    name, ...project(lat, lon), sea: !country, neighbors: connections,
    population: Math.round(density * modeledArea), housing: housingDensity * modeledArea, area: modeledArea,
    assets: Math.round(housingDensity * modeledArea * homeReplacement), density,
    source: division ? `${division.n} · Canadian census division`
      : county ? `${county.n} · U.S. county census estimate`
        : national ? `${national.n} · national density` : country ? 'No local population data' : 'Offshore',
  }
}

export function makeZones(theater: Theater): Zone[] {
  return theater.places.map((place, index) => makeZone(place, 300, neighbors[index]))
}
