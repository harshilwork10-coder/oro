import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// US Sales Tax Rates by State (base rates)
// Source: Tax Foundation, January 2024
const STATE_TAX_RATES: Record<string, { state: string; rate: number; hasLocalTax: boolean }> = {
    // No sales tax states
    'AK': { state: 'Alaska', rate: 0, hasLocalTax: true },
    'DE': { state: 'Delaware', rate: 0, hasLocalTax: false },
    'MT': { state: 'Montana', rate: 0, hasLocalTax: false },
    'NH': { state: 'New Hampshire', rate: 0, hasLocalTax: false },
    'OR': { state: 'Oregon', rate: 0, hasLocalTax: false },

    // States with sales tax
    'AL': { state: 'Alabama', rate: 4.00, hasLocalTax: true },
    'AZ': { state: 'Arizona', rate: 5.60, hasLocalTax: true },
    'AR': { state: 'Arkansas', rate: 6.50, hasLocalTax: true },
    'CA': { state: 'California', rate: 7.25, hasLocalTax: true },
    'CO': { state: 'Colorado', rate: 2.90, hasLocalTax: true },
    'CT': { state: 'Connecticut', rate: 6.35, hasLocalTax: false },
    'FL': { state: 'Florida', rate: 6.00, hasLocalTax: true },
    'GA': { state: 'Georgia', rate: 4.00, hasLocalTax: true },
    'HI': { state: 'Hawaii', rate: 4.00, hasLocalTax: true },
    'ID': { state: 'Idaho', rate: 6.00, hasLocalTax: true },
    'IL': { state: 'Illinois', rate: 6.25, hasLocalTax: true },
    'IN': { state: 'Indiana', rate: 7.00, hasLocalTax: false },
    'IA': { state: 'Iowa', rate: 6.00, hasLocalTax: true },
    'KS': { state: 'Kansas', rate: 6.50, hasLocalTax: true },
    'KY': { state: 'Kentucky', rate: 6.00, hasLocalTax: false },
    'LA': { state: 'Louisiana', rate: 4.45, hasLocalTax: true },
    'ME': { state: 'Maine', rate: 5.50, hasLocalTax: false },
    'MD': { state: 'Maryland', rate: 6.00, hasLocalTax: false },
    'MA': { state: 'Massachusetts', rate: 6.25, hasLocalTax: false },
    'MI': { state: 'Michigan', rate: 6.00, hasLocalTax: false },
    'MN': { state: 'Minnesota', rate: 6.875, hasLocalTax: true },
    'MS': { state: 'Mississippi', rate: 7.00, hasLocalTax: false },
    'MO': { state: 'Missouri', rate: 4.225, hasLocalTax: true },
    'NE': { state: 'Nebraska', rate: 5.50, hasLocalTax: true },
    'NV': { state: 'Nevada', rate: 6.85, hasLocalTax: true },
    'NJ': { state: 'New Jersey', rate: 6.625, hasLocalTax: false },
    'NM': { state: 'New Mexico', rate: 4.875, hasLocalTax: true },
    'NY': { state: 'New York', rate: 4.00, hasLocalTax: true },
    'NC': { state: 'North Carolina', rate: 4.75, hasLocalTax: true },
    'ND': { state: 'North Dakota', rate: 5.00, hasLocalTax: true },
    'OH': { state: 'Ohio', rate: 5.75, hasLocalTax: true },
    'OK': { state: 'Oklahoma', rate: 4.50, hasLocalTax: true },
    'PA': { state: 'Pennsylvania', rate: 6.00, hasLocalTax: true },
    'RI': { state: 'Rhode Island', rate: 7.00, hasLocalTax: false },
    'SC': { state: 'South Carolina', rate: 6.00, hasLocalTax: true },
    'SD': { state: 'South Dakota', rate: 4.20, hasLocalTax: true },
    'TN': { state: 'Tennessee', rate: 7.00, hasLocalTax: true },
    'TX': { state: 'Texas', rate: 6.25, hasLocalTax: true },
    'UT': { state: 'Utah', rate: 6.10, hasLocalTax: true },
    'VT': { state: 'Vermont', rate: 6.00, hasLocalTax: true },
    'VA': { state: 'Virginia', rate: 5.30, hasLocalTax: true },
    'WA': { state: 'Washington', rate: 6.50, hasLocalTax: true },
    'WV': { state: 'West Virginia', rate: 6.00, hasLocalTax: true },
    'WI': { state: 'Wisconsin', rate: 5.00, hasLocalTax: true },
    'WY': { state: 'Wyoming', rate: 4.00, hasLocalTax: true },
    'DC': { state: 'Washington DC', rate: 6.00, hasLocalTax: false },
}

