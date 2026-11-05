const FOLDER_NAME = 'Personal Khata Book';
const FILE_NAME = 'personal_khata_data.json';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';

class DriveService {
  constructor() {
    try {
      this.accessToken = localStorage.getItem('khata_google_token') || null;
      this.tokenExpiry = Number(localStorage.getItem('khata_google_token_expiry')) || 0;
      const rawUser = localStorage.getItem('khata_google_user');
      this.user = (rawUser && rawUser !== 'undefined' && rawUser !== 'null') ? JSON.parse(rawUser) : null;
      this.clientId = (import.meta.env?.VITE_GOOGLE_CLIENT_ID || localStorage.getItem('khata_google_client_id') || '').trim();
    } catch (e) {
      console.warn('Failed to read auth state from localStorage:', e);
      this.accessToken = null;
      this.tokenExpiry = 0;
      this.user = null;
      this.clientId = (import.meta.env?.VITE_GOOGLE_CLIENT_ID || '').trim();
    }
    this.tokenClient = null;
  }

  setClientId(clientId) {
    this.clientId = (clientId || '').trim();
    localStorage.setItem('khata_google_client_id', this.clientId);
    this.tokenClient = null;
  }

  getClientId() {
    return this.clientId;
  }

  isAuthenticated() {
    return !!this.accessToken && Date.now() < this.tokenExpiry;
  }

  getUser() {
    return this.user;
  }

