interface ResultCardProps {
  plantName: string;
  diseaseName: string;
  confidence: number;
  treatment?: string;
}

export default function ResultCard({
  plantName,
  diseaseName,
  confidence,
  treatment,
}: ResultCardProps) {
  const confidencePercent = Math.round(confidence * 100);
  const isHealthy = diseaseName.toLowerCase() === "healthy";

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-leaf-200 bg-white shadow-sm">
      <div className="border-b border-leaf-100 bg-leaf-50/60 px-8 py-5">
        <h2 className="text-lg font-semibold text-leaf-900">Analysis Results</h2>
        <p className="mt-1 text-sm text-earth-600">
          Based on your uploaded leaf image
        </p>
      </div>

      <div className="grid gap-8 px-8 py-8 md:grid-cols-2">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-earth-500">
              Plant Type
            </p>
            <p className="mt-1 text-2xl font-semibold text-leaf-900">{plantName}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-earth-500">
              Condition
            </p>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-2xl font-semibold text-leaf-900">{diseaseName}</p>
              {isHealthy && (
                <span className="rounded-full bg-leaf-100 px-3 py-0.5 text-xs font-medium text-leaf-700">
                  Healthy
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-earth-500">
              Confidence
            </p>
            <p className="text-2xl font-bold text-leaf-700">{confidencePercent}%</p>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-leaf-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-leaf-500 to-leaf-600 transition-all duration-700 ease-out"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
          <p className="text-xs text-earth-500">
            Model confidence in this classification
          </p>
        </div>
      </div>

      <div className="border-t border-leaf-100 bg-earth-50/40 px-8 py-6">
        <p className="text-xs font-medium uppercase tracking-wider text-earth-500">
          Treatment Recommendation
        </p>
        <div className="mt-3 rounded-xl border border-dashed border-earth-300 bg-white/70 px-5 py-4">
          <p className="text-sm leading-relaxed text-earth-700">
            {treatment ??
              "Treatment recommendation is not available for this prediction yet."}
          </p>
        </div>
      </div>
    </div>
  );
}
