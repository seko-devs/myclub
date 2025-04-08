
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDgn1WcaTx8Aj8xwFrnxr4-ndYhoiJD1Bo",
    authDomain: "myclub-fb-1ec24.firebaseapp.com",
    projectId: "myclub-fb-1ec24",
    storageBucket: "myclub-fb-1ec24.firebasestorage.app",
    messagingSenderId: "796401924413",
    appId: "1:796401924413:web:7b8a085d0d9709ee006d54"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);

  // Init Auth and Firestore
    const auth = firebase.auth();
    const db = firebase.firestore();

