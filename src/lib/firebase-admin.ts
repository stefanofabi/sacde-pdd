
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : undefined;

let adminApp: App;

if (!getApps().length) {
  if (serviceAccount) {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // This will initialize the app with Application Default Credentials
    // Useful for running in Google Cloud environments like Cloud Run
    console.log("Initializing Firebase Admin SDK with Application Default Credentials.");
    adminApp = initializeApp();
  }
} else {
  adminApp = getApps()[0];
}

export { adminApp };
