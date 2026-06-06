// MediSync — API URL Configuration
// After deploying backend to Railway, replace the placeholder below with your Railway URL.
// Example: 'https://medisync-backend-production.up.railway.app'
window.MEDISYNC_API_URL = (function () {
  var host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  // ← REPLACE THIS after Railway deployment
  return 'https://medisync-backend-rnp5.onrender.com';
}());
