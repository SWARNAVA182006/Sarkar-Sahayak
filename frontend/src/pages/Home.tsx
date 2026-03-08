import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import '../styles/Home.css';

const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi'];

function Home() {
  const [selectedLanguage, setSelectedLanguage] = useState('Hindi');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuthenticator((context) => [context.user]);

  const handleSearch = async () => {
    if (!query.trim()) {
      alert('Please enter your situation or requirements');
      return;
    }

    setIsLoading(true);
    
    // Store query and language in sessionStorage
    sessionStorage.setItem('searchQuery', query);
    sessionStorage.setItem('selectedLanguage', selectedLanguage);
    
    // Navigate to results page
    navigate('/results');
  };

  const handleVoiceInput = () => {
    // Web Speech API for voice input
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = selectedLanguage === 'Hindi' ? 'hi-IN' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        alert('Voice input failed. Please try typing instead.');
      };

      recognition.start();
    } else {
      alert('Voice input is not supported in your browser. Please type your query.');
    }
  };

  return (
    <div className="home-container">
      <header className="header">
        <div className="logo">
          <h1>🇮🇳 GovSaathi AI</h1>
          <p>सरकारी योजना खोजें</p>
        </div>
        {user && (
          <div className="user-menu">
            <button onClick={() => navigate('/profile')} className="btn-secondary">
              Profile
            </button>
            <button onClick={signOut} className="btn-secondary">
              Sign Out
            </button>
          </div>
        )}
      </header>

      <main className="main-content">
        <div className="hero">
          <h2>Find Government Schemes You're Eligible For</h2>
          <p>Tell us about yourself in your own language, and we'll help you discover welfare schemes</p>
        </div>

        <div className="search-section">
          <div className="language-selector">
            <label>Select Language / भाषा चुनें:</label>
            <div className="language-buttons">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  className={`lang-btn ${selectedLanguage === lang ? 'active' : ''}`}
                  onClick={() => setSelectedLanguage(lang)}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div className="input-section">
            <textarea
              className="query-input"
              placeholder={
                selectedLanguage === 'Hindi'
                  ? 'अपने बारे में बताएं... (उदाहरण: मैं महाराष्ट्र में एक छोटा किसान हूं)'
                  : 'Tell us about yourself... (Example: I am a small farmer in Maharashtra)'
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
            />
            
            <div className="input-actions">
              <button
                className="btn-voice"
                onClick={handleVoiceInput}
                title="Voice input"
              >
                🎤 Voice Input
              </button>
              
              <button
                className="btn-primary"
                onClick={handleSearch}
                disabled={isLoading}
              >
                {isLoading ? 'Searching...' : 'Find Schemes'}
              </button>
            </div>
          </div>
        </div>

        <div className="features">
          <div className="feature-card">
            <span className="feature-icon">🤖</span>
            <h3>AI-Powered Matching</h3>
            <p>Advanced semantic search finds the best schemes for you</p>
          </div>
          
          <div className="feature-card">
            <span className="feature-icon">🗣️</span>
            <h3>Voice Support</h3>
            <p>Listen to scheme explanations in Hindi</p>
          </div>
          
          <div className="feature-card">
            <span className="feature-icon">📄</span>
            <h3>Document Upload</h3>
            <p>Auto-fill your profile from Aadhaar or ration card</p>
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>Built with ❤️ for the people of India | Powered by AWS & GenAI</p>
      </footer>
    </div>
  );
}

export default Home;
