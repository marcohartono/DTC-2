import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Reading } from '../types';

interface TurfIQDB extends DBSchema {
  readings: {
    key: number;
    value: Reading & { id?: number };
    indexes: { 't': number; 'hole': number; 'tech': string };
  };
}

const DB_NAME = 'turfiq';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<TurfIQDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<TurfIQDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('readings', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('t', 't');
        store.createIndex('hole', 'hole');
        store.createIndex('tech', 'tech');
      },
    });
  }
  return dbPromise;
}

export async function loadAllReadings(): Promise<Reading[]> {
  const db = await getDB();
  const rows = await db.getAll('readings');
  return rows.sort((a, b) => b.t - a.t);
}

export async function saveReading(r: Reading): Promise<void> {
  const db = await getDB();
  await db.add('readings', { ...r, v: r.v ?? 1 });
}

export async function seedIfEmpty(seeds: Reading[]): Promise<boolean> {
  const db = await getDB();
  const count = await db.count('readings');
  if (count > 0) return false;
  const tx = db.transaction('readings', 'readwrite');
  await Promise.all(seeds.map((s) => tx.store.add({ ...s, v: 1 })));
  await tx.done;
  return true;
}

export async function clearReadings(): Promise<void> {
  const db = await getDB();
  await db.clear('readings');
}
