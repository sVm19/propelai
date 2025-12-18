'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { publicApi } from '../utils/api';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sparkles, Send, Zap, Loader2, History, Clock, 
  BrainCircuit, Plus, X, ListFilter, Heart, Download, Star, ChevronDown, Trash2
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

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

// Tone Data Array
const TONES = [
  "Neutral", "Formal", "Informal", "Optimistic", "Pessimistic",
  "Critical", "Humorous", "Serious", "Encouraging", "Empathetic"
];

const ToneSelector = ({ selectedTone, setTone }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="text-[11px] flex items-center gap-1 text-purple-400/80 hover:text-purple-300 transition-all hover:translate-x-0.5 font-medium ml-1">
        <BrainCircuit size={12} />
        Tone: <span className="font-bold">{selectedTone || "Default"}</span> <ChevronDown size={12} />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent className="bg-[#0c0c0e] border-white/10 text-white">
      <DropdownMenuLabel>Select Tone</DropdownMenuLabel>
      <DropdownMenuSeparator className="bg-white/10" />
      {TONES.map(toneOption => (
        <DropdownMenuItem 
          key={toneOption} 
          onClick={() => setTone(toneOption === "Neutral" ? "" : toneOption)}
          className={`cursor-pointer ${selectedTone === toneOption ? "bg-purple-600/50" : ""}`}
        >
          {toneOption}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]); // New State
  const [greeting, setGreeting] = useState('Initializing...');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState([]);
  const [tone, setTone] = useState(""); // New state for AI tone

  // 2. Inside your Home component, create a filtered list
  const starredIdeas = history.filter(item => item.is_starred);

  // The Delete Function
  const deleteIdea = async (id) => {
    try {
      await publicApi.deleteIdea(id);
      // Remove from local state immediately for a fast UI feel
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error("Failed to delete idea");
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [g, h] = await Promise.all([publicApi.getGreeting(), publicApi.getHistory()]);
      setGreeting(g.message);
      setHistory(h);
    } catch (e) { setGreeting('Ready to Propel'); }
  });
  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleCategory = (cat) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleGenerate = async () => {
    // Allow generation if there's a prompt OR if categories are selected
    if (!prompt && selectedCategories.length === 0) return;
    
    setIsLoading(true);
    setResult(null); 
    try {
      // If prompt is empty, we send a "Brainstorm" instruction
      const finalPrompt = prompt 
        ? `[Categories: ${selectedCategories.join(', ')}] ${prompt}`
        : `[Categories: ${selectedCategories.join(', ')}] BRAINSTORM_MODE`;

      const data = await publicApi.generateIdea(finalPrompt, tone);
      setGeneratedIdeas(data.ideas); // Assuming data.ideas is an array of ideas
      // setResult(data.result); // Remove this line if we're displaying multiple ideas
      
      const updatedHistory = await publicApi.getHistory();
      setHistory(updatedHistory);
    } catch (error) {
      setResult("Engine failed to ignite. Check connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStar = async (ideaId) => {
    try {
      await publicApi.toggleStar(ideaId);
      // Locally update the UI for instant feedback
      setGeneratedIdeas(prev => prev.map(idea => 
        idea.id === ideaId ? { ...idea, is_starred: !idea.is_starred } : idea
      ));
      loadData(); // Refresh history to show starred status there too
    } catch (error) {
      console.error("Failed to star idea");
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
                <Button 
                  onClick={handleGenerate} 
                  disabled={isLoading || (!prompt && selectedCategories.length === 0)}
                  className="relative group overflow-hidden bg-slate-900 border border-purple-500/50 hover:border-purple-400 text-white font-bold min-w-[160px] transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:shadow-[0_0_25px_rgba(168,85,247,0.3)]"
                >
                  {/* Animated background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative flex items-center justify-center gap-2">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                    ) : (
                      <Zap size={18} className="text-purple-400 fill-purple-400 group-hover:animate-pulse" />
                    )}
                    <span className="tracking-wide">
                      {isLoading ? 'Igniting...' : 'Ignite Research'}
                    </span>
                  </div>
                </Button>
              </div>
              
              {/* Category & Tone Actions */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <ToneSelector selectedTone={tone} setTone={setTone} />
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
                                className={`cursor-pointer transition-all ${selectedCategories.includes(item) ? "bg-white-600 " : "hover:border-purple-500/50"}`}
                                onClick={() => toggleCategory(item)}
                              >
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                    <Button className="w-full bg-white text-purple-600 mt-4" onClick={() => setIsModalOpen(false)}>Save Selections</Button>
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

            {generatedIdeas.length > 0 && !isLoading && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in zoom-in-95 duration-500">
                {generatedIdeas.map((idea, index) => (
                  <Card key={idea.id || index} className="bg-purple-500/5 border-purple-500/20 group relative overflow-hidden">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-3">
                        <Badge className="bg-purple-600 text-[10px]">Idea #{index + 1}</Badge>
                        
                        {/* Favorite Button */}
                        <button 
                          onClick={() => toggleStar(idea.id)}
                          className="transition-transform active:scale-125 hover:scale-110"
                        >
                          <Heart 
                            size={18} 
                            className={idea.is_starred 
                              ? "fill-purple-500 text-purple-500 shadow-sm" 
                              : "text-gray-500 hover:text-purple-400"
                            } 
                          />
                        </button>
                      </div>

                      <p className="text-sm text-gray-200 leading-relaxed italic">
                        {idea.result}
                      </p>

                      <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                         <Button variant="ghost" size="sm" className="h-7 text-[10px] text-gray-500">
                            <Download size={12} className="mr-1" /> PDF
                         </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* History List */}
        <div className="space-y-6 pt-4 pb-20">
          <Tabs defaultValue="all" className="w-full">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2 text-gray-400">
                <History size={18} />
                <h2 className="text-xl font-semibold text-white">Generations</h2>
              </div>
              
              {/* Tab Switcher */}
              <TabsList className="bg-white/5 border border-white/10 h-8">
                <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
                <TabsTrigger value="starred" className="text-xs px-3 gap-1.5">
                  <Star size={12} className="fill-purple-500 text-purple-500" />
                  Starred
                </TabsTrigger>
              </TabsList>
            </div>

            {/* CONTENT: ALL IDEAS */}
            <TabsContent value="all" className="mt-6">
              <div className="grid gap-4">
                {history.length === 0 ? (
                  <p className="text-gray-600 italic text-center py-8">No history yet.</p>
                ) : (
                  history.map((item) => <IdeaCard key={item.id} item={item} />)
                )}
              </div>
            </TabsContent>

            {/* CONTENT: STARRED ONLY */}
            <TabsContent value="starred" className="mt-6">
              <div className="grid gap-4">
                {starredIdeas.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-xl">
                    <Star size={32} className="mx-auto text-gray-700 mb-2" />
                    <p className="text-gray-600 italic">No starred ideas yet. Heart an idea to see it here!</p>
                  </div>
                ) : (
                  starredIdeas.map((item) => <IdeaCard key={item.id} item={item} />)
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}