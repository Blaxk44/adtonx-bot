import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCToNn1VqYZrZjjbbBA2KW126ZBso-0D80",
  authDomain: "adtonx-bot.firebaseapp.com",
  databaseURL: "https://adtonx-bot-default-rtdb.firebaseio.com",
  projectId: "adtonx-bot",
  storageBucket: "adtonx-bot.firebasestorage.app",
  messagingSenderId: "290170776005",
  appId: "1:290170776005:web:82f88036aa42d080e2c3ac",
  measurementId: "G-6S0F9NY64F"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export default app;