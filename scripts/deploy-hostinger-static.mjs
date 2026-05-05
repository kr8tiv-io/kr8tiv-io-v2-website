import fs from 'node:fs';
import path from 'node:path';
import * as tus from 'tus-js-client';

const token = process.env.HOSTINGER_API_TOKEN || process.env.API_TOKEN;
const domain = process.env.HOSTINGER_DOMAIN || 'kr8tiv.io';
const archivePath = process.argv[2];
const baseUrl = (process.env.HOSTINGER_API_BASE_URL || 'https://developers.hostinger.com').replace(/\/$/, '');

if (!token) throw new Error('HOSTINGER_API_TOKEN is required');
if (!archivePath) throw new Error('Archive path argument is required');
if (!fs.existsSync(archivePath) || !fs.statSync(archivePath).isFile()) {
  throw new Error(`Archive not found or not a file: ${archivePath}`);
}

async function api(endpoint, options = {}) {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'kr8tiv-hostinger-deploy/1.0',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${endpoint} failed: ${res.status} ${JSON.stringify(data).slice(0, 800)}`);
  }

  return data;
}

function normalizeRemotePath(value) {
  return value.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/');
}

async function uploadTusFile(filePath, remoteName, credentials) {
  const stats = fs.statSync(filePath);
  const cleanUploadUrl = credentials.url.replace(/\/$/, '');
  const uploadUrlWithFile = `${cleanUploadUrl}/${normalizeRemotePath(remoteName)}?override=true`;
  const headers = {
    'X-Auth': credentials.auth_key,
    'X-Auth-Rest': credentials.rest_auth_key,
    'upload-length': String(stats.size)
  };

  console.log(`Preparing upload to ${new URL(uploadUrlWithFile).host}/${remoteName} (${stats.size} bytes)`);

  const pre = await fetch(uploadUrlWithFile, {
    method: 'POST',
    headers,
    body: ''
  });

  if (pre.status !== 201) {
    const body = await pre.text();
    throw new Error(`Pre-upload failed: ${pre.status} ${body.slice(0, 800)}`);
  }

  await new Promise((resolve, reject) => {
    const upload = new tus.Upload(fs.createReadStream(filePath), {
      uploadUrl: uploadUrlWithFile,
      retryDelays: [1000, 2000, 4000, 8000, 16000, 20000],
      uploadDataDuringCreation: false,
      parallelUploads: 1,
      chunkSize: 10 * 1024 * 1024,
      headers,
      metadata: {
        filename: remoteName,
        filetype: 'application/zip'
      },
      onError(error) {
        reject(error);
      },
      onProgress(bytesUploaded, bytesTotal) {
        const pct = ((bytesUploaded / bytesTotal) * 100).toFixed(1);
        process.stdout.write(`\rUpload ${pct}%`);
      },
      onSuccess() {
        process.stdout.write('\n');
        resolve();
      }
    });

    upload.start();
  });
}

const websites = await api(`/api/hosting/v1/websites?domain=${encodeURIComponent(domain)}`);
const website = websites?.data?.find((site) => site.domain === domain) || websites?.data?.[0];
if (!website?.username) throw new Error(`No Hostinger website found for ${domain}`);

const username = website.username;
const archiveName = path.basename(archivePath);
console.log(`Deploying ${archiveName} to ${domain} as ${username}`);

const credentials = await api('/api/hosting/v1/files/upload-urls', {
  method: 'POST',
  body: JSON.stringify({ username, domain })
});
if (!credentials?.url || !credentials?.auth_key || !credentials?.rest_auth_key) {
  throw new Error('Invalid Hostinger upload credentials');
}

await uploadTusFile(archivePath, archiveName, credentials);

const deploy = await api(`/api/hosting/v1/accounts/${encodeURIComponent(username)}/websites/${encodeURIComponent(domain)}/deploy`, {
  method: 'POST',
  body: JSON.stringify({ archive_path: archiveName })
});

console.log('Hostinger deploy triggered:');
console.log(JSON.stringify(deploy, null, 2));
