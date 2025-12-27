const { google } = require('googleapis');
const readline = require('readline');
const http = require('http');
const url = require('url');
const opener = require('child_process');
const dotenv = require('dotenv');

dotenv.config();

/**
 * This script helps generate a Refresh Token for Google Drive API.
 * Usage: node setup-oauth.js
 */

const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/oauth2callback';
const SCOPES = ['https://www.googleapis.com/auth/drive'];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function getCredentials() {
    let clientId = process.env.GOOGLE_CLIENT_ID;
    let clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    console.log('\n--- Google Drive OAuth Setup ---\n');

    if (clientId && clientSecret) {
        console.log('✅ Used Client ID & Secret from .env');
    } else {
        console.log('Please enter credentials from Google Cloud Console:');
        clientId = await new Promise(resolve => rl.question('Enter your Client ID: ', resolve));
        clientSecret = await new Promise(resolve => rl.question('Enter your Client Secret: ', resolve));
    }

    return { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
}

async function startAuth() {
    const { clientId, clientSecret } = await getCredentials();

    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        REDIRECT_URI
    );

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent' // Force consent to ensure refresh token is returned
    });

    console.log('\nPlease visit this URL to authorize the NEW account:');
    console.log(authUrl);

    // Try to open automatically
    try {
        const cmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
        opener.exec(`${cmd} "${authUrl}"`);
    } catch (e) {
        // Check manual link
    }

    const server = http.createServer(async (req, res) => {
        const q = url.parse(req.url, true).query;

        if (req.url.startsWith('/oauth2callback')) {
            if (q.error) {
                console.error('Error:', q.error);
                res.end('Error authentication');
                server.close();
                process.exit(1);
                return;
            }

            try {
                const { tokens } = await oauth2Client.getToken(q.code);

                res.end('Authentication successful! Check your terminal.');

                console.log('\n\n--- SUCCESS! ---\n');
                console.log('Here is your NEW Refresh Token for the new account:\n');
                console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
                console.log('\n----------------\n');
                console.log('Action: Replace the GOOGLE_REFRESH_TOKEN in your .env file with this new value.');

            } catch (err) {
                console.error('Error retrieving token:', err);
                res.end('Error retrieving token');
            } finally {
                server.close();
                rl.close();
                process.exit(0);
            }
        }
    }).listen(3000);
}

startAuth();