// ZIP code prefix to state mapping (first 3 digits)
const ZIP_TO_STATE: Record<string, string> = {
    // Alabama (350-369)
    '350': 'AL', '351': 'AL', '352': 'AL', '354': 'AL', '355': 'AL', '356': 'AL', '357': 'AL', '358': 'AL', '359': 'AL',
    '360': 'AL', '361': 'AL', '362': 'AL', '363': 'AL', '364': 'AL', '365': 'AL', '366': 'AL', '367': 'AL', '368': 'AL', '369': 'AL',
    // Alaska (995-999)
    '995': 'AK', '996': 'AK', '997': 'AK', '998': 'AK', '999': 'AK',
    // Arizona (850-865)
    '850': 'AZ', '851': 'AZ', '852': 'AZ', '853': 'AZ', '855': 'AZ', '856': 'AZ', '857': 'AZ', '859': 'AZ', '860': 'AZ', '863': 'AZ', '864': 'AZ', '865': 'AZ',
    // Arkansas (716-729)
    '716': 'AR', '717': 'AR', '718': 'AR', '719': 'AR', '720': 'AR', '721': 'AR', '722': 'AR', '723': 'AR', '724': 'AR', '725': 'AR', '726': 'AR', '727': 'AR', '728': 'AR', '729': 'AR',
    // California (900-961)
    '900': 'CA', '901': 'CA', '902': 'CA', '903': 'CA', '904': 'CA', '905': 'CA', '906': 'CA', '907': 'CA', '908': 'CA', '910': 'CA', '911': 'CA', '912': 'CA', '913': 'CA', '914': 'CA', '915': 'CA', '916': 'CA', '917': 'CA', '918': 'CA',
    '920': 'CA', '921': 'CA', '922': 'CA', '923': 'CA', '924': 'CA', '925': 'CA', '926': 'CA', '927': 'CA', '928': 'CA', '930': 'CA', '931': 'CA', '932': 'CA', '933': 'CA', '934': 'CA', '935': 'CA', '936': 'CA', '937': 'CA', '938': 'CA', '939': 'CA',
    '940': 'CA', '941': 'CA', '942': 'CA', '943': 'CA', '944': 'CA', '945': 'CA', '946': 'CA', '947': 'CA', '948': 'CA', '949': 'CA', '950': 'CA', '951': 'CA', '952': 'CA', '953': 'CA', '954': 'CA', '955': 'CA', '956': 'CA', '957': 'CA', '958': 'CA', '959': 'CA', '960': 'CA', '961': 'CA',
    // Colorado (800-816)
    '800': 'CO', '801': 'CO', '802': 'CO', '803': 'CO', '804': 'CO', '805': 'CO', '806': 'CO', '807': 'CO', '808': 'CO', '809': 'CO', '810': 'CO', '811': 'CO', '812': 'CO', '813': 'CO', '814': 'CO', '815': 'CO', '816': 'CO',
    // Connecticut (060-069)
    '060': 'CT', '061': 'CT', '062': 'CT', '063': 'CT', '064': 'CT', '065': 'CT', '066': 'CT', '067': 'CT', '068': 'CT', '069': 'CT',
    // Delaware (197-199)
    '197': 'DE', '198': 'DE', '199': 'DE',
    // Florida (320-349)
    '320': 'FL', '321': 'FL', '322': 'FL', '323': 'FL', '324': 'FL', '325': 'FL', '326': 'FL', '327': 'FL', '328': 'FL', '329': 'FL',
    '330': 'FL', '331': 'FL', '332': 'FL', '333': 'FL', '334': 'FL', '335': 'FL', '336': 'FL', '337': 'FL', '338': 'FL', '339': 'FL',
    '340': 'FL', '341': 'FL', '342': 'FL', '344': 'FL', '346': 'FL', '347': 'FL', '349': 'FL',
    // Georgia (300-319, 398-399)
    '300': 'GA', '301': 'GA', '302': 'GA', '303': 'GA', '304': 'GA', '305': 'GA', '306': 'GA', '307': 'GA', '308': 'GA', '309': 'GA',
    '310': 'GA', '311': 'GA', '312': 'GA', '313': 'GA', '314': 'GA', '315': 'GA', '316': 'GA', '317': 'GA', '318': 'GA', '319': 'GA', '398': 'GA', '399': 'GA',
    // Illinois (600-629)
    '600': 'IL', '601': 'IL', '602': 'IL', '603': 'IL', '604': 'IL', '605': 'IL', '606': 'IL', '607': 'IL', '608': 'IL', '609': 'IL',
    '610': 'IL', '611': 'IL', '612': 'IL', '613': 'IL', '614': 'IL', '615': 'IL', '616': 'IL', '617': 'IL', '618': 'IL', '619': 'IL',
    '620': 'IL', '622': 'IL', '623': 'IL', '624': 'IL', '625': 'IL', '626': 'IL', '627': 'IL', '628': 'IL', '629': 'IL',
    // Indiana (460-479)
    '460': 'IN', '461': 'IN', '462': 'IN', '463': 'IN', '464': 'IN', '465': 'IN', '466': 'IN', '467': 'IN', '468': 'IN', '469': 'IN',
    '470': 'IN', '471': 'IN', '472': 'IN', '473': 'IN', '474': 'IN', '475': 'IN', '476': 'IN', '477': 'IN', '478': 'IN', '479': 'IN',
    // New Jersey (070-089)
    '070': 'NJ', '071': 'NJ', '072': 'NJ', '073': 'NJ', '074': 'NJ', '075': 'NJ', '076': 'NJ', '077': 'NJ', '078': 'NJ', '079': 'NJ',
    '080': 'NJ', '081': 'NJ', '082': 'NJ', '083': 'NJ', '084': 'NJ', '085': 'NJ', '086': 'NJ', '087': 'NJ', '088': 'NJ', '089': 'NJ',
    // New York (100-149)
    '100': 'NY', '101': 'NY', '102': 'NY', '103': 'NY', '104': 'NY', '105': 'NY', '106': 'NY', '107': 'NY', '108': 'NY', '109': 'NY',
    '110': 'NY', '111': 'NY', '112': 'NY', '113': 'NY', '114': 'NY', '115': 'NY', '116': 'NY', '117': 'NY', '118': 'NY', '119': 'NY',
    '120': 'NY', '121': 'NY', '122': 'NY', '123': 'NY', '124': 'NY', '125': 'NY', '126': 'NY', '127': 'NY', '128': 'NY', '129': 'NY',
    '130': 'NY', '131': 'NY', '132': 'NY', '133': 'NY', '134': 'NY', '135': 'NY', '136': 'NY', '137': 'NY', '138': 'NY', '139': 'NY',
    '140': 'NY', '141': 'NY', '142': 'NY', '143': 'NY', '144': 'NY', '145': 'NY', '146': 'NY', '147': 'NY', '148': 'NY', '149': 'NY',
    // Pennsylvania (150-196)
    '150': 'PA', '151': 'PA', '152': 'PA', '153': 'PA', '154': 'PA', '155': 'PA', '156': 'PA', '157': 'PA', '158': 'PA', '159': 'PA',
    '160': 'PA', '161': 'PA', '162': 'PA', '163': 'PA', '164': 'PA', '165': 'PA', '166': 'PA', '167': 'PA', '168': 'PA', '169': 'PA',
    '170': 'PA', '171': 'PA', '172': 'PA', '173': 'PA', '174': 'PA', '175': 'PA', '176': 'PA', '177': 'PA', '178': 'PA', '179': 'PA',
    '180': 'PA', '181': 'PA', '182': 'PA', '183': 'PA', '184': 'PA', '185': 'PA', '186': 'PA', '187': 'PA', '188': 'PA', '189': 'PA',
    '190': 'PA', '191': 'PA', '192': 'PA', '193': 'PA', '194': 'PA', '195': 'PA', '196': 'PA',
    // Texas (750-799, 885)
    '750': 'TX', '751': 'TX', '752': 'TX', '753': 'TX', '754': 'TX', '755': 'TX', '756': 'TX', '757': 'TX', '758': 'TX', '759': 'TX',
    '760': 'TX', '761': 'TX', '762': 'TX', '763': 'TX', '764': 'TX', '765': 'TX', '766': 'TX', '767': 'TX', '768': 'TX', '769': 'TX',
    '770': 'TX', '772': 'TX', '773': 'TX', '774': 'TX', '775': 'TX', '776': 'TX', '777': 'TX', '778': 'TX', '779': 'TX',
    '780': 'TX', '781': 'TX', '782': 'TX', '783': 'TX', '784': 'TX', '785': 'TX', '786': 'TX', '787': 'TX', '788': 'TX', '789': 'TX',
    '790': 'TX', '791': 'TX', '792': 'TX', '793': 'TX', '794': 'TX', '795': 'TX', '796': 'TX', '797': 'TX', '798': 'TX', '799': 'TX', '885': 'TX',
    // Washington DC (200-205)
    '200': 'DC', '202': 'DC', '203': 'DC', '204': 'DC', '205': 'DC',
}

