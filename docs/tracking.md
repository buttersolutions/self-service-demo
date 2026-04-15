# Analytics tracking

Server-side + client-side tracking for Google (GA4) and Meta. Events are fired from the client into both `window.dataLayer` (for GTM) and `/api/track` (server fan-out to GA4 Measurement Protocol + Meta Conversions API). A shared `event_id` makes the platforms dedupe.

## Environment variables

Set these in Vercel (Project → Settings → Environment Variables) for **Production, Preview, and Development**:

| Name | Scope | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_GTM_CONTAINER_ID` | client | GTM → Admin → Container Settings (`GTM-XXXX`) |
| `NEXT_PUBLIC_META_PIXEL_ID` | client | Meta Events Manager → Data Sources → your Pixel |
| `META_CAPI_ACCESS_TOKEN` | server | Meta Events Manager → Data Sources → Settings → Conversions API → Generate access token |
| `GA4_MEASUREMENT_ID` | server | GA4 → Admin → Data Streams → your stream (`G-XXXX`) |
| `GA4_API_SECRET` | server | GA4 → Admin → Data Streams → Measurement Protocol API secrets → Create |

After setting, pull locally:

```sh
vercel env pull .env.local
# then restore localhost URLs:
# NEXT_PUBLIC_ONBOARDING_API_URL="http://localhost:8080"
# NEXT_PUBLIC_ORG_ADMIN_URL="http://localhost:3000"
```

Without these vars set the code is a no-op (safe to deploy).

## GTM container setup

Inside the GTM container create:

1. **Consent settings** (default denied for EEA):
   - Built-in consent types: enable `ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage`.
   - Our app pushes `consent default` (denied) early and `consent_update` when the user accepts.
2. **GA4 Configuration tag**
   - Tag type: Google Analytics: GA4 Configuration
   - Measurement ID: `{{GA4 Measurement ID}}` (create a constant variable)
   - Trigger: All Pages
   - Consent: requires `analytics_storage`
3. **GA4 Event tag** (picks up our custom events)
   - Tag type: Google Analytics: GA4 Event
   - Configuration Tag: reference the config tag above
   - Event Name: `{{Event}}` (built-in variable — the `event` key from dataLayer)
   - Event Parameters: use dataLayer variables for `event_id`, `place_id`, `report_id`, etc.
   - Trigger: Custom Event, event name matches regex `^(search_submitted|map_scan_complete|website_prompt_.*|report_generated|branding_confirmed|booking_.*)$`
   - Consent: requires `analytics_storage`
4. **Meta Pixel base code** (via a Custom HTML tag or the Facebook Pixel community template)
   - Pixel ID: `{{Meta Pixel ID}}`
   - Trigger: All Pages
   - Consent: requires `ad_storage`
5. **Meta Pixel event tag** — fires the same events as custom events on the pixel.

## Verification

1. **GTM Preview mode** — connect to the preview URL; after clicking Accept on the consent banner, search a business. You should see `search_submitted` in the Tag Assistant tag list.
2. **GA4 DebugView** (Admin → DebugView). Events appear within ~30s with the correct `event_id`.
3. **Meta Events Manager → Test Events**. Both browser and server events appear. Dedup ratio should show "Deduplicated: yes" once pairing is established.
4. **Server-only test** — block GTM in DevTools (Request Blocking → `googletagmanager.com`). The server event in Meta Test Events still arrives.
5. **Consent gating** — clear localStorage, reload, verify no `/api/track` POST fires until Accept is clicked.

## Adding a new event

1. Add the event to the union in `src/lib/tracking/events.ts`.
2. Call `track({ name: 'new_event', props: {...} })` from the relevant client component.
3. (Optional) Add a trigger for it in GTM if it's not covered by the regex in the GA4 Event tag.
4. (Optional — for Meta standard events) Map it in `STANDARD_EVENT_MAP` in `src/lib/tracking/meta-capi.ts`.
