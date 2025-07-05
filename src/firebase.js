// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCN-W3ySERM3FE7BFMfHyX5oMPok1_17Rc",
  authDomain: "alf-coach.firebaseapp.com",
  projectId: "alf-coach",
  storageBucket: "alf-coach.firebasestorage.app",
  messagingSenderId: "1025423138705",
  appId: "1:1025423138705:web:4370e67aab9c9ab71a0430",
  measurementId: "G-FBKM9WDXND"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Correctly initialize and export the services
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };