import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import axios from 'axios';
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
    const language = sessionStorage.getItem('selectedLanguage') || 'Hindi';

    if (!query) {
      navigate('/');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get auth token
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      // Call Phase 2 semantic matching API
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.example.com/prod';
      
      const response = await axios.post(
        `${apiUrl}/match`,
        {
          query,
          language,
          use_cache: true,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      setSchemes(response.data.matched_schemes || []);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.response?.data?.message || 'Failed to search schemes. Please try again.');
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
