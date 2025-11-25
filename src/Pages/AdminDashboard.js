
import React, { useState, useEffect } from "react";
import { base44 } from "../api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "./components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import {
  Database,
  Users,
  Upload,
  Star,
  TrendingUp,
  Calendar,
  MapPin,
  AlertCircle,
  ArrowRight,
  Activity
} from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState({
    totalArtifacts: 0,
    totalUsers: 0,
    pendingReview: 0,
    interestingCount: 0,
    recentSubmissions: 0,
    artifactsWithLocation: 0
  });
  const [artifactsByDay, setArtifactsByDay] = useState([]);
  const [topContributors, setTopContributors] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      // Fetch all data
      const [artifacts, users] = await Promise.all([
        base44.entities.Artifact.list("-created_date"),
        base44.entities.User.list()
      ]);

      // Calculate metrics
      const pendingReview = artifacts.filter(a => !a.admin_reviewed).length;
      const interestingCount = artifacts.filter(a => a.is_interesting).length;
      const artifactsWithLocation = artifacts.filter(a => a.location_lat && a.location_lng).length;
      
      // Recent submissions (last 7 days)
      const sevenDaysAgo = subDays(new Date(), 7);
      const recentSubmissions = artifacts.filter(
        a => new Date(a.created_date) >= sevenDaysAgo
      ).length;

      setMetrics({
        totalArtifacts: artifacts.length,
        totalUsers: users.length,
        pendingReview,
        interestingCount,
        recentSubmissions,
        artifactsWithLocation
      });

      // Artifacts by day (last 7 days)
      const dayData = [];
      for (let i = 6; i >= 0; i--) {
        const date = startOfDay(subDays(new Date(), i));
        const count = artifacts.filter(a => {
          const artifactDate = startOfDay(new Date(a.created_date));
          return artifactDate.getTime() === date.getTime();
        }).length;
        dayData.push({
          date: format(date, "MMM d"),
          count
        });
      }
      setArtifactsByDay(dayData);

      // Top contributors
      const contributorCount = {};
      artifacts.forEach(a => {
        contributorCount[a.created_by] = (contributorCount[a.created_by] || 0) + 1;
      });
      const topContrib = Object.entries(contributorCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([email, count]) => {
          const user = users.find(u => u.email === email);
          return {
            email,
            name: user?.full_name || email,
            count
          };
        });
      setTopContributors(topContrib);

      // Recent activity
      const recent = artifacts.slice(0, 5).map(a => ({
        id: a.id,
        code: a.artifact_code,
        user: a.created_by,
        date: a.created_date,
        reviewed: a.admin_reviewed,
        interesting: a.is_interesting
      }));
      setRecentActivity(recent);

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToArtifacts = (filter) => {
    navigate(createPageUrl("AdminArtifacts"), { state: { filter } });
  };

  const COLORS = ["#9333EA", "#F59E0B", "#3B82F6", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#F97316"];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser?.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#FAFAF9] p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Card className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
            <p className="text-gray-500">Only administrators can view the dashboard</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-8 h-8 text-purple-600" />
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Overview of system activity and key metrics
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigateToArtifacts('all')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Artifacts</p>
                  <p className="text-3xl font-bold text-gray-900">{metrics.totalArtifacts}</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {metrics.recentSubmissions} this week
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Database className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Link to={createPageUrl("UserManagement")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Users</p>
                    <p className="text-3xl font-bold text-gray-900">{metrics.totalUsers}</p>
                    <p className="text-xs text-gray-500 mt-1">Click to manage →</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigateToArtifacts('unreviewed')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Needs Review</p>
                  <p className="text-3xl font-bold text-gray-900">{metrics.pendingReview}</p>
                  <p className="text-xs text-red-600 mt-1">Click to review →</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigateToArtifacts('interesting')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Interesting</p>
                  <p className="text-3xl font-bold text-gray-900">{metrics.interestingCount}</p>
                  <p className="text-xs text-amber-600 mt-1">Click to view →</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="mb-8">
          {/* Submissions Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Submissions (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={artifactsByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#9333EA" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Contributors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-600" />
                Top Contributors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topContributors.map((contributor, index) => (
                  <div key={contributor.email} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                        <span className="text-purple-700 font-semibold text-sm">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{contributor.name}</p>
                        <p className="text-xs text-gray-500">{contributor.email}</p>
                      </div>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">
                      {contributor.count} artifacts
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">#{activity.code || "N/A"}</p>
                      <p className="text-xs text-gray-500">
                        by {activity.user} • {format(new Date(activity.date), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!activity.reviewed && (
                        <Badge className="bg-red-100 text-red-800 text-xs">Review</Badge>
                      )}
                      {activity.interesting && (
                        <Badge className="bg-amber-100 text-amber-800 text-xs">
                          <Star className="w-3 h-3" />
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to={createPageUrl("AdminArtifacts")}>
                <Button variant="outline" className="w-full justify-between group hover:bg-purple-50 hover:border-purple-300">
                  <span className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    View All Artifacts
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              
              <Link to={createPageUrl("UserManagement")}>
                <Button variant="outline" className="w-full justify-between group hover:bg-purple-50 hover:border-purple-300">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Manage Users
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              
              <Link to={createPageUrl("AdminMap")}>
                <Button variant="outline" className="w-full justify-between group hover:bg-purple-50 hover:border-purple-300">
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    View Discovery Map
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
