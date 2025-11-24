
import React, { useState, useEffect } from "react";
import { base44 } from "../api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Filter, Star, MapPin, Hash, Calendar, ChevronDown, ChevronUp, Download, FileDown } from "lucide-react";
import { format as formatDate } from "date-fns";
import ArtifactDetailModal from "../components/artifacts/ArtifactDetailModal";
import ArtifactExportDialog from "../components/artifacts/ArtifactExportDialog";
import { useLocation } from "react-router-dom";

export default function AdminArtifacts() {
  const [artifacts, setArtifacts] = useState([]);
  const [filteredArtifacts, setFilteredArtifacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("-created_date");
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [createdByFilter, setCreatedByFilter] = useState("");
  const [artifactTypeFilter, setArtifactTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [allUsers, setAllUsers] = useState([]);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.filter) {
      setStatusFilter(location.state.filter);
    }
    
    loadArtifacts();
    loadUsers();
    
    const interval = setInterval(() => {
      loadArtifacts();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [sortBy]);

  useEffect(() => {
    applyFilters();
  }, [artifacts, searchTerm, statusFilter, dateFrom, dateTo, createdByFilter, artifactTypeFilter, priorityFilter]);

  const loadArtifacts = async () => {
    try {
      const data = await base44.entities.Artifact.list(sortBy);
      setArtifacts(data);
    } catch (error) {
      console.error("Error loading artifacts:", error);
    }
  };

  const loadUsers = async () => {
    try {
      const users = await base44.entities.User.list();
      setAllUsers(users);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...artifacts];

    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.artifact_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.user_notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.created_by?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.admin_notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter === "reviewed") {
      filtered = filtered.filter((a) => a.admin_reviewed);
    } else if (statusFilter === "unreviewed") {
      filtered = filtered.filter((a) => !a.admin_reviewed);
    } else if (statusFilter === "interesting") {
      filtered = filtered.filter((a) => a.is_interesting);
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter(a => a.priority === priorityFilter);
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(a => {
        const artifactDate = new Date(a.created_date);
        artifactDate.setHours(0, 0, 0, 0);
        return artifactDate >= fromDate;
      });
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(a => {
        const artifactDate = new Date(a.created_date);
        artifactDate.setHours(23, 59, 59, 999);
        return artifactDate <= toDate;
      });
    }

    if (createdByFilter) {
      filtered = filtered.filter(a => a.created_by === createdByFilter);
    }

    if (artifactTypeFilter !== "all") {
      filtered = filtered.filter(a => a.artifact_type === artifactTypeFilter);
    }

    setFilteredArtifacts(filtered);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setDateFrom("");
    setDateTo("");
    setCreatedByFilter("");
    setArtifactTypeFilter("all");
  };

  const handleUpdate = () => {
    loadArtifacts();
  };

  const handleExport = (exportFormat) => {
    const dataToExport = filteredArtifacts.map(a => ({
      'Artifact Code': a.artifact_code || '',
      'Type': a.artifact_type || 'uncategorized',
      'Created By': a.created_by || '',
      'Created Date': a.created_date || '',
      'Location Lat': a.location_lat || '',
      'Location Lng': a.location_lng || '',
      'Reviewed': a.admin_reviewed ? 'Yes' : 'No',
      'Interesting': a.is_interesting ? 'Yes' : 'No',
      'Priority': a.priority || 'none',
      'User Notes': (a.user_notes || '').replace(/"/g, '""'),
      'Admin Notes': (a.admin_notes || '').replace(/"/g, '""')
    }));

    let content, filename, mimeType;

    if (exportFormat === 'json') {
      content = JSON.stringify(dataToExport, null, 2);
      filename = `artifacts-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    } else if (exportFormat === 'csv') {
      const headers = Object.keys(dataToExport[0]).join(',');
      const rows = dataToExport.map(row => 
        Object.values(row).map(v => {
          const stringValue = (v === null || v === undefined) ? '' : String(v);
          return `"${stringValue.replace(/"/g, '""')}"`;
        }).join(',')
      );
      content = [headers, ...rows].join('\n');
      filename = `artifacts-${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: "bg-red-100 text-red-800 border-red-200",
      high: "bg-orange-100 text-orange-800 border-orange-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      low: "bg-blue-100 text-blue-800 border-blue-200",
      none: "bg-gray-50 text-gray-600 border-gray-200"
    };
    return colors[priority] || colors.none;
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 md:mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">All Artifacts</h1>
            <p className="text-sm md:text-base text-gray-600 mt-2">
              Manage and review all discovered artifacts
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
            <FileDown className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>

        <Card className="p-4 md:p-6 mb-6">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Artifacts</SelectItem>
                  <SelectItem value="unreviewed">Needs Review</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="interesting">Interesting</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created_date">Newest First</SelectItem>
                  <SelectItem value="created_date">Oldest First</SelectItem>
                  <SelectItem value="artifact_code">Artifact ID</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>

            {showAdvancedFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium mb-2">From</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">To</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">By</label>
                  <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      {allUsers.map(user => (
                        <SelectItem key={user.email} value={user.email}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <Select value={artifactTypeFilter} onValueChange={setArtifactTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pottery">Pottery</SelectItem>
                      <SelectItem value="glass">Glass</SelectItem>
                      <SelectItem value="metal">Metal</SelectItem>
                      <SelectItem value="stone">Stone</SelectItem>
                      <SelectItem value="bone">Bone</SelectItem>
                      <SelectItem value="textile">Textile</SelectItem>
                      <SelectItem value="wood">Wood</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Priority</label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                  <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto">
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 md:gap-4 text-xs md:text-sm flex-wrap">
              <span className="text-gray-600">
                Total: <strong>{artifacts.length}</strong>
              </span>
              <span className="text-gray-600">
                Shown: <strong>{filteredArtifacts.length}</strong>
              </span>
              <span className="text-red-600">
                Review: <strong>{artifacts.filter((a) => !a.admin_reviewed).length}</strong>
              </span>
              <span className="text-amber-600">
                Interesting: <strong>{artifacts.filter((a) => a.is_interesting).length}</strong>
              </span>
            </div>
          </div>
        </Card>

        {/* Desktop Table View */}
        <Card className="hidden md:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Photo</TableHead>
                  <TableHead>Artifact ID</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArtifacts.map((artifact) => (
                  <TableRow
                    key={artifact.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedArtifact(artifact)}
                  >
                    <TableCell>
                      <img
                        src={artifact.photo_url}
                        alt="Artifact"
                        className="w-16 h-16 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-gray-400" />
                        <span className="font-mono text-sm">
                          {artifact.artifact_code || "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {artifact.created_by}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(new Date(artifact.created_date), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      {artifact.location_lat ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">Yes</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {artifact.priority && artifact.priority !== "none" && (
                        <Badge className={getPriorityColor(artifact.priority)}>
                          {artifact.priority.charAt(0).toUpperCase() + artifact.priority.slice(1)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {!artifact.admin_reviewed && (
                          <Badge className="bg-red-500 text-white">
                            Review
                          </Badge>
                        )}
                        {artifact.is_interesting && (
                          <Badge className="bg-amber-500 text-white">
                            <Star className="w-3 h-3 mr-1" />
                            ★
                          </Badge>
                        )}
                        {artifact.admin_reviewed && !artifact.is_interesting && (
                          <Badge variant="outline">✓</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedArtifact(artifact);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filteredArtifacts.map((artifact) => (
            <Card
              key={artifact.id}
              className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedArtifact(artifact)}
            >
              <div className="flex gap-3">
                <img
                  src={artifact.photo_url}
                  alt="Artifact"
                  className="w-20 h-20 object-cover rounded flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Hash className="w-3 h-3 text-gray-400" />
                    <span className="font-mono text-xs truncate">
                      {artifact.artifact_code || "N/A"}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate">{artifact.created_by}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(new Date(artifact.created_date), "MMM d, yyyy")}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {artifact.priority && artifact.priority !== "none" && (
                      <Badge className={`${getPriorityColor(artifact.priority)} text-xs`}>
                        {artifact.priority.charAt(0).toUpperCase() + artifact.priority.slice(1)}
                      </Badge>
                    )}
                    {!artifact.admin_reviewed && (
                      <Badge className="bg-red-500 text-white text-xs">Review</Badge>
                    )}
                    {artifact.is_interesting && (
                      <Badge className="bg-amber-500 text-white text-xs">★</Badge>
                    )}
                    {artifact.location_lat && (
                      <Badge variant="outline" className="text-xs">
                        <MapPin className="w-3 h-3" />
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {selectedArtifact && (
          <ArtifactDetailModal
            artifact={selectedArtifact}
            onClose={() => setSelectedArtifact(null)}
            onUpdate={handleUpdate}
            isAdmin={true}
          />
        )}

        {showExportDialog && (
          <ArtifactExportDialog
            artifacts={filteredArtifacts}
            onClose={() => setShowExportDialog(false)}
            onExport={handleExport}
          />
        )}
      </div>
    </div>
  );
}
