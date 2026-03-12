export interface BusinessLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  isMain: boolean;
}

export interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  text: string;
}

export interface BusinessResult {
  id: string;
  name: string;
  address: string;
  category: string;
  rating: number;
  reviewCount: number;
  phone: string;
  website: string;
  hours: string;
  priceLevel: string;
  brandColors: { primary: string; secondary: string; accent: string };
  locations: BusinessLocation[];
  reviews: Review[];
  employeeEstimate: string;
  growthScore: number; // 0-50 based on hiring posts, new locations, etc.
  competitors: { name: string; rating: number; distance: string }[];
  painPoints: string[];
  images: string[];
}

export const mockBusinesses: BusinessResult[] = [
  {
    id: "1",
    name: "Bella Cucina Italian Kitchen",
    address: "742 Evergreen Terrace, Austin, TX 78701",
    category: "Italian Restaurant",
    rating: 4.6,
    reviewCount: 387,
    phone: "+1 (512) 555-0142",
    website: "https://www.bellacucinaatx.com",
    hours: "Mon-Thu 11am-10pm, Fri-Sat 11am-11pm, Sun 10am-9pm",
    priceLevel: "$$",
    brandColors: { primary: "#8B2500", secondary: "#F5E6D3", accent: "#D4A574" },
    locations: [
      { id: "l1", name: "Bella Cucina - Downtown", address: "742 Evergreen Terrace, Austin, TX", lat: 30.2672, lng: -97.7431, isMain: true },
      { id: "l2", name: "Bella Cucina - South Lamar", address: "1100 S Lamar Blvd, Austin, TX", lat: 30.2532, lng: -97.7654, isMain: false },
      { id: "l3", name: "Bella Cucina - Domain", address: "3208 The Domain, Austin, TX", lat: 30.4021, lng: -97.7254, isMain: false },
    ],
    reviews: [
      { id: "r1", author: "Sarah Mitchell", avatar: "https://i.pravatar.cc/150?img=1", rating: 5, date: "2 weeks ago", text: "Absolutely incredible pasta! The carbonara is the best I've had outside of Rome. The ambiance is warm and inviting, perfect for date night. Staff was attentive without being overbearing." },
      { id: "r2", author: "James Rodriguez", avatar: "https://i.pravatar.cc/150?img=12", rating: 5, date: "1 month ago", text: "We hosted our anniversary dinner here and it was magical. The truffle risotto is a must-try. Chef Marco even came out to congratulate us. Will definitely be back!" },
      { id: "r3", author: "Emily Chen", avatar: "https://i.pravatar.cc/150?img=5", rating: 4, date: "3 weeks ago", text: "Great food and lovely atmosphere. The only reason I'm not giving 5 stars is the wait time on a Friday night was about 45 minutes even with a reservation. But the food made up for it." },
      { id: "r4", author: "Michael Brown", avatar: "https://i.pravatar.cc/150?img=11", rating: 5, date: "1 week ago", text: "Best Italian in Austin, hands down. The homemade gnocchi melts in your mouth. My family has been coming here every Sunday for the past year." },
      { id: "r5", author: "Lisa Park", avatar: "https://i.pravatar.cc/150?img=9", rating: 4, date: "2 months ago", text: "Lovely place with authentic Italian dishes. The wine selection is impressive and well-curated. Prices are reasonable for the quality you get." },
      { id: "r6", author: "David Thompson", avatar: "https://i.pravatar.cc/150?img=14", rating: 5, date: "3 days ago", text: "Came here for my birthday and was blown away. The seafood linguine was perfection. They even brought out a complimentary tiramisu! Outstanding service." },
      { id: "r7", author: "Rachel Green", avatar: "https://i.pravatar.cc/150?img=20", rating: 3, date: "1 month ago", text: "Food was good but the restaurant was extremely loud on a Saturday night. Hard to have a conversation. The bruschetta appetizer was amazing though." },
    ],
    employeeEstimate: "25-40",
    growthScore: 38,
    competitors: [
      { name: "Olive & Vine", rating: 4.3, distance: "0.8 mi" },
      { name: "Trattoria Roma", rating: 4.1, distance: "1.2 mi" },
      { name: "Pasta Palace", rating: 3.9, distance: "2.1 mi" },
    ],
    painPoints: [
      "Long wait times on weekends despite reservations",
      "Staff scheduling across 3 locations is manual and error-prone",
      "No centralized communication channel for team updates",
      "Difficulty tracking employee availability and shift swaps",
    ],
    images: [
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=300&fit=crop",
    ],
  },
  {
    id: "2",
    name: "The Golden Dragon",
    address: "888 Lucky Street, San Francisco, CA 94108",
    category: "Chinese Restaurant",
    rating: 4.4,
    reviewCount: 521,
    phone: "+1 (415) 555-0888",
    website: "https://www.goldendragon-sf.com",
    hours: "Daily 11am-11pm",
    priceLevel: "$$",
    brandColors: { primary: "#C41E3A", secondary: "#FFD700", accent: "#1A1A2E" },
    locations: [
      { id: "l1", name: "The Golden Dragon - Chinatown", address: "888 Lucky Street, SF, CA", lat: 37.7941, lng: -122.4078, isMain: true },
      { id: "l2", name: "The Golden Dragon - Sunset", address: "2200 Irving St, SF, CA", lat: 37.7637, lng: -122.4815, isMain: false },
    ],
    reviews: [
      { id: "r1", author: "Tony Wu", avatar: "https://i.pravatar.cc/150?img=33", rating: 5, date: "1 week ago", text: "Best dim sum in the city! The har gow and siu mai are perfectly crafted. Weekend brunch here is a must-do SF experience." },
      { id: "r2", author: "Amanda Foster", avatar: "https://i.pravatar.cc/150?img=23", rating: 4, date: "2 weeks ago", text: "Really authentic Chinese cuisine. The Peking duck needs to be ordered in advance but it's absolutely worth the planning." },
      { id: "r3", author: "Kevin Patel", avatar: "https://i.pravatar.cc/150?img=53", rating: 5, date: "3 days ago", text: "This place is a gem! The mapo tofu has the perfect level of heat and the dan dan noodles are addictive. Great value for money too." },
      { id: "r4", author: "Sophie Laurent", avatar: "https://i.pravatar.cc/150?img=25", rating: 4, date: "1 month ago", text: "Wonderful flavors and generous portions. The restaurant gets very busy during lunch hour so arrive early. Kung pao chicken is exceptional." },
      { id: "r5", author: "Marcus Johnson", avatar: "https://i.pravatar.cc/150?img=51", rating: 5, date: "5 days ago", text: "Family has been coming here for 10+ years. Consistently excellent food. The staff treats regulars like family. Try the walnut shrimp!" },
    ],
    employeeEstimate: "15-25",
    growthScore: 22,
    competitors: [
      { name: "Dragon Palace", rating: 4.2, distance: "0.3 mi" },
      { name: "Szechuan House", rating: 4.5, distance: "0.7 mi" },
      { name: "Lucky Wok", rating: 3.8, distance: "1.5 mi" },
    ],
    painPoints: [
      "Weekend dim sum service overwhelms current staff",
      "Language barriers make written communication challenging",
      "No digital system for shift scheduling — still using paper",
      "High turnover due to lack of team engagement tools",
    ],
    images: [
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1526234362653-3b75a0c07438?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400&h=300&fit=crop",
    ],
  },
  {
    id: "3",
    name: "Sunrise Café & Bakery",
    address: "45 Morning Glory Lane, Portland, OR 97205",
    category: "Café & Bakery",
    rating: 4.8,
    reviewCount: 892,
    phone: "+1 (503) 555-0234",
    website: "https://www.sunrisecafebakery.com",
    hours: "Daily 6am-4pm",
    priceLevel: "$",
    brandColors: { primary: "#FF9F43", secondary: "#FFF3E0", accent: "#6B4423" },
    locations: [
      { id: "l1", name: "Sunrise Café - Pearl District", address: "45 Morning Glory Lane, Portland, OR", lat: 45.5266, lng: -122.6836, isMain: true },
    ],
    reviews: [
      { id: "r1", author: "Megan Walsh", avatar: "https://i.pravatar.cc/150?img=32", rating: 5, date: "4 days ago", text: "The croissants here are legitimately the best in Portland. Flaky, buttery, perfect. And the cold brew is incredibly smooth." },
      { id: "r2", author: "Chris Nakamura", avatar: "https://i.pravatar.cc/150?img=57", rating: 5, date: "1 week ago", text: "This is my daily morning stop. The baristas know my order by heart. Sourdough bread is baked fresh every morning - you can smell it from the street!" },
      { id: "r3", author: "Julia Hernandez", avatar: "https://i.pravatar.cc/150?img=44", rating: 4, date: "2 weeks ago", text: "Cute café with amazing pastries. Gets very crowded on weekends. The avocado toast is simple but done really well." },
      { id: "r4", author: "Ben Clarke", avatar: "https://i.pravatar.cc/150?img=59", rating: 5, date: "3 days ago", text: "Best breakfast spot in the Pearl District. The eggs benedict with house-made hollandaise is to die for. Worth the weekend wait." },
    ],
    employeeEstimate: "8-12",
    growthScore: 44,
    competitors: [
      { name: "Pearl Bakehouse", rating: 4.5, distance: "0.4 mi" },
      { name: "Morning Ritual Coffee", rating: 4.6, distance: "0.6 mi" },
    ],
    painPoints: [
      "Early morning shifts are hard to fill consistently",
      "Team updates shared via personal group chats — unprofessional",
      "No way to broadcast daily specials or menu changes to staff",
      "Growing fast but onboarding new hires takes too long",
    ],
    images: [
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&h=300&fit=crop",
    ],
  },
  {
    id: "4",
    name: "Smoke & Barrel BBQ",
    address: "1200 Pit Lane, Nashville, TN 37203",
    category: "BBQ Restaurant",
    rating: 4.7,
    reviewCount: 1243,
    phone: "+1 (615) 555-0567",
    website: "https://www.smokeandbarrelbbq.com",
    hours: "Tue-Sun 11am-9pm",
    priceLevel: "$$",
    brandColors: { primary: "#2C1810", secondary: "#F4E4C1", accent: "#D35400" },
    locations: [
      { id: "l1", name: "Smoke & Barrel - The Gulch", address: "1200 Pit Lane, Nashville, TN", lat: 36.1510, lng: -86.7896, isMain: true },
      { id: "l2", name: "Smoke & Barrel - East Nashville", address: "800 Woodland St, Nashville, TN", lat: 36.1745, lng: -86.7582, isMain: false },
      { id: "l3", name: "Smoke & Barrel - Franklin", address: "330 Main St, Franklin, TN", lat: 35.9251, lng: -86.8689, isMain: false },
      { id: "l4", name: "Smoke & Barrel - Murfreesboro", address: "125 SE Broad St, Murfreesboro, TN", lat: 35.8456, lng: -86.3903, isMain: false },
    ],
    reviews: [
      { id: "r1", author: "Jake Morrison", avatar: "https://i.pravatar.cc/150?img=68", rating: 5, date: "2 days ago", text: "The brisket here is absolutely insane. 14-hour smoked perfection. The bark, the smoke ring, the tenderness - everything is on point." },
      { id: "r2", author: "Patricia Hayes", avatar: "https://i.pravatar.cc/150?img=26", rating: 5, date: "1 week ago", text: "Best BBQ in Nashville and that's saying something! The pulled pork sandwich with their house slaw is my go-to. Mac and cheese is incredible too." },
      { id: "r3", author: "Omar Abdullah", avatar: "https://i.pravatar.cc/150?img=52", rating: 4, date: "3 weeks ago", text: "Fantastic smoked meats. The ribs fall off the bone. Only slight issue is they sometimes run out of brisket by 7pm. Get there early!" },
      { id: "r4", author: "Cindy Liu", avatar: "https://i.pravatar.cc/150?img=47", rating: 5, date: "5 days ago", text: "We drove 2 hours just to eat here and it was 100% worth it. The smoked wings are a hidden gem on the menu. Bourbon selection is top-notch." },
      { id: "r5", author: "Robert Taylor", avatar: "https://i.pravatar.cc/150?img=60", rating: 5, date: "2 weeks ago", text: "Been a regular since they opened. Consistent quality every single visit. The burnt ends are the best I've had anywhere, including Kansas City." },
      { id: "r6", author: "Diana Mercer", avatar: "https://i.pravatar.cc/150?img=19", rating: 4, date: "1 month ago", text: "Great BBQ with a fun atmosphere. Live music on weekends is a nice touch. Prices are fair for the quality and portions are generous." },
    ],
    employeeEstimate: "40-60",
    growthScore: 41,
    competitors: [
      { name: "Nashville Hot Pit", rating: 4.4, distance: "0.5 mi" },
      { name: "Smokin' Joe's", rating: 4.2, distance: "1.8 mi" },
      { name: "The Rib Shack", rating: 4.0, distance: "2.3 mi" },
    ],
    painPoints: [
      "Coordinating across 4 locations with different managers is chaotic",
      "Staff morale drops during peak BBQ season — burnout is real",
      "No central feed for sharing recipes, prep notes, or updates",
      "Shift swaps happen over text messages — impossible to track",
    ],
    images: [
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1529193591184-b1d58069ecf4?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1504382103100-db7e92322d39?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop",
    ],
  },
];

export function searchBusinesses(query: string): BusinessResult[] {
  if (!query || query.length < 2) return [];
  const lower = query.toLowerCase();
  return mockBusinesses.filter(
    (b) =>
      b.name.toLowerCase().includes(lower) ||
      b.category.toLowerCase().includes(lower) ||
      b.address.toLowerCase().includes(lower)
  );
}
