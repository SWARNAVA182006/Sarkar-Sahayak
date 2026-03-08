import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Temporarily commented out for local development
// import { useAuthenticator } from '@aws-amplify/ui-react';
// import { fetchAuthSession } from 'aws-amplify/auth';
// import axios from 'axios';
import '../styles/Profile.css';

function Profile() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const navigate = useNavigate();
  // Temporarily removed for local development
  // const { user, signOut } = useAuthenticator((context) => [context.user]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) return;

    try {
      setIsUploading(true);

      // Temporarily simulate file upload for local development
      // In production, this would upload to S3 via the API
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate upload delay

      // Mock extracted data for demo
      setExtractedData({
        name: "Demo User",
        age: 30,
        income: "₹50,000/month",
        location: "Mumbai, Maharashtra",
        category: "General",
        documents: ["Aadhaar Card", "PAN Card"]
      });

      alert('Demo: File uploaded successfully! (Backend not deployed yet)');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Demo: Upload failed (Backend not deployed yet)');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="profile-container">
      <header className="profile-header">
        <button onClick={() => navigate('/')} className="btn-back">
          ← Back to Home
        </button>
        <h1>My Profile</h1>
      </header>

      <div className="profile-content">
        <div className="user-info">
          <h2>User Information</h2>
          <p><strong>Email:</strong> demo@govsaathi.ai</p>
          <p><strong>User ID:</strong> demo-user</p>
          <p><strong>Status:</strong> Demo Mode (Backend not deployed)</p>
        </div>

        <div className="document-upload">
          <h2>Upload Document</h2>
          <p>Upload your Aadhaar card or ration card to auto-fill your profile</p>
          
          <div className="upload-section">
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileSelect}
              className="file-input"
            />
            
            {uploadedFile && (
              <div className="file-preview">
                <p>Selected: {uploadedFile.name}</p>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="btn-primary"
                >
                  {isUploading ? 'Uploading...' : 'Upload & Process'}
                </button>
              </div>
            )}
          </div>

          {extractedData && (
            <div className="extracted-data">
              <h3>✓ {extractedData.message}</h3>
            </div>
          )}
        </div>

        <div className="actions">
          <p className="demo-notice">Demo Mode: Authentication not required</p>
        </div>
      </div>
    </div>
  );
}

export default Profile;