// Major city additional tax rates (city + county combined local rate)
const CITY_TAX_RATES: Record<string, { city: string; localRate: number }> = {
    // Illinois - Chicago
    '60601': { city: 'Chicago', localRate: 4.50 },
    '60602': { city: 'Chicago', localRate: 4.50 },
    '60603': { city: 'Chicago', localRate: 4.50 },
    '60604': { city: 'Chicago', localRate: 4.50 },
    '60605': { city: 'Chicago', localRate: 4.50 },
    '60606': { city: 'Chicago', localRate: 4.50 },
    '60607': { city: 'Chicago', localRate: 4.50 },
    '60608': { city: 'Chicago', localRate: 4.50 },
    '60609': { city: 'Chicago', localRate: 4.50 },
    '60610': { city: 'Chicago', localRate: 4.50 },
    '60611': { city: 'Chicago', localRate: 4.50 },
    '60612': { city: 'Chicago', localRate: 4.50 },
    '60613': { city: 'Chicago', localRate: 4.50 },
    '60614': { city: 'Chicago', localRate: 4.50 },
    '60615': { city: 'Chicago', localRate: 4.50 },
    '60616': { city: 'Chicago', localRate: 4.50 },
    '60617': { city: 'Chicago', localRate: 4.50 },
    '60618': { city: 'Chicago', localRate: 4.50 },
    '60619': { city: 'Chicago', localRate: 4.50 },
    '60620': { city: 'Chicago', localRate: 4.50 },
    '60621': { city: 'Chicago', localRate: 4.50 },
    '60622': { city: 'Chicago', localRate: 4.50 },
    '60623': { city: 'Chicago', localRate: 4.50 },
    '60624': { city: 'Chicago', localRate: 4.50 },
    '60625': { city: 'Chicago', localRate: 4.50 },
    '60626': { city: 'Chicago', localRate: 4.50 },
    '60628': { city: 'Chicago', localRate: 4.50 },
    '60629': { city: 'Chicago', localRate: 4.50 },
    '60630': { city: 'Chicago', localRate: 4.50 },
    '60631': { city: 'Chicago', localRate: 4.50 },
    '60632': { city: 'Chicago', localRate: 4.50 },
    '60634': { city: 'Chicago', localRate: 4.50 },
    '60636': { city: 'Chicago', localRate: 4.50 },
    '60637': { city: 'Chicago', localRate: 4.50 },
    '60638': { city: 'Chicago', localRate: 4.50 },
    '60639': { city: 'Chicago', localRate: 4.50 },
    '60640': { city: 'Chicago', localRate: 4.50 },
    '60641': { city: 'Chicago', localRate: 4.50 },
    '60642': { city: 'Chicago', localRate: 4.50 },
    '60643': { city: 'Chicago', localRate: 4.50 },
    '60644': { city: 'Chicago', localRate: 4.50 },
    '60645': { city: 'Chicago', localRate: 4.50 },
    '60646': { city: 'Chicago', localRate: 4.50 },
    '60647': { city: 'Chicago', localRate: 4.50 },
    '60649': { city: 'Chicago', localRate: 4.50 },
    '60651': { city: 'Chicago', localRate: 4.50 },
    '60652': { city: 'Chicago', localRate: 4.50 },
    '60653': { city: 'Chicago', localRate: 4.50 },
    '60654': { city: 'Chicago', localRate: 4.50 },
    '60655': { city: 'Chicago', localRate: 4.50 },
    '60656': { city: 'Chicago', localRate: 4.50 },
    '60657': { city: 'Chicago', localRate: 4.50 },
    '60659': { city: 'Chicago', localRate: 4.50 },
    '60660': { city: 'Chicago', localRate: 4.50 },
    '60661': { city: 'Chicago', localRate: 4.50 },
    // Cook County suburbs (not Chicago)
    '60007': { city: 'Elk Grove Village', localRate: 3.50 },
    '60008': { city: 'Rolling Meadows', localRate: 3.50 },
    '60016': { city: 'Des Plaines', localRate: 3.50 },
    '60018': { city: 'Des Plaines', localRate: 3.50 },
    '60025': { city: 'Glenview', localRate: 3.50 },
    '60053': { city: 'Morton Grove', localRate: 3.50 },
    '60068': { city: 'Park Ridge', localRate: 3.50 },
    '60077': { city: 'Skokie', localRate: 3.50 },
    '60091': { city: 'Wilmette', localRate: 3.50 },
    '60201': { city: 'Evanston', localRate: 3.50 },
    '60202': { city: 'Evanston', localRate: 3.50 },
    // New York City
    '10001': { city: 'New York City', localRate: 4.50 },
    '10002': { city: 'New York City', localRate: 4.50 },
    '10003': { city: 'New York City', localRate: 4.50 },
    '10004': { city: 'New York City', localRate: 4.50 },
    '10005': { city: 'New York City', localRate: 4.50 },
    '10006': { city: 'New York City', localRate: 4.50 },
    '10007': { city: 'New York City', localRate: 4.50 },
    '10010': { city: 'New York City', localRate: 4.50 },
    '10011': { city: 'New York City', localRate: 4.50 },
    '10012': { city: 'New York City', localRate: 4.50 },
    '10013': { city: 'New York City', localRate: 4.50 },
    '10014': { city: 'New York City', localRate: 4.50 },
    '10016': { city: 'New York City', localRate: 4.50 },
    '10017': { city: 'New York City', localRate: 4.50 },
    '10018': { city: 'New York City', localRate: 4.50 },
    '10019': { city: 'New York City', localRate: 4.50 },
    '10020': { city: 'New York City', localRate: 4.50 },
    '10021': { city: 'New York City', localRate: 4.50 },
    '10022': { city: 'New York City', localRate: 4.50 },
    '10023': { city: 'New York City', localRate: 4.50 },
    '10024': { city: 'New York City', localRate: 4.50 },
    '10025': { city: 'New York City', localRate: 4.50 },
    '10027': { city: 'New York City', localRate: 4.50 },
    '10028': { city: 'New York City', localRate: 4.50 },
    '10029': { city: 'New York City', localRate: 4.50 },
    '10030': { city: 'New York City', localRate: 4.50 },
    '10031': { city: 'New York City', localRate: 4.50 },
    '10032': { city: 'New York City', localRate: 4.50 },
    '10033': { city: 'New York City', localRate: 4.50 },
    '10034': { city: 'New York City', localRate: 4.50 },
    '10035': { city: 'New York City', localRate: 4.50 },
    '10036': { city: 'New York City', localRate: 4.50 },
    '10037': { city: 'New York City', localRate: 4.50 },
    '10038': { city: 'New York City', localRate: 4.50 },
    '10039': { city: 'New York City', localRate: 4.50 },
    '10040': { city: 'New York City', localRate: 4.50 },
    // Los Angeles
    '90001': { city: 'Los Angeles', localRate: 2.25 },
    '90002': { city: 'Los Angeles', localRate: 2.25 },
    '90003': { city: 'Los Angeles', localRate: 2.25 },
    '90004': { city: 'Los Angeles', localRate: 2.25 },
    '90005': { city: 'Los Angeles', localRate: 2.25 },
    '90006': { city: 'Los Angeles', localRate: 2.25 },
    '90007': { city: 'Los Angeles', localRate: 2.25 },
    '90008': { city: 'Los Angeles', localRate: 2.25 },
    '90010': { city: 'Los Angeles', localRate: 2.25 },
    '90012': { city: 'Los Angeles', localRate: 2.25 },
    '90013': { city: 'Los Angeles', localRate: 2.25 },
    '90014': { city: 'Los Angeles', localRate: 2.25 },
    '90015': { city: 'Los Angeles', localRate: 2.25 },
    '90016': { city: 'Los Angeles', localRate: 2.25 },
    // Houston
    '77001': { city: 'Houston', localRate: 2.00 },
    '77002': { city: 'Houston', localRate: 2.00 },
    '77003': { city: 'Houston', localRate: 2.00 },
    '77004': { city: 'Houston', localRate: 2.00 },
    '77005': { city: 'Houston', localRate: 2.00 },
    '77006': { city: 'Houston', localRate: 2.00 },
    '77007': { city: 'Houston', localRate: 2.00 },
    '77008': { city: 'Houston', localRate: 2.00 },
    '77009': { city: 'Houston', localRate: 2.00 },
    '77010': { city: 'Houston', localRate: 2.00 },
    // Atlanta
    '30301': { city: 'Atlanta', localRate: 4.00 },
    '30302': { city: 'Atlanta', localRate: 4.00 },
    '30303': { city: 'Atlanta', localRate: 4.00 },
    '30305': { city: 'Atlanta', localRate: 4.00 },
    '30306': { city: 'Atlanta', localRate: 4.00 },
    '30307': { city: 'Atlanta', localRate: 4.00 },
    '30308': { city: 'Atlanta', localRate: 4.00 },
    '30309': { city: 'Atlanta', localRate: 4.00 },
    '30310': { city: 'Atlanta', localRate: 4.00 },
}

// Illinois Villages/Municipalities with home rule tax
const ILLINOIS_VILLAGE_TAXES: Record<string, { name: string; villageTax: number; rta: number; county: string }> = {
    // Chicago
    '60601': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60602': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60603': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60604': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60605': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60606': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60607': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60608': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60609': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60610': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60611': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60614': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60615': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60616': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60617': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60618': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60619': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60620': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60622': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60623': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60624': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60625': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60626': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60629': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60630': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60632': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60634': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60636': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60637': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60638': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60639': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60640': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60641': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60647': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60651': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60652': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60653': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60654': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60657': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60659': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60660': { name: 'Chicago', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    // Cook County Suburbs with Home Rule
    '60004': { name: 'Arlington Heights', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60005': { name: 'Arlington Heights', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60007': { name: 'Elk Grove Village', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60008': { name: 'Rolling Meadows', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60016': { name: 'Des Plaines', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60018': { name: 'Rosemont', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60025': { name: 'Glenview', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60053': { name: 'Morton Grove', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60060': { name: 'Mundelein', villageTax: 0.50, rta: 1.00, county: 'Lake' },
    '60062': { name: 'Northbrook', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60068': { name: 'Park Ridge', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60074': { name: 'Palatine', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60076': { name: 'Skokie', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60077': { name: 'Skokie', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60090': { name: 'Wheeling', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60091': { name: 'Wilmette', villageTax: 0.25, rta: 1.00, county: 'Cook' },
    '60093': { name: 'Winnetka', villageTax: 0.00, rta: 1.00, county: 'Cook' },
    '60101': { name: 'Addison', villageTax: 0.50, rta: 1.00, county: 'DuPage' },
    '60103': { name: 'Bartlett', villageTax: 0.75, rta: 1.00, county: 'DuPage' },
    '60108': { name: 'Bloomingdale', villageTax: 0.50, rta: 1.00, county: 'DuPage' },
    '60116': { name: 'Carol Stream', villageTax: 0.50, rta: 1.00, county: 'DuPage' },
    '60126': { name: 'Elmhurst', villageTax: 0.75, rta: 1.00, county: 'DuPage' },
    '60137': { name: 'Glen Ellyn', villageTax: 0.75, rta: 1.00, county: 'DuPage' },
    '60139': { name: 'Glendale Heights', villageTax: 0.50, rta: 1.00, county: 'DuPage' },
    '60148': { name: 'Lombard', villageTax: 0.75, rta: 1.00, county: 'DuPage' },
    '60153': { name: 'Maywood', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60154': { name: 'Westchester', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60155': { name: 'Broadview', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60160': { name: 'Melrose Park', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60162': { name: 'Hillside', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60163': { name: 'Berkeley', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60164': { name: 'Schiller Park', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60165': { name: 'Stone Park', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60171': { name: 'River Grove', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60172': { name: 'Roselle', villageTax: 0.50, rta: 1.00, county: 'DuPage' },
    '60173': { name: 'Schaumburg', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60176': { name: 'Niles', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60181': { name: 'Villa Park', villageTax: 0.75, rta: 1.00, county: 'DuPage' },
    '60187': { name: 'Wheaton', villageTax: 0.75, rta: 1.00, county: 'DuPage' },
    '60188': { name: 'Carol Stream', villageTax: 0.50, rta: 1.00, county: 'DuPage' },
    '60189': { name: 'Wheaton', villageTax: 0.75, rta: 1.00, county: 'DuPage' },
    '60191': { name: 'Wood Dale', villageTax: 0.75, rta: 1.00, county: 'DuPage' },
    '60193': { name: 'Schaumburg', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60194': { name: 'Schaumburg', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60195': { name: 'Schaumburg', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60201': { name: 'Evanston', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60202': { name: 'Evanston', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60301': { name: 'Oak Park', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60302': { name: 'Oak Park', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60304': { name: 'Oak Park', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60305': { name: 'River Forest', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60402': { name: 'Berwyn', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60406': { name: 'Blue Island', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60409': { name: 'Calumet City', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60411': { name: 'Chicago Heights', villageTax: 1.50, rta: 1.00, county: 'Cook' },
    '60415': { name: 'Chicago Ridge', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60419': { name: 'Dolton', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60426': { name: 'Harvey', villageTax: 1.50, rta: 1.00, county: 'Cook' },
    '60428': { name: 'Markham', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60429': { name: 'Hazel Crest', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60430': { name: 'Homewood', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60438': { name: 'Lansing', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60445': { name: 'Midlothian', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60452': { name: 'Oak Forest', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60453': { name: 'Oak Lawn', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60455': { name: 'Bridgeview', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60456': { name: 'Hometown', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60458': { name: 'Justice', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60459': { name: 'Burbank', villageTax: 1.25, rta: 1.00, county: 'Cook' },
    '60461': { name: 'Olympia Fields', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60462': { name: 'Orland Park', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60463': { name: 'Palos Heights', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60464': { name: 'Palos Park', villageTax: 0.25, rta: 1.00, county: 'Cook' },
    '60465': { name: 'Palos Hills', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60466': { name: 'Park Forest', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60467': { name: 'Orland Park', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60469': { name: 'Posen', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60471': { name: 'Richton Park', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60472': { name: 'Robbins', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60473': { name: 'South Holland', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60475': { name: 'Steger', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60476': { name: 'Thornton', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60477': { name: 'Tinley Park', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60478': { name: 'Country Club Hills', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60480': { name: 'Willow Springs', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60482': { name: 'Worth', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60501': { name: 'Summit', villageTax: 1.00, rta: 1.00, county: 'Cook' },
    '60513': { name: 'Brookfield', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60521': { name: 'Hinsdale', villageTax: 0.50, rta: 1.00, county: 'DuPage' },
    '60525': { name: 'La Grange', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60526': { name: 'La Grange Park', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60527': { name: 'Willowbrook', villageTax: 0.50, rta: 1.00, county: 'DuPage' },
    '60534': { name: 'Lyons', villageTax: 0.75, rta: 1.00, county: 'Cook' },
    '60540': { name: 'Naperville', villageTax: 0.75, rta: 1.00, county: 'DuPage' },
    '60546': { name: 'Riverside', villageTax: 0.50, rta: 1.00, county: 'Cook' },
    '60558': { name: 'Western Springs', villageTax: 0.25, rta: 1.00, county: 'Cook' },
    '60559': { name: 'Westmont', villageTax: 0.75, rta: 1.00, county: 'DuPage' },
    '60561': { name: 'Darien', villageTax: 0.50, rta: 1.00, county: 'DuPage' },
    '60563': { name: 'Naperville', villageTax: 0.75, rta: 1.00, county: 'DuPage' },
    '60564': { name: 'Naperville', villageTax: 0.75, rta: 1.00, county: 'Will' },
    '60565': { name: 'Naperville', villageTax: 0.75, rta: 1.00, county: 'DuPage' },
}

// Illinois Excise Taxes (per category)
const ILLINOIS_EXCISE_TAXES = {
    // Liquor taxes per gallon (converted to approx % of retail)
    liquor: {
        spirits: { ratePerGallon: 8.55, approxRetailPercent: 18.00 }, // ~36% markup estimate
        wine: { ratePerGallon: 1.39, approxRetailPercent: 5.00 },
        beer: { ratePerGallon: 0.231, approxRetailPercent: 1.50 },
    },
    // Chicago additional liquor tax
    chicagoLiquor: {
        spirits: { ratePerGallon: 2.68, approxRetailPercent: 6.00 },
        wine: { ratePerGallon: 0.36, approxRetailPercent: 1.25 },
        beer: { ratePerGallon: 0.29, approxRetailPercent: 2.00 },
    },
    // Cook County additional liquor tax
    cookCountyLiquor: {
        spirits: { ratePerGallon: 2.50, approxRetailPercent: 5.50 },
        wine: { ratePerGallon: 0.30, approxRetailPercent: 1.00 },
        beer: { ratePerGallon: 0.06, approxRetailPercent: 0.50 },
    },
    // Tobacco/Vape
    tobacco: {
        cigarettePerPack: 2.98, // State tobacco tax per pack
        chicagoCigarettePerPack: 1.18, // Chicago additional
        cookCountyCigarettePerPack: 3.00, // Cook County additional
        otherTobaccoPercent: 36.0, // Other tobacco products (cigars, etc)
    },
    // Low tax rate items (groceries, medicine)
    lowTaxItems: {
        groceryRate: 1.00, // Qualifying food and drugs
        medicineRate: 1.00, // Prescription and OTC medicine
    },
}

// Lookup tax rate by ZIP code
function getTaxRateByZip(zip: string): {
    zip: string
    state: string
    stateCode: string
    city?: string
    county?: string
    stateTaxRate: number
    localTaxRate: number
    villageTax?: number
    rtaTax?: number
    countyTax?: number
    combinedRate: number
    // Category-specific rates
    categoryRates?: {
        general: number
        grocery: number
        liquorSpirits: number
        liquorWine: number
        liquorBeer: number
        tobacco: number
    }
    disclaimer: string
} {
    const prefix = zip.substring(0, 3)
    const stateCode = ZIP_TO_STATE[prefix]

    if (!stateCode) {
        return {
            zip,
            state: 'Unknown',
            stateCode: '',
            stateTaxRate: 0,
            localTaxRate: 0,
            combinedRate: 0,
            disclaimer: 'ZIP code not recognized. Please verify and set tax rate manually.'
        }
    }

    const stateInfo = STATE_TAX_RATES[stateCode]
    const cityInfo = CITY_TAX_RATES[zip]
    const illVillage = ILLINOIS_VILLAGE_TAXES[zip]

    // Calculate local rate
    let localRate = 0
    let villageTax = 0
    let rtaTax = 0
    let countyTax = 0
    let county = ''

    // Illinois-specific calculation
    if (stateCode === 'IL' && illVillage) {
        villageTax = illVillage.villageTax
        rtaTax = illVillage.rta
        county = illVillage.county

        // County tax rates
        if (county === 'Cook') {
            countyTax = 1.75 // Cook County sales tax
        } else if (county === 'DuPage') {
            countyTax = 0.75
        } else if (county === 'Lake') {
            countyTax = 0.50
        } else if (county === 'Will') {
            countyTax = 0.25
        }

        localRate = villageTax + rtaTax + countyTax
    } else if (cityInfo) {
        localRate = cityInfo.localRate
    } else if (stateInfo.hasLocalTax) {
        // Estimate average local tax if city not in database
        const defaultLocalRates: Record<string, number> = {
            'IL': 2.50, 'NY': 4.00, 'CA': 1.50, 'TX': 1.75, 'FL': 1.00,
            'GA': 3.00, 'PA': 1.00, 'OH': 1.50, 'WA': 2.50, 'CO': 4.00
        }
        localRate = defaultLocalRates[stateCode] || 1.50
    }

    const combinedRate = stateInfo.rate + localRate

    // Calculate category-specific rates for Illinois
    let categoryRates = undefined
    if (stateCode === 'IL') {
        const isChicago = illVillage?.name === 'Chicago'
        const isCookCounty = illVillage?.county === 'Cook'

        // General merchandise rate
        const generalRate = combinedRate

        // Grocery (low tax - 1% state + local)
        const groceryRate = 1.00 + localRate

        // Liquor - Spirits (highest)
        let spiritsRate = combinedRate + ILLINOIS_EXCISE_TAXES.liquor.spirits.approxRetailPercent
        if (isCookCounty) spiritsRate += ILLINOIS_EXCISE_TAXES.cookCountyLiquor.spirits.approxRetailPercent
        if (isChicago) spiritsRate += ILLINOIS_EXCISE_TAXES.chicagoLiquor.spirits.approxRetailPercent

        // Liquor - Wine
        let wineRate = combinedRate + ILLINOIS_EXCISE_TAXES.liquor.wine.approxRetailPercent
        if (isCookCounty) wineRate += ILLINOIS_EXCISE_TAXES.cookCountyLiquor.wine.approxRetailPercent
        if (isChicago) wineRate += ILLINOIS_EXCISE_TAXES.chicagoLiquor.wine.approxRetailPercent

        // Liquor - Beer
        let beerRate = combinedRate + ILLINOIS_EXCISE_TAXES.liquor.beer.approxRetailPercent
        if (isCookCounty) beerRate += ILLINOIS_EXCISE_TAXES.cookCountyLiquor.beer.approxRetailPercent
        if (isChicago) beerRate += ILLINOIS_EXCISE_TAXES.chicagoLiquor.beer.approxRetailPercent

        // Tobacco - just regular sales tax (excise tax already in wholesale price)
        const tobaccoRate = combinedRate // Same as general merchandise

        categoryRates = {
            general: Math.round(generalRate * 100) / 100,
            grocery: Math.round(groceryRate * 100) / 100,
            liquorSpirits: Math.round(spiritsRate * 100) / 100,
            liquorWine: Math.round(wineRate * 100) / 100,
            liquorBeer: Math.round(beerRate * 100) / 100,
            tobacco: Math.round(tobaccoRate * 100) / 100,
        }
    }

    const result: any = {
        zip,
        state: stateInfo.state,
        stateCode,
        city: illVillage?.name || cityInfo?.city,
        stateTaxRate: stateInfo.rate,
        localTaxRate: Math.round(localRate * 100) / 100,
        combinedRate: Math.round(combinedRate * 100) / 100,
        disclaimer: (illVillage || cityInfo)
            ? 'Tax rate based on state and local data. Verify with your tax authority.'
            : 'Local tax estimated. Please verify with your local tax authority for exact rate.'
    }

    // Add Illinois-specific fields
    if (stateCode === 'IL' && illVillage) {
        result.county = county
        result.villageTax = villageTax
        result.rtaTax = rtaTax
        result.countyTax = countyTax
        result.categoryRates = categoryRates
    }

    return result
}

// GET - Lookup tax rate by ZIP code
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const zip = searchParams.get('zip')?.replace(/\D/g, '').substring(0, 5)

        if (!zip || zip.length !== 5) {
            return NextResponse.json({ error: 'Valid 5-digit ZIP code required' }, { status: 400 })
        }

        const taxInfo = getTaxRateByZip(zip)

        return NextResponse.json({
            success: true,
            ...taxInfo
        })

    } catch (error) {
        console.error('[TAX_LOOKUP]', error)
        return NextResponse.json({ error: 'Failed to lookup tax rate' }, { status: 500 })
    }
}

