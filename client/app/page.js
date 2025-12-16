'use client';

import React, { useState, useEffect } from 'react';
import { publicApi } from '../utils/api';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Send, Zap, Loader2, History, Clock } from "lucide-react";

export default function Home() {
  // --- 1. UI LOGIC (State Management) ---
  const [prompt, setPrompt] = useState('');
  const [greeting, setGreeting] = useState('Initializing...');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]); // Added history state
  const [isLoading, setIsLoading] = useState(false);

  // --- 2. DATA FETCHING (Greeting & History) ---
  const loadData = async () => {
    try {
      // Fetch both greeting and history simultaneously
      const [greetingData, historyData] = await Promise.all([
        publicApi.getGreeting(),
        publicApi.getHistory()
      ]);
      setGreeting(greetingData.message);
      setHistory(historyData);
    } catch (error) {
      console.error('Initial load error:', error);
      setGreeting('Ready to Propel');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- 3. EVENT HANDLER (Generate Button) ---
  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setResult(null); 
    try {
      const data = await publicApi.generateIdea(prompt);
      setResult(data.result);
      
      // Refresh history list immediately after a new generation
      const updatedHistory = await publicApi.getHistory();
      setHistory(updatedHistory);
    } catch (error) {
      console.error(error);
      setResult("Error connecting to AI engine. Ensure FastAPI is running.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-white flex flex-col items-center p-8 overflow-x-hidden relative">
      {/* Background Glow Decoration */}
      <div className="fixed top-0 -z-10 h-full w-full bg-white [background:radial-gradient(125%_125%_at_50%_10%,#000_40%,#63e_100%)]"></div>

      <div className="w-full max-w-2xl space-y-12">
        {/* --- HEADER SECTION --- */}
        <div className="space-y-4 text-center mt-12">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-purple-400 backdrop-blur-xl">
            <Zap size={14} className="mr-2 fill-current" />
            <span>{greeting}</span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
            What will you create?
          </h1>
          <p className="text-gray-400 text-lg">
            Enter a prompt below and let our AI turn your ideas into reality.
          </p>
        </div>

        {/* --- GENERATOR CARD --- */}
        <Card className="bg-black/40 border-white/10 backdrop-blur-md shadow-2xl">
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col space-y-1.5 text-left">
              <Label htmlFor="prompt" className="text-gray-300 ml-1 mb-2">Your AI Prompt</Label>
              <div className="flex gap-2">
                <Input 
                  id="prompt"
                  placeholder="Describe your startup idea..." 
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-purple-500"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isLoading}
                />
                <Button 
                  onClick={handleGenerate} 
                  disabled={isLoading || !prompt}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold min-w-[120px]"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send size={18} className="mr-2" />
                  )}
                  {isLoading ? 'Wait...' : 'Generate'}
                </Button>
              </div>
            </div>

            {result && (
              <div className="mt-6 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 text-left animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                  <Sparkles size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">AI Result</span>
                </div>
                <p className="text-gray-200 leading-relaxed">{result}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- 5. HISTORY DISPLAY SECTION --- */}
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-2 text-gray-400 border-b border-white/5 pb-2">
            <History size={18} />
            <h2 className="text-xl font-semibold text-white">Previous Generations</h2>
          </div>

          <div className="grid gap-4">
            {history.length === 0 && !isLoading ? (
              <p className="text-gray-600 italic text-center py-8">No saved ideas yet. Generate your first one above!</p>
            ) : (
              history.map((item) => (
                <Card key={item.id} className="bg-white/5 border-white/5 hover:border-purple-500/30 transition-all duration-300 group">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <p className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                        "{item.prompt}"
                      </p>
                      <span className="text-[10px] text-gray-500 flex items-center gap-1 bg-white/5 px-2 py-1 rounded">
                        <Clock size={10} /> ID: {item.id}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed italic line-clamp-3">
                      {item.result}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}