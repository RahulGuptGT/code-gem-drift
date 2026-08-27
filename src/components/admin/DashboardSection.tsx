import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MapPin, Upload, AlertCircle } from "lucide-react";

interface DashboardSectionProps {
  stats: {
    totalACs: number;
    acsWithResearch: number;
    totalFiles: number;
    pendingReview: number;
  };
}

export const DashboardSection = ({ stats }: DashboardSectionProps) => {
  const statCards = [
    {
      title: "Total Assembly Constituencies",
      value: stats.totalACs,
      icon: MapPin,
      color: "text-blue-500",
    },
    {
      title: "ACs with Research",
      value: stats.acsWithResearch,
      icon: FileText,
      color: "text-green-500",
    },
    {
      title: "Total Files Uploaded",
      value: stats.totalFiles,
      icon: Upload,
      color: "text-purple-500",
    },
    {
      title: "Pending Review",
      value: stats.pendingReview,
      icon: AlertCircle,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your Bihar Election 2025 research management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Research Coverage</p>
              <p className="text-sm text-muted-foreground">
                {stats.totalACs > 0 
                  ? `${Math.round((stats.acsWithResearch / stats.totalACs) * 100)}% of ACs have research`
                  : 'No ACs available'}
              </p>
            </div>
            <div className="text-2xl font-bold">
              {stats.acsWithResearch}/{stats.totalACs}
            </div>
          </div>

          {stats.pendingReview > 0 && (
            <div className="flex items-center gap-2 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium">Action Required</p>
                <p className="text-sm text-muted-foreground">
                  {stats.pendingReview} items need verification
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
