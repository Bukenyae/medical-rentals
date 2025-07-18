import React, { useState } from 'react';
import FileUploader from './FileUploader';

interface BookingDetailsProps {
  bookingId: string;
  isOwner: boolean; // Whether the current user is the property owner
}

const BookingDetails: React.FC<BookingDetailsProps> = ({ bookingId, isOwner }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'documents'>('details');
  const [error, setError] = useState<string | null>(null);

  const handleUploadComplete = (path: string) => {
    console.log('Upload completed:', path);
    // You could update the booking details here if needed
  };

  const handleError = (error: Error) => {
    setError(error.message);
    setTimeout(() => setError(null), 5000); // Clear error after 5 seconds
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-6">Booking Details</h1>
      
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
            onClick={() => setActiveTab('documents')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'documents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Documents
          </button>
        </nav>
      </div>
      
      {/* Tab content */}
      <div>
        {activeTab === 'details' && (
          <div>
            {/* Booking details content will go here */}
            <p>Booking details content</p>
          </div>
        )}
        
        {activeTab === 'documents' && (
          <div>
            <h2 className="text-lg font-medium mb-4">Booking Documents</h2>
            <p className="text-sm text-gray-500 mb-4">
              {isOwner 
                ? 'Upload and manage documents related to this booking. Both you and the guest can view these documents.'
                : 'View and upload documents related to your booking. Both you and the property owner can view these documents.'}
            </p>
            <FileUploader
              type="document"
              entityId={bookingId}
              onUploadComplete={handleUploadComplete}
              onError={handleError}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingDetails;