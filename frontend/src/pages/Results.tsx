import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Temporarily commented out for local development
// import { fetchAuthSession } from 'aws-amplify/auth';
// import axios from 'axios';
import '../styles/Results.css';

interface Scheme {
  scheme_id: string;
  scheme_name: string;
  ministry?: string;
  match_score: number;
  similarity_score?: number;
  explanation?: string;
}

function Results() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    searchSchemes();
  }, []);

  const searchSchemes = async () => {
    const query = sessionStorage.getItem('searchQuery');
    // const language = sessionStorage.getItem('selectedLanguage') || 'Hindi'; // Not used in demo

    if (!query) {
      navigate('/');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Temporarily simulate API call for local development
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay

      // Mock demo schemes data
      const mockSchemes: Scheme[] = [
        {
          scheme_id: 'pm-kisan',
          scheme_name: 'PM-KISAN',
          ministry: 'Ministry of Agriculture',
          match_score: 95,
          explanation: 'Direct income support scheme for farmers'
        },
        {
          scheme_id: 'ayushman-bharat',
          scheme_name: 'Ayushman Bharat',
          ministry: 'Ministry of Health',
          match_score: 88,
          explanation: 'Health insurance scheme for low-income families'
        },
        {
          scheme_id: 'mudra-loan',
          scheme_name: 'Mudra Loan Scheme',
          ministry: 'Ministry of Finance',
          match_score: 82,
          explanation: 'Loan scheme for small businesses and entrepreneurs'
        }
      ];

      setSchemes(mockSchemes);
    } catch (err) {
      setError('Demo: Failed to load schemes (Backend not deployed yet)');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  if (isLoading) {
    return (
      <div className="results-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Finding schemes for you...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-container">
        <div className="error">
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="results-container">
      <header className="results-header">
        <button onClick={() => navigate('/')} className="btn-back">
          ← Back
        </button>
        <h1>Your Matching Schemes</h1>
        <p>Found {schemes.length} schemes that match your profile</p>
      </header>

      <div className="schemes-grid">
        {schemes.map((scheme) => (
          <div
            key={scheme.scheme_id}
            className="scheme-card"
            onClick={() => navigate(`/scheme/${scheme.scheme_id}`)}
          >
            <div className="scheme-header">
              <h3>{scheme.scheme_name}</h3>
              <div
                className="match-badge"
                style={{ backgroundColor: getScoreColor(scheme.match_score) }}
              >
                {scheme.match_score}% Match
              </div>
            </div>
            
            {scheme.ministry && (
              <p className="ministry">{scheme.ministry}</p>
            )}
            
            {scheme.explanation && (
              <p className="explanation">{scheme.explanation}</p>
            )}
            
            <button className="btn-view">
              View Details →
            </button>
          </div>
        ))}
      </div>

      {schemes.length === 0 && (
        <div className="no-results">
          <p>No matching schemes found. Try providing more details about your situation.</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            New Search
          </button>
        </div>
      )}
    </div>
  );
}

export default Results;
