import { Project } from '../types';

const STORAGE_KEY = 'lingosync_projects';
const DB_NAME = 'LingoSyncDB';
const DB_VERSION = 1;
const STORE_NAME = 'video_blobs';

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('IndexedDB not supported in SSR'));
    }
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.dbPromise;
  }

  // --- IndexedDB for Video Blobs ---
  async saveVideoBlob(key: string, blob: Blob): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(blob, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Could not cache video blob in IndexedDB:', e);
    }
  }

  async getVideoBlob(key: string): Promise<Blob | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  async deleteVideoBlob(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Error deleting video blob:', e);
    }
  }

  // --- LocalStorage for Projects Metadata ---
  getProjects(): Project[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  getProject(id: string): Project | null {
    const list = this.getProjects();
    return list.find((p) => p.id === id) || null;
  }

  saveProject(project: Project): void {
    if (typeof window === 'undefined') return;
    try {
      const list = this.getProjects();
      const idx = list.findIndex((p) => p.id === project.id);
      const sanitized = { ...project, videoUrl: undefined }; // Don't persist temporary object URLs in localStorage
      if (idx >= 0) {
        list[idx] = { ...sanitized, updatedAt: Date.now() };
      } else {
        list.unshift({ ...sanitized, updatedAt: Date.now() });
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Error saving project to localStorage:', e);
    }
  }

  deleteProject(id: string): void {
    if (typeof window === 'undefined') return;
    try {
      const list = this.getProjects();
      const project = list.find((p) => p.id === id);
      if (project?.videoBlobKey) {
        this.deleteVideoBlob(project.videoBlobKey);
      }
      const updated = list.filter((p) => p.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error deleting project:', e);
    }
  }
}

export const storageService = new StorageService();

