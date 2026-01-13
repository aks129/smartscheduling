import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Server,
  RefreshCw,
  Database,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  MapPin,
  Calendar,
  FileText,
  ExternalLink
} from "lucide-react";

interface ServerStatus {
  status: string;
  timestamp: string;
}

interface Stats {
  locations: number;
  practitioners: number;
  schedules: number;
  slots: number;
  availableSlots: number;
}

export default function AdminDashboard() {
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchServerStatus = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setServerStatus(data);
    } catch (error) {
      console.error('Failed to fetch server status:', error);
      setServerStatus({ status: 'error', timestamp: new Date().toISOString() });
    }
  };

  const fetchStats = async () => {
    try {
      const [locations, practitioners, schedules, slots] = await Promise.all([
        fetch('/api/locations').then(r => r.json()),
        fetch('/api/practitioners').then(r => r.json()),
        fetch('/api/schedules').then(r => r.json()),
        fetch('/api/slots').then(r => r.json())
      ]);

      const availableSlots = slots.filter((slot: any) => slot.status === 'free').length;

      setStats({
        locations: locations.length,
        practitioners: practitioners.length,
        schedules: schedules.length,
        slots: slots.length,
        availableSlots
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerSync = async () => {
    setIsSyncing(true);
    setSyncMessage("Syncing FHIR data from publishers...");

    try {
      const response = await fetch('/api/sync', { method: 'POST' });
      const data = await response.json();
      setSyncMessage(data.message || "Sync completed successfully!");

      // Refresh stats after sync
      setTimeout(() => {
        fetchStats();
        setSyncMessage("");
      }, 2000);
    } catch (error) {
      setSyncMessage("Sync failed. Check server logs.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchServerStatus();
    fetchStats();

    // Refresh status every 30 seconds
    const interval = setInterval(fetchServerStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-primary-foreground p-2 rounded-lg">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Server Dashboard
                </h1>
                <p className="text-xs text-muted-foreground">
                  Administration & Monitoring
                </p>
              </div>
            </div>
            <a
              href="/"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-4 h-4" />
              Back to App
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Server Status */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${serverStatus?.status === 'ok' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                {serverStatus?.status === 'ok' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold">Server Status</h2>
                <p className="text-sm text-muted-foreground">
                  {serverStatus?.status === 'ok' ? 'All systems operational' : 'Server error'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last checked: {serverStatus ? new Date(serverStatus.timestamp).toLocaleTimeString() : 'N/A'}
              </p>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Sync Data</p>
                <Button
                  onClick={triggerSync}
                  disabled={isSyncing}
                  className="mt-2"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Now
                    </>
                  )}
                </Button>
                {syncMessage && (
                  <p className="text-xs text-muted-foreground mt-2">{syncMessage}</p>
                )}
              </div>
              <Database className="w-8 h-8 text-muted-foreground opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">API Documentation</p>
                <a href="/api-docs" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="mt-2">
                    <FileText className="w-4 h-4 mr-2" />
                    Open Swagger UI
                  </Button>
                </a>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Bulk Publish</p>
                <a href="/fhir/$bulk-publish" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="mt-2">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Manifest
                  </Button>
                </a>
              </div>
              <Activity className="w-8 h-8 text-muted-foreground opacity-20" />
            </div>
          </Card>
        </div>

        {/* Statistics */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Data Statistics</h3>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2" />
              <p>Loading statistics...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Locations</p>
                    <p className="text-3xl font-bold mt-2">{stats?.locations || 0}</p>
                  </div>
                  <MapPin className="w-10 h-10 text-blue-500 opacity-20" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Practitioners</p>
                    <p className="text-3xl font-bold mt-2">{stats?.practitioners || 0}</p>
                  </div>
                  <Users className="w-10 h-10 text-green-500 opacity-20" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Slots</p>
                    <p className="text-3xl font-bold mt-2">{stats?.slots || 0}</p>
                  </div>
                  <Calendar className="w-10 h-10 text-purple-500 opacity-20" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Available Slots</p>
                    <p className="text-3xl font-bold mt-2 text-accent">{stats?.availableSlots || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats?.slots ? Math.round((stats.availableSlots / stats.slots) * 100) : 0}% of total
                    </p>
                  </div>
                  <CheckCircle2 className="w-10 h-10 text-accent opacity-20" />
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* API Endpoints Reference */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick API Reference</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-3 bg-muted rounded">
              <code className="text-primary">GET /api/health</code>
              <span className="text-muted-foreground">Health check</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded">
              <code className="text-primary">GET /api/locations</code>
              <span className="text-muted-foreground">List all locations</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded">
              <code className="text-primary">GET /api/practitioners</code>
              <span className="text-muted-foreground">List all practitioners</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded">
              <code className="text-primary">GET /api/slots</code>
              <span className="text-muted-foreground">List all slots</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded">
              <code className="text-primary">POST /api/search</code>
              <span className="text-muted-foreground">Search with filters</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded">
              <code className="text-primary">GET /fhir/$bulk-publish</code>
              <span className="text-muted-foreground">Bulk publish manifest</span>
            </div>
          </div>
          <div className="mt-4 text-center">
            <a href="/api-docs" target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                View Full API Documentation
              </Button>
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
