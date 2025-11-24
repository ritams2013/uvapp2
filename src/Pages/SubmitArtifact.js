import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Mic, MicOff, MapPin, Loader2, CheckCircle, Play, Pause, RefreshCw, AlertCircle, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SubmitArtifact() {
  const navigate = useNavigate();
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [location, setLocation] = useState(null);
  const [userNotes, setUserNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [locationAsked, setLocationAsked] = useState(false);
  const [material, setMaterial] = useState("");
  const [country, setCountry] = useState("");
  const [functionalType, setFunctionalType] = useState("unknown");
  const [timePeriod, setTimePeriod] = useState("unknown");
  const [estimatedDate, setEstimatedDate] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const bulkFileInputRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const mimeTypeRef = useRef(null);

  const generateArtifactCode = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ART-${timestamp}-${random}`;
  };

  const getLocation = () => {
    if (locationAsked && !locationError) return;

    setLocationLoading(true);
    setLocationError(false);
    setLocationAsked(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationError(false);
          setLocationLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError(true);
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setLocationError(true);
      setLocationLoading(false);
    }
  };

  const retryLocation = () => {
    setLocationAsked(false);
    getLocation();
  };

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);

      if (!locationAsked && !location) {
        getLocation();
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);

      if (!locationAsked && !location) {
        getLocation();
      }
    } else {
      toast.error("Please drop an image file");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;

      const options = mimeType ? { mimeType } : {};
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current || 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
        clearInterval(recordingIntervalRef.current);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlayingPreview) {
        audioRef.current.pause();
        setIsPlayingPreview(false);
      } else {
        audioRef.current.play();
        setIsPlayingPreview(true);
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!photo) {
      toast.error("Please take a photo of the artifact");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Starting artifact submission...");

      console.log("Uploading photo...");
      const { file_url: photoUrl } = await base44.integrations.Core.UploadFile({ file: photo });
      console.log("Photo uploaded:", photoUrl);

      let uploadedAudioUrl = null;
      if (audioBlob) {
        console.log("Uploading audio...");
        const fileExtension = mimeTypeRef.current?.includes('webm') ? 'webm' :
                             mimeTypeRef.current?.includes('ogg') ? 'ogg' :
                             mimeTypeRef.current?.includes('mp4') ? 'mp4' : 'webm';
        const audioFile = new File([audioBlob], `recording-${Date.now()}.${fileExtension}`, {
          type: mimeTypeRef.current || 'audio/webm'
        });
        const { file_url } = await base44.integrations.Core.UploadFile({ file: audioFile });
        uploadedAudioUrl = file_url;
        console.log("Audio uploaded:", uploadedAudioUrl);
      }

      const artifactData = {
        artifact_code: generateArtifactCode(),
        photo_url: photoUrl,
        audio_url: uploadedAudioUrl,
        location_lat: location?.lat,
        location_lng: location?.lng,
        user_notes: userNotes,
        material: material || undefined,
        country: country || undefined,
        functional_type: functionalType,
        time_period: timePeriod,
        estimated_date: estimatedDate || undefined,
        admin_reviewed: false
      };

      console.log("Creating artifact with data:", artifactData);
      const result = await base44.entities.Artifact.create(artifactData);
      console.log("Artifact created successfully:", result);

      toast.success("Artifact submitted successfully!");
      navigate(createPageUrl("MyArtifacts"));
    } catch (error) {
      console.error("Error submitting artifact:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      toast.error("Error submitting artifact: " + (error.message || error.toString() || "Please try again"));
      setIsSubmitting(false);
    }
  };

  const handleBulkFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBulkFile(file);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return;

    setIsBulkUploading(true);
    try {
      const fileExtension = bulkFile.name.split('.').pop().toLowerCase();
      let artifactsToCreate = [];

      if (fileExtension === 'json') {
        const text = await bulkFile.text();
        const data = JSON.parse(text);
        artifactsToCreate = Array.isArray(data) ? data : [data];
      } else if (fileExtension === 'csv') {
        const text = await bulkFile.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          throw new Error("CSV file is empty");
        }

        const parseCSVLine = (line) => {
          const values = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim());
          return values;
        };

        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = parseCSVLine(lines[i]);
          const artifact = {};
          headers.forEach((header, index) => {
            if (values[index]) {
              artifact[header] = values[index];
            }
          });
          if (Object.keys(artifact).length > 0) {
            artifactsToCreate.push(artifact);
          }
        }
      } else if (fileExtension === 'txt') {
        const text = await bulkFile.text();
        const lines = text.split('\n').filter(line => line.trim());

        artifactsToCreate = lines.map(line => ({
          user_notes: line
        }));
      }

      if (artifactsToCreate.length === 0) {
        toast.error("No valid artifacts found in file");
        setIsBulkUploading(false);
        return;
      }

      let created = 0;
      let skipped = 0;
      
      for (const artifactData of artifactsToCreate) {
        try {
          const parseBoolean = (value) => {
            if (typeof value === 'boolean') return value;
            if (typeof value === 'string') {
              const lower = value.toLowerCase();
              return lower === 'true' || lower === 'yes' || lower === '1';
            }
            return false;
          };

          const parseNumber = (value) => {
            if (value === null || value === undefined || value === '') return null;
            const num = parseFloat(value);
            return isNaN(num) ? null : num;
          };

          const dataToSubmit = {
            artifact_code: artifactData.artifact_code || generateArtifactCode(),
            photo_url: artifactData.photo_url || artifactData.photourl || artifactData.photo || '',
            audio_url: artifactData.audio_url || artifactData.audiourl || artifactData.audio || null,
            location_lat: parseNumber(artifactData.location_lat || artifactData.lat || artifactData.latitude),
            location_lng: parseNumber(artifactData.location_lng || artifactData.location_lng || artifactData.lng || artifactData.longitude),
            user_notes: artifactData.user_notes || artifactData.notes || artifactData.usernotes || artifactData.description || '',
            admin_notes: artifactData.admin_notes || artifactData.adminnotes || '',
            artifact_type: (artifactData.artifact_type || artifactData.type || 'uncategorized').toLowerCase(),
            priority: (artifactData.priority || 'none').toLowerCase(),
            is_interesting: parseBoolean(artifactData.is_interesting || artifactData.interesting || artifactData.isinteresting),
            admin_reviewed: parseBoolean(artifactData.admin_reviewed || artifactData.reviewed || artifactData.adminreviewed)
          };

          if (!dataToSubmit.photo_url) {
            console.warn('Skipping artifact without photo_url:', artifactData);
            skipped++;
            continue;
          }

          await base44.entities.Artifact.create(dataToSubmit);
          created++;
        } catch (error) {
          console.error('Error creating artifact:', artifactData, error);
          skipped++;
        }
      }

      if (created > 0) {
        toast.success(`Successfully uploaded ${created} artifact${created !== 1 ? 's' : ''}!${skipped > 0 ? ` (${skipped} skipped due to errors or missing photo_url)` : ''}`);
        setShowBulkUpload(false);
        setBulkFile(null);
        navigate(createPageUrl("MyArtifacts"));
      } else {
        toast.error(`Failed to upload any artifacts. ${skipped} skipped. Check that all artifacts have a 'photo_url' field and correct format.`);
      }
    } catch (error) {
      console.error('Error processing bulk upload:', error);
      toast.error('Failed to process file: ' + (error.message || 'Please check the file format and content.'));
    } finally {
      setIsBulkUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFAF9] to-[#F2E8E5] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Document New Find</h1>
            <p className="text-gray-600 mt-2">Capture and record details about your discovery</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </Button>
        </div>

        {locationError && (
          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <div className="flex items-center justify-between">
                <span>
                  Location access was denied. GPS data helps track where artifacts were found, but you can still submit without it.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retryLocation}
                  className="ml-4 border-amber-300 hover:bg-amber-100"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#9333EA]" />
              Artifact Documentation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Artifact Photo *</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Artifact"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <Button
                    variant="outline"
                    className="absolute bottom-4 right-4 bg-white"
                    onClick={() => fileInputRef.current.click()}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Retake Photo
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-full h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-all ${
                    isDragging 
                      ? 'border-[#9333EA] bg-purple-50 scale-105' 
                      : 'border-gray-300 hover:border-[#9333EA] hover:bg-[#FDF8F6]'
                  }`}
                >
                  <Camera className="w-12 h-12 text-gray-400 mb-3" />
                  <span className="text-gray-600 font-medium">
                    {isDragging ? 'Drop image here' : 'Tap to Capture or Drag & Drop'}
                  </span>
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Voice Description (Optional)</label>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Button
                    variant={isRecording ? "destructive" : "outline"}
                    className="flex-1"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isSubmitting}
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-4 h-4 mr-2" />
                        Stop Recording ({formatTime(recordingTime)})
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 mr-2" />
                        {audioBlob ? "Re-record" : "Start Recording"}
                      </>
                    )}
                  </Button>
                </div>

                {audioUrl && !isRecording && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={togglePlayback}
                    >
                      {isPlayingPreview ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Recording ready</p>
                      <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={() => setIsPlayingPreview(false)}
                        className="w-full mt-2"
                        controls
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Written Notes (Optional)</label>
              <Textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="Describe what you think this artifact might be..."
                className="h-32"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Material (Optional)</label>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="e.g., Bronze, Iron, Clay, Flint..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Country (Optional)</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g., Egypt, Greece, China..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Functional Type</label>
                <select
                  value={functionalType}
                  onChange={(e) => setFunctionalType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="unknown">Unknown</option>
                  <option value="weapon">Weapon</option>
                  <option value="tool">Tool</option>
                  <option value="ornament">Ornament</option>
                  <option value="vessel">Vessel</option>
                  <option value="building_material">Building Material</option>
                  <option value="religious_object">Religious Object</option>
                  <option value="coin">Coin</option>
                  <option value="inscription">Inscription</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Time Period</label>
                <select
                  value={timePeriod}
                  onChange={(e) => setTimePeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="unknown">Unknown</option>
                  <option value="paleolithic">Paleolithic</option>
                  <option value="mesolithic">Mesolithic</option>
                  <option value="neolithic">Neolithic</option>
                  <option value="bronze_age">Bronze Age</option>
                  <option value="iron_age">Iron Age</option>
                  <option value="classical_antiquity">Classical Antiquity</option>
                  <option value="medieval">Medieval</option>
                  <option value="renaissance">Renaissance</option>
                  <option value="modern">Modern</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Estimated Date (Optional)</label>
                <input
                  type="text"
                  value={estimatedDate}
                  onChange={(e) => setEstimatedDate(e.target.value)}
                  placeholder="e.g., 3000 BCE, 100-200 CE, 12th century..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className={`flex items-center gap-2 p-4 rounded-lg ${
              location ? 'bg-green-50' : locationError ? 'bg-amber-50' : 'bg-gray-50'
            }`}>
              <MapPin className={`w-5 h-5 ${
                location ? 'text-green-600' :
                locationError ? 'text-amber-600' :
                'text-gray-400'
              }`} />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {location ? "Location Captured" :
                   locationError ? "Location Not Available" :
                   "Location (will be requested when you take photo)"}
                </p>
                {location && (
                  <p className="text-xs text-gray-500">
                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </p>
                )}
                {locationError && (
                  <p className="text-xs text-amber-700">
                    You can still submit without location data
                  </p>
                )}
              </div>
              {locationLoading && (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              )}
              {location && (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
              {locationError && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={retryLocation}
                  className="text-amber-700 hover:bg-amber-100"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!photo || isSubmitting}
              className="w-full bg-[#9333EA] hover:bg-[#7E22CE] text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Artifact"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Upload Artifacts</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload multiple artifacts from a JSON, CSV, or TXT file.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2">Supported Fields:</h4>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• <strong>photo_url</strong> (required, also `photourl`, `photo`) - URL of the artifact photo</li>
                <li>• <strong>audio_url</strong> (also `audiourl`, `audio`) - URL of voice recording</li>
                <li>• <strong>user_notes</strong> (also `notes`, `usernotes`, `description`) - Written description</li>
                <li>• <strong>admin_notes</strong> (also `adminnotes`) - Admin review notes</li>
                <li>• <strong>location_lat</strong> (also `lat`, `latitude`), <strong>location_lng</strong> (also `lng`, `longitude`) - GPS coordinates</li>
                <li>• <strong>artifact_type</strong> (also `type`) - Type of artifact</li>
                <li>• <strong>priority</strong> - Priority level (none, low, medium, high, urgent)</li>
                <li>• <strong>is_interesting</strong> (also `interesting`, `isinteresting`) - Mark as interesting (true/false, yes/no, 1/0)</li>
                <li>• <strong>admin_reviewed</strong> (also `reviewed`, `adminreviewed`) - Mark as admin reviewed (true/false, yes/no, 1/0)</li>
                <li>• <strong>artifact_code</strong> - Custom ID (auto-generated if not provided)</li>
              </ul>
            </div>
            <input
              ref={bulkFileInputRef}
              type="file"
              accept=".json,.csv,.txt"
              onChange={handleBulkFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => bulkFileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {bulkFile ? bulkFile.name : "Select File"}
            </Button>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowBulkUpload(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkUpload}
                disabled={!bulkFile || isBulkUploading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isBulkUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload Artifacts"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}