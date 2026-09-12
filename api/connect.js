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
    let body = req.body || {};

    if (typeof body === "string") {
      body = Object.fromEntries(
        new URLSearchParams(body).entries()
      );
    }

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
    const keyData = keyDoc.data();

    if (keyData.blocked === true) {
      return res.status(200).json({
        success: false,
        message: "Key Blocked"
      });
    }

    if (keyData.active === false) {
      return res.status(200).json({
        success: false,
        message: "Key Inactive"
      });
    }

    if (!keyData.expiry) {
      return res.status(200).json({
        success: false,
        message: "Invalid Expiry"
      });
    }

    const expiryDate = new Date(keyData.expiry);

    if (
      Number.isNaN(expiryDate.getTime()) ||
      expiryDate.getTime() <= Date.now()
    ) {
      return res.status(200).json({
        success: false,
        message: "Key Expired"
      });
    }

    // First activation
    if (!keyData.deviceUID) {
      await updateDoc(
        doc(db, "keys", keyDoc.id),
        {
          deviceUID: deviceUID
        }
      );
    }
    // Different device
    else if (String(keyData.deviceUID) !== String(deviceUID)) {
      return res.status(200).json({
        success: false,
        message: "Wrong Device"
      });
    }

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

  } catch (error) {
    console.error("CONNECT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
}
