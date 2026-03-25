import Anthropic from "@anthropic-ai/sdk";
import type { ReviewAnalysis } from "@/lib/types";

const anthropic = new Anthropic();

const PROMPT = `You are a team lead at a hospitality business writing internal feed posts for your staff app. Write posts that sound natural, warm, and human — like a real manager would post. No corporate jargon.

You have review analysis data for the business. Use specific findings to make posts feel grounded and relevant.

Write exactly 4 posts as JSON:
- 2 for "desktop" platform (slightly longer, 2-3 sentences each)
- 2 for "mobile" platform (shorter, 1-2 sentences each)

Each desktop and mobile pair should cover different topics:
1. One celebrating a strength/positive finding from the reviews (channel: "Team Shoutouts")
2. One about a growth area or new initiative based on an opportunity (channel: "Announcements")

The mobile posts should NOT be shortened versions of the desktop posts — they should be completely different content covering the same themes.

Return valid JSON array:
[
  { "body": string, "channel": string, "platform": "desktop" | "mobile" }
]

Do NOT include any markdown, code fences, or explanation. Just the JSON array.`;

export async function POST(request: Request) {
  try {
    const { businessName, analysis } = (await request.json()) as {
      businessName: string;
      analysis: ReviewAnalysis;
    };

    if (!analysis) {
      return Response.json({ error: "analysis required" }, { status: 400 });
    }

    const context = `
Business: ${businessName}
Strengths: ${analysis.strengths.join(", ") || "N/A"}
Opportunities: ${analysis.opportunities.join(", ") || "N/A"}
Category breakdown: ${analysis.categoryBreakdown.map((c) => `${c.category} (${Math.round(c.percentage)}%, ${c.sentiment})`).join(", ") || "N/A"}
Headline: ${analysis.headline}
Summary: ${analysis.body}
Total reviews analyzed: ${analysis.totalReviewsAnalyzed}
Positive: ${analysis.positiveCount}, Negative: ${analysis.negativeCount}
`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `${PROMPT}\n\nHere is the review analysis data:\n${context}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      return Response.json({ posts: [] });
    }

    const posts = JSON.parse(jsonMatch[0]);
    return Response.json({ posts });
  } catch (err) {
    console.error("posts generation error:", err);
    return Response.json({ posts: [] });
  }
}
