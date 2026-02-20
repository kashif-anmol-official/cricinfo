import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { MatchBundle } from '../types';

const API = 'http://localhost:4000/api';

interface Ctx {
  data: MatchBundle | null;
  load: (id: number) => Promise<void>;
  createMatch: (payload: any) => Promise<void>;
  addEvent: (event: any) => Promise<void>;
  undo: () => Promise<void>;
  updateInnings: (inningsId: number, payload: any) => Promise<void>;
}

const MatchContext = createContext<Ctx | null>(null);

export function MatchProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<MatchBundle | null>(null);
  const [matchId, setMatchId] = useState<number | null>(null);

  const load = async (id: number) => {
    const res = await fetch(`${API}/matches/${id}`);
    const json = await res.json();
    setData(json);
    setMatchId(id);
  };

  useEffect(() => {
    const id = localStorage.getItem('matchId');
    if (id) load(Number(id));
  }, []);

  const createMatch = async (payload: any) => {
    const res = await fetch(`${API}/matches`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json();
    localStorage.setItem('matchId', String(json.matchId));
    await load(json.matchId);
  };

  const addEvent = async (event: any) => {
    if (!matchId) return;
    await fetch(`${API}/matches/${matchId}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event) });
    await load(matchId);
  };

  const undo = async () => {
    if (!matchId) return;
    await fetch(`${API}/matches/${matchId}/undo`, { method: 'POST' });
    await load(matchId);
  };

  const updateInnings = async (inningsId: number, payload: any) => {
    if (!matchId) return;
    await fetch(`${API}/matches/${matchId}/innings/${inningsId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    await load(matchId);
  };

  const value = useMemo(() => ({ data, load, createMatch, addEvent, undo, updateInnings }), [data]);
  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}

export const useMatch = () => {
  const ctx = useContext(MatchContext);
  if (!ctx) throw new Error('Missing MatchProvider');
  return ctx;
};
