const generateBtn = document.getElementById('generateBtn');
const requirementEl = document.getElementById('requirement');
const countEl = document.getElementById('count');
const focusEl = document.getElementById('focus');
const errorMsg = document.getElementById('errorMsg');
const resultsSection = document.getElementById('resultsSection');
const resultsBody = document.getElementById('resultsBody');
const loadingOverlay = document.getElementById('loadingOverlay');
const exportBtn = document.getElementById('exportBtn');

let currentTestCases = [];

generateBtn.addEventListener('click', async () => {
  const requirement = requirementEl.value.trim();
  errorMsg.textContent = '';

  if (!requirement) {
    errorMsg.textContent = 'Please enter a requirement or user story first.';
    return;
  }

  setLoading(true);

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement,
        numberOfCases: countEl.value,
        focusAreas: focusEl.value,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong.');
    }

    currentTestCases = data.testCases || [];
    renderTable(currentTestCases);
  } catch (err) {
    errorMsg.textContent = err.message;
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  loadingOverlay.classList.toggle('hidden', !isLoading);
  generateBtn.disabled = isLoading;
}

function renderTable(testCases) {
  resultsBody.innerHTML = '';

  if (!testCases.length) {
    resultsSection.classList.add('hidden');
    errorMsg.textContent = 'No test cases were returned. Try rephrasing the requirement.';
    return;
  }

  testCases.forEach((tc) => {
    const tr = document.createElement('tr');
    const steps = Array.isArray(tc.steps) ? tc.steps.join(' → ') : (tc.steps || '');
    tr.innerHTML = `
      <td>${escapeHtml(tc.id || '')}</td>
      <td>${escapeHtml(tc.title || '')}</td>
      <td>${escapeHtml(tc.type || '')}</td>
      <td>${escapeHtml(tc.priority || '')}</td>
      <td>${escapeHtml(tc.preconditions || '')}</td>
      <td>${escapeHtml(steps)}</td>
      <td>${escapeHtml(tc.testData || '')}</td>
      <td>${escapeHtml(tc.expectedResult || '')}</td>
    `;
    resultsBody.appendChild(tr);
  });

  resultsSection.classList.remove('hidden');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

exportBtn.addEventListener('click', () => {
  if (!currentTestCases.length) return;

  const headers = ['ID', 'Title', 'Type', 'Priority', 'Preconditions', 'Steps', 'Test Data', 'Expected Result'];
  const rows = currentTestCases.map((tc) => [
    tc.id || '',
    tc.title || '',
    tc.type || '',
    tc.priority || '',
    tc.preconditions || '',
    Array.isArray(tc.steps) ? tc.steps.join(' | ') : (tc.steps || ''),
    tc.testData || '',
    tc.expectedResult || '',
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'test-cases.csv';
  a.click();
  URL.revokeObjectURL(url);
});

function csvEscape(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