  initTokenClient(onSuccess, onError) {
    if (!window.google?.accounts?.oauth2) {
      onError?.(new Error('Google Identity Services SDK is not loaded yet. Check your connection.'));
      return;
    }

    if (!this.clientId) {
      return;
    }

    try {
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: SCOPES,
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            onError?.(new Error(tokenResponse.error));
            return;
          }

          // Check if Drive scope was granted
          const grantedScopes = tokenResponse.scope || '';
          if (!grantedScopes.includes('drive')) {
            console.warn('User did not grant Google Drive permissions:', grantedScopes);
          }

          this.accessToken = tokenResponse.access_token;
          this.tokenExpiry = Date.now() + (Number(tokenResponse.expires_in) || 3600) * 1000;
          localStorage.setItem('khata_google_token', this.accessToken);
          localStorage.setItem('khata_google_token_expiry', this.tokenExpiry.toString());

          // Fetch user profile
          try {
            const user = await this.fetchUserProfile();
            this.user = user;
            localStorage.setItem('khata_google_user', JSON.stringify(user));
            onSuccess?.(user);
          } catch (err) {
            console.error('Failed to fetch user profile:', err);
            onSuccess?.(null);
          }
        },
      });
    } catch (e) {
      onError?.(e);
    }
  }

  signIn(onSuccess, onError) {
    // If real Google OAuth Client ID is configured, trigger official Google Account Chooser with consent prompt
    if (this.clientId) {
      this.initTokenClient(onSuccess, onError);
      if (this.tokenClient) {
        this.tokenClient.requestAccessToken({ prompt: 'consent select_account' });
        return;
      }
    }

    // Google strictly requires a Web Client ID to open its official login popup on the web
    onError?.(
      new Error(
        'Google OAuth Web Client ID is not configured. As the app developer, please set VITE_GOOGLE_CLIENT_ID in .env so Google can open the sign-in window.'
      )
    );
  }

  signOut() {
    if (this.accessToken && window.google?.accounts?.oauth2 && this.accessToken !== 'connected_drive_session') {
      try {
        window.google.accounts.oauth2.revoke(this.accessToken, () => {});
      } catch (e) {
        console.warn('Revoke failed:', e);
      }
    }
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.user = null;
    localStorage.removeItem('khata_google_token');
    localStorage.removeItem('khata_google_token_expiry');
    localStorage.removeItem('khata_google_user');
  }

  async fetchUserProfile() {
    if (this.accessToken === 'connected_drive_session') {
      return this.user;
    }
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });
    if (!res.ok) throw new Error('Failed to fetch user info');
    return await res.json();
  }

  async getOrCreateFolder() {
    if (this.accessToken === 'connected_drive_session') {
      return 'drive_folder_personal_khata';
    }

    const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${FOLDER_NAME}' and trashed = false`;
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&spaces=drive&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });

    if (!searchRes.ok) {
      let msg = searchRes.statusText;
      try {
        const errJson = await searchRes.json();
        msg = errJson.error?.message || msg;
      } catch (e) {}
      if (msg.includes('insufficient') || searchRes.status === 401 || searchRes.status === 403) {
        this.signOut();
        throw new Error('Google Drive permission required. Please click Sign in with Google again and check the Drive permission box.');
      }
      throw new Error(`Drive folder search failed: ${msg}`);
    }
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // Create folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!createRes.ok) {
      let msg = createRes.statusText;
      try {
        const errJson = await createRes.json();
        msg = errJson.error?.message || msg;
      } catch (e) {}
      throw new Error(`Failed to create Drive folder: ${msg}`);
    }
    const createData = await createRes.json();
    return createData.id;
  }

  async uploadKhataData(payload) {
    if (this.accessToken === 'connected_drive_session') {
      localStorage.setItem('personal_khata_drive_synced_payload', JSON.stringify(payload));
      return { id: 'simulated_drive_file_id', name: FILE_NAME };
    }

    const folderId = await this.getOrCreateFolder();

    // Check if file exists in folder (ordered by latest modified)
    const q = `name = '${FILE_NAME}' and '${folderId}' in parents and trashed = false`;
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&spaces=drive&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime)`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });

    if (!searchRes.ok) {
      let msg = searchRes.statusText;
      try {
        const errJson = await searchRes.json();
        msg = errJson.error?.message || msg;
      } catch (e) {}
      throw new Error(`Failed to search for Khata file in Drive: ${msg}`);
    }
    const searchData = await searchRes.json();
    const files = searchData.files || [];
    const existingFile = files[0];

    // Auto-clean any duplicate files so there is strictly ONE file in Google Drive
    if (files.length > 1) {
      for (let i = 1; i < files.length; i++) {
        fetch(`https://www.googleapis.com/drive/v3/files/${files[i].id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${this.accessToken}` }
        }).catch(e => console.warn('Cleaned up duplicate Drive file:', e));
      }
    }

    const fileContent = JSON.stringify(payload, null, 2);

    if (existingFile) {
      // Update existing file
      const updateRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: fileContent,
      });

      if (!updateRes.ok) {
        let msg = updateRes.statusText;
        try {
          const errJson = await updateRes.json();
          msg = errJson.error?.message || msg;
        } catch (e) {}
        throw new Error(`Failed to update Khata data in Drive: ${msg}`);
      }
      return await updateRes.json();
    } else {
      // Upload new multipart file
      const metadata = {
        name: FILE_NAME,
        parents: [folderId],
        mimeType: 'application/json',
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        closeDelimiter;

      const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });

      if (!createRes.ok) {
        let msg = createRes.statusText;
        try {
          const errJson = await createRes.json();
          msg = errJson.error?.message || msg;
        } catch (e) {}
        throw new Error(`Failed to upload Khata data to Drive: ${msg}`);
      }
      return await createRes.json();
    }
  }

  async downloadKhataData() {
    if (this.accessToken === 'connected_drive_session') {
      const saved = localStorage.getItem('personal_khata_drive_synced_payload') || localStorage.getItem('personal_khata_local_data');
      return saved ? JSON.parse(saved) : null;
    }

    const folderId = await this.getOrCreateFolder();

    const q = `name = '${FILE_NAME}' and '${folderId}' in parents and trashed = false`;
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&spaces=drive&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime)`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });

    if (!searchRes.ok) {
      let msg = searchRes.statusText;
      try {
        const errJson = await searchRes.json();
        msg = errJson.error?.message || msg;
      } catch (e) {}
      if (msg.includes('insufficient') || searchRes.status === 401 || searchRes.status === 403) {
        this.signOut();
        throw new Error('Google Drive permission required. Please sign in again and check the Drive permission box.');
      }
      throw new Error(`Failed to find Khata data in Drive: ${msg}`);
    }
    const searchData = await searchRes.json();
    const files = searchData.files || [];

    if (files.length === 0) {
      return null;
    }

    // Auto-clean any duplicate files so there is strictly ONE file in Google Drive
    if (files.length > 1) {
      for (let i = 1; i < files.length; i++) {
        fetch(`https://www.googleapis.com/drive/v3/files/${files[i].id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${this.accessToken}` }
        }).catch(e => console.warn('Cleaned up duplicate Drive file:', e));
      }
    }

    const fileId = files[0].id;
    const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });

    if (!downloadRes.ok) {
      let msg = downloadRes.statusText;
      try {
        const errJson = await downloadRes.json();
        msg = errJson.error?.message || msg;
      } catch (e) {}
      throw new Error(`Failed to download Khata data from Drive: ${msg}`);
    }
    return await downloadRes.json();
  }
}

export const driveService = new DriveService();
