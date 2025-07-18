import React, { useState, useRef } from 'react';
import { 
  uploadPropertyImage, 
  uploadPropertyReceipt, 
  uploadBookingDocument,
  getPropertyImages,
  getPropertyReceipts,
  getBookingDocuments,
  deletePropertyImage,
  deletePropertyReceipt,
  deleteBookingDocument,
  getPropertyImageUrl,
  getSignedReceiptUrl,
  getSignedDocumentUrl
} from '../lib/utils/storage-utils';
import { FileObject } from '@supabase/storage-js';

interface FileUploaderProps {
  type: 'property-image' | 'receipt' | 'document';
  entityId: string; // propertyId or bookingId
  onUploadComplete?: (path: string) => void;
  onError?: (error: Error) => void;
  isPublic?: boolean; // Only applicable for property images
}

const FileUploader: React.FC<FileUploaderProps> = ({
  type,
  entityId,
  onUploadComplete,
  onError,
  isPublic = true
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<FileObject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing files
  const loadFiles = async () => {
    setIsLoading(true);
    try {
      let result;
      
      switch (type) {
        case 'property-image':
          result = await getPropertyImages(entityId, isPublic);
          break;
        case 'receipt':
          result = await getPropertyReceipts(entityId);
          break;
        case 'document':
          result = await getBookingDocuments(entityId);
          break;
      }
      
      if (result.error) {
        throw result.error;
      }
      
      if (result.data) {
        setFiles(result.data);
      }
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      } else {
        console.error('Error loading files:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load files on component mount
  React.useEffect(() => {
    loadFiles();
  }, [entityId, type, isPublic]);

  // Handle file upload
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    
    setIsUploading(true);
    try {
      let result;
      
      switch (type) {
        case 'property-image':
          result = await uploadPropertyImage(entityId, selectedFile, isPublic);
          break;
        case 'receipt':
          result = await uploadPropertyReceipt(entityId, selectedFile);
          break;
        case 'document':
          result = await uploadBookingDocument(entityId, selectedFile);
          break;
      }
      
      if (result.error) {
        throw result.error;
      }
      
      if (result.path && onUploadComplete) {
        onUploadComplete(result.path);
      }
      
      // Reload files after successful upload
      await loadFiles();
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      } else {
        console.error('Error uploading file:', error);
      }
    } finally {
      setIsUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle file deletion
  const handleDelete = async (fileName: string) => {
    try {
      let result;
      
      switch (type) {
        case 'property-image':
          result = await deletePropertyImage(entityId, fileName, isPublic);
          break;
        case 'receipt':
          result = await deletePropertyReceipt(entityId, fileName);
          break;
        case 'document':
          result = await deleteBookingDocument(entityId, fileName);
          break;
      }
      
      if (result.error) {
        throw result.error;
      }
      
      // Reload files after successful deletion
      await loadFiles();
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      } else {
        console.error('Error deleting file:', error);
      }
    }
  };

  // Get file URL
  const getFileUrl = async (fileName: string): Promise<string> => {
    try {
      switch (type) {
        case 'property-image':
          return getPropertyImageUrl(entityId, fileName, isPublic);
        case 'receipt': {
          const result = await getSignedReceiptUrl(entityId, fileName);
          if (result.error) throw result.error;
          return result.url || '';
        }
        case 'document': {
          const result = await getSignedDocumentUrl(entityId, fileName);
          if (result.error) throw result.error;
          return result.url || '';
        }
        default:
          return '';
      }
    } catch (error) {
      console.error('Error getting file URL:', error);
      return '';
    }
  };

  // Get upload button text
  const getUploadButtonText = () => {
    switch (type) {
      case 'property-image':
        return 'Upload Property Image';
      case 'receipt':
        return 'Upload Receipt';
      case 'document':
        return 'Upload Document';
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {getUploadButtonText()}
        </label>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={isUploading}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
        {isUploading && (
          <div className="mt-2 text-sm text-gray-500">Uploading...</div>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500">Loading files...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {files.map((file) => (
            <div key={file.id} className="border rounded-md p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-medium truncate" title={file.name}>
                  {file.name}
                </div>
                <button
                  onClick={() => handleDelete(file.name)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
              {type === 'property-image' && (
                <img
                  src={getPropertyImageUrl(entityId, file.name, isPublic)}
                  alt={file.name}
                  className="w-full h-32 object-cover rounded"
                />
              )}
              {(type === 'receipt' || type === 'document') && (
                <button
                  onClick={async () => {
                    const url = await getFileUrl(file.name);
                    if (url) window.open(url, '_blank');
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View File
                </button>
              )}
              <div className="text-xs text-gray-500 mt-1">
                {new Date(file.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploader;