"""
Custom Django Storage Backend for Google Drive using google-api-python-client
"""

import os
import io
import json
import mimetypes
from datetime import datetime
from django.core.files.base import File
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload
from googleapiclient.errors import HttpError


@deconstructible
class GoogleDriveStorage(Storage):
    """
    Custom storage backend for Google Drive.
    Implements Django's Storage interface for seamless integration.
    """
    
    def __init__(self):
        """
        Initialize Google Drive storage backend.
        Reads credentials and folder ID from environment variables.
        """
        # Get credentials JSON from environment variable
        credentials_json = os.getenv('GOOGLE_DRIVE_CREDENTIALS_JSON')
        if not credentials_json:
            raise ValueError("GOOGLE_DRIVE_CREDENTIALS_JSON environment variable is not set")
        
        # Parse credentials
        try:
            credentials_dict = json.loads(credentials_json)
        except json.JSONDecodeError:
            # If it's a file path instead of JSON string
            if os.path.isfile(credentials_json):
                with open(credentials_json, 'r') as f:
                    credentials_dict = json.load(f)
            else:
                raise ValueError("Invalid GOOGLE_DRIVE_CREDENTIALS_JSON format")
        
        # Get folder ID from environment
        self.folder_id = os.getenv('GDRIVE_FOLDER_ID')
        if not self.folder_id:
            raise ValueError("GDRIVE_FOLDER_ID environment variable is not set")
        
        # Define required scopes
        scopes = ['https://www.googleapis.com/auth/drive.file']
        
        # Create credentials
        self.credentials = service_account.Credentials.from_service_account_info(
            credentials_dict,
            scopes=scopes
        )
        
        # Build the Google Drive service
        self.service = build('drive', 'v3', credentials=self.credentials)
        
        # Cache for file metadata
        self._file_cache = {}
    
    def _get_file_by_name(self, name):
        """
        Search for a file by name in the specified folder.
        
        Args:
            name: The file name to search for
            
        Returns:
            File metadata dict or None if not found
        """
        # Check cache first
        if name in self._file_cache:
            return self._file_cache[name]
        
        try:
            query = f"name='{name}' and '{self.folder_id}' in parents and trashed=false"
            results = self.service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name, size, createdTime, modifiedTime, mimeType)',
                pageSize=1
            ).execute()
            
            files = results.get('files', [])
            if files:
                file_metadata = files[0]
                self._file_cache[name] = file_metadata
                return file_metadata
            return None
        except HttpError as e:
            print(f"Error searching for file {name}: {e}")
            return None
    
    def _save(self, name, content):
        """
        Save a file to Google Drive.
        
        Args:
            name: The name of the file
            content: File content (Django File object)
            
        Returns:
            The name of the saved file
        """
        # Check if file already exists
        existing_file = self._get_file_by_name(name)
        
        # Determine MIME type
        mime_type, _ = mimetypes.guess_type(name)
        if mime_type is None:
            mime_type = 'application/octet-stream'
        
        # Prepare file content
        if hasattr(content, 'read'):
            content.seek(0)
            file_content = content.read()
        else:
            file_content = content
        
        media = MediaIoBaseUpload(
            io.BytesIO(file_content),
            mimetype=mime_type,
            resumable=True
        )
        
        try:
            if existing_file:
                # Update existing file
                file_id = existing_file['id']
                updated_file = self.service.files().update(
                    fileId=file_id,
                    media_body=media
                ).execute()
                
                # Update cache
                self._file_cache[name] = updated_file
            else:
                # Create new file
                file_metadata = {
                    'name': name,
                    'parents': [self.folder_id]
                }
                
                uploaded_file = self.service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields='id, name, size, createdTime, modifiedTime, mimeType'
                ).execute()
                
                # Make file publicly accessible (optional)
                self._make_file_public(uploaded_file['id'])
                
                # Update cache
                self._file_cache[name] = uploaded_file
            
            return name
        except HttpError as e:
            raise IOError(f"Error uploading file to Google Drive: {e}")
    
    def _make_file_public(self, file_id):
        """
        Make a file publicly accessible.
        
        Args:
            file_id: The Google Drive file ID
        """
        try:
            permission = {
                'type': 'anyone',
                'role': 'reader'
            }
            self.service.permissions().create(
                fileId=file_id,
                body=permission
            ).execute()
        except HttpError as e:
            print(f"Warning: Could not make file public: {e}")
    
    def _open(self, name, mode='rb'):
        """
        Open a file from Google Drive.
        
        Args:
            name: The name of the file
            mode: The file open mode (default: 'rb')
            
        Returns:
            File-like object
        """
        file_metadata = self._get_file_by_name(name)
        
        if not file_metadata:
            raise FileNotFoundError(f"File {name} not found in Google Drive")
        
        try:
            request = self.service.files().get_media(fileId=file_metadata['id'])
            file_content = io.BytesIO()
            downloader = MediaIoBaseDownload(file_content, request)
            
            done = False
            while not done:
                status, done = downloader.next_chunk()
            
            file_content.seek(0)
            return File(file_content, name=name)
        except HttpError as e:
            raise IOError(f"Error downloading file from Google Drive: {e}")
    
    def delete(self, name):
        """
        Delete a file from Google Drive.
        
        Args:
            name: The name of the file to delete
        """
        file_metadata = self._get_file_by_name(name)
        
        if file_metadata:
            try:
                self.service.files().delete(fileId=file_metadata['id']).execute()
                # Remove from cache
                if name in self._file_cache:
                    del self._file_cache[name]
            except HttpError as e:
                raise IOError(f"Error deleting file from Google Drive: {e}")
    
    def exists(self, name):
        """
        Check if a file exists in Google Drive.
        
        Args:
            name: The name of the file
            
        Returns:
            True if file exists, False otherwise
        """
        return self._get_file_by_name(name) is not None
    
    def url(self, name):
        """
        Generate a public URL for the file.
        
        Args:
            name: The name of the file
            
        Returns:
            Public URL string
        """
        file_metadata = self._get_file_by_name(name)
        
        if not file_metadata:
            raise FileNotFoundError(f"File {name} not found in Google Drive")
        
        file_id = file_metadata['id']
        # Return direct download link
        return f"https://drive.google.com/uc?export=view&id={file_id}"
    
    def size(self, name):
        """
        Get the size of a file.
        
        Args:
            name: The name of the file
            
        Returns:
            File size in bytes
        """
        file_metadata = self._get_file_by_name(name)
        
        if not file_metadata:
            raise FileNotFoundError(f"File {name} not found in Google Drive")
        
        return int(file_metadata.get('size', 0))
    
    def listdir(self, path):
        """
        List the contents of the specified folder.
        
        Args:
            path: The folder path (not used, lists root folder)
            
        Returns:
            Tuple of (directories, files)
        """
        try:
            query = f"'{self.folder_id}' in parents and trashed=false"
            results = self.service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name, mimeType)',
                pageSize=1000
            ).execute()
            
            files = results.get('files', [])
            directories = []
            file_names = []
            
            for file in files:
                if file['mimeType'] == 'application/vnd.google-apps.folder':
                    directories.append(file['name'])
                else:
                    file_names.append(file['name'])
            
            return directories, file_names
        except HttpError as e:
            raise IOError(f"Error listing directory: {e}")
    
    def get_created_time(self, name):
        """
        Get the creation time of a file.
        
        Args:
            name: The name of the file
            
        Returns:
            datetime object
        """
        file_metadata = self._get_file_by_name(name)
        
        if not file_metadata:
            raise FileNotFoundError(f"File {name} not found in Google Drive")
        
        created_time = file_metadata.get('createdTime')
        if created_time:
            return datetime.fromisoformat(created_time.replace('Z', '+00:00'))
        return None
    
    def get_modified_time(self, name):
        """
        Get the modification time of a file.
        
        Args:
            name: The name of the file
            
        Returns:
            datetime object
        """
        file_metadata = self._get_file_by_name(name)
        
        if not file_metadata:
            raise FileNotFoundError(f"File {name} not found in Google Drive")
        
        modified_time = file_metadata.get('modifiedTime')
        if modified_time:
            return datetime.fromisoformat(modified_time.replace('Z', '+00:00'))
        return None
    
    def get_accessed_time(self, name):
        """
        Get the access time of a file.
        Note: Google Drive doesn't track access time, returns modified time instead.
        
        Args:
            name: The name of the file
            
        Returns:
            datetime object
        """
        return self.get_modified_time(name)
    
    def get_available_name(self, name, max_length=None):
        """
        Get an available name for the file.
        If file exists, append a number to make it unique.
        
        Args:
            name: The desired file name
            max_length: Maximum length of the name
            
        Returns:
            Available file name
        """
        if not self.exists(name):
            return name
        
        # File exists, find an available name
        dir_name, file_name = os.path.split(name)
        file_root, file_ext = os.path.splitext(file_name)
        count = 1
        
        while self.exists(name):
            name = os.path.join(dir_name, f"{file_root}_{count}{file_ext}")
            count += 1
            
            if max_length and len(name) > max_length:
                raise ValueError(f"File name too long: {name}")
        
        return name

