export interface BusinessLocationV2 {
  id: string;
  name: string;
  address: string;
}

export interface MockBusinessV2 {
  name: string;
  logoUrl: string | null;
  domain: string;
  brandColors: string[];
  locations: BusinessLocationV2[];
}

const MOCK_BUSINESS: MockBusinessV2 = {
  name: 'Sunrise Café & Bakery',
  logoUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=80&h=80&fit=crop',
  domain: 'sunrisecafebakery.com',
  brandColors: ['#FF9F43', '#FFF3E0', '#6B4423'],
  locations: [
    {
      id: 'loc-1',
      name: 'Sunrise Café - Pearl District',
      address: '45 Morning Glory Lane, Portland, OR 97205',
    },
    {
      id: 'loc-2',
      name: 'Sunrise Café - Alberta Arts',
      address: '2812 Alberta St, Portland, OR 97211',
    },
    {
      id: 'loc-3',
      name: 'Sunrise Café - Hawthorne',
      address: '1507 SE Hawthorne Blvd, Portland, OR 97214',
    },
  ],
};

export function lookupBusiness(_url: string): Promise<MockBusinessV2> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ ...MOCK_BUSINESS }), 2500);
  });
}

export function isValidUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^(https?:\/\/)?[\w-]+(\.[\w-]+)+/.test(trimmed);
}
