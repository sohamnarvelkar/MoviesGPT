import { initializeApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

// TODO: Replace with your specific Firebase Project Configuration
// You can get this from Firebase Console -> Project Settings -> General -> Your Apps
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Check if the user has actually configured the keys
// We check if apiKey is the default placeholder or empty
export const isConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" &&
  !firebaseConfig.apiKey.includes("YOUR_API_KEY");

let app;
let authInstance: Auth | undefined;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    authInstance = getAuth(app);
  } catch (e) {
    console.error("Firebase initialization failed. Falling back to demo mode.", e);
  }
}

export const auth = authInstance;