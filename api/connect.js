import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc
} from "firebase/firestore";
import crypto from "crypto";

const firebaseConfig = {
  apiKey: "AIzaSyBjSg8viticfmkOogheNcnIaLR_28xnFhQ",
  authDomain: "key-panel-1e294.firebaseapp.com",
  projectId: "key-panel-1e294",
  storageBucket: "key-panel-1e294.firebasestorage.app",
  messagingSenderId: "370777776498",
  appId: "1:370777776498:web:745b2592287fdac2c57deb"
};

const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];

const db = getFirestore(app);

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  try {

    let body = req.body;

    // Support application/x-www-form-urlencoded
    if (typeof body === "string") {
      const params = new URLSearchParams(body);

      body = Object.fromEntries(params.entries());
    }

    body = body || {};

    // C++ sends:
    // game=PUBG
    // user_key=KEY
    // serial=DEVICE_UUID

    const game = body.game || "PUBG";
    const userKey = body.user_key || body.key;
    const deviceUID = body.serial || body.deviceUID;

    if (!userKey || !deviceUID) {
      return res.status(400).json({
        success: false,
        message: "Key aur Device UID required hai"
      });
    }

    const q = query(
      collection(db, "keys"),
      where("key", "==", userKey)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return res.status(200).json({
        success: false,
        message: "Invalid Key"
      });
    }

    const keyDoc = snapshot.docs[0];
    const data = keyDoc.data();

    // Optional app check
    if (
      data.appName &&
      game &&
      String(data.appName).toLowerCase() !== String(game).toLowerCase()
    ) {
      return res.status(200).json({
        success: false,
        message: "Invalid Application"
      });
    }

    // Blocked key
    if (data.blocked === true) {
      return res.status(200).json({
        success: false,
        message: "Key Blocked"
      });
    }

    // Inactive key
    if (data.active === false) {
      return res.status(200).json({
        success: false,
        message: "Key Inactive"
      });
    }

    // Expiry check
    if (!data.expiry) {
      return res.status(200).json({
        success: false,
        message: "Invalid Expiry"
      });
    }

    const expiryDate = new Date(data.expiry);

    if (
      Number.isNaN(expiryDate.getTime()) ||
      expiryDate.getTime() <= Date.now()
    ) {
      return res.status(200).json({
        success: false,
        message: "Key Expired"
      });
    }

    // First device activation
    if (!data.deviceUID) {

      await updateDoc(
        doc(db, "keys", keyDoc.id),
        {
          deviceUID: deviceUID
        }
      );

      const now = Math.floor(Date.now() / 1000);

      return res.status(200).json({
        success: true,
        message: "Activated Successfully",

        data: {
          token: crypto.randomUUID(),
          rng: now,
          EXP: expiryDate.toISOString()
        }
      });
    }

    // Same device
    if (String(data.deviceUID) === String(deviceUID)) {

      const now = Math.floor(Date.now() / 1000);

      return res.status(200).json({
        success: true,
        message: "Login Successful",

        data: {
          token: crypto.randomUUID(),
          rng: now,
          EXP: expiryDate.toISOString()
        }
      });
    }

    // Different device
    return res.status(200).json({
      success: false,
      message: "Wrong Device"
    });

  } catch (error) {

    console.error("CONNECT API ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
}
