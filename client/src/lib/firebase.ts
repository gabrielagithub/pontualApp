// client/src/lib/firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
   apiKey: "AIzaSyBKoNkQyQYhSkA8owz2Hqp8XUrFHuuC76I",
  authDomain: "pontualapp-33f57.firebaseapp.com",
  projectId: "pontualapp-33f57",
  storageBucket: "pontualapp-33f57.firebasestorage.app",
  messagingSenderId: "643701891348",
  appId: "1:643701891348:web:f55ff6a97f05ca6876a201"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);