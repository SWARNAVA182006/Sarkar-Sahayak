import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import axios from 'axios';
import '../styles/SchemeDetail.css';

interface SchemeData {
  scheme_id: string;
  scheme_name: string;
  ministry?: string;
  target_beneficiaries?: string[];
  benefits?: string[];
  eligibility_criteria?: any[];
  application_steps?: string[];
  documents_required?: string[];
  official_url?: string;
}

function SchemeDetail() {
  const { schemeId } = useParams();
  const navigate = useNavigate();
  const [scheme, setScheme] = useState<SchemeData | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    loadSchemeDetails();
  }, [schemeId]);

  const loadSchemeDetails = async () => {
    try {
      setIsLoading(true);
      
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.example.com/prod';
      const language = sessionStorage.getItem('selectedLanguage') || 'Hindi';

      // Call Phase 3 explain API
      const response = await axios.post(
        `${apiUrl}/explain`,
        {
          scheme_id: schemeId,
          language,
          include_voice: true,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      setScheme(response.data.scheme);
      setExplanation(response.data.explanation);
      setAudioUrl(response.data.voice?.audio_url || null);
    } catch (err) {
      console.error('Failed to load scheme details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      setIsPlayingAudio(true);
      audio.play();
      audio.onended = () => setIsPlayingAudio(false);
    }
  };

  if (isLoading) {
    return (
      <div className="scheme-detail-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading scheme details...</p>
        </div>
      </div>
    );
  }

  if (!scheme) {
    return (
      <div className="scheme-detail-container">
        <div className="error">
          <p>Scheme not found</p>
          <button onClick={() => navigate('/results')} className="btn-primary">
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="scheme-detail-container">
      <header className="detail-header">
        <button onClick={() => navigate('/results')} className="btn-back">
          ← Back to Results
        </button>
      </header>

      <div className="scheme-content">
        <div className="scheme-title">
          <h1>{scheme.scheme_name}</h1>
          {scheme.ministry && <p className="ministry">{scheme.ministry}</p>}
        </div>

        <div className="explanation-section">
          <h2>Explanation</h2>
          <p className="explanation-text">{explanation}</p>
          
          {audioUrl && (
            <button
              className="btn-audio"
              onClick={playAudio}
              disabled={isPlayingAudio}
            >
              {isPlayingAudio ? '🔊 Playing...' : '🔊 Listen in Hindi'}
            </button>
          )}
        </div>

        {scheme.benefits && scheme.benefits.length > 0 && (
          <div className="section">
            <h2>Benefits</h2>
            <ul>
              {scheme.benefits.map((benefit, index) => (
                <li key={index}>{benefit}</li>
              ))}
            </ul>
          </div>
        )}

        {scheme.eligibility_criteria && scheme.eligibility_criteria.length > 0 && (
          <div className="section">
            <h2>Eligibility Criteria</h2>
            <ul>
              {scheme.eligibility_criteria.map((criteria, index) => (
                <li key={index}>
                  {criteria.field}: {criteria.operator} {criteria.value}
                </li>
              ))}
            </ul>
          </div>
        )}

        {scheme.documents_required && scheme.documents_required.length > 0 && (
          <div className="section">
            <h2>Required Documents</h2>
            <ul>
              {scheme.documents_required.map((doc, index) => (
                <li key={index}>{doc}</li>
              ))}
            </ul>
          </div>
        )}

        {scheme.application_steps && scheme.application_steps.length > 0 && (
          <div className="section">
            <h2>How to Apply</h2>
            <ol>
              {scheme.application_steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {scheme.official_url && (
          <div className="section">
            <a
              href={scheme.official_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Visit Official Website →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default SchemeDetail;
