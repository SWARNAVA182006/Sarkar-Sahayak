import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import Home from './pages/Home';
import Results from './pages/Results';
import SchemeDetail from './pages/SchemeDetail';
import Profile from './pages/Profile';
import { amplifyConfig } from './config/amplify';

// Configure Amplify
Amplify.configure(amplifyConfig);

function App() {
  return (
    <Authenticator.Provider>
      <Router>
        <div className="app">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/results" element={<Results />} />
            <Route path="/scheme/:schemeId" element={<SchemeDetail />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </div>
      </Router>
    </Authenticator.Provider>
  );
}

export default App;
