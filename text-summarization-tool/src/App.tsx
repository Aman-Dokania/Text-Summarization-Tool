import { useState } from 'react';
import './App.css';

interface SummaryResponse {
  summary: string;
}

interface SummaryFormat {
  style: 'paragraphs' | 'bullets' | 'numbered';
  isBold?: boolean;
  isItalic?: boolean;
}

function App() {
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryFormat, setSummaryFormat] = useState<SummaryFormat>({
    style: 'paragraphs',
    isBold: false,
    isItalic: false
  });

  const splitIntoSentences = (text: string): string[] => {
    return text.match(/[^.!?]+[.!?]/g) || [text];
  };

  const handleSummarize = async () => {
    setIsLoading(true);
    setError(null);
    setIsEditing(false);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const res = await fetch('http://localhost:8000/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, num_sentences: 3 }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Backend error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json() as SummaryResponse;
      let formattedSummary = data.summary || 'No summary returned.';
      const sentences = splitIntoSentences(formattedSummary).map(s => s.trim());

      if (summaryFormat.style === 'bullets') {
        formattedSummary = sentences.map(s => `• ${s}`).join('\n');
      } else if (summaryFormat.style === 'numbered') {
        formattedSummary = sentences.map((s, i) => `${i + 1}. ${s}`).join('\n');
      } else {
        formattedSummary = sentences.join(' ');
      }

      setSummary(formattedSummary);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      setSummary('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setInputText(event.target?.result as string);
      };
      reader.onerror = () => {
        setError('Failed to read the file.');
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="container">
      <h1>Text Summarization Tool</h1>

      <div className="input-section">
        <label htmlFor="text-input">Paste your text here:</label>
        <textarea
          id="text-input"
          rows={8}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Paste or type your text here..."
        />

        <div className="file-upload">
          <input type="file" accept=".txt" onChange={handleFileUpload} />
          {fileName && <span>Loaded: {fileName}</span>}
        </div>

        <div className="format-options">
          <div className="format-group">
            <label>Style:</label>
            <select
              value={summaryFormat.style}
              onChange={(e) =>
                setSummaryFormat(prev => ({
                  ...prev,
                  style: e.target.value as SummaryFormat['style']
                }))
              }
            >
              <option value="paragraphs">Paragraphs</option>
              <option value="bullets">Bullet Points</option>
              <option value="numbered">Numbered List</option>
            </select>
          </div>

          <div className="format-group">
            <button
              className={`format-btn ${summaryFormat.isBold ? 'active' : ''}`}
              onClick={() =>
                setSummaryFormat(prev => ({ ...prev, isBold: !prev.isBold }))
              }
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button
              className={`format-btn ${summaryFormat.isItalic ? 'active' : ''}`}
              onClick={() =>
                setSummaryFormat(prev => ({ ...prev, isItalic: !prev.isItalic }))
              }
              title="Italic"
            >
              <em>I</em>
            </button>
          </div>
        </div>

        <button onClick={handleSummarize} disabled={!inputText.trim() || isLoading}>
          {isLoading ? 'Summarizing...' : 'Summarize'}
        </button>

        {error && <div className="error-message">Error: {error}</div>}
      </div>

      <div className="output-section">
        <h2>Summary</h2>
        {summary ? (
          isEditing ? (
            <textarea
              rows={6}
              value={summary}
              onChange={e => setSummary(e.target.value)}
              style={{
                fontWeight: summaryFormat.isBold ? 'bold' : 'normal',
                fontStyle: summaryFormat.isItalic ? 'italic' : 'normal'
              }}
              onBlur={() => setIsEditing(false)}
              autoFocus
            />
          ) : (
            <div
              className="summary-box"
              onClick={() => setIsEditing(true)}
              style={{
                whiteSpace: 'pre-wrap',
                fontWeight: summaryFormat.isBold ? 'bold' : 'normal',
                fontStyle: summaryFormat.isItalic ? 'italic' : 'normal',
                cursor: 'pointer'
              }}
            >
              {summary}
              <div className="edit-hint">(Click to edit)</div>
            </div>
          )
        ) : (
          <div className="summary-placeholder">Summary will appear here.</div>
        )}
      </div>
    </div>
  );
}

export default App;
