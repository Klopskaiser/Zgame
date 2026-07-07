/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star, Rocket, ShieldAlert, Cpu, Award, Code, Terminal, Server } from 'lucide-react';

interface MainMenuProps {
  onNewGame: (speed: number, isDebug?: boolean) => void;
  onLoadGame: () => void;
  hasSave: boolean;
}

export default function MainMenu({ onNewGame, onLoadGame, hasSave }: MainMenuProps) {
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(10);
  const [stars, setStars] = useState<{ x: number; y: number; size: number; delay: number }[]>([]);

  useEffect(() => {
    // Generate star background coords
    const tempStars = Array.from({ length: 80 }).map((_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 5,
    }));
    setStars(tempStars);
  }, []);

  const speeds = [
    { value: 1, label: '1x', desc: 'Echtzeit (Standard)' },
    { value: 10, label: '10x', desc: 'Schnell' },
    { value: 100, label: '100x', desc: 'Sehr Schnell' },
    { value: 1000, label: '1000x', desc: 'Super-Sim' },
  ];

  return (
    <div id="main-menu-container" className="relative min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans overflow-hidden py-6 px-4">
      
      {/* Ambient Starfield background (restricted to screen) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {stars.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-20 animate-pulse"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`,
              animationDuration: '4s',
            }}
          />
        ))}
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#020617_1px,transparent_1px),linear-gradient(to_bottom,#020617_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none z-0" />

      {/* Outer UI Container imitating the exact Elegant Dark spec, made fluid yet robust */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-[1024px] min-h-[700px] lg:h-[768px] theme-ui-container grid grid-cols-1 lg:grid-cols-[300px_1fr] grid-rows-[auto_1fr_auto] gap-[1px]"
      >
        
        {/* HEADER */}
        <header className="col-span-full theme-header px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <Rocket className="w-5 h-5 text-blue-500 animate-pulse" />
            <span className="font-extrabold text-xl tracking-widest text-blue-500 uppercase select-none">
              Orionkriege
            </span>
          </div>
          <div className="flex items-center gap-6 text-[11px] uppercase tracking-widest text-slate-400 font-mono">
            <span>Universum: 1.0.4</span>
            <span className="text-blue-400 font-bold">Singleplayer Protocol</span>
          </div>
        </header>

        {/* SIDEBAR (Hidden on mobile to save space, but displayed cleanly on LG screens) */}
        <aside className="theme-sidebar p-6 flex flex-col gap-6 hidden lg:flex">
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-500 mb-3 tracking-widest flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-slate-500" />
              Technik-Architektur
            </h3>
            <div className="space-y-3 font-mono">
              <div className="theme-stat-row">
                <span>GameEngine</span>
                <span className="text-emerald-400 font-semibold">Ready</span>
              </div>
              <div className="theme-stat-row">
                <span>Persistence</span>
                <span className="text-emerald-400 font-semibold">LocalStorage</span>
              </div>
              <div className="theme-stat-row">
                <span>Simulation</span>
                <span className="text-emerald-400 font-semibold">Offline-Sync</span>
              </div>
              <div className="theme-stat-row">
                <span>AI Entities</span>
                <span className="text-blue-400 font-semibold">5/5 Aktiv</span>
              </div>
            </div>
          </div>

          <div className="mt-auto p-4 bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400 leading-relaxed rounded font-mono">
            <span className="font-bold text-slate-300 block mb-1 uppercase tracking-wider text-[11px] text-red-400">Siegbedingung:</span>
            Vernichtung aller Planeten der KI. Der Todesstern-Angriff erfordert 10 Einheiten und unterliegt einer 20% Erfolgswahrscheinlichkeit bei minimaler Verteidigungslast. Fehlschläge zerstören die Flotte.
          </div>
        </aside>

        {/* MAIN VIEW */}
        <main className="theme-main-view flex flex-col items-center justify-center p-6 sm:p-10 text-center relative overflow-y-auto">
          
          {/* CENTERED MENU CARD */}
          <div className="theme-menu-card p-6 sm:p-8 w-full max-w-[450px] flex flex-col gap-5 text-left shadow-2xl relative z-10 my-4">
            <h2 className="text-2xl font-light text-slate-100 tracking-wider text-center uppercase border-b border-slate-800 pb-3">
              HAUPTMENÜ
            </h2>

            {/* Speeds multiplier selection */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest text-center font-bold font-mono">
                Geschwindigkeits-Multiplikator
              </label>
              
              <div className="flex gap-2 justify-center mt-1">
                {speeds.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSpeedMultiplier(s.value)}
                    className={`theme-mult-pill font-mono ${speedMultiplier === s.value ? 'active' : ''}`}
                    title={s.desc}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-slate-500 text-center italic mt-1 min-h-[14px]">
                {speeds.find(s => s.value === speedMultiplier)?.desc}
              </span>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => onNewGame(speedMultiplier, false)}
              className="theme-btn theme-btn-primary py-3.5 px-6 rounded cursor-pointer flex items-center justify-center gap-2 hover:opacity-90 transform active:scale-[0.99] transition-all font-mono tracking-wider font-bold"
            >
              <Rocket className="w-4 h-4" />
              Neues Spiel starten
            </button>

            {/* Debug Mode Button */}
            <button
              onClick={() => onNewGame(100, true)}
              className="theme-btn py-3 px-6 rounded cursor-pointer flex items-center justify-center gap-2 border border-red-950/60 hover:border-red-500 bg-red-950/10 hover:bg-red-950/30 transform active:scale-[0.99] transition-all font-mono tracking-wider text-red-400 font-bold"
            >
              <Code className="w-4 h-4 text-red-400 animate-pulse" />
              Debug-Modus starten (100x)
            </button>

            {/* Load Save Button */}
            {hasSave && (
              <button
                onClick={onLoadGame}
                className="theme-btn py-3 px-6 rounded cursor-pointer flex items-center justify-center gap-2 hover:border-blue-500 transform active:scale-[0.99] transition-all font-mono tracking-wider"
              >
                <Award className="w-4 h-4 text-indigo-400" />
                Spielstand laden
              </button>
            )}
          </div>

          {/* GREEN TERMINAL ARCHITECTURE PANEL */}
          <div className="w-full text-left mt-auto hidden sm:block">
            <div className="theme-arch-panel p-4 rounded text-xs leading-relaxed max-h-[150px] overflow-y-auto border-l-[3px] border-emerald-500/80 bg-slate-950/60 font-mono text-[10px] opacity-85 select-text">
              <div className="text-emerald-400/50 mb-1 flex items-center gap-1.5 uppercase font-bold tracking-widest text-[9px]">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                // SYSTEM ARCHITECTURE LOADED
              </div>
              <div className="text-emerald-400">
                <span className="text-slate-500 font-bold">class</span> <span className="text-blue-300">GameLoop</span> &#123;<br />
                &nbsp;&nbsp;<span className="text-slate-500">constructor</span>(mult) &#123; <span className="text-slate-400">this.multiplier</span> = mult; <span className="text-slate-400">this.lastTick</span> = Date.now(); &#125;<br />
                &nbsp;&nbsp;<span className="text-slate-300">sync</span>() &#123; <span className="text-slate-500">const</span> delta = Date.now() - localStorage.getItem(<span className="text-emerald-300">'last_save'</span>); <span className="text-slate-400">this.simulate</span>(delta); &#125;<br />
                &#125;<br />
                <span className="text-slate-500 font-bold">class</span> <span className="text-blue-300">Planet</span> &#123;<br />
                &nbsp;&nbsp;<span className="text-slate-500">constructor</span>() &#123; <span className="text-slate-400">this.resources</span> = &#123; metal: 500, crystal: 300, deut: 100 &#125;; &#125;<br />
                &#125;<br />
                <span className="text-slate-500 font-bold">class</span> <span className="text-blue-300">CombatEngine</span> &#123;<br />
                &nbsp;&nbsp;<span className="text-slate-500">static</span> <span className="text-slate-300">resolve</span>(attacker, defender) &#123; <span className="text-slate-500">// OGame Formula Realtime Simulator</span> &#125;<br />
                &#125;
              </div>
            </div>
          </div>
        </main>

        {/* FOOTER */}
        <footer className="col-span-full bg-slate-950 p-4 text-[10px] text-slate-500 flex flex-col sm:flex-row justify-between items-center px-6 border-t border-slate-900 gap-2 font-mono">
          <span>© 2026 Orionkriege - Strategische Raumsimulation</span>
          <span className="text-slate-600">Status: Warte auf Benutzereingabe...</span>
        </footer>

      </motion.div>
    </div>
  );
}
