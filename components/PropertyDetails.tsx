import React, { useState } from 'react';
import FileUploader from './FileUploader';

interface PropertyDetailsProps {
  propertyId: string;
}

const PropertyDetails: React.FC<PropertyDetailsProps> = ({ propertyId }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'images' | 'receipts'>('details');
  const [error, setError] = useState<string | null>(null);

  const handleUploadComplete = (path: string) => {
    console.log('Upload completed:', path);
    // You could update the property details here if needed
  };

  const handleError = (error: Error) => {
    setError(error.message);
    setTimeout(() => setError(null), 5000); // Clear error after 5 seconds
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-6">Property Details</h1>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'images'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Images
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'receipts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Receipts
          </button>
        </nav>
      </div>
      
      {/* Tab content */}
      <div>
        {activeTab === 'details' && (
          <div>
            {/* Property details content will go here */}
            <p>Property details content</p>
          </div>
        )}
        
        {activeTab === 'images' && (
          <div>
            <h2 className="text-lg font-medium mb-4">Property Images</h2>
            <div className="mb-6">
              <h3 className="text-md font-medium mb-2">Public Images</h3>
              <p className="text-sm text-gray-500 mb-4">
                These images are visible to everyone browsing the property listing.
              </p>
              <FileUploader
                type="property-image"
                entityId={propertyId}
                isPublic={true}
                onUploadComplete={handleUploadComplete}
                onError={handleError}
              />
            </div>
            
            <div>
              <h3 className="text-md font-medium mb-2">Private Images</h3>
              <p className="text-sm text-gray-500 mb-4">
                These images are only visible to you and are not shown on the public listing.
              </p>
              <FileUploader
                type="property-image"
                entityId={propertyId}
                isPublic={false}
                onUploadComplete={handleUploadComplete}
                onError={handleError}
              />
            </div>
          </div>
        )}
        
        {activeTab === 'receipts' && (
          <div>
            <h2 className="text-lg font-medium mb-4">Property Receipts</h2>
            <p className="text-sm text-gray-500 mb-4">
              Upload and manage receipts for expenses related to this property.
            </p>
            <FileUploader
              type="receipt"
              entityId={propertyId}
              onUploadComplete={handleUploadComplete}
              onError={handleError}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyDetails;