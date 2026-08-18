import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { ExtractedJobFields } from "@/lib/types";

// POST /api/extract
// Body: { text: string }  -> raw pasted job post text
// Returns: ExtractedJobFields (strict JSON, guaranteed shape via responseSchema)
//
// Uses Gemini's free tier. Override with GEMINI_MODEL if Google changes model
// names again. Requires GEMINI_API_KEY in .env.local; see .env.example.

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    company: { type: SchemaType.STRING, nullable: true },
    position: { type: SchemaType.STRING, nullable: true },
    location: { type: SchemaType.STRING, nullable: true },
    remote_type: {
      type: SchemaType.STRING,
      enum: ["remote", "hybrid", "onsite"],
      nullable: true,
    },
    tech_stack: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    experience_required: { type: SchemaType.STRING, nullable: true },
    salary_range: { type: SchemaType.STRING, nullable: true },
    contact_person: { type: SchemaType.STRING, nullable: true },
    source: { type: SchemaType.STRING, nullable: true },
  },
  required: [
    "company",
    "position",
    "location",
    "remote_type",
    "tech_stack",
    "experience_required",
    "salary_range",
    "contact_person",
    "source",
  ],
};

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length < 20) {
      return NextResponse.json(
        { error: "Please paste the full job post text (too short to extract from)." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const prompt = `You extract structured data from job postings. Read the job post text below and
extract the requested fields. Rules:
- Only use information explicitly present in the text. Do not invent or guess.
- If a field isn't mentioned, return null for it (or an empty array for tech_stack).
- "location" is only the physical job place/city/region mentioned in the post
  (for example "Sousse", "Tunis", "Monastir", "Paris", "France"). Do not put
  "remote", "hybrid", or "onsite" in location.
- "remote_type" is the work setup only. It must be exactly one of: remote, hybrid, onsite.
  Use "remote" for fully remote roles, "hybrid" for hybrid roles, and "onsite" for on-site
  office roles. If genuinely unclear, return null.
- "tech_stack" should be a short list of concrete technologies/tools/languages mentioned
  (e.g. ["React", "Node.js", "PostgreSQL"]), not soft skills.
- "experience_required" should be a short phrase (e.g. "2+ years" or "Entry level").
- "source" is the application method/platform. Return the place where the user found
  or applies to the role, such as "LinkedIn", "Company Website", "Referral", "Indeed",
  or "Other". If no application method/platform is mentioned or obvious, return null.

JOB POST TEXT:
"""
${text.slice(0, 12000)}
"""`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const parsed: ExtractedJobFields = JSON.parse(raw);

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown extraction error.";
    console.error("Extraction error:", err);
    return NextResponse.json(
      {
        error: message.includes("API key")
          ? "Gemini rejected the API key. Check GEMINI_API_KEY in .env.local."
          : message.includes("model") || message.includes("Not Found")
            ? "Gemini model is unavailable. Set GEMINI_MODEL=gemini-3.6-flash in .env.local or update the model name."
            : "Failed to extract fields. You can still fill the form manually.",
      },
      { status: 500 }
    );
  }
}
