const { google } = require('googleapis');
require('dotenv').config();

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents'
];

const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// If we have a refresh token (we should for offline access), set it.
if (process.env.GOOGLE_REFRESH_TOKEN) {
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
}

const googleSheets = google.sheets({ version: 'v4', auth });
const googleDrive = google.drive({ version: 'v3', auth });
const googleDocs = google.docs({ version: 'v1', auth });

module.exports = {
    auth,
    googleSheets,
    googleDrive,
    googleDocs,
    SHEET_ID: process.env.GOOGLE_SHEET_ID,
    FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID
};
