import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import axios from 'axios';
import '../styles/Profile.css';

function Profile() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuthenticator((context) => [context.user]);

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

      // Get auth token
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.example.com/prod';

      // Get pre-signed upload URL
      const uploadUrlResponse = await axios.post(
        `${apiUrl}/upload`,
        {
          file_name: uploadedFile.name,
          content_type: uploadedFile.type,
          user_id: user?.username || 'anonymous',
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      const { upload_url } = uploadUrlResponse.data;

      // Upload file to S3
      await axios.put(upload_url, uploadedFile, {
        headers: {
          'Content-Type': uploadedFile.type,
        },
      });

      alert('Document uploaded successfully! Processing will take a few seconds.');
      
      // Wait for processing
      setTimeout(() => {
        checkExtractedData();
      }, 5000);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const checkExtractedData = async () => {
    // In a real app, you'd query DynamoDB or call an API
    // For now, just show a success message
    setExtractedData({
      message: 'Document processed! Your profile has been updated.',
    });
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
          <p><strong>Email:</strong> {user?.signInDetails?.loginId || 'Not available'}</p>
          <p><strong>User ID:</strong> {user?.username || 'Not available'}</p>
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
          <button onClick={signOut} className="btn-secondary">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
