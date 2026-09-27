# AI QA Test Case Generator 

A web app: paste a requirement or user story, and Google's Gemini API generates a structured set of test cases (positive, negative, edge, security) which you can view in a table and export as CSV.

## Project structure
```
qa-testcase-generator/
├── server.js           # Express server + Gemini API call
├── package.json
├── public/
│   ├── index.html        # UI
│   ├── style.css
│   └── script.js         # Frontend logic (calls /api/generate)
└── README.md
```
