
import React, { useState, useEffect } from "react";
import { base44 } from "../api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Star, Hash, FileDown } from "lucide-react";
import { format as formatDate } from "date-fns";
import ArtifactDetailModal from "../components/artifacts/ArtifactDetailModal";
import ArtifactExportDialog from "../components/artifacts/ArtifactExportDialog";
import { Button } from "./components/ui/button";

export default function MyArtifacts() {
  const [artifacts, setArtifacts] = useState([]);
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showExportDialog, setShowExportDialog] = useState(false);

  useEffect(() => {
    loadData();
    
    const interval = setInterval(() => {
      loadData();
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      const allArtifacts = await base44.entities.Artifact.list("-created_date");
      console.log("All artifacts loaded:", allArtifacts);
      
      const userArtifacts = allArtifacts.filter(a => a.created_by === userData.email);
      console.log("User artifacts:", userArtifacts);
      
      setArtifacts(userArtifacts);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading artifacts:", error);
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    await loadData();
    setSelectedArtifact(null);
  };

  // The handleExport function is removed as its functionality is now handled by ArtifactExportDialog.

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading your artifacts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Artifacts</h1>
            <p className="text-gray-600 mt-2">
              {artifacts.length} {artifacts.length === 1 ? "discovery" : "discoveries"} documented
            </p>
          </div>
          {artifacts.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
              <FileDown className="w-4 h-4 mr-1" />
              Export
            </Button>
          )}
        </div>

        {artifacts.length === 0 ? (
          <Card className="p-12 text-center">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Artifacts Yet</h3>
            <p className="text-gray-500">Start documenting your discoveries in the field</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {artifacts.map((artifact) => (
              <Card
                key={artifact.id}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden group"
                onClick={() => setSelectedArtifact(artifact)}
              >
                <div className="relative h-48 overflow-hidden bg-gray-100">
                  <img
                    src={artifact.photo_url}
                    alt="Artifact"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  {artifact.is_interesting && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-amber-500 text-white border-none">
                        <Star className="w-3 h-3 mr-1" />
                        Interesting
                      </Badge>
                    </div>
                  )}
                  {!artifact.admin_reviewed && (
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-red-500 text-white border-none">
                        Pending Review
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      {artifact.artifact_code && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                          <Hash className="w-3 h-3" />
                          {artifact.artifact_code}
                        </div>
                      )}
                      {artifact.user_notes && (
                        <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                          {artifact.user_notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(new Date(artifact.created_date), "MMM d, yyyy")}
                    </div>
                    {artifact.location_lat && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Located
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {selectedArtifact && (
          <ArtifactDetailModal
            artifact={selectedArtifact}
            onClose={() => setSelectedArtifact(null)}
            onUpdate={handleUpdate}
            isAdmin={false}
          />
        )}

        {showExportDialog && (
          <ArtifactExportDialog
            artifacts={artifacts}
            onClose={() => setShowExportDialog(false)}
          />
        )}
      </div>
    </div>
  );
}
