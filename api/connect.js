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

  // Form data aur JSON dono support
  let key, deviceUID;

  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('application/json')) {
    key = req.body?.key;
    deviceUID = req.body?.deviceUID;
  } else {
    // Form urlencoded parse karo manually
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const params = new URLSearchParams(bodyStr);
    key = params.get('key') || req.body?.key;
    deviceUID = params.get('deviceUID') || params.get('uuid') || params.get('hwid') || req.body?.deviceUID;
  }

  // Log karo debugging ke liye
  console.log('Received body:', req.body);
  console.log('Key:', key, 'DeviceUID:', deviceUID);

  if (!key || !deviceUID) {
    return res.status(400).json({ 
      success: false, 
      message: 'Key aur Device UID required hai',
      received: { key: key || null, deviceUID: deviceUID || null, body: req.body }
    });
  }

  try {
    const q = query(collection(db, 'keys'), where('key', '==', key));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return res.status(200).json({ success: false, message: 'Invalid Key' });
    }

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();

    if (data.blocked) {
      return res.status(200).json({ success: false, message: 'Key Blocked' });
    }

    if (new Date(data.expiry) < new Date()) {
      return res.status(200).json({ success: false, message: 'Key Expired' });
    }

    if (data.deviceUID === null || data.deviceUID === undefined) {
      await updateDoc(doc(db, 'keys', docSnap.id), { deviceUID: deviceUID });
    } else if (data.deviceUID !== deviceUID) {
      return res.status(200).json({ success: false, message: 'Wrong Device' });
    }

    const rng = Math.floor(Date.now() / 1000);
    return res.status(200).json({
      success: true,
      data: {
        token: "PIKAZOO_AUTH_TOKEN",
        rng: rng,
        EXP: data.expiry.substring(0, 10)
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
}
