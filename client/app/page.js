'use client';

import React, { useState, useEffect } from 'react';
import { publicApi } from '../utils/api';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Sparkles, Send, Zap, Loader2, History, Clock, 
  BrainCircuit, Plus, X, ListFilter 
} from "lucide-react";

// Category Data Object
const CATEGORIES = {
  "Software & Tech": ["Micro-SaaS", "AI Automation Agents", "B2B Productivity Tools", "Developer Tools & APIs", "Cybersecurity", "Cloud Computing", "Low-Code", "Enterprise Software"],
  "AI & Data": ["AI SaaS", "LLM Assistants", "Prompt Tools", "MLOps", "Computer Vision", "Voice AI", "Recommendation Systems", "Synthetic Data"],
  "Finance & Operations": ["Accounting", "Payroll", "Tax Automation", "Fraud Detection", "Personal Finance", "Wealth Management", "SME Tools"],
  "Web3 & Blockchain": ["NFT Tools", "DeFi", "DAO Tools", "Web3 Gaming", "Tokenization", "Blockchain Analytics", "Crypto Payments"],
  "Commerce & Services": ["E-commerce", "Marketplaces", "Dropshipping", "Subscription Biz", "PropTech", "Logistics"],
  "Creator Economy": ["Monetization Tools", "Community Platforms", "Influencer Tech", "Creator Analytics", "Newsletter/Podcast", "Digital Products"],
  "Education & Career": ["EdTech", "AI Tutors", "Career Coaching", "HR Tech", "Skill Assessment", "Language Learning"],
  "Health & Lifestyle": ["Health-Tech", "Fitness Tools", "Mental Health", "Nutrition Apps", "Sleep Tech", "Lifestyle Optimization"],
  "Emerging Markets": ["TravelTech", "FoodTech", "AgriTech", "LegalTech", "InsurTech", "SportsTech", "Gaming", "AR / VR"],
  "Sustainability": ["Green-Tech", "Carbon Tracking", "Charity Tech", "GovTech", "Inclusive Tech", "Ethical AI"],
  "Experimental": ["Viral Apps", "Meme Products", "AI Companions", "Hobby Platforms", "Indie Products"]
};

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]); // New State
  const [greeting, setGreeting] = useState('Initializing...');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [g, h] = await Promise.all([publicApi.getGreeting(), publicApi.getHistory()]);
        setGreeting(g.message);
        setHistory(h);
      } catch (e) { setGreeting('Ready to Propel'); }
    };
    loadData();
  }, []);

  const toggleCategory = (cat) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setResult(null);
    try {
      // Logic check: include categories if present
      const context = selectedCategories.length > 0 
        ? `[Categories: ${selectedCategories.join(', ')}] ` 
        : '';
      
      const data = await publicApi.generateIdea(context + prompt);
      setResult(data.result);
      const h = await publicApi.getHistory();
      setHistory(h);
    } catch (error) {
      setResult("Error connecting to AI engine.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-white flex flex-col items-center p-8 relative">
      <div className="fixed top-0 -z-10 h-full w-full bg-white [background:radial-gradient(125%_125%_at_50%_10%,#000_40%,#63e_100%)]"></div>

      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-4 pt-10">
          <Badge variant="outline" className="text-purple-400 border-purple-400/20 bg-purple-400/5 uppercase tracking-tighter">
            <Zap size={12} className="mr-1 fill-current" /> {greeting}
          </Badge>
          <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
            Propel Your Idea
          </h1>
        </div>

        <Card className="bg-black/40 border-white/10 backdrop-blur-md shadow-2xl">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2 text-left">
              <Label className="text-gray-400 ml-1">Describe your idea</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="e.g. A marketplace for freelance AI trainers..." 
                  className="bg-white/5 border-white/10 text-white"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isLoading}
                />
                <Button onClick={handleGenerate} disabled={isLoading || !prompt} className="bg-purple-600 hover:bg-purple-700">
                  {isLoading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                </Button>
              </div>
              
              {/* Category Actions */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogTrigger asChild>
                    {/* Replace the current button with this for better feedback */}
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="text-[11px] flex items-center gap-1 text-purple-400/80 hover:text-purple-300 transition-all hover:translate-x-0.5 font-medium ml-1"
                    >
                      <ListFilter size={12} />
                      Refine by category (optional)
                    </button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0c0c0e] border-white/10 text-white max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Select Categories</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[400px] pr-4">
                      {Object.entries(CATEGORIES).map(([group, items]) => (
                        <div key={group} className="mb-6">
                          <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">{group}</h4>
                          <div className="flex flex-wrap gap-2">
                            {items.map(item => (
                              <Badge
                                key={item}
                                variant={selectedCategories.includes(item) ? "default" : "outline"}
                                className={`cursor-pointer transition-all ${selectedCategories.includes(item) ? "bg-purple-600 hover:bg-purple-700" : "hover:border-purple-500/50"}`}
                                onClick={() => toggleCategory(item)}
                              >
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                    <Button className="w-full bg-purple-600 mt-4" onClick={() => setIsModalOpen(false)}>Save Selections</Button>
                  </DialogContent>
                </Dialog>

                {/* Selected Tags Display */}
                {selectedCategories.map(cat => (
                  <Badge key={cat} variant="secondary" className="bg-white/10 text-white border-none h-5 px-2 flex items-center gap-1 text-[10px]">
                    {cat}
                    <X size={10} className="cursor-pointer hover:text-red-400" onClick={() => toggleCategory(cat)} />
                  </Badge>
                ))}
              </div>
            </div>

            {isLoading && (
              <div className="p-4 bg-white/5 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-purple-400/50 text-[10px] uppercase font-bold tracking-widest">
                  <BrainCircuit size={14} className="animate-pulse" /> AI Processing
                </div>
                <Skeleton className="h-3 w-full bg-white/5" />
                <Skeleton className="h-3 w-3/4 bg-white/5" />
              </div>
            )}

            {result && !isLoading && (
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 text-left animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 text-purple-400 mb-2"><Sparkles size={14} /><span className="text-[10px] font-bold uppercase tracking-widest">Analysis</span></div>
                <p className="text-sm text-gray-200 leading-relaxed">{result}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* History List */}
        <div className="space-y-4 pb-20">
          <div className="flex items-center gap-2 text-gray-500 border-b border-white/5 pb-2 ml-1">
            <History size={16} /> <span className="text-sm font-semibold">History</span>
          </div>
          <div className="grid gap-3">
            {history.map((item) => (
              <Card key={item.id} className="bg-white/5 border-white/5 hover:border-purple-500/20 transition-all group">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-sm text-gray-200 line-clamp-1">"{item.prompt}"</p>
                    <Clock size={12} className="text-gray-600" />
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{item.result}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}