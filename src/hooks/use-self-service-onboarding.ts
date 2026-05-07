import { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { useOnboarding } from '@/lib/demo-flow-context';
import type { PlacePhoto } from '@/lib/types';

/* ── Config ─────────────────────────────────────────────────────────── */

const API_BASE = process.env.NEXT_PUBLIC_ONBOARDING_API_URL || 'http://localhost:8080';
const REDIRECT_BASE_URL = process.env.NEXT_PUBLIC_ORG_ADMIN_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE}/self-service-onboarding`,
  headers: { 'Content-Type': 'application/json' },
});

/* ── Types ──────────────────────────────────────────────────────────── */

interface SendOtpRequest {
  email: string;
}

interface SendOtpResponse {
  success: boolean;
}

interface ThemeColors {
  primary: string;
  primaryText: string;
  secondary: string;
  secondaryText: string;
  highlight: string;
}

interface ThemeBranding {
  logoURL?: string;
  squareLogoURL?: string;
  handbookBannerURL?: string;
}

interface ApiImage {
  imageURL: string;
  width: number;
  height: number;
}

interface ImageComponent {
  image: ApiImage;
}

interface ApiPost {
  contentPlainText: string;
  handbookArticleKeys?: string[];
  imageComponents?: ImageComponent[];
}

interface ApiFeed {
  name: string;
  imageComponent?: ImageComponent;
  posts: ApiPost[];
}

interface ApiHandbookArticle {
  key: string;
  name: string;
  imageComponent?: ImageComponent;
  contentDraftJS?: string;
}

interface ApiHandbook {
  name: string;
  imageComponent?: ImageComponent;
  articles: ApiHandbookArticle[];
}

interface VerifyOtpRequest {
  email: string;
  otp: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  termsAndConditions: boolean;
  companyName: string;
  locations: { name: string; countryCode: string }[];
  feeds: ApiFeed[];
  theme: {
    colors: ThemeColors;
    branding?: ThemeBranding;
  };
  handbooks?: ApiHandbook[];
}

interface VerifyOtpResponse {
  code: string;
  isNewUser: boolean;
}

/* ── Helpers ────────────────────────────────────────────────────────── */

const SUPPORTED_COUNTRY_CODES = new Set(['DK', 'GB-ENG', 'NO', 'SE', 'NL', 'DE', 'BE']);

function toApiCountryCode(isoCode?: string): string {
  if (!isoCode) return 'GB-ENG';
  const upper = isoCode.toUpperCase();
  if (upper === 'GB' || upper === 'UK') return 'GB-ENG';
  if (SUPPORTED_COUNTRY_CODES.has(upper)) return upper;
  return 'GB-ENG';
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message[0];
    return err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

const COVER_IMAGE_PATH = '/welcome-cover.jpg';
const COVER_IMAGE_WIDTH = 1961;
const COVER_IMAGE_HEIGHT = 1080;

function buildCoverImage(origin: string): ImageComponent {
  return {
    image: {
      imageURL: `${origin}${COVER_IMAGE_PATH}`,
      width: COVER_IMAGE_WIDTH,
      height: COVER_IMAGE_HEIGHT,
    },
  };
}

const GETTING_STARTED_KEY = 'getting-started';
const ANNOUNCEMENTS_FEED_NAME = '📢 Announcements';

const GENERIC_FEEDS: { name: string; image: ImageComponent }[] = [
  {
    name: '💬 General',
    image: {
      image: {
        imageURL: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1600&q=80',
        width: 1600,
        height: 1067,
      },
    },
  },
  {
    name: ANNOUNCEMENTS_FEED_NAME,
    image: {
      image: {
        imageURL: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1600&q=80',
        width: 1600,
        height: 1067,
      },
    },
  },
  {
    name: '🏆 Team Shoutouts',
    image: {
      image: {
        imageURL: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1600&q=80',
        width: 1600,
        height: 1067,
      },
    },
  },
  {
    name: '📅 Events',
    image: {
      image: {
        imageURL: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1600&q=80',
        width: 1600,
        height: 1067,
      },
    },
  },
];

const FEED_IMAGE_MAX_WIDTH = 1600;

function placePhotoToImage(photo: PlacePhoto, origin: string): ImageComponent {
  const width = photo.widthPx > 0 ? Math.min(photo.widthPx, FEED_IMAGE_MAX_WIDTH) : FEED_IMAGE_MAX_WIDTH;
  const height = photo.widthPx > 0 && photo.heightPx > 0
    ? Math.round((photo.heightPx / photo.widthPx) * width)
    : Math.round(width * (2 / 3));
  return {
    image: {
      imageURL: `${origin}/api/places/photo?name=${encodeURIComponent(photo.name)}&maxWidthPx=${FEED_IMAGE_MAX_WIDTH}`,
      width,
      height,
    },
  };
}

function buildFeeds(photos: PlacePhoto[], origin: string): ApiFeed[] {
  const photoImages = origin ? photos.map((p) => placePhotoToImage(p, origin)) : [];
  const cover = buildCoverImage(origin);

  return GENERIC_FEEDS.map((f, idx) => {
    const image = photoImages[idx] ?? f.image;
    if (f.name === ANNOUNCEMENTS_FEED_NAME) {
      return {
        name: f.name,
        imageComponent: image,
        posts: [
          {
            contentPlainText:
              "Welcome to All Gravy! 🥳 So glad to have you here. Take a look around and make yourself at home.",
            imageComponents: [cover],
          },
          {
            contentPlainText:
              "Just getting set up? Tap below for a quick walkthrough on inviting your team and personalising your account. 👇",
            handbookArticleKeys: [GETTING_STARTED_KEY],
          },
        ],
      };
    }
    return { name: f.name, imageComponent: image, posts: [] };
  });
}

type DraftBlockType = 'header-two' | 'header-three' | 'unstyled' | 'unordered-list-item';
type RichSegment = string | { bold: string } | { link: string; url: string };
interface RichBlock {
  type: DraftBlockType;
  segments: RichSegment[];
}

const ALLGRAVY_URL = 'https://account.allgravy.com';
const ALLGRAVY_THEME_URL = 'https://account.allgravy.com/settings/account-theme';
const SUPPORT_EMAIL_URL = 'mailto:support@allgravy.com';

const GETTING_STARTED_BLOCKS: RichBlock[] = [
  { type: 'header-two', segments: ['Welcome to All Gravy! 🎉'] },
  { type: 'unstyled', segments: ["You're all set up and ready to go. Your account is live, your branding is in place, and now it's time to bring your team on board."] },
  { type: 'unstyled', segments: [{ bold: 'Important:' }, ' To invite your team and personalise your account settings, you need to use the web version at ', { link: 'account.allgravy.com', url: ALLGRAVY_URL }, " on a computer. That's where all the admin setup happens, and it's not fully supported on mobile yet. So when you're ready, head over to your laptop or desktop to continue."] },

  { type: 'header-three', segments: ['Step 1: Sign In to account.allgravy.com'] },
  { type: 'unstyled', segments: ['On your computer, open ', { link: 'https://account.allgravy.com', url: ALLGRAVY_URL }, " and sign in with your email and password. This is your admin hub where you'll manage your team and customise your account."] },

  { type: 'header-three', segments: ['Step 2: Create and Invite Your Team'] },
  { type: 'unstyled', segments: ["Once you're logged in on the web, follow these steps to add your colleagues."] },
  { type: 'unstyled', segments: [{ bold: 'Create a New User:' }] },
  { type: 'unordered-list-item', segments: ['Navigate to "Directory" in the top bar'] },
  { type: 'unordered-list-item', segments: ['Click the "Create New User" button in the top-right corner'] },
  { type: 'unordered-list-item', segments: ['Fill in the following details: Name, Location, Role, Email Address'] },
  { type: 'unordered-list-item', segments: ['Click the "Create" button in the bottom-right corner'] },
  { type: 'unstyled', segments: [{ bold: 'Note:' }, " Creating a user adds their information to the system but doesn't give them access yet. You need to invite them in the next step."] },

  { type: 'unstyled', segments: [{ bold: 'Invite Employees:' }] },
  { type: 'unordered-list-item', segments: ['Go back to the "Directory" (People section)'] },
  { type: 'unordered-list-item', segments: ['Click the "Invite Employees" button in the top-right corner'] },
  { type: 'unordered-list-item', segments: ['In the invite window, find the employee you want to invite'] },
  { type: 'unordered-list-item', segments: ['Tick the checkbox next to their name'] },
  { type: 'unordered-list-item', segments: ['Check the box labeled "Send onboarding email" (bottom-left corner) so they get your welcome message'] },
  { type: 'unordered-list-item', segments: ['Click the blue "Invite X Employees" button in the bottom-right corner'] },
  { type: 'unstyled', segments: [{ bold: 'Caution:' }, " This action cannot be undone. Make sure you're ready before clicking."] },

  { type: 'unstyled', segments: ["Your colleagues will receive an email invitation. Once they accept and create their own account, they'll have access to All Gravy on both the web and the mobile app."] },
  { type: 'unstyled', segments: [{ bold: 'Pro tip:' }, " Start with your co-managers or shift supervisors first. They'll help drive adoption across the rest of the team."] },

  { type: 'header-three', segments: ['Step 3: Personalise Your Account'] },
  { type: 'unstyled', segments: ["We've already selected a logo and colors based on your branding, but you're free to personalize it further if you'd like."] },
  { type: 'unordered-list-item', segments: ['Go to ', { link: 'https://account.allgravy.com/settings/account-theme', url: ALLGRAVY_THEME_URL }] },
  { type: 'unordered-list-item', segments: [{ bold: 'Upload a Logo:' }, ' Change your logo by selecting a new square or horizontal image. Use a high-quality image for the best result'] },
  { type: 'unordered-list-item', segments: [{ bold: 'Select a Background Image:' }, ' Choose a background image for your handbook. A preview shows at the bottom of the page. A photo of your venue often works well'] },
  { type: 'unordered-list-item', segments: [{ bold: 'Customize the Color Scheme:' }, ' Click on a color option (like "Primary") and use the palette to adjust to your preferred shade'] },
  { type: 'unordered-list-item', segments: [{ bold: 'Preview Your Design:' }, ' See how it all looks together at the bottom of the page'] },
  { type: 'unordered-list-item', segments: [{ bold: 'Edit Invitation Email (Optional):' }, ' Scroll down to customize the invitation email your team receives (admins only)'] },

  { type: 'header-three', segments: ['More Help'] },
  { type: 'unstyled', segments: ["Once you're set up, there are more onboarding articles to explore. Look for the profile icon (usually top-right corner) and go to Help & Support. You'll find step-by-step guides for scheduling, training, handbooks, communications, and more."] },

  { type: 'header-three', segments: ['Need Help Right Now?'] },
  { type: 'unordered-list-item', segments: ["Look for the ? icon on your screen for tips about what you're doing"] },
  { type: 'unordered-list-item', segments: ['Use the chat button (usually bottom-right) to message our support team'] },
  { type: 'unordered-list-item', segments: ['Email ', { link: 'support@allgravy.com', url: SUPPORT_EMAIL_URL }, ' with your question. We typically reply within one business day'] },

  { type: 'header-three', segments: ["What's Next?"] },
  { type: 'unstyled', segments: ['Once your team has joined, you can start using All Gravy across the mobile app and web:'] },
  { type: 'unordered-list-item', segments: [{ bold: 'Scheduling:' }, ' Build rotas, manage availability, and publish shifts'] },
  { type: 'unordered-list-item', segments: [{ bold: 'Training & Learning:' }, " Create courses, run onboarding, track who's completed what"] },
  { type: 'unordered-list-item', segments: [{ bold: 'Handbooks:' }, ' Store policies, procedures, and compliance documents in one place'] },
  { type: 'unordered-list-item', segments: [{ bold: 'Communications:' }, ' Post updates, send broadcasts, keep everyone in the loop'] },
  { type: 'unordered-list-item', segments: [{ bold: 'Recognition:' }, ' Celebrate wins and reward great work with badges and kudos'] },

  { type: 'unstyled', segments: ['Welcome aboard! 🚀'] },
];

function buildDraftJS(blocks: RichBlock[]): string {
  const entityMap: Record<string, { type: 'LINK'; mutability: 'MUTABLE'; data: { href: string; url: string } }> = {};
  let nextEntityKey = 0;

  const emittedBlocks = blocks.map((block, i) => {
    let text = '';
    const inlineStyleRanges: { offset: number; length: number; style: 'BOLD' }[] = [];
    const entityRanges: { offset: number; length: number; key: number }[] = [];

    for (const seg of block.segments) {
      if (typeof seg === 'string') {
        text += seg;
      } else if ('bold' in seg) {
        inlineStyleRanges.push({ offset: text.length, length: seg.bold.length, style: 'BOLD' });
        text += seg.bold;
      } else {
        const key = nextEntityKey++;
        entityMap[key] = { type: 'LINK', mutability: 'MUTABLE', data: { href: seg.url, url: seg.url } };
        entityRanges.push({ offset: text.length, length: seg.link.length, key });
        text += seg.link;
      }
    }

    return {
      key: `b${i}`,
      text,
      type: block.type,
      depth: 0,
      inlineStyleRanges,
      entityRanges,
      data: {},
    };
  });

  return JSON.stringify({ blocks: emittedBlocks, entityMap });
}

function buildHandbooks(origin: string): ApiHandbook[] {
  const cover = buildCoverImage(origin);
  return [
    {
      name: 'Company Handbook',
      imageComponent: cover,
      articles: [
        {
          key: GETTING_STARTED_KEY,
          name: "Here's how to get started",
          imageComponent: cover,
          contentDraftJS: buildDraftJS(GETTING_STARTED_BLOCKS),
        },
      ],
    },
  ];
}

/* ── Hook ───────────────────────────────────────────────────────────── */

export function useSelfServiceOnboarding() {
  const { state, brandColorMap } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = async (email: string) => {
    setError(null);
    setLoading(true);
    try {
      await api.post<SendOtpResponse>('/send-otp', { email } satisfies SendOtpRequest);
      return true;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send code. Please try again.'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (params: {
    email: string;
    otp: string;
    fullName: string;
    phoneNumber?: string;
  }) => {
    setError(null);
    setLoading(true);
    try {
      const nameParts = params.fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || firstName;
      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      const payload: VerifyOtpRequest = {
        email: params.email,
        otp: params.otp,
        firstName,
        lastName,
        phoneNumber: params.phoneNumber || undefined,
        termsAndConditions: true,
        companyName: state.business?.name || 'My Company',
        locations: state.locations.map((l) => ({
          name: l.name,
          countryCode: toApiCountryCode(l.countryCode),
        })),
        feeds: buildFeeds(state.gatheringData.photos ?? [], origin),
        theme: {
          colors: {
            primary: brandColorMap.primaryColor,
            primaryText: brandColorMap.primaryTextColor,
            secondary: brandColorMap.secondaryColor,
            secondaryText: brandColorMap.secondaryTextColor,
            highlight: brandColorMap.highlightColor,
          },
          branding: {
            logoURL: state.business?.logoUrl || undefined,
            squareLogoURL: state.business?.logoUrl || undefined,
          },
        },
        handbooks: buildHandbooks(origin),
      };

      const { data } = await api.post<VerifyOtpResponse>('/verify-otp', payload);
      return data;
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid code. Please try again.'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const redirectToApp = (code: string) => {
    window.location.href = `${REDIRECT_BASE_URL}/welcome?code=${code}`;
  };

  const redirectToSignIn = () => {
    window.location.href = `${REDIRECT_BASE_URL}/signin`;
  };

  const clearError = () => setError(null);

  return { loading, error, sendOtp, verifyOtp, redirectToApp, redirectToSignIn, clearError };
}
