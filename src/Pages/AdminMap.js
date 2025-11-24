import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Star, MapPin, Loader2 } from "lucide-react";
import ArtifactDetailModal from "../components/artifacts/ArtifactDetailModal";

export default function AdminMap() {
  const [artifacts, setArtifacts] = useState([]);
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const L = useRef(null);

  useEffect(() => {
    loadUser();
    loadArtifacts();
    initializeLeaflet();
    
    const interval = setInterval(() => {
      loadArtifacts();
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (artifacts.length > 0 && L.current && mapRef.current && !mapInstanceRef.current) {
      initializeMap();
    } else if (artifacts.length > 0 && mapInstanceRef.current) {
      updateMarkers();
    }
  }, [artifacts]);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const initializeLeaflet = async () => {
    if (typeof window === 'undefined') return;
    
    const leaflet = await import('leaflet');
    await import('leaflet/dist/leaflet.css');
    
    delete leaflet.Icon.Default.prototype._getIconUrl;
    leaflet.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    });
    
    L.current = leaflet;
  };

  const loadArtifacts = async () => {
    try {
      const data = await base44.entities.Artifact.list("-created_date");
      const withLocation = data.filter(a => a.location_lat && a.location_lng);
      setArtifacts(withLocation);
      if (isLoading) {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error loading artifacts:", error);
      if (isLoading) {
        setIsLoading(false);
      }
    }
  };

  const initializeMap = () => {
    if (!L.current || !mapRef.current || mapInstanceRef.current) return;

    try {
      const avgLat = artifacts.reduce((sum, a) => sum + a.location_lat, 0) / artifacts.length;
      const avgLng = artifacts.reduce((sum, a) => sum + a.location_lng, 0) / artifacts.length;

      const map = L.current.map(mapRef.current).setView([avgLat, avgLng], 4);

      L.current.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      mapInstanceRef.current = map;

      addMarkersToMap();

      // The original `window.viewArtifact` is now replaced by `window.openArtifact`
      // which will be defined in a separate useEffect below.
    } catch (error) {
      console.error("Error initializing map:", error);
    }
  };

  const addMarkersToMap = () => {
    if (!L.current || !mapInstanceRef.current) return;

    // Group artifacts by location
    const locationGroups = {};
    artifacts.forEach(artifact => {
      const key = `${artifact.location_lat.toFixed(4)},${artifact.location_lng.toFixed(4)}`;
      if (!locationGroups[key]) {
        locationGroups[key] = [];
      }
      locationGroups[key].push(artifact);
    });

    const typeIcons = {
      pottery: L.current.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
        shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      }),
      glass: L.current.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
        shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      }),
      metal: L.current.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png",
        shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      }),
      stone: L.current.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
        shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      }),
      bone: L.current.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png",
        shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      }),
      wood: L.current.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
        shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      }),
      gold: L.current.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
        shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      }),
      red: L.current.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
        shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      }),
      textile: L.current.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-pink.png",
        shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      }),
      blue: L.current.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
        shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      }),
    };

    Object.entries(locationGroups).forEach(([key, groupArtifacts]) => {
      const firstArtifact = groupArtifacts[0];
      const count = groupArtifacts.length;
      const isUnreviewed = groupArtifacts.some(a => !a.admin_reviewed);
      
      let markerIcon;
      if (isUnreviewed) {
        markerIcon = typeIcons.red;
      } else if (groupArtifacts.some(a => a.is_interesting)) {
        markerIcon = typeIcons.gold;
      } else if (firstArtifact.artifact_type && firstArtifact.artifact_type !== "uncategorized" && typeIcons[firstArtifact.artifact_type]) {
        markerIcon = typeIcons[firstArtifact.artifact_type];
      } else {
        markerIcon = typeIcons.blue;
      }

      const marker = L.current.marker(
        [firstArtifact.location_lat, firstArtifact.location_lng],
        { icon: markerIcon }
      ).addTo(mapInstanceRef.current);

      // If multiple artifacts at same location, show list
      let popupContent;
      if (count > 1) {
        const artifactsList = groupArtifacts.map(artifact => {
          const typeLabel = artifact.artifact_type && artifact.artifact_type !== "uncategorized" 
            ? `<span style="background: #9333EA; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-left: 4px;">${artifact.artifact_type}</span>`
            : '';
          return `
            <div style="padding: 8px; border-bottom: 1px solid #e5e7eb; cursor: pointer;" onclick="window.openArtifact('${artifact.id}')">
              <div style="display: flex; gap: 8px; align-items: center;">
                <img src="${artifact.photo_url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />
                <div style="flex: 1;">
                  <p style="margin: 0; font-size: 12px; font-weight: 600; color: #333;">ID: ${artifact.artifact_code || 'N/A'}${typeLabel}</p>
                  ${artifact.user_notes ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #666;">${artifact.user_notes.substring(0, 40)}...</p>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('');

        popupContent = `
          <div style="min-width: 250px; max-height: 400px; overflow-y: auto;">
            <div style="padding: 8px; background: #9333EA; color: white; font-weight: 600; border-radius: 4px 4px 0 0; position: sticky; top: 0; z-index: 10;">
              ${count} artifacts at this location
            </div>
            ${artifactsList}
          </div>
        `;
      } else {
        // Single artifact
        const artifact = firstArtifact;
        const typeLabel = artifact.artifact_type && artifact.artifact_type !== "uncategorized" 
          ? `<div style="display: inline-block; background: #9333EA; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-top: 4px;"><span>📦 ${artifact.artifact_type.charAt(0).toUpperCase() + artifact.artifact_type.slice(1)}</span></div>`
          : '';

        popupContent = `
          <div style="min-width: 200px;">
            <img src="${artifact.photo_url}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />
            <p style="margin: 4px 0; font-size: 12px; font-weight: 600; color: #666;">ID: ${artifact.artifact_code || 'N/A'}</p>
            ${artifact.user_notes ? `<p style="margin: 8px 0; font-size: 14px;">${artifact.user_notes}</p>` : ''}
            ${!artifact.admin_reviewed ? '<div style="display: inline-block; background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-top: 4px;"><span>⚠️ Needs Review</span></div>' : ''}
            ${artifact.is_interesting ? '<div style="display: inline-block; background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-top: 4px;"><span>⭐ Interesting</span></div>' : ''}
            ${typeLabel}
            <button onclick="window.openArtifact('${artifact.id}')" style="margin-top: 8px; width: 100%; padding: 8px; background: #9333EA; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">View Details</button>
          </div>
        `;
      }

      marker.bindPopup(popupContent);
      markersRef.current.push(marker);
    });
  };

  const updateMarkers = () => {
    if (!L.current || !mapInstanceRef.current) return;

    markersRef.current.forEach(marker => {
      try {
        mapInstanceRef.current.removeLayer(marker);
      } catch (e) {
        console.log("Error removing marker:", e);
      }
    });
    markersRef.current = [];

    addMarkersToMap();
  };

  const handleArtifactUpdate = async (updatedArtifact) => {
    await loadArtifacts();
    setSelectedArtifact(null);
  };

  useEffect(() => {
    // Define global function to open artifact by ID
    window.openArtifact = async (artifactId) => {
      try {
        // Fetch fresh artifact data to ensure we have the latest
        const allArtifacts = await base44.entities.Artifact.list("-created_date");
        const artifact = allArtifacts.find(a => a.id === artifactId);
        if (artifact) {
          setSelectedArtifact(artifact);
        }
      } catch (error) {
        console.error("Error opening artifact:", error);
      }
    };

    return () => {
      // Cleanup
      delete window.openArtifact;
    };
  }, []);

  const unreviewedCount = artifacts.filter(a => !a.admin_reviewed).length;
  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="h-screen flex flex-col bg-[#FAFAF9]">
      <div className="p-4 md:p-6 bg-white border-b z-10 relative flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Discovery Map</h1>
                <p className="text-sm md:text-base text-gray-600 mt-1">
                  {isLoading ? "Loading..." : `${artifacts.length} artifacts`}
                  {unreviewedCount > 0 && <span className="text-red-600 ml-2">• {unreviewedCount} need review</span>}
                </p>
              </div>
            </div>
            
            {/* Mobile Legend */}
            <div className="flex gap-3 text-xs flex-wrap lg:hidden">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="font-medium">Review</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="font-medium">Interesting</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="font-medium">Normal</span>
              </div>
            </div>

            {/* Desktop Legend */}
            <div className="hidden lg:flex gap-4 md:gap-6 text-xs md:text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full"></div>
                <span className="font-medium">Needs Review</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-amber-500 rounded-full"></div>
                <span className="font-medium">Interesting</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-blue-500 rounded-full"></div>
                <span className="font-medium">Normal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative" style={{ zIndex: 1 }}>
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading map...</p>
            </div>
          </div>
        ) : artifacts.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 p-4">
            <Card className="p-8 md:p-12 text-center max-w-md">
              <MapPin className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg md:text-xl font-semibold mb-2">No Artifacts with Location</h3>
              <p className="text-sm md:text-base text-gray-500">Artifacts with GPS data will appear on the map</p>
            </Card>
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full" style={{ zIndex: 1 }} />
        )}
      </div>

      {selectedArtifact && (
        <div style={{ zIndex: 10000 }}>
          <ArtifactDetailModal
            artifact={selectedArtifact}
            onClose={() => setSelectedArtifact(null)}
            onUpdate={handleArtifactUpdate}
            isAdmin={isAdmin}
          />
        </div>
      )}
    </div>
  );
}