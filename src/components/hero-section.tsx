"use client";

import { Button } from "./ui/button";
import { ArrowRight, Github } from "lucide-react";
import { ParticleTextEffect } from "./particle-text-effect";
import { useAuth } from "@/lib/auth";

export function HeroSection() {
  const { signInWithGitHub } = useAuth();

  return (
    <section className="py-20 px-4 relative overflow-hidden min-h-screen flex flex-col justify-between">
      <div className="flex-1 flex items-start justify-center pt-20">
        <ParticleTextEffect
          words={["0cto", "PLATFORM", "COLLABORATE", "CREATE"]}
        />
      </div>

      <div className="container mx-auto text-center relative z-10 pb-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 text-balance">
            Build Better Together with{" "}
            <span className="text-gray-300">Powerful Collaboration Tools</span>
          </h2>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              onClick={signInWithGitHub}
              className="bg-white hover:bg-gray-200 text-black group"
            >
              <Github className="mr-2 h-5 w-5" />
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-600 text-white hover:bg-gray-800 bg-transparent"
            >
              Watch Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
