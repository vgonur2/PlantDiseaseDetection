"use client";

import { useCallback, useState } from "react";
import Navbar from "@/components/Navbar";
import ResultCard from "@/components/ResultCard";
import UploadBox from "@/components/UploadBox";

interface ClassificationResult {
  plant: string;
  condition: string;
  confidence: number;
  treatment?: string;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setResult(null);
    setError(null);
  }, []);

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch("/api/classify", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Classification failed.");
      }

      if (data.plant && data.condition && data.confidence != null) {
        setResult({
          plant: data.plant,
          condition: data.condition,
          confidence: data.confidence,
          treatment: data.treatment,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-leaf-50 via-earth-50 to-leaf-100/40">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-12">
        {/* Hero */}
        <section className="mb-12 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-leaf-600">
            Plant Disease Detection
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-leaf-950 md:text-5xl">
            Protect your crops with{" "}
            <span className="text-leaf-700">AI-powered</span> leaf analysis
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-earth-700">
            Upload a photo of a plant leaf to identify the species, detect
            diseases, and receive treatment recommendations — powered by the
            PlantVillage dataset.
          </p>
        </section>

        {/* Upload */}
        <section className="mx-auto w-full max-w-3xl">
          <UploadBox onFileSelect={handleFileSelect} disabled={isLoading} />

          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!selectedFile || isLoading}
              className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-xl bg-leaf-700 px-8 text-base font-semibold text-white shadow-md transition-all hover:bg-leaf-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg
                    className="mr-2 h-5 w-5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Analyzing…
                </>
              ) : (
                "Analyze Leaf"
              )}
            </button>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            {!result && !isLoading && selectedFile && (
              <p className="text-sm text-earth-600">
                Ready to analyze. Click the button above to classify your leaf.
              </p>
            )}
          </div>
        </section>

        {/* Results */}
        {result && (
          <section className="mx-auto mt-12 w-full max-w-3xl">
            <ResultCard
              plantName={result.plant}
              diseaseName={result.condition}
              confidence={result.confidence}
              treatment={result.treatment}
            />
          </section>
        )}
      </main>

      <footer className="border-t border-leaf-200/60 py-6 text-center text-sm text-earth-500">
        Plant Disease Detection · PlantVillage · 38 disease classes
      </footer>
    </div>
  );
}
