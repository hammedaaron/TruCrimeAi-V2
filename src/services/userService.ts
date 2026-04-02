import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { ContentStyle, UserPreferences, VisualPreset } from "../types";

const SETTINGS_COLLECTION = "settings";
const STYLES_COLLECTION = "contentStyles";
const VISUAL_PRESETS_COLLECTION = "visualPresets";

export async function getUserPreferences(uid: string): Promise<UserPreferences | null> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserPreferences;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${SETTINGS_COLLECTION}/${uid}`);
    return null;
  }
}

export async function saveUserPreferences(uid: string, preferences: Partial<UserPreferences>): Promise<void> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, uid);
    await setDoc(docRef, {
      ...preferences,
      uid,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/${uid}`);
  }
}

export async function getContentStyles(uid: string): Promise<ContentStyle[]> {
  try {
    const q = query(
      collection(db, STYLES_COLLECTION),
      where("uid", "==", uid),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ContentStyle));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, STYLES_COLLECTION);
    return [];
  }
}

export async function saveContentStyle(uid: string, style: Omit<ContentStyle, 'id' | 'uid' | 'createdAt'>, id?: string): Promise<string> {
  try {
    if (id) {
      const docRef = doc(db, STYLES_COLLECTION, id);
      await setDoc(docRef, {
        ...style,
        uid,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return id;
    } else {
      const docRef = await addDoc(collection(db, STYLES_COLLECTION), {
        ...style,
        uid,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, STYLES_COLLECTION);
    throw error;
  }
}

export async function deleteContentStyle(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, STYLES_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${STYLES_COLLECTION}/${id}`);
    throw error;
  }
}

// Visual Presets
export async function getVisualPresets(uid: string): Promise<VisualPreset[]> {
  try {
    const q = query(
      collection(db, VISUAL_PRESETS_COLLECTION),
      where("uid", "==", uid),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as VisualPreset));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, VISUAL_PRESETS_COLLECTION);
    return [];
  }
}

export async function saveVisualPreset(uid: string, preset: Omit<VisualPreset, 'id' | 'uid' | 'createdAt'>, id?: string): Promise<string> {
  try {
    if (id) {
      const docRef = doc(db, VISUAL_PRESETS_COLLECTION, id);
      await setDoc(docRef, {
        ...preset,
        uid,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return id;
    } else {
      const docRef = await addDoc(collection(db, VISUAL_PRESETS_COLLECTION), {
        ...preset,
        uid,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, VISUAL_PRESETS_COLLECTION);
    throw error;
  }
}

export async function deleteVisualPreset(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, VISUAL_PRESETS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${VISUAL_PRESETS_COLLECTION}/${id}`);
    throw error;
  }
}

export async function setActiveVisualPreset(uid: string, presetId: string): Promise<void> {
  try {
    // 1. Update user preferences with active preset ID
    await saveUserPreferences(uid, { activeVisualPresetId: presetId });
    
    // 2. We could also update the isActive field in the visualPresets collection
    // but it's easier to just rely on the activeVisualPresetId in UserPreferences
    // However, to keep it consistent with the user's request "Only one prompt can be active at a time"
    // we can update all presets for this user.
    
    const presets = await getVisualPresets(uid);
    for (const preset of presets) {
      if (preset.id) {
        const docRef = doc(db, VISUAL_PRESETS_COLLECTION, preset.id);
        await setDoc(docRef, { isActive: preset.id === presetId }, { merge: true });
      }
    }
  } catch (error) {
    console.error("Error setting active visual preset:", error);
    throw error;
  }
}
