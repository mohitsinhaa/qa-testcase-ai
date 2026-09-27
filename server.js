require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.GEMINI_API_KEY) {
  console.warn(
    '\n[WARNING] GEMINI_API_KEY is not set. Get a free key at ' +
    'https://aistudio.google.com/app/apikey and set it in your .env file (local) ' +
    'or in Render > Environment (production) before generating test cases.\n'
  );
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// The system instruction tells Gemini how to behave as a QA analyst.
const SYSTEM_INSTRUCTION = `You are a senior QA Analyst with 10+ years of experience in manual and automated software testing.
Given a requirement, user story, or feature description, generate a thorough set of test cases.

Cover, where relevant:
- Positive (happy path) scenarios
- Negative scenarios (invalid input, error handling)
- Edge cases and boundary values
- UI/UX checks if applicable
- Security/permissions checks if applicable

Respond ONLY with valid JSON matching the provided schema. Do not include markdown fences or commentary.`;

// Structured output schema so Gemini returns clean, predictable JSON.
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    testCases: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          title: { type: 'STRING' },
          type: { type: 'STRING' },
          priority: { type: 'STRING' },
          preconditions: { type: 'STRING' },
          steps: { type: 'ARRAY', items: { type: 'STRING' } },
          testData: { type: 'STRING' },
          expectedResult: { type: 'STRING' },
        },
        required: ['id', 'title', 'type', 'priority', 'steps', 'expectedResult'],
      },
    },
  },
  required: ['testCases'],
};

app.post('/api/generate', async (req, res) => {
  try {
    const { requirement, numberOfCases, focusAreas } = req.body;

    if (!requirement || !requirement.trim()) {
      return res.status(400).json({ error: 'Please provide a requirement or user story.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Ask the admin to set it.' });
    }

    const count = Math.min(Math.max(parseInt(numberOfCases, 10) || 8, 1), 30);
    const focus = (focusAreas && focusAreas.trim())
      ? `Pay special attention to these focus areas: ${focusAreas.trim()}.`
      : '';

    // This is the "few lines" sent to Gemini describing exactly what to do with the requirement.
    const userPrompt = `Requirement / User Story:
"""
${requirement.trim()}
"""

Generate approximately ${count} test cases for the above requirement. ${focus}`;

    const body = {
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    };

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      const message = data?.error?.message || `Gemini API returned status ${response.status}`;
      return res.status(response.status >= 500 ? 502 : response.status).json({ error: message });
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return res.status(502).json({ error: 'Gemini returned an empty response. Please try again.' });
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      return res.status(502).json({ error: 'AI returned an unparseable response. Please try again.' });
    }

    const testCases = Array.isArray(parsed.testCases) ? parsed.testCases : [];
    res.json({ testCases });
  } catch (err) {
    console.error('Error generating test cases:', err);
    res.status(500).json({ error: `Failed to generate test cases: ${err.message || 'Unknown error'}` });
  }
});

// Health check endpoint (useful for Render)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`QA Test Case Generator running on port ${PORT}`);
});
