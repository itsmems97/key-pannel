import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBjSg8viticfmkOogheNcnIaLR_28xnFhQ",
  authDomain: "key-panel-1e294.firebaseapp.com",
  projectId: "key-panel-1e294",
  storageBucket: "key-panel-1e294.firebasestorage.app",
  messagingSenderId: "370777776498",
  appId: "1:370777776498:web:745b2592287fdac2c57deb"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const { key, deviceUID } = req.body;

  if (!key || !deviceUID) {
    return res.status(400).json({ success: false, message: 'Key aur Device UID required hai' });
  }

  try {
    const q = query(collection(db, 'keys'), where('key', '==', key));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return res.status(200).json({ success: false, message: 'Invalid Key' });
    }

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();

    if (new Date(data.expiry) < new Date()) {
      return res.status(200).json({ success: false, message: 'Key Expired' });
    }

    if (data.deviceUID === null) {
      await updateDoc(doc(db, 'keys', docSnap.id), { deviceUID: deviceUID });
      return res.status(200).json({ success: true, message: 'Activated Successfully' });
    }

    if (data.deviceUID === deviceUID) {
      return res.status(200).json({ success: true, message: 'Login Successful' });
    } else {
      return res.status(200).json({ success: false, message: 'Wrong Device' });
    }

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
}
