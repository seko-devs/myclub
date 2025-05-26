

  // Init Auth and Firestore
    const auth = firebase.auth();
    const db = firebase.firestore();

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJmOLs6nGaheZmr6qUbUpXN_ylzonF2G4",
  authDomain: "myclub-fb.firebaseapp.com",
  projectId: "myclub-fb",
  storageBucket: "myclub-fb.firebasestorage.app",
  messagingSenderId: "542512653051",
  appId: "1:542512653051:web:7b8856c9a43d36000ec65e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

async function getSinglePlayer() {
  const docRef = doc(db, "players", "EteZoTtd40FPI0aYjEKw"); // Assuming a document with ID "SF" exists
  try {
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log("Document data:", docSnap.data());
    } else {
      console.log("No such document!");
    }
  } catch (e) {
    console.error("Error getting document:", e);
  }
}


