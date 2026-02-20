// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAmnKwUDDuUB0-n1JqOGdAqbkt5dQjUYHs",
    authDomain: "test-cc50d.firebaseapp.com",
    projectId: "test-cc50d",
    storageBucket: "test-cc50d.firebasestorage.app",
    messagingSenderId: "697042867652",
    appId: "1:697042867652:web:b1fbdfa5fec4efd7928091",
    measurementId: "G-XS5SB5HXYE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);